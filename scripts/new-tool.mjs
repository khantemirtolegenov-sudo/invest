/**
 * Генератор нового инструмента: шаблонный код пишет скрипт, модель и человек — только смысл.
 *
 * Инструмент проходит одни и те же точки регистрации: тип сущности, форма снапшота
 * (Database), права клиента и сервера, таблица с миграцией и карточкой витрины, адаптер,
 * модуль сервисного слоя, экран, маршрут, документация. Скрипт вписывает всё по меткам
 * `@gen:*` и создаёт рабочий CRUD-каркас; дальше дописывается предметная логика.
 *
 *   npm run new-tool                         — спросит всё по шагам
 *   npm run new-tool -- --id deals --name "Сделки" --fields "title:text,amount:float,dueDate:date,done:bool" --access admin
 *
 * Доступ: admin — только админ + персональный грант (безопасный вариант по умолчанию);
 *         manager — руководители и админ; all — все сотрудники.
 * Поля: text, int, float, bool, date (YYYY-MM-DD), tstz (ISO-время), jsonb.
 * --dry — показать план без записи. Без терминала (CI, Claude) вопросы не задаются.
 */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';

const ROOT = process.cwd();
const A = 'app/src';
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]);
    return acc;
  }, []),
);
const DRY = Boolean(args.dry);
const rl = process.stdin.isTTY ? readline.createInterface({ input: process.stdin, output: process.stdout }) : null;

async function ask(key, q, def, check = () => true) {
  if (args[key] && args[key] !== true) {
    if (!check(String(args[key]))) fail(`неверное значение --${key}`);
    return String(args[key]);
  }
  if (!rl) {
    if (def && check(def)) return def;
    fail(`не задан --${key} (${q})`);
  }
  for (;;) {
    const v = ((await rl.question(`${q}${def ? ` [${def}]` : ''}: `)).trim() || def || '').trim();
    if (v && check(v)) return v;
    console.log('  — неверное значение, ещё раз');
  }
}
function fail(msg) {
  console.error(`Ничего не записано: ${msg}`);
  process.exit(1);
}

const camel = (s) => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const pascal = (s) => camel(s).replace(/^./, (c) => c.toUpperCase());
const snake = (s) => s.replace(/([A-Z])/g, '_$1').replace(/-/g, '_').toLowerCase();
const sq = (s) => s.replace(/'/g, "''");
const TS = { text: 'string', int: 'number', float: 'number', bool: 'boolean', date: 'string', tstz: 'string', jsonb: 'unknown' };
const SQL = { text: 'TEXT', int: 'INTEGER', float: 'DOUBLE PRECISION', bool: 'BOOLEAN', date: 'DATE', tstz: 'TIMESTAMPTZ', jsonb: 'JSONB' };

const id = await ask('id', 'id инструмента (латиница через дефис, напр. deals)', '', (v) => /^[a-z][a-z0-9-]*$/.test(v));
const name = await ask('name', 'Название (по-русски)', '');
const description = await ask('description', 'Описание карточки', `${name}: список, создание и правка записей.`);
const collection = await ask('collection', 'Имя коллекции (camelCase, мн. число)', `${camel(id)}Items`, (v) => /^[a-z][A-Za-z0-9]*$/.test(v));
const fieldsRaw = await ask('fields', 'Поля имя:тип через запятую', 'title:text,note:text', (v) =>
  v.split(',').every((f) => /^[a-z][A-Za-z0-9]*:(text|int|float|bool|date|tstz|jsonb)$/.test(f.trim())),
);
const access = await ask('access', 'Доступ: admin (админ + грант) / manager / all', 'admin', (v) => ['admin', 'manager', 'all'].includes(v));
const icon = await ask('icon', 'Иконка Material Symbols (fonts.google.com/icons)', 'widgets');
rl?.close();

const fields = fieldsRaw.split(',').map((f) => {
  const [n, t] = f.trim().split(':');
  return { name: n, type: t, col: snake(n) };
});
if (!fields.some((f) => f.name === 'title')) fields.unshift({ name: 'title', type: 'text', col: 'title' });
const toolId = `tool-${id}`;
const Entity = pascal(collection).replace(/s$/, '') || 'Item';
const table = snake(collection);
const apiName = `${camel(id)}Api`;
const Page = `${pascal(id)}Page`;
const route = `/tools/${id}`;
const migNo = String(
  Math.max(0, ...fs.readdirSync(path.join(ROOT, 'backend/migrations')).map((f) => parseInt(f, 10)).filter(Number.isFinite)) + 1,
).padStart(3, '0');
const today = new Date().toLocaleDateString('ru-RU');
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const readFile = (p) => (exists(p) ? fs.readFileSync(path.join(ROOT, p), 'utf8') : null);

// ---------------------------------------------------------------- план правок
const edits = [];
const before = (file, marker, text) => edits.push({ file, mode: 'before', marker, text });
const create = (file, text) => edits.push({ file, mode: 'create', text });
const append = (file, text) => edits.push({ file, mode: 'append', text });
const replace = (file, from, to) => edits.push({ file, mode: 'replace', from, to });

append(
  `${A}/types/index.ts`,
  `
/** ${name} (инструмент ${toolId}, генератор ${today}) */
export interface ${Entity} {
  id: string;
${fields.map((f) => `  ${f.name}${f.name === 'title' ? '' : '?'}: ${TS[f.type]};`).join('\n')}
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
}
`,
);
replace(`${A}/api/seedDb.ts`, "} from '../types';", `  ${Entity},\n} from '../types';`);
before(`${A}/api/seedDb.ts`, '  // @gen:database-field', `  /** ${name} */\n  ${collection}: ${Entity}[];\n`);
before(`${A}/api/seedDb.ts`, '      // @gen:database-check', `      Array.isArray(db.${collection}) &&\n`);
before(`${A}/api/seedDb.ts`, '    // @gen:database-empty', `    ${collection}: [],\n`);

const rw = access === 'all' ? "'any'" : access === 'manager' ? "'manager'" : "'admin'";
before('backend/src/db/collections.js', '  // @gen:collections', `  // ${name} (${toolId})${access === 'admin' ? ' — круг инструмента: TOOL_GATED_COLLECTIONS' : ''}\n  ${collection}: { kind: 'array', read: ${rw}, write: ${rw} },\n`);
if (access === 'admin') {
  before('backend/src/db/collections.js', '  // @gen:tool-gated', `  ${collection}: '${toolId}',\n`);
  for (const f of ['backend/src/db/collections.js', `${A}/utils/permissions.ts`]) replace(f, '/* @gen:admin-only */', `'${toolId}', /* @gen:admin-only */`);
}

create(
  `backend/migrations/${migNo}_${table}.sql`,
  `-- ${name} (${toolId}): таблица коллекции ${collection} и карточка в витрине.
-- Генератор scripts/new-tool.mjs, ${today}. Поля без своей колонки едут в extra.
CREATE TABLE IF NOT EXISTS ${table} (
  id               TEXT PRIMARY KEY,
${fields.map((f) => `  ${f.col.padEnd(16)} ${SQL[f.type]},`).join('\n')}
  created_at       TEXT,
  created_by       TEXT,
  extra            JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at       TEXT,
  updated_by       TEXT
);

INSERT INTO tools (id, name, description, icon, path)
VALUES ('${toolId}', '${sq(name)}', '${sq(description)}', '${icon}', '${route}')
ON CONFLICT (id) DO NOTHING;
`,
);
before(
  'backend/src/db/tables/simple.js',
  '// @gen:simple-tables',
  `/** ${name} (${toolId}) — генератор ${today} */\nexport const ${collection}Table = flatTable('${collection}', '${table}', [\n${fields
    .map((f) => `  ['${f.name}', '${f.col}', '${f.type}'],`)
    .join('\n')}\n  ['createdAt', 'created_at', 'text'],\n  ['createdBy', 'created_by', 'text'],\n]);\n\n`,
);
before('backend/src/db/tables/simple.js', '  // @gen:simple-tables-list', `  ${collection}Table,\n`);

const rule = access === 'all' ? '() => true' : access === 'manager' ? '(u) => hasManagerRights(u)' : '() => false';
before(`${A}/utils/permissions.ts`, '  // @gen:tool-rules', `  // ${name}${access === 'admin' ? ' — админ + грант (ADMIN_ONLY_TOOLS)' : ''}\n  '${toolId}': ${rule},\n`);

create(
  `${A}/api/modules/${camel(id)}.ts`,
  `/**
 * «${name}» (${toolId}) — сервисный слой. Каркас CRUD создан генератором ${today}:
 * delay → проверки → mutate() → копия наружу. Предметную логику дописывать здесь.
 */
import type { ${Entity}, User } from '../../types';
import { canAccessTool } from '../../utils/permissions';
import { loadDb, mutate, uid } from '../db';
import { ApiError, copy, delay } from './core';

export type ${Entity}Input = Omit<${Entity}, 'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'>;

const guard = (user: User) => {
  if (!canAccessTool(user, '${toolId}')) throw new ApiError('Нет доступа к инструменту «${name}»');
};

export const ${apiName} = {
  async list(user: User): Promise<${Entity}[]> {
    await delay();
    guard(user);
    return copy([...loadDb().${collection}].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  },

  async create(user: User, input: ${Entity}Input): Promise<${Entity}> {
    await delay();
    guard(user);
    if (!input.title?.trim()) throw new ApiError('Укажите название');
    const item: ${Entity} = { ...input, title: input.title.trim(), id: uid('${id.slice(0, 3)}'), createdAt: new Date().toISOString(), createdBy: user.id };
    mutate((db) => {
      db.${collection}.unshift(item);
    });
    return copy(item);
  },

  async update(user: User, id: string, input: Partial<${Entity}Input>): Promise<${Entity}> {
    await delay();
    guard(user);
    if (!loadDb().${collection}.some((x) => x.id === id)) throw new ApiError('Запись не найдена');
    if (input.title !== undefined && !input.title.trim()) throw new ApiError('Укажите название');
    const saved = mutate((db) => {
      const t = db.${collection}.find((x) => x.id === id)!;
      return Object.assign(t, input, { updatedAt: new Date().toISOString(), updatedBy: user.id });
    });
    return copy(saved);
  },

  async remove(user: User, id: string): Promise<void> {
    await delay();
    guard(user);
    if (!loadDb().${collection}.some((x) => x.id === id)) throw new ApiError('Запись не найдена');
    mutate((db) => {
      db.${collection} = db.${collection}.filter((x) => x.id !== id);
    });
  },
};
`,
);
append(`${A}/api/index.ts`, `export * from './modules/${camel(id)}';\n`);

create(
  `${A}/pages/tools/${id}/${Page}.tsx`,
  `/**
 * «${name}» (${toolId}) — экран. Каркас создан генератором ${today}: список, добавление,
 * удаление, три состояния (загрузка / ошибка / пусто). Предметный интерфейс — здесь.
 */
import { useState } from 'react';
import { ${apiName} } from '../../../api';
import { Page } from '../../../components/layout/AppLayout';
import { Button } from '../../../components/ui/Button';
import { TextInput } from '../../../components/ui/Form';
import { CardSkeleton, EmptyState, ErrorState } from '../../../components/ui/States';
import { useAsync } from '../../../hooks/useAsync';
import { useAuth } from '../../../store/auth';
import { toast } from '../../../store/toast';

export function ${Page}() {
  const user = useAuth((s) => s.user)!;
  const { data, loading, error, reload } = useAsync(() => ${apiName}.list(user), [user.id]);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  const add = async () => {
    setBusy(true);
    try {
      await ${apiName}.create(user, { title });
      setTitle('');
      toast.success('Добавлено');
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await ${apiName}.remove(user, id);
      toast.success('Удалено');
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Page title="${name.replace(/"/g, '&quot;')}" subtitle="${description.replace(/"/g, '&quot;')}">
      <form
        className="glass-card p-card-padding flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Название" />
        <Button type="submit" icon="add" loading={busy} disabled={!title.trim()}>
          Добавить
        </Button>
      </form>
      {loading ? (
        <CardSkeleton count={3} />
      ) : error ? (
        <ErrorState text={error} onRetry={reload} />
      ) : !data?.length ? (
        <EmptyState icon="${icon}" title="Пока пусто" text="Добавьте первую запись." />
      ) : (
        <div className="space-y-2">
          {data.map((x) => (
            <div key={x.id} className="glass-card p-card-padding flex items-center justify-between gap-3">
              <span className="text-body-sm text-on-surface">{x.title}</span>
              <Button variant="ghost" size="sm" icon="delete" onClick={() => remove(x.id)}>
                Удалить
              </Button>
            </div>
          ))}
        </div>
      )}
    </Page>
  );
}
`,
);
before(`${A}/App.tsx`, '// @gen:lazy-pages', `const ${Page} = lazy(() => named(import('./pages/tools/${id}/${Page}'), '${Page}'));\n`);
before(
  `${A}/App.tsx`,
  '              {/* @gen:routes */}',
  `              <Route\n                path="${route}"\n                element={\n                  <RequireTool tool="${toolId}">\n                    <${Page} />\n                  </RequireTool>\n                }\n              />\n`,
);
create(
  `docs/tools/${id}.md`,
  `# ${name}\n\n> Инструмент \`${toolId}\`, маршрут \`${route}\`, коллекция \`${collection}\` (таблица \`${table}\`). Заведён генератором ${today}.\n\n## Зачем\n\n_(для кого, какую задачу закрывает, решение владельца с датой)_\n\n## Устройство\n\n- Доступ: ${access === 'admin' ? 'админ + персональный грант (ADMIN_ONLY_TOOLS, TOOL_GATED_COLLECTIONS)' : access === 'manager' ? 'руководители и админ' : 'все сотрудники'}.\n- Сервисный слой: \`app/src/api/modules/${camel(id)}.ts\`; экран: \`app/src/pages/tools/${id}/${Page}.tsx\`.\n\n## Проверено / не проверено\n\n_(заполнить при сдаче)_\n`,
);
before('CLAUDE.md', '<!-- @gen:docs-index -->', `| [${id}.md](docs/tools/${id}.md) | ${name} |\n`);

// ---------------------------------------------------------------- применение
const problems = [];
if (readFile(`${A}/types/index.ts`)?.includes(`export interface ${Entity} `)) problems.push(`тип ${Entity} уже существует`);
if (new RegExp(`\\n  ${collection}:`).test(readFile('backend/src/db/collections.js') ?? '')) problems.push(`коллекция ${collection} уже существует`);
const pending = new Map();
const cur = (f) => (pending.has(f) ? pending.get(f) : readFile(f));
for (const e of edits) {
  if (e.mode === 'create') {
    if (exists(e.file)) problems.push(`файл уже есть: ${e.file}`);
    pending.set(e.file, e.text);
    continue;
  }
  const s = cur(e.file);
  if (s === null) {
    problems.push(`нет файла: ${e.file}`);
    continue;
  }
  if (e.mode === 'append') pending.set(e.file, s + e.text);
  else if (e.mode === 'replace') {
    if (!s.includes(e.from)) problems.push(`нет фрагмента «${e.from}» в ${e.file}`);
    else pending.set(e.file, s.replace(e.from, e.to));
  } else if (!s.includes(e.marker)) problems.push(`нет метки «${e.marker.trim()}» в ${e.file}`);
  else pending.set(e.file, s.replace(e.marker, e.text + e.marker));
}
if (problems.length) fail('\n - ' + problems.join('\n - '));

console.log(`${DRY ? 'Будет изменено' : 'Изменено'}: ${toolId} (коллекция ${collection}, таблица ${table}, миграция ${migNo})`);
for (const [f, s] of pending) {
  console.log(`  ${exists(f) ? '~' : '+'} ${f}`);
  if (!DRY) {
    fs.mkdirSync(path.dirname(path.join(ROOT, f)), { recursive: true });
    fs.writeFileSync(path.join(ROOT, f), s);
  }
}
if (!DRY)
  console.log(`
Дальше:
  1. npm run typecheck   — сторож прав и типы
  2. npm run dev         — миграция применится при старте; инструмент: ${route}
  3. Предметная логика — app/src/api/modules/${camel(id)}.ts и экран; особые правила записи — checkWrite (collections.js)
  4. Заполнить docs/tools/${id}.md`);
