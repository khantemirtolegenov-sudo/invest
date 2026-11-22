/**
 * Конфигурация backend из переменных окружения (backend/.env, в Docker — environment).
 * Все секреты — только здесь и только из окружения; в код и в git они не попадают.
 */
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = process.env.NODE_ENV || 'development';

export const config = {
  env,
  port: Number(process.env.PORT || 5185),
  databaseUrl: process.env.DATABASE_URL || '',
  dbSsl: process.env.DB_SSL === 'true',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5184').split(',').map((s) => s.trim()).filter(Boolean),
  trustProxy: process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY : false,
  migrationsDir: path.join(root, 'migrations'),
  backupsDir: process.env.BACKUPS_DIR || path.join(root, 'backups'),
  uploadsDir: process.env.UPLOADS_DIR || path.join(root, 'uploads'),
  maxFileSize: Number(process.env.MAX_FILE_SIZE || 50 * 1024 * 1024),
  staticDir: process.env.STATIC_DIR ? path.resolve(root, process.env.STATIC_DIR) : '',
  jsonLimitDb: process.env.JSON_LIMIT_DB || '20mb',
  jsonLimitDefault: '1mb',
  logRequests: process.env.LOG_REQUESTS === 'true',
  telegramToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramUsername: process.env.TELEGRAM_BOT_USERNAME || '',
};

if (env === 'production' && config.jwtSecret === 'dev-only-change-me') {
  console.error('[config] В production обязан быть задан свой JWT_SECRET');
  process.exit(1);
}
