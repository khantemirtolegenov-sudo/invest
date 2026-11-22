/**
 * HTTP-клиент backend: формат {ok, data|error}, Bearer-токен, нормализация ошибок.
 * Токен входа — единственное, что приложение хранит в localStorage (`hub-token`).
 */
export class ApiHttpError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

const TOKEN_KEY = 'hub-token';
let token: string | null = (() => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
})();

export const getToken = () => token;
export function setToken(next: string | null): void {
  token = next;
  try {
    if (next) localStorage.setItem(TOKEN_KEY, next);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* приватный режим — токен живёт до закрытия вкладки */
  }
}

interface FetchOptions {
  method?: string;
  body?: unknown;
  keepalive?: boolean;
  /** Не разбирать JSON (файлы) — вернуть Response */
  raw?: boolean;
  /** Доступ к ответу до разбора тела (служебные заголовки, например X-Db-Revision) */
  onResponse?: (res: Response) => void;
}

export async function apiFetch<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: opts.method ?? 'GET',
      headers: {
        ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      keepalive: opts.keepalive,
    });
  } catch {
    throw new ApiHttpError('Сервер недоступен. Проверьте подключение и повторите.', 0);
  }
  opts.onResponse?.(res);
  if (opts.raw) return res as unknown as T;
  const payload = (await res.json().catch(() => null)) as { ok?: boolean; data?: T; error?: string } | null;
  if (!res.ok || !payload?.ok) throw new ApiHttpError(payload?.error ?? `Ошибка сервера (${res.status})`, res.status);
  return payload.data as T;
}
