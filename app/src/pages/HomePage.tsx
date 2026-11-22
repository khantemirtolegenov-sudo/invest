/**
 * Главная. Для тех, кому доступны «Проекты», — сводка портфеля (те же KPI, что в инструменте)
 * и последние проекты: открыл портал — сразу видишь состояние денег. Ниже — разделы-инструменты.
 * Без доступа к «Проектам» остаётся только витрина разделов.
 */
import { Link } from 'react-router-dom';
import { projectsApi, toolsApi } from '../api';
import { PROJECT_STATUSES } from '../api/modules/projects';
import { Page } from '../components/layout/AppLayout';
import { Icon } from '../components/ui/Icon';
import { Delta, Stat } from '../components/ui/Indicators';
import { CardSkeleton, EmptyState, ErrorState } from '../components/ui/States';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../store/auth';
import { canAccessTool, isAdmin } from '../utils/permissions';

const NBSP = ' ';
const fmt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const fmtShort = new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 2 });
const money = (v: number) => `${fmt.format(v).replace(/\s/g, NBSP)}${NBSP}₸`;
const moneyShort = (v: number) => `${fmtShort.format(v).replace(/\s/g, NBSP)}${NBSP}₸`;

export function HomePage() {
  const user = useAuth((s) => s.user)!;
  const portfolio = canAccessTool(user, 'tool-projects');
  const tools = useAsync(() => toolsApi.visible(user), [user.id]);
  const projects = useAsync(() => (portfolio ? projectsApi.list(user) : Promise.resolve([])), [user.id, portfolio]);
  const sum = projectsApi.summary(projects.data ?? []);
  const recent = (projects.data ?? []).slice(0, 5);

  return (
    <Page title={`Здравствуйте, ${user.name.split(' ')[0]}`} subtitle={portfolio ? 'Состояние портфеля на сегодня' : 'Ваши разделы'}>
      {portfolio &&
        (projects.loading ? (
          <CardSkeleton count={2} />
        ) : projects.error ? (
          <ErrorState text={projects.error} onRetry={projects.reload} />
        ) : !projects.data?.length ? (
          <EmptyState icon="account_balance" title="Портфель пуст" text="Добавьте первый проект в разделе «Проекты»: здесь появится сводка." />
        ) : (
          <section aria-labelledby="h-portfolio" className="space-y-4">
            <h2 id="h-portfolio" className="sr-only">Портфель</h2>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 [&>*:first-child]:col-span-2 sm:[&>*:first-child]:col-span-1">
              <Stat label="Объём вложений" value={moneyShort(sum.invested)} hint={money(sum.invested)} />
              <Stat
                label="Доходность портфеля"
                value={sum.weightedYield === null ? <span className="text-muted">—</span> : <Delta value={sum.weightedYield} digits={2} />}
                hint="средневзвешенная, % годовых"
              />
              <Stat label="Проектов" value={sum.count} hint={`в работе: ${sum.active}`} />
            </div>
            <div className="glass-card overflow-hidden">
              <div className="flex items-center justify-between px-card-padding py-3 border-b border-ice-100/10">
                <span className="eyebrow">Последние проекты</span>
                <Link to="/tools/projects" className="hub-link !mx-0 text-body-sm text-on-surface-variant hover:text-on-surface">
                  Весь портфель
                </Link>
              </div>
              <ul className="divide-y divide-ice-100/10">
                {recent.map((x) => (
                  <li key={x.id} className="px-card-padding py-3.5 flex items-baseline gap-4">
                    <span className="flex-1 min-w-0">
                      <span className="block text-body-sm font-medium text-on-surface truncate">{x.title}</span>
                      <span className="block text-label-bold text-muted">{x.status ? PROJECT_STATUSES[x.status] : '—'}</span>
                    </span>
                    <span className="figure text-body-sm text-on-surface whitespace-nowrap">{x.amount !== undefined ? money(x.amount) : '—'}</span>
                    <span className="w-24 text-right text-body-sm">{x.yieldPct !== undefined ? <Delta value={x.yieldPct} digits={2} /> : <span className="text-muted">—</span>}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))}

      <section aria-labelledby="h-tools" className="space-y-3">
        <h2 id="h-tools" className="text-headline-md text-on-surface">
          Разделы
        </h2>
        {tools.loading ? (
          <CardSkeleton count={2} />
        ) : tools.error ? (
          <ErrorState text={tools.error} onRetry={tools.reload} />
        ) : !tools.data?.length ? (
          <EmptyState
            icon="widgets"
            title="Разделов пока нет"
            text={isAdmin(user) ? 'Добавьте первый инструмент командой npm run new-tool: карточка появится здесь сама.' : 'Доступ к разделам выдаёт администратор.'}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {tools.data.map((t) => (
              <Link key={t.id} to={t.path ?? '/'} className="group glass-card p-card-padding flex gap-4 transition-colors hover:border-gold/30">
                <span className="w-11 h-11 rounded-full border border-ice-100/15 text-on-surface-variant group-hover:text-gold group-hover:border-gold/40 transition-colors flex items-center justify-center shrink-0">
                  <Icon name={t.icon ?? 'widgets'} />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1 text-body-lg font-medium text-on-surface">
                    {t.name}
                    <Icon name="arrow_outward" className="text-body-sm text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-gold" />
                  </span>
                  {t.description && <span className="block text-body-sm text-muted">{t.description}</span>}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </Page>
  );
}
