/**
 * Типы сущностей фронтенда. Форма сущности = форма записи коллекции в базе
 * (адаптер backend/src/db/tables/*). Даты — ISO-строки. id обязателен у каждой
 * сущности array-коллекции: синк адресует записи по нему, безымянная запись
 * живёт только в кэше вкладки и пропадает при F5.
 */

export type Role = 'employee' | 'manager' | 'admin';
export type UserStatus = 'active' | 'pending' | 'blocked';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  department?: string;
  position?: string;
  /** Персональные гранты к инструментам «только админ» */
  toolAccess?: string[];
  /** Отзыв доступа к инструменту поверх правила роли */
  toolDenied?: string[];
  mustChangePassword?: boolean;
  createdAt?: string;
  lastLoginAt?: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  text?: string;
  icon?: string;
  link?: string;
  read?: boolean;
  createdAt: string;
}

/** Карточка инструмента в витрине (заводится миграцией, обычно генератором) */
export interface Tool {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  path?: string;
}
