/**
 * «Проекты» (tool-projects) — экран. Каркас создан генератором 22.11.2026: список, добавление,
 * удаление, три состояния (загрузка / ошибка / пусто). Предметный интерфейс — здесь.
 */
import { useState } from 'react';
import { projectsApi } from '../../../api';
import { Page } from '../../../components/layout/AppLayout';
import { Button } from '../../../components/ui/Button';
import { TextInput } from '../../../components/ui/Form';
import { CardSkeleton, EmptyState, ErrorState } from '../../../components/ui/States';
import { useAsync } from '../../../hooks/useAsync';
import { useAuth } from '../../../store/auth';
import { toast } from '../../../store/toast';

export function ProjectsPage() {
  const user = useAuth((s) => s.user)!;
  const { data, loading, error, reload } = useAsync(() => projectsApi.list(user), [user.id]);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  const add = async () => {
    setBusy(true);
    try {
      await projectsApi.create(user, { title });
      setTitle('');
      toast.success('Добавлено');
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await projectsApi.remove(user, id);
      toast.success('Удалено');
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Page title="Проекты" subtitle="Проекты: список, создание и правка записей.">
      <form
        className="glass-card p-card-padding flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Название" />
        <Button type="submit" icon="add" loading={busy} disabled={!title.trim()}>
          Добавить
        </Button>
      </form>
      {loading ? (
        <CardSkeleton count={3} />
      ) : error ? (
        <ErrorState text={error} onRetry={reload} />
      ) : !data?.length ? (
        <EmptyState icon="widgets" title="Пока пусто" text="Добавьте первую запись." />
      ) : (
        <div className="space-y-2">
          {data.map((x) => (
            <div key={x.id} className="glass-card p-card-padding flex items-center justify-between gap-3">
              <span className="text-body-sm text-on-surface">{x.title}</span>
              <Button variant="ghost" size="sm" icon="delete" onClick={() => remove(x.id)}>
                Удалить
              </Button>
            </div>
          ))}
        </div>
      )}
    </Page>
  );
}
