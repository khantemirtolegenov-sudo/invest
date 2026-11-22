/**
 * Вход и учётные записи:
 *   POST /api/auth/login {email, password} → {user, token}
 *   GET  /api/auth/me                       → текущий пользователь (восстановление сессии)
 *   POST /api/auth/change-password {currentPassword, newPassword}
 *   POST /api/auth/register                 → заявка на регистрацию (модуль registration)
 *   POST /api/auth/users                    → админ заводит сотрудника с временным паролем
 *   POST /api/auth/users/:id/password       → админ задаёт новый временный пароль
 * Пароли — только через эти маршруты: в синке коллекции users хеш не принимается.
 */
import { Router } from 'express';
import { ApiError, asyncHandler, ok } from '../middleware/errors.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import {
  changePassword,
  createUserByAdmin,
  login,
  // @module:registration:start
  register,
  // @module:registration:end
  resetPasswordByAdmin,
} from '../services/authService.js';

export const authRouter = Router();

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') throw new ApiError('Укажите email и пароль');
    ok(res, await login(email, password));
  }),
);

authRouter.get('/me', requireAuth, (req, res) => ok(res, req.user));

authRouter.post(
  '/change-password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body ?? {};
    ok(res, await changePassword(req.user.id, currentPassword, newPassword));
  }),
);

// @module:registration:start
authRouter.post(
  '/register',
  asyncHandler(async (req, res) => ok(res, await register(req.body ?? {}))),
);
// @module:registration:end

authRouter.post(
  '/users',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => ok(res, await createUserByAdmin(req.user, req.body ?? {}))),
);

authRouter.post(
  '/users/:id/password',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    await resetPasswordByAdmin(req.user, req.params.id, req.body?.password);
    ok(res, { done: true });
  }),
);
