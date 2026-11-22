/**
 * npm run db:seed — первый администратор из SEED_ADMIN_* (backend/.env).
 * Идемпотентно: если пользователь с таким email уже есть, ничего не делает.
 * Пароль временный — при первом входе портал попросит сменить его.
 */
import { pool, runMigrations } from '../src/db/connection.js';
import { applyChanges } from '../src/db/store.js';
import { findUserRowByEmail } from '../src/db/tables/index.js';
import { hashPassword, normalizeEmail, uid } from '../src/services/authService.js';

await runMigrations();
const email = normalizeEmail(process.env.SEED_ADMIN_EMAIL || 'admin@example.com');
const password = process.env.SEED_ADMIN_PASSWORD || 'admin12345';
if (await findUserRowByEmail(email)) {
  console.log(`Админ ${email} уже есть — пропускаю`);
} else {
  const user = {
    id: uid('u'),
    name: process.env.SEED_ADMIN_NAME || 'Администратор',
    email,
    role: 'admin',
    status: 'active',
    passwordHash: await hashPassword(password),
    mustChangePassword: true,
    createdAt: new Date().toISOString(),
  };
  await applyChanges('users', { upserts: [user] }, user.id);
  console.log(`Создан администратор ${email} (временный пароль из SEED_ADMIN_PASSWORD)`);
}
await pool.end();
