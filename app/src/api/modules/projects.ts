/**
 * «Проекты» (tool-projects) — сервисный слой. Каркас CRUD создан генератором 22.11.2026:
 * delay → проверки → mutate() → копия наружу. Предметную логику дописывать здесь.
 */
import type { ProjectsItem, User } from '../../types';
import { canAccessTool } from '../../utils/permissions';
import { loadDb, mutate, uid } from '../db';
import { ApiError, copy, delay } from './core';

export type ProjectsItemInput = Omit<ProjectsItem, 'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'>;

const guard = (user: User) => {
  if (!canAccessTool(user, 'tool-projects')) throw new ApiError('Нет доступа к инструменту «Проекты»');
};

export const projectsApi = {
  async list(user: User): Promise<ProjectsItem[]> {
    await delay();
    guard(user);
    return copy([...loadDb().projectsItems].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  },

  async create(user: User, input: ProjectsItemInput): Promise<ProjectsItem> {
    await delay();
    guard(user);
    if (!input.title?.trim()) throw new ApiError('Укажите название');
    const item: ProjectsItem = { ...input, title: input.title.trim(), id: uid('pro'), createdAt: new Date().toISOString(), createdBy: user.id };
    mutate((db) => {
      db.projectsItems.unshift(item);
    });
    return copy(item);
  },

  async update(user: User, id: string, input: Partial<ProjectsItemInput>): Promise<ProjectsItem> {
    await delay();
    guard(user);
    if (!loadDb().projectsItems.some((x) => x.id === id)) throw new ApiError('Запись не найдена');
    if (input.title !== undefined && !input.title.trim()) throw new ApiError('Укажите название');
    const saved = mutate((db) => {
      const t = db.projectsItems.find((x) => x.id === id)!;
      return Object.assign(t, input, { updatedAt: new Date().toISOString(), updatedBy: user.id });
    });
    return copy(saved);
  },

  async remove(user: User, id: string): Promise<void> {
    await delay();
    guard(user);
    if (!loadDb().projectsItems.some((x) => x.id === id)) throw new ApiError('Запись не найдена');
    mutate((db) => {
      db.projectsItems = db.projectsItems.filter((x) => x.id !== id);
    });
  },
};
