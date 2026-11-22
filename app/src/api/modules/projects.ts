/**
 * «Проекты» (tool-projects) — сервисный слой портфеля инвестпроектов.
 * delay → проверки → mutate() → копия наружу. Вся валидация — здесь, до первой записи:
 * экран только показывает текст ApiError.
 */
import type { ProjectStatus, ProjectsItem, User } from '../../types';
import { canAccessTool } from '../../utils/permissions';
import { loadDb, mutate, uid } from '../db';
import { ApiError, copy, delay } from './core';

export type ProjectsItemInput = Omit<ProjectsItem, 'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'>;

export const PROJECT_STATUSES: Record<ProjectStatus, string> = {
  planned: 'Планируется',
  active: 'В работе',
  paused: 'Приостановлен',
  closed: 'Закрыт',
};

/** Сводка портфеля для KPI-плиток. Доходность — средневзвешенная по объёму вложений. */
export interface ProjectsSummary {
  count: number;
  active: number;
  invested: number;
  weightedYield: number | null;
}

const guard = (user: User) => {
  if (!canAccessTool(user, 'tool-projects')) throw new ApiError('Нет доступа к инструменту «Проекты»');
};

/** Приводит и проверяет поля; бросает ApiError с понятным текстом */
function clean(input: Partial<ProjectsItemInput>, partial: boolean): Partial<ProjectsItemInput> {
  const out: Partial<ProjectsItemInput> = {};
  if (input.title !== undefined || !partial) {
    const title = input.title?.trim() ?? '';
    if (!title) throw new ApiError('Укажите название проекта');
    if (title.length > 200) throw new ApiError('Название длиннее 200 символов');
    out.title = title;
  }
  if (input.amount !== undefined) {
    if (!Number.isFinite(input.amount) || input.amount < 0) throw new ApiError('Объём инвестиций — неотрицательное число');
    out.amount = Math.round(input.amount * 100) / 100;
  }
  if (input.yieldPct !== undefined) {
    if (!Number.isFinite(input.yieldPct) || input.yieldPct < -100 || input.yieldPct > 1000)
      throw new ApiError('Доходность — число от −100 до 1000 %');
    out.yieldPct = Math.round(input.yieldPct * 100) / 100;
  }
  if (input.startDate !== undefined) {
    if (input.startDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.startDate)) throw new ApiError('Дата старта — в формате ГГГГ-ММ-ДД');
    out.startDate = input.startDate || undefined;
  }
  if (input.status !== undefined) {
    if (!(input.status in PROJECT_STATUSES)) throw new ApiError('Неизвестный статус проекта');
    out.status = input.status;
  } else if (!partial) out.status = 'planned';
  return out;
}

export const projectsApi = {
  async list(user: User): Promise<ProjectsItem[]> {
    await delay();
    guard(user);
    return copy([...loadDb().projectsItems].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  },

  /** Сводка по переданному списку (уже отфильтрованному экраном) — чистая функция, без запроса */
  summary(items: ProjectsItem[]): ProjectsSummary {
    const invested = items.reduce((s, x) => s + (x.amount ?? 0), 0);
    const withYield = items.filter((x) => x.yieldPct !== undefined && (x.amount ?? 0) > 0);
    const base = withYield.reduce((s, x) => s + (x.amount ?? 0), 0);
    return {
      count: items.length,
      active: items.filter((x) => x.status === 'active').length,
      invested,
      weightedYield: base > 0 ? withYield.reduce((s, x) => s + (x.amount ?? 0) * (x.yieldPct ?? 0), 0) / base : null,
    };
  },

  async create(user: User, input: ProjectsItemInput): Promise<ProjectsItem> {
    await delay();
    guard(user);
    const fields = clean(input, false) as ProjectsItemInput;
    const item: ProjectsItem = { ...fields, id: uid('pro'), createdAt: new Date().toISOString(), createdBy: user.id };
    mutate((db) => {
      db.projectsItems.unshift(item);
    });
    return copy(item);
  },

  async update(user: User, id: string, input: Partial<ProjectsItemInput>): Promise<ProjectsItem> {
    await delay();
    guard(user);
    if (!loadDb().projectsItems.some((x) => x.id === id)) throw new ApiError('Проект не найден');
    const fields = clean(input, true);
    const saved = mutate((db) => {
      const t = db.projectsItems.find((x) => x.id === id)!;
      // Очищенное поле (пустая строка в форме) приходит как undefined — снимаем его явно
      for (const k of ['amount', 'yieldPct', 'startDate'] as const) if (k in input && fields[k] === undefined) delete t[k];
      return Object.assign(t, fields, { updatedAt: new Date().toISOString(), updatedBy: user.id });
    });
    return copy(saved);
  },

  async remove(user: User, id: string): Promise<void> {
    await delay();
    guard(user);
    if (!loadDb().projectsItems.some((x) => x.id === id)) throw new ApiError('Проект не найден');
    mutate((db) => {
      db.projectsItems = db.projectsItems.filter((x) => x.id !== id);
    });
  },
};
