/**
 * Данные приложения — контракт, который НЕ меняется:
 *   GET  /api/db          — снапшот всех коллекций (форма Database фронтенда), с учётом прав
 *   GET  /api/db/revision — ревизия данных {rev} для живого обновления вкладок
 *   POST /api/db/sync     — пакет {changes: {collection: {upserts, deletes, order, set}}}
 *
 * Ревизия едет заголовком X-Db-Revision: тело снапшота = интерфейс Database, служебному
 * числу в нём не место. Права — db/collections.js, на КАЖДУЮ сущность пакета.
 */
import { Router } from 'express';
import { ApiError, asyncHandler, ok } from '../middleware/errors.js';
import { applyChangesBatch, getEntity, readRevision, snapshot } from '../db/store.js';
import { COLLECTIONS, PROTECTED_USER_FIELDS, canRead, checkWrite, isKnownCollection } from '../db/collections.js';
import { query } from '../db/connection.js';
import { enqueue } from '../services/telegram.js';

export const dbRouter = Router();

/** Коллекции, которые каждый видит только в своей части (по полю владельца) */
const PRIVATE_COLLECTIONS = { notifications: 'userId' };

dbRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    // ревизию читаем ДО снапшота: в гонке клиент лишний раз перечитает, но не потеряет изменение
    const rev = await readRevision();
    const snap = await snapshot((name) => canRead(req.user, name));
    for (const [name, field] of Object.entries(PRIVATE_COLLECTIONS)) {
      snap[name] = (snap[name] ?? []).filter((x) => x?.[field] === req.user.id);
    }
    snap.users = (snap.users ?? []).map(({ passwordHash, ...u }) => (void passwordHash, u));
    res.setHeader('X-Db-Revision', String(rev));
    ok(res, snap);
  }),
);

dbRouter.get(
  '/revision',
  asyncHandler(async (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    ok(res, { rev: await readRevision() });
  }),
);

dbRouter.post(
  '/sync',
  asyncHandler(async (req, res) => {
    try {
      await handleSync(req, res);
    } catch (err) {
      // каждый отказ правами — в журнал: рассинхрон прав клиента и сервера должен быть виден сразу
      if (err instanceof ApiError && err.status === 403) {
        await query('INSERT INTO sync_rejections (user_id, role, reason, created_at) VALUES ($1, $2, $3, $4)', [
          req.user.id,
          req.user.role,
          err.message,
          new Date().toISOString(),
        ]).catch(() => undefined);
      }
      throw err;
    }
  }),
);

async function handleSync(req, res) {
  const changes = req.body?.changes;
  if (!changes || typeof changes !== 'object') throw new ApiError('Нет изменений (ожидается {changes})', 400);

  const prevCache = new Map();
  const prevOf = async (name, id) => {
    const key = `${name}:${id}`;
    if (!prevCache.has(key)) prevCache.set(key, await getEntity(name, id));
    return prevCache.get(key);
  };
  const newNotifications = [];

  // 1) проверка формы и прав по каждой сущности ДО записи
  for (const [name, ch] of Object.entries(changes)) {
    if (!isKnownCollection(name)) throw new ApiError(`Неизвестная коллекция: ${name}`, 400);
    const def = COLLECTIONS[name];
    if (def.kind === 'singleton') {
      if (!('set' in (ch ?? {}))) throw new ApiError(`Для ${name} ожидается {set}`, 400);
      const err = checkWrite(req.user, name, '__singleton__', ch.set, null);
      if (err) throw new ApiError(`${name}: ${err}`, 403);
      continue;
    }
    for (const up of ch?.upserts ?? []) {
      const id = def.kind === 'record' ? up?.key : up?.id;
      if (id === undefined || id === null || id === '') throw new ApiError(`${name}: запись без id`, 400);
      const next = def.kind === 'record' ? up.value : up;
      const prev = await prevOf(name, String(id));
      const err = checkWrite(req.user, name, String(id), next, prev);
      if (err) throw new ApiError(`${name}: ${err}`, 403);
      if (name === 'notifications' && !prev) newNotifications.push(next);
    }
    for (const del of ch?.deletes ?? []) {
      const prev = await prevOf(name, String(del));
      if (!prev) continue;
      const err = checkWrite(req.user, name, String(del), null, prev);
      if (err) throw new ApiError(`${name}: ${err}`, 403);
    }
    if (ch?.order !== undefined && !Array.isArray(ch.order)) throw new ApiError(`${name}: order — массив id`, 400);
  }

  // 2) users: хеш пароля клиент не видит — берём из БД; не-админ не меняет себе защищённые поля
  if (changes.users?.upserts) {
    const merged = [];
    for (const incoming of changes.users.upserts) {
      const prev = await prevOf('users', String(incoming.id));
      const row = { ...incoming };
      if (prev) {
        row.passwordHash = prev.passwordHash;
        if (req.user.role !== 'admin') {
          for (const f of PROTECTED_USER_FIELDS) {
            if (f in prev) row[f] = prev[f];
            else delete row[f];
          }
        }
      } else delete row.passwordHash;
      merged.push(row);
    }
    changes.users.upserts = merged;
  }

  // 3) весь пакет одной транзакцией; очередь Telegram — тем же коммитом
  const rev = await applyChangesBatch(changes, req.user.id, async (client) => {
    void client;
    void newNotifications;
    await enqueue(client, newNotifications);
  });
  res.setHeader('X-Db-Revision', String(rev || (await readRevision())));
  ok(res, { applied: Object.keys(changes).length });
}
