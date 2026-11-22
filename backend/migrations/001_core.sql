-- Ядро шаблона: служебные таблицы синка, пользователи, уведомления, витрина инструментов.
--
-- Каждая коллекция фронтенда (интерфейс Database) — своя типизированная таблица.
-- Поля без своей колонки едут в JSONB extra и возвращаются как есть (страховка
-- контракта, а не способ «не делать колонку»). updated_at/updated_by ставит сервер.

-- Порядок элементов array-коллекций (контракт снапшота сохраняет порядок массива)
CREATE TABLE IF NOT EXISTS collection_order (
  collection TEXT PRIMARY KEY,
  ids        JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TEXT
);

-- Ревизия данных: растёт при каждой записи; вкладки спрашивают её раз в 5 с
-- и перечитывают снапшот, только когда она выросла (живое обновление)
CREATE TABLE IF NOT EXISTS db_revision (
  id         BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  rev        BIGINT NOT NULL DEFAULT 0,
  updated_at TEXT
);
INSERT INTO db_revision (id, rev) VALUES (TRUE, 0) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS users (
  id                   TEXT PRIMARY KEY,
  email                TEXT NOT NULL UNIQUE,
  name                 TEXT,
  role                 TEXT NOT NULL DEFAULT 'employee',
  status               TEXT NOT NULL DEFAULT 'active',
  password_hash        TEXT,
  department           TEXT,
  position             TEXT,
  tool_access          JSONB,
  tool_denied          JSONB,
  must_change_password BOOLEAN,
  created_at           TEXT,
  last_login_at        TEXT,
  extra                JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at           TEXT,
  updated_by           TEXT
);

CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT,
  title      TEXT,
  text       TEXT,
  icon       TEXT,
  link       TEXT,
  read       BOOLEAN,
  created_at TEXT,
  extra      JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TEXT,
  updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id);

-- Витрина инструментов: карточка = вход в инструмент (path) для тех, у кого есть доступ.
-- Новые карточки добавляет генератор (scripts/new-tool.mjs) своей миграцией.
CREATE TABLE IF NOT EXISTS tools (
  id          TEXT PRIMARY KEY,
  name        TEXT,
  description TEXT,
  icon        TEXT,
  path        TEXT,
  extra       JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TEXT,
  updated_by  TEXT
);

-- Журнал отказов синка (403): «интерфейс разрешает — сервер отклоняет» должно
-- всплывать в первый день, а не через три месяца (урок проекта-прародителя)
CREATE TABLE IF NOT EXISTS sync_rejections (
  id         BIGSERIAL PRIMARY KEY,
  user_id    TEXT,
  role       TEXT,
  reason     TEXT,
  created_at TEXT NOT NULL
);
