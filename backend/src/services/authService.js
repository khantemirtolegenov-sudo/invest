/**
 * Вход, регистрация, смена пароля, создание пользователей админом, выпуск JWT.
 * Хеш пароля (bcrypt) никогда не покидает backend: стрип в снапшоте и здесь.
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { applyChanges, applyChangesBatch, getEntity, readCollection } from '../db/store.js';
import { findUserRowByEmail } from '../db/tables/index.js';
import { ApiError } from '../middleware/errors.js';
import { enqueue } from './telegram.js';

export const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
export const normalizeEmail = (raw) => String(raw ?? '').trim().toLowerCase();
export const hashPassword = (password) => bcrypt.hash(password, 10);

export function sanitizeUser(u) {
  if (!u) return null;
  const { passwordHash, ...rest } = u;
  void passwordHash;
  return rest;
}

export const issueToken = (user) => jwt.sign({ sub: user.id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
export const verifyToken = (token) => jwt.verify(token, config.jwtSecret);
export const findUserById = (id) => getEntity('users', id);

// Проверка пароля идёт всегда — по времени ответа нельзя понять, есть ли такой email
const DUMMY_HASH = await hashPassword(`no-such-user::${Math.random()}`);

export async function login(email, password) {
  const user = await findUserRowByEmail(normalizeEmail(email));
  const passOk = await bcrypt.compare(String(password ?? ''), user?.passwordHash ?? DUMMY_HASH).catch(() => false);
  if (!user || !passOk) throw new ApiError('Неверный email или пароль', 401);
  if (user.status === 'blocked') throw new ApiError('Аккаунт заблокирован. Обратитесь к администратору.', 403);
  if (user.status === 'pending') throw new ApiError('Аккаунт ожидает подтверждения администратором.', 403);
  const next = { ...user, lastLoginAt: new Date().toISOString() };
  await applyChanges('users', { upserts: [next] }, user.id);
  return { user: sanitizeUser(next), token: issueToken(next) };
}

export async function changePassword(userId, currentPassword, newPassword) {
  if (String(newPassword ?? '').length < 8) throw new ApiError('Новый пароль — не короче 8 символов');
  const user = await findUserById(userId);
  if (!user) throw new ApiError('Пользователь не найден', 404);
  if (!(await bcrypt.compare(String(currentPassword ?? ''), user.passwordHash ?? ''))) {
    throw new ApiError('Текущий пароль указан неверно');
  }
  const next = { ...user, passwordHash: await hashPassword(newPassword), mustChangePassword: false };
  await applyChanges('users', { upserts: [next] }, userId);
  return sanitizeUser(next);
}

function validateNew({ name, email, password }) {
  if (!String(name ?? '').trim()) throw new ApiError('Укажите имя');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizeEmail(email))) throw new ApiError('Некорректный email');
  if (String(password ?? '').length < 8) throw new ApiError('Пароль — не короче 8 символов');
}

/** Админ заводит сотрудника с временным паролем: при первом входе тот сменит пароль */
export async function createUserByAdmin(admin, input) {
  validateNew(input);
  const email = normalizeEmail(input.email);
  if (await findUserRowByEmail(email)) throw new ApiError('Пользователь с таким email уже есть', 409);
  const role = ['employee', 'manager', 'admin'].includes(input.role) ? input.role : 'employee';
  const user = {
    id: uid('u'),
    name: String(input.name).trim(),
    email,
    role,
    status: 'active',
    department: String(input.department ?? '').trim() || undefined,
    position: String(input.position ?? '').trim() || undefined,
    passwordHash: await hashPassword(input.password),
    mustChangePassword: true,
    createdAt: new Date().toISOString(),
  };
  await applyChanges('users', { upserts: [user] }, admin.id);
  return sanitizeUser(user);
}

/** Админ задаёт новый временный пароль сотруднику */
export async function resetPasswordByAdmin(admin, userId, password) {
  if (String(password ?? '').length < 8) throw new ApiError('Пароль — не короче 8 символов');
  const user = await findUserById(userId);
  if (!user) throw new ApiError('Пользователь не найден', 404);
  await applyChanges('users', { upserts: [{ ...user, passwordHash: await hashPassword(password), mustChangePassword: true }] }, admin.id);
}

/** Самостоятельная регистрация: аккаунт «ожидает подтверждения», админам — уведомление */
export async function register(input) {
  validateNew(input);
  const email = normalizeEmail(input.email);
  if (await findUserRowByEmail(email)) throw new ApiError('Пользователь с таким email уже есть', 409);
  const user = {
    id: uid('u'),
    name: String(input.name).trim(),
    email,
    role: 'employee',
    status: 'pending',
    department: String(input.department ?? '').trim() || undefined,
    position: String(input.position ?? '').trim() || undefined,
    passwordHash: await hashPassword(input.password),
    createdAt: new Date().toISOString(),
  };
  const admins = (await readCollection('users')).filter((u) => u.role === 'admin' && u.status === 'active');
  const notifications = admins.map((a) => ({
    id: uid('n'),
    userId: a.id,
    title: 'Новая регистрация',
    text: `${user.name} (${email}) ожидает подтверждения`,
    icon: 'person_add',
    link: '/users',
    read: false,
    createdAt: new Date().toISOString(),
  }));
  await applyChangesBatch({ users: { upserts: [user] }, notifications: { upserts: notifications } }, user.id, async (client) => {
    void client;
    await enqueue(client, notifications);
  });
  return sanitizeUser(user);
}
