/**
 * Загрузка данных экрана: { data, loading, error, reload, setData }.
 * Повторная загрузка (reload, фоновое обновление) идёт без скелетона, если данные уже
 * на экране, — иначе прокрутка улетала бы наверх после каждого изменения.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { subscribeDb } from '../api/db';

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const hasData = useRef(false);

  useEffect(() => {
    let alive = true;
    if (!hasData.current) setLoading(true);
    fnRef
      .current()
      .then((d) => {
        if (!alive) return;
        hasData.current = true;
        setData(d);
        setError(null);
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  useEffect(() => subscribeDb(() => setTick((t) => t + 1)), []);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, reload, setData };
}
