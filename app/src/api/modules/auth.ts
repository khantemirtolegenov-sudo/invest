/**
 * Вход и учётные записи. Исключение из правила «без fetch в сервисном слое»: пароли
 * и токены живут только на сервере, коллекцией их не выразить.
 */
import type { User } from '../../types';
import { initDb, resetDb } from '../db';
import { apiFetch, getToken, setToken } from '../http';

export const authApi = {
  hasToken: () => Boolean(getToken()),

  async login(email: string, password: string): Promise<User> {
    const { user, token } = await apiFetch<{ user: User; token: string }>('/api/auth/login', { method: 'POST', body: { email, password } });
    setToken(token);
    await initDb();
    return user;
  },

  /** Восстановить сессию по сохранённому токену */
  async restore(): Promise<User | null> {
    if (!getToken()) return null;
    try {
      const user = await apiFetch<User>('/api/auth/me');
      await initDb();
      return user;
    } catch {
      setToken(null);
      return null;
    }
  },

  logout(): void {
    setToken(null);
    resetDb();
  },

  changePassword: (currentPassword: string, newPassword: string) =>
    apiFetch<User>('/api/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } }),

  // @module:registration:start
  register: (input: { name: string; email: string; password: string; department?: string; position?: string }) =>
    apiFetch<User>('/api/auth/register', { method: 'POST', body: input }),
  // @module:registration:end

  /** Админ: новый сотрудник с временным паролем (сменит при первом входе) */
  async createUser(input: { name: string; email: string; password: string; role: User['role']; department?: string; position?: string }): Promise<User> {
    const user = await apiFetch<User>('/api/auth/users', { method: 'POST', body: input });
    await initDb({ replay: false });
    return user;
  },

  resetPassword: (userId: string, password: string) =>
    apiFetch<{ done: boolean }>(`/api/auth/users/${userId}/password`, { method: 'POST', body: { password } }),
};
