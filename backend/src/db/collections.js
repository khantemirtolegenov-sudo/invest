/**
 * Реестр коллекций и права доступа на СЕРВЕРЕ — это безопасность.
 *
 * Права проверяются дважды: в интерфейсе (`app/src/utils/permissions.ts`) — чтобы
 * спрятать кнопку и дать понятную ошибку, и здесь — на каждую сущность пакета синка.
 * Изменение модели доступа без серверной половины = дыра: POST /api/db/sync можно
 * вызвать руками. Сторож `npm run check:acl` сверяет реестр с типами фронтенда.
 *
 * kind: array | record | singleton.
 * read / write: any (любой вошедший) | manager | admin | self (только своё: ownerField).
 * Роли: employee < manager < admin.
 */

export const COLLECTIONS = {
  users: { kind: 'array', read: 'any', write: 'self', ownerField: 'id' },
  // Уведомления создаёт любой (так сервисный слой сообщает коллегам), правит и удаляет — адресат
  notifications: { kind: 'array', read: 'any', write: 'any', ownerField: 'userId' },
  tools: { kind: 'array', read: 'any', write: 'admin' },
  // Проекты (tool-projects)
  projectsItems: { kind: 'array', read: 'manager', write: 'manager' },
  // @gen:collections
};

/** Поля пользователя, которые не-админ не может поменять даже себе: сервер восстанавливает их из БД */
export const PROTECTED_USER_FIELDS = ['role', 'status', 'email', 'toolAccess', 'toolDenied', 'mustChangePassword', 'passwordHash'];

/**
 * Инструменты «по умолчанию только администратор»: роль доступа не даёт, конкретным
 * людям открывает админ персональным грантом (user.toolAccess). Зеркало — ADMIN_ONLY_TOOLS
 * в app/src/utils/permissions.ts; check:acl сверяет списки.
 */
export const ADMIN_ONLY_TOOLS = [/* @gen:admin-only */];

/** Коллекции инструментов «админ + грант»: коллекция → id инструмента (вписывает генератор) */
export const TOOL_GATED_COLLECTIONS = {
  // @gen:tool-gated
};

const RANK = { employee: 1, manager: 2, admin: 3 };
const hasRole = (user, need) => need === 'any' || need === 'self' || (RANK[user?.role] ?? 0) >= (RANK[need] ?? 99);

export const isKnownCollection = (name) => Object.prototype.hasOwnProperty.call(COLLECTIONS, name);

const isToolDenied = (user, toolId) => Array.isArray(user?.toolDenied) && user.toolDenied.includes(toolId);
export const canAccessToolByRank = (user, toolId) =>
  user?.role === 'admin' || (!isToolDenied(user, toolId) && Array.isArray(user?.toolAccess) && user.toolAccess.includes(toolId));

/** Может ли пользователь читать коллекцию (скрытая уходит в снапшот пустой) */
export function canRead(user, name) {
  const tool = TOOL_GATED_COLLECTIONS[name];
  if (tool) return canAccessToolByRank(user, tool);
  return hasRole(user, COLLECTIONS[name].read);
}

/**
 * Проверка записи одной сущности. Возвращает null — можно, иначе текст отказа (→ 403).
 * next — новое значение (null при удалении), prev — текущее из БД (null при создании).
 */
export function checkWrite(user, name, id, next, prev) {
  const def = COLLECTIONS[name];
  const isAdmin = user?.role === 'admin';

  const tool = TOOL_GATED_COLLECTIONS[name];
  if (tool) return canAccessToolByRank(user, tool) ? null : 'Нет доступа к этому инструменту';

  if (name === 'users') {
    if (isAdmin) return null;
    if (!prev) return 'Создавать пользователей может только администратор';
    return id === user.id ? null : 'Можно менять только свою карточку';
  }

  if (name === 'notifications') {
    if (!prev) return null; // создать уведомление коллеге может любой
    return isAdmin || prev.userId === user.id ? null : 'Можно менять только свои уведомления';
  }

  if (!hasRole(user, def.write)) return 'Недостаточно прав';
  if (def.write === 'self' && !isAdmin) {
    const f = def.ownerField;
    if (prev && prev[f] !== user.id) return 'Можно менять только свои записи';
    if (next && next[f] !== user.id) return 'Запись должна принадлежать вам';
  }
  return null;
}
