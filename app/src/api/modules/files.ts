/**
 * Модуль files: загрузка и скачивание файлов. В сущности коллекции хранится только
 * id файла (`attachmentId`), сам файл — на сервере. Исключение из правила «без fetch»:
 * бинарные данные не едут в снапшот.
 */
import { apiFetch, ApiHttpError, getToken } from '../http';

export interface StoredFile {
  id: string;
  name: string;
  size: number;
  mime: string;
}

export const filesApi = {
  async upload(file: File): Promise<StoredFile> {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/files', { method: 'POST', body: form, headers: { Authorization: `Bearer ${getToken() ?? ''}` } });
    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload?.ok) throw new ApiHttpError(payload?.error ?? 'Не удалось загрузить файл', res.status);
    return payload.data as StoredFile;
  },

  async download(id: string, fallbackName = 'file'): Promise<void> {
    const res = await apiFetch<Response>(`/api/files/${id}`, { raw: true });
    if (!res.ok) throw new ApiHttpError('Файл не найден', res.status);
    const name = /filename\*=UTF-8''([^;]+)/i.exec(res.headers.get('content-disposition') ?? '')?.[1];
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = name ? decodeURIComponent(name) : fallbackName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  },

  remove: (id: string) => apiFetch(`/api/files/${id}`, { method: 'DELETE' }),
};
