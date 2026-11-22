-- Модуль files: загруженные файлы. Сам файл — на диске (UPLOADS_DIR), здесь — описание.
-- Не коллекция синка: бинарные данные не едут в снапшот, сущности хранят только id файла.
CREATE TABLE IF NOT EXISTS files (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  mime       TEXT,
  size       BIGINT,
  owner_id   TEXT,
  created_at TEXT NOT NULL
);
