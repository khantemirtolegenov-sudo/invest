/** Уведомления текущего пользователя */
import { Link } from 'react-router-dom';
import { notificationsApi } from '../api';
import { Page } from '../components/layout/AppLayout';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { CardSkeleton, EmptyState, ErrorState } from '../components/ui/States';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../store/auth';
import { toast } from '../store/toast';

export function NotificationsPage() {
  const user = useAuth((s) => s.user)!;
  const { data, loading, error, reload } = useAsync(() => notificationsApi.list(user), [user.id]);
  const readAll = async () => {
    try {
      await notificationsApi.markRead(user);
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <Page
      title="Уведомления"
      actions={
        data?.some((n) => !n.read) ? (
          <Button variant="secondary" icon="done_all" onClick={readAll}>
            Прочитать все
          </Button>
        ) : null
      }
    >
      {loading ? (
        <CardSkeleton />
      ) : error ? (
        <ErrorState text={error} onRetry={reload} />
      ) : !data?.length ? (
        <EmptyState icon="notifications" title="Уведомлений нет" />
      ) : (
        <div className="space-y-2">
          {data.map((n) => {
            const body = (
              <div className={`glass-card p-card-padding flex gap-3 ${n.read ? 'opacity-70' : ''}`}>
                <Icon name={n.icon ?? 'notifications'} className="text-accent" />
                <div className="min-w-0 flex-1">
                  <div className="text-body-sm font-semibold text-on-surface">{n.title}</div>
                  {n.text && <div className="text-body-sm text-on-surface-variant">{n.text}</div>}
                  <div className="text-label-bold text-muted mt-1">{new Date(n.createdAt).toLocaleString('ru-RU')}</div>
                </div>
              </div>
            );
            return n.link ? (
              <Link key={n.id} to={n.link} onClick={() => void notificationsApi.markRead(user, n.id)}>
                {body}
              </Link>
            ) : (
              <div key={n.id}>{body}</div>
            );
          })}
        </div>
      )}
    </Page>
  );
}
