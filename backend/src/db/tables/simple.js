/**
 * Плоские коллекции: flatTable(collection, table, fields) — декларативная спека
 * «поле JSON → колонка → тип», toRow/fromRow генерируются.
 *
 * Требование: точный round-trip — fromRow(toRow(x)) совпадает с x поле-в-поле
 * (NULL-колонка ↔ отсутствие поля; поля без колонки — через extra).
 * Типы: text | int | float | bool | date ('YYYY-MM-DD') | tstz (ISO-время) | jsonb.
 */
import { asJsonb, orNull, restOf } from './util.js';

export function flatTable(collection, table, fields) {
  const known = new Set(['id', ...fields.map((f) => f[0])]);
  return {
    collection,
    table,
    columns: ['id', ...fields.map((f) => f[1]), 'extra'],
    toRow(data) {
      const row = { id: String(data.id), extra: JSON.stringify(restOf(data, known)) };
      for (const [json, col, type] of fields) {
        const v = data[json];
        row[col] = type === 'jsonb' ? asJsonb(v) : type === 'date' || type === 'tstz' ? orNull(v) : (v ?? null);
      }
      return row;
    },
    fromRow(row) {
      const data = { id: row.id };
      for (const [json, col, type] of fields) {
        const v = row[col];
        if (v === null || v === undefined) continue;
        data[json] = type === 'tstz' ? new Date(v).toISOString() : type === 'int' || type === 'float' ? Number(v) : v;
      }
      return Object.assign(data, row.extra ?? {});
    },
  };
}

export const usersTable = flatTable('users', 'users', [
  ['email', 'email', 'text'],
  ['name', 'name', 'text'],
  ['role', 'role', 'text'],
  ['status', 'status', 'text'],
  ['passwordHash', 'password_hash', 'text'],
  ['department', 'department', 'text'],
  ['position', 'position', 'text'],
  ['toolAccess', 'tool_access', 'jsonb'],
  ['toolDenied', 'tool_denied', 'jsonb'],
  ['mustChangePassword', 'must_change_password', 'bool'],
  ['createdAt', 'created_at', 'text'],
  ['lastLoginAt', 'last_login_at', 'text'],
]);

export const notificationsTable = flatTable('notifications', 'notifications', [
  ['userId', 'user_id', 'text'],
  ['title', 'title', 'text'],
  ['text', 'text', 'text'],
  ['icon', 'icon', 'text'],
  ['link', 'link', 'text'],
  ['read', 'read', 'bool'],
  ['createdAt', 'created_at', 'text'],
]);

export const toolsTable = flatTable('tools', 'tools', [
  ['name', 'name', 'text'],
  ['description', 'description', 'text'],
  ['icon', 'icon', 'text'],
  ['path', 'path', 'text'],
]);

/** Проекты (tool-projects) — генератор 22.11.2026 */
export const projectsItemsTable = flatTable('projectsItems', 'projects_items', [
  ['title', 'title', 'text'],
  ['amount', 'amount', 'float'],
  ['yieldPct', 'yield_pct', 'float'],
  ['startDate', 'start_date', 'date'],
  ['status', 'status', 'text'],
  ['createdAt', 'created_at', 'text'],
  ['createdBy', 'created_by', 'text'],
]);

// @gen:simple-tables

export const SIMPLE_TABLES = [
  usersTable,
  notificationsTable,
  toolsTable,
  projectsItemsTable,
  // @gen:simple-tables-list
];
