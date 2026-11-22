/**
 * Слой данных: кэш снапшота базы в памяти вкладки + фоновая синхронизация.
 *
 * Контракт для сервисного слоя (api/modules/*):
 *   loadDb()   — синхронно вернуть кэш (после initDb());
 *   mutate(fn) — синхронно изменить кэш; через ~250 мс дифф уходит на POST /api/db/sync;
 *   uid(p)     — новый id.
 *
 * Дифф считается по каждой коллекции (upserts/deletes по id, порядок массива,
 * singleton). Права проверяет СЕРВЕР на каждую сущность пакета.
 *
 * Защиты от тихой потери правок (уроки проекта-прародителя):
 *  - ящик неотправленного: неподтверждённый дифф дублируется в localStorage и
 *    досылается после перезагрузки (F5, выкладка, падение сервера);
 *  - окончательный отказ сервера (403/400) не откатывает весь пакет: `salvage`
 *    сохраняет по одной записи всё, что сервер примет;
 *  - confirmSync() — «готово» человеку говорят только после ответа сервера.
 * Живое обновление: раз в 5 с вкладка спрашивает ревизию и перечитывает снапшот,
 * только если данные изменились, — но не под руками у пользователя.
 */
import { apiFetch, ApiHttpError, getToken, setToken } from './http';
import { isValidDb, type Database } from './seedDb';
import { toast } from '../store/toast';

export type { Database } from './seedDb';

// Формы коллекций (зеркало backend/src/db/collections.js); array — по умолчанию
const RECORD_COLLECTIONS = new Set<string>([]);
const SINGLETON_COLLECTIONS = new Set<string>([]);

type Changes = Record<string, { upserts?: unknown[]; deletes?: string[]; order?: string[]; set?: unknown }>;

let cache: Database | null = null;
let synced: Record<string, Map<string, string> | string> = {};
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let syncInFlight = false;
let syncFailures = 0;
let lastSyncError: unknown = null;
let confirmWaiting = 0;

export const dbReady = () => cache !== null;
export const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

async function fetchSnapshot(): Promise<{ db: Database; rev: number }> {
  let rev = 0;
  const snap = await apiFetch<Partial<Database>>('/api/db', {
    onResponse: (res) => {
      rev = Number(res.headers.get('X-Db-Revision')) || 0;
    },
  });
  if (!isValidDb(snap)) throw new ApiHttpError('Сервер вернул некорректный снапшот данных', 500);
  return { db: snap, rev };
}

// ===================== ящик неотправленного =====================
const OUTBOX_KEY = 'hub-outbox';
const OUTBOX_MAX_AGE = 7 * 24 * 3600_000;

function tokenUser(): string | null {
  const t = getToken();
  if (!t) return null;
  try {
    return JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub ?? null;
  } catch {
    return null;
  }
}

function saveOutbox(changes: Changes): void {
  const user = tokenUser();
  if (!user) return;
  try {
    if (!Object.keys(changes).length) localStorage.removeItem(OUTBOX_KEY);
    else localStorage.setItem(OUTBOX_KEY, JSON.stringify({ user, at: Date.now(), changes }));
  } catch {
    /* хранилище недоступно — остаётся обычная отправка */
  }
}

function readOutbox(): Changes | null {
  try {
    const box = JSON.parse(localStorage.getItem(OUTBOX_KEY) || 'null') as { user: string; at: number; changes: Changes } | null;
    if (!box) return null;
    if (box.user !== tokenUser() || Date.now() - box.at > OUTBOX_MAX_AGE) {
      localStorage.removeItem(OUTBOX_KEY);
      return null;
    }
    return Object.keys(box.changes ?? {}).length ? box.changes : null;
  } catch {
    return null;
  }
}

const clearOutbox = () => {
  try {
    localStorage.removeItem(OUTBOX_KEY);
  } catch {
    /* нечего чистить */
  }
};

const isNetworkFailure = (e: unknown) => !(e instanceof ApiHttpError) || e.status === 0 || e.status >= 500 || e.status === 408 || e.status === 429;

/** Отказ, который повтором не лечится: нет прав или данные не прошли проверку */
export const isPermanentRejection = (e: unknown): e is ApiHttpError =>
  e instanceof ApiHttpError && e.status >= 400 && e.status < 500 && ![401, 408, 429].includes(e.status);

/** Пакет отклонён — сохранить всё, что сервер примет, по одной записи */
async function salvage(changes: Changes): Promise<{ dropped: number; reason?: string }> {
  let dropped = 0;
  let reason: string | undefined;
  const send = (part: Changes) => apiFetch('/api/db/sync', { method: 'POST', body: { changes: part } });
  for (const [name, ch] of Object.entries(changes)) {
    try {
      await send({ [name]: ch });
      continue;
    } catch (e) {
      if (isNetworkFailure(e)) throw e;
    }
    const pieces: Changes[] = [
      ...(ch.upserts ?? []).map((u) => ({ [name]: { upserts: [u], deletes: [] } })),
      ...(ch.deletes ?? []).map((d) => ({ [name]: { upserts: [], deletes: [d] } })),
      ...(ch.set !== undefined ? [{ [name]: { set: ch.set } }] : []),
    ];
    for (const piece of pieces) {
      try {
        await send(piece);
      } catch (e) {
        if (isNetworkFailure(e)) throw e;
        dropped += 1;
        reason ??= e instanceof Error ? e.message : undefined;
      }
    }
  }
  return { dropped, reason };
}

async function replayOutbox(): Promise<void> {
  const box = readOutbox();
  if (!box) return;
  try {
    const { dropped, reason } = await salvage(box);
    clearOutbox();
    if (dropped) toast.error(`Часть прошлых изменений сервер не принял (${dropped}): ${reason ?? 'нет прав'}`);
    else toast.success('Несохранённые изменения прошлой сессии сохранены');
  } catch {
    toast.error('Есть несохранённые изменения прошлой сессии — сервер недоступен, повторим при следующем входе');
  }
}

// ===================== кэш =====================

export async function initDb(opts: { replay?: boolean } = {}): Promise<void> {
  if (opts.replay !== false) await replayOutbox(); // до снапшота — тогда он уже с этими правками
  const { db, rev } = await fetchSnapshot();
  cache = db;
  synced = takeSnapshot(db);
  revision = rev;
  startLiveSync();
}

export function resetDb(): void {
  cache = null;
  synced = {};
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = null;
  stopLiveSync();
}

export function loadDb(): Database {
  if (!cache) throw new Error('База данных ещё не загружена (initDb не выполнен)');
  return cache;
}

export function mutate<T>(fn: (db: Database) => T): T {
  const result = fn(loadDb());
  scheduleSync();
  return result;
}

function takeSnapshot(db: Database): Record<string, Map<string, string> | string> {
  const out: Record<string, Map<string, string> | string> = {};
  for (const [name, value] of Object.entries(db)) {
    if (SINGLETON_COLLECTIONS.has(name)) out[name] = JSON.stringify(value ?? null);
    else if (RECORD_COLLECTIONS.has(name))
      out[name] = new Map(Object.entries((value ?? {}) as Record<string, unknown>).map(([k, v]) => [k, JSON.stringify(v)]));
    else
      out[name] = new Map(
        ((value ?? []) as { id?: unknown }[]).filter((i) => i && i.id !== undefined).map((i) => [String(i.id), JSON.stringify(i)]),
      );
  }
  return out;
}

const warned = new Set<string>();
function computeChanges(db: Database): Changes {
  const changes: Changes = {};
  for (const [name, value] of Object.entries(db)) {
    const prev = synced[name];
    if (SINGLETON_COLLECTIONS.has(name)) {
      if (JSON.stringify(value ?? null) !== prev) changes[name] = { set: value };
      continue;
    }
    const prevMap = prev instanceof Map ? prev : new Map<string, string>();
    if (RECORD_COLLECTIONS.has(name)) {
      const entries = Object.entries((value ?? {}) as Record<string, unknown>);
      const upserts = entries.filter(([k, v]) => prevMap.get(k) !== JSON.stringify(v)).map(([key, v]) => ({ key, value: v }));
      const keys = new Set(entries.map(([k]) => k));
      const deletes = [...prevMap.keys()].filter((k) => !keys.has(k));
      if (upserts.length || deletes.length) changes[name] = { upserts, deletes };
      continue;
    }
    const upserts: unknown[] = [];
    const ids: string[] = [];
    for (const item of (value ?? []) as { id?: unknown }[]) {
      if (!item || item.id === undefined) {
        if (import.meta.env.DEV && !warned.has(name)) {
          warned.add(name);
          console.warn(`[db] в коллекции «${name}» есть сущность без id — она не будет сохранена на сервере`);
        }
        continue;
      }
      const id = String(item.id);
      ids.push(id);
      if (prevMap.get(id) !== JSON.stringify(item)) upserts.push(item);
    }
    const idSet = new Set(ids);
    const deletes = [...prevMap.keys()].filter((k) => !idSet.has(k));
    const orderChanged = ids.join('\u0000') !== [...prevMap.keys()].join('\u0000');
    if (upserts.length || deletes.length || orderChanged) changes[name] = { upserts, deletes, ...(orderChanged ? { order: ids } : {}) };
  }
  return changes;
}

function scheduleSync() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => void flushSync(), 250);
}

export async function flushSync(): Promise<void> {
  if (!cache || syncInFlight || !getToken()) return;
  const changes = computeChanges(cache);
  if (!Object.keys(changes).length) return;
  saveOutbox(changes);
  syncInFlight = true;
  const sent = takeSnapshot(cache);
  let appliedRev = 0;
  try {
    await apiFetch('/api/db/sync', {
      method: 'POST',
      body: { changes },
      onResponse: (res) => {
        appliedRev = Number(res.headers.get('X-Db-Revision')) || 0;
      },
    });
    synced = sent;
    lastSyncError = null;
    syncFailures = 0;
    if (appliedRev) revision = appliedRev; // своя запись не вызывает перечитывания снапшота
    const rest = computeChanges(cache);
    saveOutbox(rest);
    if (Object.keys(rest).length) scheduleSync();
  } catch (e) {
    syncFailures += 1;
    lastSyncError = e;
    if (e instanceof ApiHttpError && e.status === 401) {
      setToken(null);
      toast.error('Сессия истекла — войдите заново, изменения не сохранены');
    } else if (isPermanentRejection(e)) {
      if (!confirmWaiting) toast.error(e.message);
      void salvage(changes)
        .then(() => clearOutbox())
        .catch(() => undefined)
        .finally(() => void initDb({ replay: false }).catch(() => undefined));
    } else if (syncFailures <= 3) {
      setTimeout(() => void flushSync(), 1500 * syncFailures);
    } else {
      toast.error('Не удалось сохранить изменения: сервер недоступен. Повторим попытку.');
      syncFailures = 0;
      setTimeout(() => void flushSync(), 10_000);
    }
  } finally {
    syncInFlight = false;
  }
}

const hasPendingChanges = () => (cache ? Object.keys(computeChanges(cache)).length > 0 : false);

/**
 * Дождаться, пока сервер ПРИМЕТ правки, — для действий, о которых человеку говорят
 * «отправлено». 'saved' — принято; 'pending' — сервер недоступен, правки уйдут повтором.
 * Отказ правами — исключение с текстом сервера: данные НЕ сохранены.
 */
export async function confirmSync(timeoutMs = 20_000): Promise<'saved' | 'pending'> {
  const deadline = Date.now() + timeoutMs;
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  confirmWaiting += 1;
  try {
    if (syncTimer) {
      clearTimeout(syncTimer);
      syncTimer = null;
    }
    for (;;) {
      while (syncInFlight) {
        if (Date.now() > deadline) return 'pending';
        await sleep(50);
      }
      if (!hasPendingChanges()) return 'saved';
      lastSyncError = null;
      await flushSync();
      const err = lastSyncError as unknown;
      if (err instanceof ApiHttpError && (err.status === 401 || isPermanentRejection(err))) throw new ApiHttpError(err.message, err.status);
      if (err) return 'pending';
      if (!hasPendingChanges()) return 'saved';
      if (Date.now() > deadline) return 'pending';
    }
  } finally {
    confirmWaiting -= 1;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', (ev) => {
    if (!cache || !getToken()) return;
    const changes = computeChanges(cache);
    if (!Object.keys(changes).length) return;
    saveOutbox(changes);
    if (JSON.stringify({ changes }).length < 60_000) {
      void apiFetch('/api/db/sync', { method: 'POST', body: { changes }, keepalive: true }).catch(() => undefined);
    }
    ev.preventDefault();
    ev.returnValue = '';
  });
  // вышла новая версия: старая вкладка не находит свои файлы — правки в ящик и перезагрузка
  window.addEventListener('vite:preloadError', (ev) => {
    ev.preventDefault();
    if (cache) saveOutbox(computeChanges(cache));
    window.setTimeout(() => window.location.reload(), 500);
  });
}

// ===================== живое обновление =====================
const POLL_MS = 5_000;
let revision = 0;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let checking = false;
let suspended = 0;
const listeners = new Set<() => void>();

/** Подписаться на фоновое обновление кэша (useAsync перезагружает экран молча) */
export function subscribeDb(listener: () => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/** Пауза фонового обновления на время работы с формой (Modal вызывает сам) */
export function suspendLiveSync(): () => void {
  suspended += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    suspended = Math.max(0, suspended - 1);
  };
}

function isTyping(): boolean {
  const el = document.activeElement as HTMLElement | null;
  return Boolean(el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable));
}

const busy = () => suspended > 0 || syncInFlight || isTyping() || hasPendingChanges();

export async function checkForUpdates(): Promise<void> {
  if (!cache || !getToken() || checking || busy()) return;
  checking = true;
  try {
    const { rev } = await apiFetch<{ rev: number }>('/api/db/revision');
    if (!rev || rev === revision) return;
    const next = await fetchSnapshot();
    if (busy()) return;
    cache = next.db;
    synced = takeSnapshot(next.db);
    revision = next.rev || rev;
    for (const l of [...listeners]) l();
  } catch {
    /* сервер недоступен — следующий круг */
  } finally {
    checking = false;
  }
}

function startLiveSync(): void {
  if (typeof window === 'undefined' || pollTimer) return;
  pollTimer = setInterval(() => {
    if (document.visibilityState !== 'hidden') void checkForUpdates();
  }, POLL_MS);
}

function stopLiveSync(): void {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
  revision = 0;
}

if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void checkForUpdates();
  });
  window.addEventListener('focus', () => void checkForUpdates());
}
