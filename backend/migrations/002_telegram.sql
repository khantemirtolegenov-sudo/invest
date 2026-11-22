-- Модуль telegram: привязки чатов, одноразовые токены привязки и очередь отправки.
-- Намеренно вне реестра коллекций: chat_id — персональные данные, токен — секрет,
-- в снапшот, который читает каждый сотрудник, они попадать не должны.
CREATE TABLE IF NOT EXISTS telegram_links (
  user_id   TEXT PRIMARY KEY,
  chat_id   TEXT NOT NULL,
  linked_at TEXT
);
CREATE TABLE IF NOT EXISTS telegram_link_tokens (
  token      TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS telegram_outbox (
  id         BIGSERIAL PRIMARY KEY,
  user_id    TEXT NOT NULL,
  text       TEXT NOT NULL,
  attempts   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  sent_at    TEXT
);
