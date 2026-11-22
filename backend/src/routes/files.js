/**
 * Модуль files (только вошедшим):
 *   POST   /api/files      multipart, поле file → {id, name, size, mime}
 *   GET    /api/files/:id  → файл (скачивание)
 *   DELETE /api/files/:id  → удалить (владелец или админ)
 * Файл пишется потоком на диск (UPLOADS_DIR), в базе — описание. В сущностях
 * коллекций хранится только id файла. Права на ЧТЕНИЕ конкретного файла — по
 * умолчанию любой вошедший; для закрытых инструментов сузьте проверку здесь.
 */
import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { config } from '../config.js';
import { query } from '../db/connection.js';
import { ApiError, asyncHandler, ok } from '../middleware/errors.js';
import { uid } from '../services/authService.js';

export const filesRouter = Router();
fs.mkdirSync(config.uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: config.uploadsDir,
    filename: (_req, _file, cb) => cb(null, uid('f')),
  }),
  limits: { fileSize: config.maxFileSize },
});

// Исполняемое и скрипты не принимаем: файл откроют на чужом компьютере
const BLOCKED = /\.(exe|bat|cmd|com|msi|ps1|sh|js|vbs|scr|jar|html?)$/i;

filesRouter.post(
  '/',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const f = req.file;
    if (!f) throw new ApiError('Нет файла (поле file)');
    const name = Buffer.from(f.originalname, 'latin1').toString('utf8');
    if (BLOCKED.test(name)) {
      fs.rmSync(f.path, { force: true });
      throw new ApiError('Такой тип файла загружать нельзя');
    }
    const meta = { id: f.filename, name, mime: f.mimetype, size: f.size };
    await query('INSERT INTO files (id, name, mime, size, owner_id, created_at) VALUES ($1, $2, $3, $4, $5, $6)', [
      meta.id,
      name,
      f.mimetype,
      f.size,
      req.user.id,
      new Date().toISOString(),
    ]);
    ok(res, meta);
  }),
);

filesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = (await query('SELECT * FROM files WHERE id = $1', [req.params.id]))[0];
    const file = row && path.join(config.uploadsDir, path.basename(row.id));
    if (!row || !fs.existsSync(file)) throw new ApiError('Файл не найден', 404);
    res.setHeader('Content-Type', row.mime || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(row.name)}`);
    fs.createReadStream(file).pipe(res);
  }),
);

filesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = (await query('SELECT * FROM files WHERE id = $1', [req.params.id]))[0];
    if (!row) return ok(res, { done: true });
    if (row.owner_id !== req.user.id && req.user.role !== 'admin') throw new ApiError('Удалить файл может владелец или админ', 403);
    await query('DELETE FROM files WHERE id = $1', [row.id]);
    fs.rmSync(path.join(config.uploadsDir, path.basename(row.id)), { force: true });
    ok(res, { done: true });
  }),
);
