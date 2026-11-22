/**
 * JWT-аутентификация. Роль и статус берутся из актуальной записи в БД, а не из токена:
 * смена роли или блокировка действует сразу.
 */
import { findUserById, sanitizeUser, verifyToken } from '../services/authService.js';
import { ApiError } from './errors.js';

export async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return next(new ApiError('Требуется авторизация', 401));
    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      return next(new ApiError('Сессия истекла — войдите заново', 401));
    }
    const user = await findUserById(payload.sub);
    if (!user) return next(new ApiError('Пользователь не найден', 401));
    if (user.status !== 'active') return next(new ApiError('Аккаунт не активен', 403));
    req.user = sanitizeUser(user);
    next();
  } catch (e) {
    next(e);
  }
}

export const requireAdmin = (req, _res, next) =>
  req.user?.role === 'admin' ? next() : next(new ApiError('Только для администратора', 403));
