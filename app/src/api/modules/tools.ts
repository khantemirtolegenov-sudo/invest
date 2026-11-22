/** Витрина инструментов: карточки, доступные текущему пользователю */
import type { Tool, User } from '../../types';
import { ADMIN_ONLY_TOOLS, canAccessTool } from '../../utils/permissions';
import { loadDb } from '../db';
import { copy, delay } from './core';

export const toolsApi = {
  async visible(user: User): Promise<Tool[]> {
    await delay();
    return copy(loadDb().tools.filter((t) => canAccessTool(user, t.id)));
  },

  /** Для экрана «Пользователи»: инструменты, к которым админ выдаёт доступ грантом */
  grantable: (): Tool[] => copy(loadDb().tools.filter((t) => ADMIN_ONLY_TOOLS.includes(t.id))),
};
