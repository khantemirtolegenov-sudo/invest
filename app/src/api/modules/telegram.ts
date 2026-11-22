/** Модуль telegram: привязка своего чата к уведомлениям (chat_id в снапшот не попадает) */
import { apiFetch } from '../http';

export const telegramApi = {
  status: () => apiFetch<{ enabled: boolean; linked: boolean }>('/api/telegram/status'),
  link: () => apiFetch<{ url: string }>('/api/telegram/link', { method: 'POST' }),
  unlink: () => apiFetch('/api/telegram/link', { method: 'DELETE' }),
};
