-- Проекты (tool-projects): таблица коллекции projectsItems и карточка в витрине.
-- Генератор scripts/new-tool.mjs, 22.11.2026. Поля без своей колонки едут в extra.
CREATE TABLE IF NOT EXISTS projects_items (
  id               TEXT PRIMARY KEY,
  title            TEXT,
  name             TEXT,
  amount           DOUBLE PRECISION,
  yield_pct        DOUBLE PRECISION,
  start_date       DATE,
  status           TEXT,
  created_at       TEXT,
  created_by       TEXT,
  extra            JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at       TEXT,
  updated_by       TEXT
);

INSERT INTO tools (id, name, description, icon, path)
VALUES ('tool-projects', 'Проекты', 'Проекты: список, создание и правка записей.', 'widgets', '/tools/projects')
ON CONFLICT (id) DO NOTHING;
