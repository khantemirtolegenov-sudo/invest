/** Главная: приветствие и витрина доступных инструментов */
import { Link } from 'react-router-dom';
import { toolsApi } from '../api';
import { Page } from '../components/layout/AppLayout';
import { Icon } from '../components/ui/Icon';
import { CardSkeleton, EmptyState, ErrorState } from '../components/ui/States';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../store/auth';
import { isAdmin } from '../utils/permissions';

export function HomePage() {
  const user = useAuth((s) => s.user)!;
  const { data, loading, error, reload } = useAsync(() => toolsApi.visible(user), [user.id]);
  return (
    <Page title={`Здравствуйте, ${user.name.split(' ')[0]}`} subtitle="Ваши инструменты">
      {loading ? (
        <CardSkeleton count={3} />
      ) : error ? (
        <ErrorState text={error} onRetry={reload} />
      ) : !data?.length ? (
        <EmptyState
          icon="widgets"
          title="Инструментов пока нет"
          text={isAdmin(user) ? 'Добавьте первый инструмент командой npm run new-tool — карточка появится здесь сама.' : 'Доступ к инструментам выдаёт администратор.'}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((t) => (
            <Link key={t.id} to={t.path ?? '/'} className="glass-card p-card-padding flex gap-3 hover:shadow-lg transition-shadow">
              <span className="w-11 h-11 rounded-xl bg-primary-fixed text-primary flex items-center justify-center shrink-0">
                <Icon name={t.icon ?? 'widgets'} />
              </span>
              <span className="min-w-0">
                <span className="block text-body-lg font-semibold text-on-surface">{t.name}</span>
                {t.description && <span className="block text-body-sm text-muted">{t.description}</span>}
              </span>
            </Link>
          ))}
        </div>
      )}
    </Page>
  );
}
