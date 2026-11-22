/**
 * Мастер первого запуска: превращает шаблон в конкретный проект.
 *
 *   npm run setup                 — спросит всё по шагам
 *   npm run setup -- --yes --name "Портал склада" --modules telegram,files --admin-email me@corp.kz
 *
 * Что делает:
 *  1. название проекта → в интерфейс, README, CLAUDE.md, package.json;
 *  2. модули — оставить или вырезать (код между метками @module:<имя>:start/end и файлы модуля);
 *     метки убираются в любом случае, код остаётся чистым;
 *  3. backend/.env — база, секрет JWT (случайный), первый администратор;
 *  4. стартовые инструменты — по одному, через генератор (npm run new-tool);
 *  5. .setup.json — что выбрано (повторный запуск не нужен: модули уже вырезаны).
 * Вопросы те же, что Claude задаёт на первом разговоре (см. CLAUDE.md → «Первый запуск»).
 */
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';

const ROOT = process.cwd();
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]);
    return acc;
  }, []),
);
if (fs.existsSync(path.join(ROOT, '.setup.json')) && !args.force) {
  console.log('Проект уже настроен (.setup.json). Новые инструменты: npm run new-tool');
  process.exit(0);
}
const YES = Boolean(args.yes) || !process.stdin.isTTY;
const rl = YES ? null : readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = async (key, q, def = '') => {
  if (args[key] && args[key] !== true) return String(args[key]);
  if (!rl) return def;
  return ((await rl.question(`${q}${def ? ` [${def}]` : ''}: `)).trim() || def).trim();
};
const yesNo = async (key, q, def) => {
  const v = (await ask(key, `${q} (да/нет)`, def ? 'да' : 'нет')).toLowerCase();
  return ['да', 'д', 'yes', 'y', 'true', '1'].includes(v);
};

const MODULES = {
  registration: {
    q: 'Самостоятельная регистрация сотрудников (заявка → подтверждение админом)?',
    def: true,
    files: [],
  },
  telegram: {
    q: 'Уведомления в Telegram-бот (нужен токен от @BotFather)?',
    def: true,
    files: ['backend/src/services/telegram.js', 'backend/src/routes/telegram.js', 'backend/migrations/002_telegram.sql', 'app/src/api/modules/telegram.ts'],
  },
  files: {
    q: 'Загрузка файлов (вложения к записям)?',
    def: true,
    files: ['backend/src/routes/files.js', 'backend/migrations/003_files.sql', 'app/src/api/modules/files.ts'],
  },
  docker: {
    q: 'Выкладка в Docker (Dockerfile + docker-compose)?',
    def: true,
    files: ['Dockerfile', 'docker-compose.yml', '.dockerignore', '.env.docker.example'],
  },
  ci: {
    q: 'Автопроверка на каждый пуш (GitHub Actions)?',
    def: true,
    files: ['.github/workflows/ci.yml'],
  },
};

console.log('\nНастройка нового проекта из шаблона. Enter — значение в скобках.\n');
const name = await ask('name', 'Название проекта (как в интерфейсе)', 'Портал');
const slug = (await ask('slug', 'Короткое имя латиницей (папки, пакеты, база)', 'portal')).replace(/[^a-z0-9-]/gi, '-').toLowerCase();
const purpose = await ask('purpose', 'Для чего портал — одной фразой (попадёт в CLAUDE.md)', 'Внутренний портал компании');

const chosen = {};
const listed = typeof args.modules === 'string' ? args.modules.split(',').map((s) => s.trim()) : null;
for (const [key, m] of Object.entries(MODULES)) chosen[key] = listed ? listed.includes(key) : await yesNo(`module-${key}`, m.q, m.def);

const dbUrl = await ask('db', 'Строка подключения к PostgreSQL', `postgresql://postgres:postgres@localhost:5432/${slug.replace(/-/g, '_')}_dev`);
const adminEmail = await ask('admin-email', 'Email первого администратора', 'admin@example.com');
const adminPassword = await ask('admin-password', 'Временный пароль администратора (сменит при входе)', crypto.randomBytes(6).toString('base64url'));
const adminName = await ask('admin-name', 'Имя администратора', 'Администратор');

// ---------------------------------------------------------------- модули
const MARK = /(@module:([a-z]+):(start|end))/;
function stripModules(file) {
  const src = fs.readFileSync(file, 'utf8');
  if (!src.includes('@module:')) return;
  const out = [];
  const skipping = [];
  for (const line of src.split('\n')) {
    const m = MARK.exec(line);
    if (m) {
      const [, , mod, edge] = m;
      if (edge === 'start' && !chosen[mod]) skipping.push(mod);
      if (edge === 'end' && skipping.at(-1) === mod) skipping.pop();
      continue; // строка-метка уходит всегда
    }
    if (!skipping.length) out.push(line);
  }
  // вырезанный блок не должен оставлять «дыр» из пустых строк
  fs.writeFileSync(file, out.join('\n').replace(/\n{3,}/g, '\n\n'));
}
const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (['node_modules', '.git', 'dist'].includes(e.name)) return [];
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
for (const [key, m] of Object.entries(MODULES)) if (!chosen[key]) for (const f of m.files) fs.rmSync(path.join(ROOT, f), { force: true, recursive: true });
for (const f of walk(ROOT)) if (/\.(js|mjs|ts|tsx|json|md|yml|example|sql|css|html)$|\.env/.test(f) && !f.endsWith('setup.mjs')) stripModules(f);
if (!chosen.files) {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'backend/package.json'), 'utf8'));
  delete pkg.dependencies.multer;
  fs.writeFileSync(path.join(ROOT, 'backend/package.json'), JSON.stringify(pkg, null, 2) + '\n');
}

// ---------------------------------------------------------------- имя проекта
for (const f of ['app/index.html', 'app/src/components/layout/AppLayout.tsx', 'README.md', 'CLAUDE.md', 'PLAYBOOK.md']) {
  const p = path.join(ROOT, f);
  if (fs.existsSync(p)) fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replaceAll('{{PROJECT_NAME}}', name).replaceAll('{{PROJECT_PURPOSE}}', purpose));
}
for (const [f, n] of [['package.json', slug], ['backend/package.json', `${slug}-backend`], ['app/package.json', `${slug}-app`]]) {
  const p = path.join(ROOT, f);
  const pkg = JSON.parse(fs.readFileSync(p, 'utf8'));
  pkg.name = n;
  fs.writeFileSync(p, JSON.stringify(pkg, null, 2) + '\n');
}

// ---------------------------------------------------------------- окружение
const env = [
  `DATABASE_URL=${dbUrl}`,
  `JWT_SECRET=${crypto.randomBytes(32).toString('hex')}`,
  'PORT=5185',
  'CORS_ORIGIN=http://localhost:5184',
  `SEED_ADMIN_EMAIL=${adminEmail}`,
  `SEED_ADMIN_PASSWORD=${adminPassword}`,
  `SEED_ADMIN_NAME=${adminName}`,
  ...(chosen.telegram ? ['TELEGRAM_BOT_TOKEN=', 'TELEGRAM_BOT_USERNAME='] : []),
  '',
].join('\n');
fs.writeFileSync(path.join(ROOT, 'backend/.env'), env);

fs.writeFileSync(
  path.join(ROOT, '.setup.json'),
  JSON.stringify({ name, slug, purpose, modules: chosen, at: new Date().toISOString() }, null, 2) + '\n',
);

// ---------------------------------------------------------------- стартовые инструменты
const tools = [];
if (typeof args.tools === 'string') {
  // --tools "id|Название|поля|доступ;id2|…"
  for (const t of args.tools.split(';').filter(Boolean)) {
    const [id, title, fields, access] = t.split('|');
    tools.push({ id, title, fields: fields || 'title:text,note:text', access: access || 'admin' });
  }
} else if (rl) {
  console.log('\nИнструменты — разделы портала со своими данными (заявки, реестр, учёт…).');
  while (await yesNo('_', 'Добавить инструмент сейчас?', tools.length === 0)) {
    const id = await ask('_', '  id латиницей (напр. requests)');
    const title = await ask('_', '  Название');
    const fields = await ask('_', '  Поля имя:тип через запятую (text,int,float,bool,date,tstz,jsonb)', 'title:text,note:text');
    const access = await ask('_', '  Доступ: admin (админ + грант) / manager / all', 'admin');
    if (id && title) tools.push({ id, title, fields, access });
  }
}
rl?.close();
for (const t of tools) {
  execFileSync(process.execPath, ['scripts/new-tool.mjs', '--id', t.id, '--name', t.title, '--fields', t.fields, '--access', t.access], {
    stdio: ['ignore', 'inherit', 'inherit'],
  });
}

console.log(`
Готово: «${name}».
Модули: ${Object.entries(chosen).map(([k, v]) => `${k} ${v ? '✓' : '✗'}`).join(', ')}
Администратор: ${adminEmail} / ${adminPassword} (временный — смените при входе)

Дальше:
  npm run install:all     — зависимости
  npm run db:seed         — создать администратора (база из DATABASE_URL должна существовать)
  npm run dev             — портал на http://localhost:5184
  npm run new-tool        — новый инструмент в любой момент
`);
