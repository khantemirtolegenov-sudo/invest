/** npm run backup:db — дамп базы через pg_dump в backend/backups (нужны утилиты PostgreSQL в PATH) */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { config } from '../src/config.js';

fs.mkdirSync(config.backupsDir, { recursive: true });
const dest = path.join(config.backupsDir, `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.sql`);
const out = fs.createWriteStream(dest);
const child = spawn('pg_dump', ['--no-owner', '--no-privileges', config.databaseUrl], { stdio: ['ignore', 'pipe', 'inherit'] });
child.stdout.pipe(out);
child.on('error', (e) => {
  console.error('pg_dump не запустился (установлены ли утилиты PostgreSQL?):', e.message);
  process.exit(1);
});
child.on('close', (code) => {
  if (code === 0) console.log(`Бэкап: ${dest}`);
  process.exit(code ?? 1);
});
