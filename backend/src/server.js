/**
 * Backend — точка входа. Express + PostgreSQL.
 * API: /api/health, /api/auth, /api/db (снапшот + синк), модули: /api/files, /api/telegram.
 * В production отдаёт и собранный фронтенд (STATIC_DIR) — один процесс, один порт.
 * Миграции применяются при старте; без них сервер не поднимается.
 */
import fs from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { pool, runMigrations, safeDbTarget } from './db/connection.js';
import { requireAuth } from './middleware/auth.js';
import { ApiError, errorHandler, notFoundHandler, ok } from './middleware/errors.js';
import { rateLimit, securityHeaders } from './middleware/security.js';
import { authRouter } from './routes/auth.js';
import { dbRouter } from './routes/db.js';
import { filesRouter } from './routes/files.js';
import { telegramRouter } from './routes/telegram.js';
import { startTelegram, stopTelegram } from './services/telegram.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', config.trustProxy);
app.use(securityHeaders);
app.use(
  cors({
    origin(origin, cb) {
      if (!origin || config.corsOrigins.includes(origin)) return cb(null, true);
      // в разработке — любой порт localhost: два проекта на одной машине не мешают друг другу
      if (config.env !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return cb(null, true);
      cb(new ApiError(`CORS: источник ${origin} не разрешён`, 403));
    },
    exposedHeaders: ['X-Db-Revision'],
  }),
);

app.get('/api/health', async (_req, res, next) => {
  try {
    await pool.query('SELECT 1');
    ok(res, { status: 'up', env: config.env, database: safeDbTarget() });
  } catch (e) {
    next(e);
  }
});

// /api/db — авторизация ДО разбора тела: аноним не заставит сервер парсить мегабайты
app.use('/api/db', requireAuth, express.json({ limit: config.jsonLimitDb }), dbRouter);
app.use(express.json({ limit: config.jsonLimitDefault }));
app.use('/api/auth', rateLimit({ windowMs: 60_000, max: 30 }), authRouter);
app.use('/api/files', requireAuth, rateLimit({ windowMs: 60_000, max: 120 }), filesRouter);
app.use('/api/telegram', requireAuth, telegramRouter);

if (config.staticDir && fs.existsSync(config.staticDir)) {
  app.use(express.static(config.staticDir));
  // Известные маршруты SPA → 200, остальное → та же оболочка со статусом 404 (её покажет NotFoundPage).
  // Новый раздел верхнего уровня — добавить сюда; инструменты /tools/<id> покрыты шаблоном.
  const KNOWN = /^\/(?:|notifications|profile|users|tools\/[\w-]+)\/?$/;
  app.get(/^(?!\/api\/).*/, (req, res) =>
    res.status(KNOWN.test(req.path) ? 200 : 404).sendFile(path.join(config.staticDir, 'index.html')),
  );
}

app.use('/api', notFoundHandler);
app.use(errorHandler);

runMigrations()
  .then(() => {
    const server = app.listen(config.port, () => {
      console.log(`[server] http://localhost:${config.port} (env=${config.env}), БД: ${safeDbTarget()}`);
    });
    startTelegram();
    const shutdown = () => {
      stopTelegram();
      server.close(() => pool.end().finally(() => process.exit(0)));
      setTimeout(() => process.exit(1), 10_000).unref();
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  })
  .catch((e) => {
    console.error('[server] не удалось запустить (миграции/БД):', e.message);
    process.exit(1);
  });
