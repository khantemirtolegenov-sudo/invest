/**
 * Единый формат ответов API. Успех: { ok: true, data }. Ошибка: { ok: false, error } + статус.
 * ApiError — осознанный текст для пользователя (по-русски), он показывается как есть.
 */
export class ApiError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const ok = (res, data) => res.json({ ok: true, data });

export function notFoundHandler(req, res) {
  res.status(404).json({ ok: false, error: `Не найдено: ${req.method} ${req.path}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err instanceof ApiError ? err.status : err.status || 500;
  if (status >= 500) console.error(`[error] ${req.method} ${req.path}:`, err);
  const message = err instanceof ApiError ? err.message : status >= 500 ? 'Внутренняя ошибка сервера' : err.message;
  res.status(status).json({ ok: false, error: message });
}
