/**
 * Подключение к PostgreSQL и миграции.
 *
 * Миграции — файлы backend/migrations/NNN_*.sql, применяются по имени один раз
 * (таблица schema_migrations) при каждом старте сервера. Append-only: применённый
 * файл не редактируется, правка схемы — новый файл следующим номером.
 */
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { config } from '../config.js';

if (!config.databaseUrl) {
  console.error('[db] Не задан DATABASE_URL (см. backend/.env.example)');
  process.exit(1);
}

// DATE читаем строкой 'YYYY-MM-DD': JS Date добавил бы сдвиг часового пояса
pg.types.setTypeParser(1082, (v) => v);

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  ssl: config.dbSsl ? { rejectUnauthorized: false } : undefined,
  connectionTimeoutMillis: 10_000,
});
pool.on('error', (err) => console.error('[db] ошибка соединения в пуле:', err.message));

export async function query(text, params) {
  return (await pool.query(text, params)).rows;
}

/** fn(client) в транзакции: COMMIT при успехе, ROLLBACK при ошибке */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw e;
  } finally {
    client.release();
  }
}

export async function runMigrations() {
  await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
  const applied = new Set((await pool.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
  const files = fs.readdirSync(config.migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(config.migrationsDir, file), 'utf8');
    await withTransaction(async (client) => {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name, applied_at) VALUES ($1, $2)', [file, new Date().toISOString()]);
    });
    console.log(`[db] миграция применена: ${file}`);
  }
}

export function safeDbTarget() {
  try {
    const u = new URL(config.databaseUrl);
    return `${u.host}${u.pathname}`;
  } catch {
    return '(DATABASE_URL)';
  }
}
