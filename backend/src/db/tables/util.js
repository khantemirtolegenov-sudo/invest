/** Помощники маппинга «поле JSON ↔ колонка» для адаптеров таблиц */

export const orNull = (v) => (v === undefined || v === null || v === '' ? null : v);

/** JSONB-параметр: node-pg сериализует массив как postgres-array, поэтому stringify вручную */
export const asJsonb = (v) => (v === undefined || v === null ? null : JSON.stringify(v));

/** Поля объекта, не входящие в known, — в extra */
export function restOf(obj, known) {
  const extra = {};
  for (const [k, v] of Object.entries(obj ?? {})) if (!known.has(k)) extra[k] = v;
  return extra;
}

/** INSERT … ON CONFLICT (id) DO UPDATE по колонкам адаптера + updated_at/updated_by */
export function buildUpsertSql(adapter) {
  const meta = ['updated_at', 'updated_by'];
  const cols = [...adapter.columns, ...meta];
  const updates = cols.filter((c) => c !== 'id').map((c) => `${c} = EXCLUDED.${c}`);
  return {
    sql: `INSERT INTO ${adapter.table} (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})
  ON CONFLICT (id) DO UPDATE SET ${updates.join(', ')}`,
    values: (row, at, actorId) => [...adapter.columns.map((c) => row[c]), at, actorId],
  };
}
