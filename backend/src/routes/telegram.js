/**
 * Модуль telegram (только вошедшим):
 *   GET    /api/telegram/status → {enabled, linked}
 *   POST   /api/telegram/link   → {url} одноразовая ссылка привязки на 30 минут
 *   DELETE /api/telegram/link   → отвязать чат
 */
import { Router } from 'express';
import { ApiError, asyncHandler, ok } from '../middleware/errors.js';
import { linkStatus, linkUrl, telegramEnabled, unlink } from '../services/telegram.js';

export const telegramRouter = Router();

telegramRouter.get('/status', asyncHandler(async (req, res) => ok(res, await linkStatus(req.user.id))));

telegramRouter.post(
  '/link',
  asyncHandler(async (req, res) => {
    if (!telegramEnabled()) throw new ApiError('Telegram-бот не настроен (TELEGRAM_BOT_TOKEN)', 503);
    ok(res, { url: await linkUrl(req.user.id) });
  }),
);

telegramRouter.delete(
  '/link',
  asyncHandler(async (req, res) => {
    await unlink(req.user.id);
    ok(res, { done: true });
  }),
);
