/** Пользователи: список, роль, статус, гранты к инструментам (правит только админ) */
import type { Role, User, UserStatus } from '../../types';
import { isAdmin } from '../../utils/permissions';
import { loadDb, mutate } from '../db';
import { ApiError, copy, delay } from './core';

export const usersApi = {
  async list(): Promise<User[]> {
    await delay();
    return copy([...loadDb().users].sort((a, b) => a.name.localeCompare(b.name, 'ru')));
  },

  async update(actor: User, id: string, patch: { role?: Role; status?: UserStatus; toolAccess?: string[]; department?: string; position?: string }): Promise<User> {
    await delay();
    if (!isAdmin(actor)) throw new ApiError('Менять сотрудников может только администратор');
    const target = loadDb().users.find((u) => u.id === id);
    if (!target) throw new ApiError('Пользователь не найден');
    if (id === actor.id && (patch.role && patch.role !== 'admin')) throw new ApiError('Нельзя снять роль администратора с себя');
    if (id === actor.id && patch.status && patch.status !== 'active') throw new ApiError('Нельзя заблокировать самого себя');
    let saved = target;
    mutate((db) => {
      const u = db.users.find((x) => x.id === id)!;
      Object.assign(u, patch);
      saved = u;
    });
    return copy(saved);
  },

  /** Своя карточка: имя, отдел, должность (роль и статус сервер не даст поменять) */
  async updateSelf(actor: User, patch: { name?: string; department?: string; position?: string }): Promise<User> {
    await delay();
    if (patch.name !== undefined && !patch.name.trim()) throw new ApiError('Укажите имя');
    let saved = actor;
    mutate((db) => {
      const u = db.users.find((x) => x.id === actor.id);
      if (!u) throw new ApiError('Пользователь не найден');
      Object.assign(u, patch);
      saved = u;
    });
    return copy(saved);
  },
};
