/** npm run db:migrate — применить новые миграции без запуска сервера */
import { pool, runMigrations } from '../src/db/connection.js';

await runMigrations();
await pool.end();
console.log('Миграции применены');
