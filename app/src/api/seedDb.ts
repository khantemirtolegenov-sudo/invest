/**
 * Форма снапшота базы = интерфейс Database. Это контракт GET /api/db: каждое поле —
 * коллекция из backend/src/db/collections.js (сторож check:acl сверяет списки).
 * Новая коллекция: поле здесь + проверка в isValidDb + пустое значение в emptyDb.
 * Генератор (`npm run new-tool`) вписывает всё сам по меткам @gen:*.
 */
import type {
  AppNotification,
  Tool,
  User,
  ProjectsItem,
} from '../types';

export interface Database {
  users: User[];
  notifications: AppNotification[];
  tools: Tool[];
  /** Проекты */
  projectsItems: ProjectsItem[];
  // @gen:database-field
}

export function isValidDb(db: Partial<Database> | null): db is Database {
  return Boolean(
    db &&
      Array.isArray(db.users) &&
      Array.isArray(db.notifications) &&
      Array.isArray(db.projectsItems) &&
      // @gen:database-check
      Array.isArray(db.tools),
  );
}

export function emptyDb(): Database {
  return {
    users: [],
    notifications: [],
    tools: [],
    projectsItems: [],
    // @gen:database-empty
  };
}
