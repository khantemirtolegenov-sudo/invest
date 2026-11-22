/**
 * Права в ИНТЕРФЕЙСЕ — это UX (спрятать кнопку, дать понятную ошибку), не безопасность.
 * Безопасность — backend/src/db/collections.js. Меняешь правило здесь — меняй и там.
 *
 * Доступ к инструменту: TOOL_RULES (единственная точка правды) + персональные гранты
 * user.toolAccess поверх, отзыв — user.toolDenied. Незнакомый id инструмента по
 * умолчанию ЗАКРЫТ (кроме админа): забытая запись не должна открывать инструмент всем.
 */
import type { User } from '../types';

export const isAdmin = (u?: User | null) => u?.role === 'admin';
export const hasManagerRights = (u?: User | null) => u?.role === 'manager' || u?.role === 'admin';

/**
 * Инструменты «по умолчанию только администратор»: открывает админ персональным грантом.
 * Зеркало — ADMIN_ONLY_TOOLS в backend/src/db/collections.js (check:acl сверяет).
 */
export const ADMIN_ONLY_TOOLS: string[] = [/* @gen:admin-only */];

export const TOOL_RULES: Record<string, (u: User) => boolean> = {
  // Проекты
  'tool-projects': (u) => hasManagerRights(u),
  // @gen:tool-rules
};

export function canAccessTool(user: User | null | undefined, toolId: string): boolean {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (user.toolDenied?.includes(toolId)) return false;
  if (user.toolAccess?.includes(toolId)) return true;
  if (ADMIN_ONLY_TOOLS.includes(toolId)) return false;
  return TOOL_RULES[toolId]?.(user) ?? false;
}
