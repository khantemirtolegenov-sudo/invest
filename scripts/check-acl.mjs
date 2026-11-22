/**
 * Сторож прав (входит в typecheck и build, а значит и в CI).
 *
 * Ловит класс ошибок «интерфейс разрешает — сервер отклоняет» (и наоборот) ДО выкладки:
 *  1. коллекции сервера (collections.js → COLLECTIONS) и фронтенда (seedDb.ts → Database) совпадают;
 *  2. ownerField каждой коллекции реально есть в типе её сущности (types/index.ts);
 *  3. списки ADMIN_ONLY_TOOLS на клиенте и сервере одинаковые;
 *  4. у каждой коллекции есть адаптер таблицы (simple.js → flatTable) — иначе сервер упадёт на старте.
 * Урок проекта-прародителя: неверное имя поля владельца три месяца тихо теряло ответы сотрудников.
 */
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const server = read('backend/src/db/collections.js');
const tables = read('backend/src/db/tables/simple.js');
const seedDb = read('app/src/api/seedDb.ts');
const types = read('app/src/types/index.ts');
const perms = read('app/src/utils/permissions.ts');
const errors = [];

const block = (src, start) => {
  const i = src.indexOf(start);
  if (i < 0) return '';
  let depth = 0;
  for (let j = src.indexOf('{', i); j < src.length; j++) {
    if (src[j] === '{') depth++;
    if (src[j] === '}' && --depth === 0) return src.slice(i, j + 1);
  }
  return '';
};

// 1. коллекции
const serverBlock = block(server, 'export const COLLECTIONS');
const serverCols = new Map([...serverBlock.matchAll(/^\s{2}(\w+):\s*\{([^}]*)\}/gm)].map((m) => [m[1], m[2]]));
const dbBlock = block(seedDb, 'export interface Database');
const clientCols = new Map([...dbBlock.matchAll(/^\s{2}(\w+):\s*([\w<>[\]]+);/gm)].map((m) => [m[1], m[2]]));
for (const c of serverCols.keys()) if (!clientCols.has(c)) errors.push(`коллекция «${c}» есть на сервере, но нет в Database (seedDb.ts)`);
for (const c of clientCols.keys()) if (!serverCols.has(c)) errors.push(`коллекция «${c}» есть в Database, но нет в COLLECTIONS (collections.js)`);

// 2. ownerField
for (const [c, def] of serverCols) {
  const owner = /ownerField:\s*'(\w+)'/.exec(def)?.[1];
  if (!owner) continue;
  const entity = /^(\w+)\[\]$/.exec(clientCols.get(c) ?? '')?.[1];
  const iface = entity && block(types, `export interface ${entity} `);
  if (!iface) errors.push(`не найден тип сущности коллекции «${c}»`);
  else if (!new RegExp(`\\n\\s+${owner}\\??:`).test(iface)) errors.push(`ownerField «${owner}» коллекции «${c}» отсутствует в типе ${entity}`);
}

// 3. ADMIN_ONLY_TOOLS
const listOf = (src) => {
  const m = /ADMIN_ONLY_TOOLS\s*(?::[^=]*)?=\s*\[([^\]]*)\]/.exec(src);
  return m ? [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]).sort() : null;
};
const a = listOf(perms);
const b = listOf(server);
if (!a || !b) errors.push('ADMIN_ONLY_TOOLS не найден в permissions.ts или collections.js');
else if (a.join('|') !== b.join('|')) errors.push(`ADMIN_ONLY_TOOLS разошёлся: интерфейс [${a}], сервер [${b}]`);

// 4. адаптеры
const adapters = new Set([...tables.matchAll(/flatTable\('(\w+)'/g)].map((m) => m[1]));
for (const c of serverCols.keys()) if (!adapters.has(c)) errors.push(`у коллекции «${c}» нет адаптера таблицы (backend/src/db/tables/simple.js)`);

if (errors.length) {
  console.error('✗ Сторож прав:\n - ' + errors.join('\n - '));
  process.exit(1);
}
console.log(`✓ Права и коллекции согласованы (${serverCols.size} коллекций)`);
