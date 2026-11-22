/**
 * Уведомления. notify() — единственный способ сообщить сотруднику о событии:
 * уведомление появится в колокольчике, а с модулем telegram — и в боте (сервер
 * ставит его в очередь той же транзакцией, что и запись).
 */
import type { AppNotification, User } from '../../types';
import { loadDb, mutate, uid } from '../db';
import { copy, delay } from './core';

export interface NotifyInput {
  userId: string;
  title: string;
  text?: string;
  icon?: string;
  link?: string;
}

/** Синхронно, внутри другого метода (вызывать из mutate не нужно — он сам) */
export function notify(items: NotifyInput | NotifyInput[]): void {
  const list = Array.isArray(items) ? items : [items];
  if (!list.length) return;
  mutate((db) => {
    for (const n of list) db.notifications.unshift({ ...n, id: uid('n'), read: false, createdAt: new Date().toISOString() });
  });
}

export const notificationsApi = {
  async list(user: User): Promise<AppNotification[]> {
    await delay();
    return copy(loadDb().notifications.filter((n) => n.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  },

  unreadCount: (user: User) => loadDb().notifications.filter((n) => n.userId === user.id && !n.read).length,

  async markRead(user: User, id?: string): Promise<void> {
    await delay();
    mutate((db) => {
      for (const n of db.notifications) if (n.userId === user.id && (!id || n.id === id)) n.read = true;
    });
  },
};
