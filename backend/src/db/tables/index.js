/**
 * Реестр адаптеров «коллекция → таблица». Коллекция без адаптера — ошибка
 * конфигурации (сервер бросит исключение), а не тихий фолбэк.
 *
 * Адаптер: { collection, table, columns, toRow, fromRow } — операции чтения и
 * записи собираются автоматически. Нужна сложная форма (родитель + дочерние
 * таблицы) — адаптер может принести свои ops: { readAll, getOne, put, deleteOne, deleteAll }.
 */
import { query } from '../connection.js';
import { SIMPLE_TABLES } from './simple.js';
import { buildUpsertSql } from './util.js';

export const TABLE_ADAPTERS = Object.fromEntries(SIMPLE_TABLES.map((t) => [t.collection, t]));

const opsCache = new Map();

export function adapterOps(t) {
  if (!opsCache.has(t)) opsCache.set(t, t.ops ?? singleTableOps(t));
  return opsCache.get(t);
}

function singleTableOps(t) {
  const upsert = buildUpsertSql(t);
  return {
    readAll: async () => (await query(`SELECT * FROM ${t.table}`)).map((r) => ({ id: r.id, data: t.fromRow(r) })),
    getOne: async (id) => {
      const rows = await query(`SELECT * FROM ${t.table} WHERE id = $1`, [String(id)]);
      return rows[0] ? t.fromRow(rows[0]) : null;
    },
    put: (client, id, data, at, actorId) => {
      const row = t.toRow(data);
      row.id = String(id);
      return client.query(upsert.sql, upsert.values(row, at, actorId));
    },
    deleteOne: (client, id) => client.query(`DELETE FROM ${t.table} WHERE id = $1`, [String(id)]),
    deleteAll: (client) => client.query(`DELETE FROM ${t.table}`),
  };
}

/** Пользователь по email (без учёта регистра) — для входа, без чтения всей коллекции */
export async function findUserRowByEmail(email) {
  const rows = await query('SELECT * FROM users WHERE lower(email) = lower($1) LIMIT 1', [String(email ?? '').trim()]);
  return rows[0] ? TABLE_ADAPTERS.users.fromRow(rows[0]) : null;
}
