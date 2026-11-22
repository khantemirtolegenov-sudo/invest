/**
 * Хранилище коллекций поверх типизированных таблиц.
 *
 * Наружу коллекции имеют «фронтендную» форму (интерфейс Database): array — массив
 * в сохранённом порядке, record — объект по ключу, singleton — одно значение.
 * Каждая запись двигает ревизию данных (db_revision) — на ВСЕХ путях записи сразу,
 * поэтому открытые вкладки узнают о любом изменении, включая серверные.
 */
import { query, withTransaction } from './connection.js';
import { COLLECTIONS } from './collections.js';
import { TABLE_ADAPTERS, adapterOps } from './tables/index.js';

const SINGLETON_ID = '__singleton__';
const now = () => new Date().toISOString();
const ORDER_SQL = `INSERT INTO collection_order (collection, ids, updated_at) VALUES ($1, $2::jsonb, $3)
  ON CONFLICT (collection) DO UPDATE SET ids = EXCLUDED.ids, updated_at = EXCLUDED.updated_at`;

function opsFor(name) {
  const t = TABLE_ADAPTERS[name];
  if (!t) throw new Error(`Коллекция «${name}» не имеет адаптера таблицы (backend/src/db/tables/index.js)`);
  return adapterOps(t);
}

export async function bumpRevision(client, at = now()) {
  const res = await client.query('UPDATE db_revision SET rev = rev + 1, updated_at = $1 WHERE id = TRUE RETURNING rev', [at]);
  return Number(res.rows[0]?.rev ?? 0);
}

export async function readRevision() {
  return Number((await query('SELECT rev FROM db_revision WHERE id = TRUE'))[0]?.rev ?? 0);
}

export const getEntity = (collection, id) => opsFor(collection).getOne(id);

function shape(def, rows, order) {
  if (def.kind === 'singleton') return rows.find((r) => r.id === SINGLETON_ID)?.data ?? null;
  if (def.kind === 'record') return Object.fromEntries(rows.map((r) => [r.id, r.data]));
  const byId = new Map(rows.map((r) => [r.id, r.data]));
  const out = [];
  for (const id of order ?? []) {
    if (byId.has(id)) {
      out.push(byId.get(id));
      byId.delete(id);
    }
  }
  return [...out, ...byId.values()];
}

export async function readCollection(name) {
  const def = COLLECTIONS[name];
  const [rows, order] = await Promise.all([
    opsFor(name).readAll(),
    def.kind === 'array' ? query('SELECT ids FROM collection_order WHERE collection = $1', [name]).then((r) => r[0]?.ids ?? []) : null,
  ]);
  return shape(def, rows, order);
}

async function applyOn(client, name, changes, actorId) {
  const def = COLLECTIONS[name];
  const ops = opsFor(name);
  const at = now();
  let writes = false;
  if (def.kind === 'singleton') {
    if ('set' in changes) {
      await ops.put(client, SINGLETON_ID, changes.set, at, actorId);
      writes = true;
    }
  } else {
    for (const del of changes.deletes ?? []) {
      await ops.deleteOne(client, del);
      writes = true;
    }
    for (const up of changes.upserts ?? []) {
      const id = def.kind === 'record' ? String(up.key) : String(up.id);
      await ops.put(client, id, def.kind === 'record' ? up.value : up, at, actorId);
      writes = true;
    }
    if (def.kind === 'array' && Array.isArray(changes.order)) {
      await client.query(ORDER_SQL, [name, JSON.stringify(changes.order.map(String)), at]);
      writes = true;
    }
  }
  return writes ? bumpRevision(client, at) : 0;
}

/** Пакет изменений одной коллекции отдельной транзакцией (серверные записи, вход) */
export const applyChanges = (name, changes, actorId) => withTransaction((client) => applyOn(client, name, changes, actorId));

/**
 * Пакет по нескольким коллекциям ОДНОЙ транзакцией: целиком или никак.
 * afterApply(client) — побочные записи в той же транзакции (очередь Telegram):
 * пакет откатился — заданий нет, применён — гарантированно есть (transactional outbox).
 */
export async function applyChangesBatch(byCollection, actorId, afterApply) {
  return withTransaction(async (client) => {
    let rev = 0;
    for (const [name, ch] of Object.entries(byCollection)) rev = (await applyOn(client, name, ch ?? {}, actorId)) || rev;
    if (afterApply) await afterApply(client);
    return rev;
  });
}

/** Снимок всей базы в форме фронтенда; скрытые коллекции — пустыми той же формы */
export async function snapshot(canReadFn) {
  const orders = new Map((await query('SELECT collection, ids FROM collection_order')).map((r) => [r.collection, r.ids]));
  const entries = await Promise.all(
    Object.entries(COLLECTIONS).map(async ([name, def]) => {
      if (!canReadFn(name)) return [name, def.kind === 'array' ? [] : def.kind === 'record' ? {} : null];
      return [name, shape(def, await opsFor(name).readAll(), orders.get(name))];
    }),
  );
  return Object.fromEntries(entries);
}
