/**
 * «Проекты» (tool-projects) — экран портфеля инвестпроектов.
 * Сверху KPI по текущему фильтру (объём, средневзвешенная доходность, число проектов),
 * фильтр по статусу (SegmentedControl glisse), список, создание/правка в модалке.
 * Палитра: доходность — positive/negative со знаком ± (это финрезультат к нулю);
 * статусы — info/warning/neutral с иконкой, без зелёного/красного; золото — только
 * главная кнопка и выбранный фильтр.
 */
import { SegmentedControl } from 'glisse';
import { useMemo, useState } from 'react';
import { projectsApi } from '../../../api';
import { PROJECT_STATUSES, type ProjectsItemInput } from '../../../api/modules/projects';
import { Page } from '../../../components/layout/AppLayout';
import { Button } from '../../../components/ui/Button';
import { Field, Select, TextInput } from '../../../components/ui/Form';
import { Icon } from '../../../components/ui/Icon';
import { Badge, Delta, Stat, type Tone } from '../../../components/ui/Indicators';
import { Modal } from '../../../components/ui/Modal';
import { CardSkeleton, EmptyState, ErrorState } from '../../../components/ui/States';
import { useAsync } from '../../../hooks/useAsync';
import { useAuth } from '../../../store/auth';
import { toast } from '../../../store/toast';
import type { ProjectStatus, ProjectsItem } from '../../../types';

const STATUS_TONE: Record<ProjectStatus, { tone: Tone; icon: string }> = {
  planned: { tone: 'neutral', icon: 'schedule' },
  active: { tone: 'info', icon: 'play_circle' },
  paused: { tone: 'warning', icon: 'pause_circle' },
  closed: { tone: 'neutral', icon: 'check_circle' },
};

type Filter = 'all' | ProjectStatus;

const money = (v: number) => `${v.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₸`;
const moneyShort = (v: number) => `${v.toLocaleString('ru-RU', { notation: 'compact', maximumFractionDigits: 1 })} ₸`;
const date = (iso?: string) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
/** «1 250 000,5» → 1250000.5; пусто → undefined; мусор → NaN (его отклонит сервисный слой) */
const parseNum = (s: string) => (s.trim() === '' ? undefined : Number(s.replace(/\s/g, '').replace(',', '.')));

export function ProjectsPage() {
  const user = useAuth((s) => s.user)!;
  const { data, loading, error, reload } = useAsync(() => projectsApi.list(user), [user.id]);
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<ProjectsItem | 'new' | null>(null);
  const [deleting, setDeleting] = useState<ProjectsItem | null>(null);

  const shown = useMemo(() => (data ?? []).filter((x) => filter === 'all' || x.status === filter), [data, filter]);
  const sum = projectsApi.summary(shown);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: data?.length ?? 0, planned: 0, active: 0, paused: 0, closed: 0 };
    for (const x of data ?? []) if (x.status) c[x.status]++;
    return c;
  }, [data]);

  const remove = async () => {
    if (!deleting) return;
    try {
      await projectsApi.remove(user, deleting.id);
      toast.success('Проект удалён');
      setDeleting(null);
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Page
      title="Проекты"
      subtitle="Портфель инвестпроектов"
      actions={
        data?.length ? (
          <Button icon="add" onClick={() => setEditing('new')}>
            Новый проект
          </Button>
        ) : null
      }
    >
      {loading ? (
        <CardSkeleton count={3} />
      ) : error ? (
        <ErrorState text={error} onRetry={reload} />
      ) : !data?.length ? (
        <EmptyState
          icon="account_balance"
          title="Портфель пуст"
          text="Добавьте первый проект — здесь появятся объём вложений и доходность портфеля."
          action={
            <Button icon="add" onClick={() => setEditing('new')}>
              Новый проект
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 [&>*:first-child]:col-span-2 sm:[&>*:first-child]:col-span-1">
            <Stat label="Объём вложений" value={moneyShort(sum.invested)} hint={money(sum.invested)} />
            <Stat
              label="Доходность портфеля"
              value={
                sum.weightedYield === null ? (
                  <span className="text-muted">—</span>
                ) : (
                  <Delta value={sum.weightedYield} suffix=" %" />
                )
              }
              hint={sum.weightedYield === null ? 'нет данных о доходности' : 'средневзвешенная, % годовых'}
            />
            <Stat label="Проектов" value={sum.count} hint={`в работе: ${sum.active}`} />
          </div>

          <div className="hub-scroll-x -mx-4 px-4 overflow-x-auto lg:mx-0 lg:px-0">
            <SegmentedControl
              className="hub-segmented"
              aria-label="Фильтр по статусу"
              value={filter}
              onValueChange={(v) => setFilter(v as Filter)}
              items={[
                { value: 'all', label: <FilterLabel text="Все" n={counts.all} /> },
                ...(Object.keys(PROJECT_STATUSES) as ProjectStatus[]).map((s) => ({
                  value: s,
                  label: <FilterLabel text={PROJECT_STATUSES[s]} n={counts[s]} />,
                })),
              ]}
            />
          </div>

          {!shown.length ? (
            <EmptyState icon="filter_alt_off" title="Нет проектов с таким статусом" text="Выберите другой фильтр." />
          ) : (
            <div className="glass-card overflow-hidden">
              <div className="hidden lg:grid grid-cols-[minmax(0,1fr)_9rem_10rem_8rem_5.5rem] gap-4 px-card-padding py-3 eyebrow border-b border-ice-100/10">
                <span>Проект</span>
                <span>Статус</span>
                <span className="text-right">Вложения</span>
                <span className="text-right">Доходность</span>
                <span />
              </div>
              <ul className="divide-y divide-ice-100/10">
                {shown.map((x) => (
                  <ProjectRow key={x.id} item={x} onEdit={() => setEditing(x)} onDelete={() => setDeleting(x)} />
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <ProjectForm
        key={editing === 'new' ? 'new' : editing?.id ?? 'none'}
        item={editing}
        onClose={() => setEditing(null)}
        onDone={reload}
      />

      <Modal
        open={!!deleting}
        title="Удалить проект?"
        onClose={() => setDeleting(null)}
        onSubmit={remove}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Отмена
            </Button>
            <Button type="submit" variant="danger" icon="delete">
              Удалить
            </Button>
          </>
        }
      >
        <p className="text-body-sm text-on-surface-variant">
          «{deleting?.title}» будет удалён из портфеля. Действие нельзя отменить.
        </p>
      </Modal>
    </Page>
  );
}

function FilterLabel({ text, n }: { text: string; n: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {text}
      <span className="tabular-nums text-muted">{n}</span>
    </span>
  );
}

function ProjectRow({ item: x, onEdit, onDelete }: { item: ProjectsItem; onEdit: () => void; onDelete: () => void }) {
  const st = x.status ? STATUS_TONE[x.status] : null;
  return (
    <li className="group px-card-padding py-4 grid gap-3 lg:gap-4 lg:items-center grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_9rem_10rem_8rem_5.5rem] hover:bg-ice-100/5 transition-colors">
      <div className="min-w-0">
        <div className="text-body-lg font-medium text-on-surface break-words lg:truncate" title={x.title}>
          {x.title}
        </div>
        <div className="text-body-sm text-muted">старт: {date(x.startDate)}</div>
      </div>
      <div className="lg:order-none order-last col-span-2 lg:col-span-1 flex flex-wrap items-center gap-x-4 gap-y-2 lg:block">
        {st && x.status ? (
          <Badge tone={st.tone} icon={st.icon}>
            {PROJECT_STATUSES[x.status]}
          </Badge>
        ) : (
          <span className="text-muted">—</span>
        )}
        <span className="lg:hidden text-body-sm text-on-surface tabular-nums">{x.amount !== undefined ? money(x.amount) : '—'}</span>
        <span className="lg:hidden text-body-sm">{x.yieldPct !== undefined ? <Delta value={x.yieldPct} digits={2} /> : <span className="text-muted">—</span>}</span>
      </div>
      <div className="hidden lg:block text-right text-body-sm text-on-surface tabular-nums">{x.amount !== undefined ? money(x.amount) : <span className="text-muted">—</span>}</div>
      <div className="hidden lg:block text-right text-body-sm">{x.yieldPct !== undefined ? <Delta value={x.yieldPct} digits={2} /> : <span className="text-muted">—</span>}</div>
      <div className="flex justify-end gap-1 row-start-1 col-start-2 lg:row-auto lg:col-auto">
        <button type="button" onClick={onEdit} className="p-2 rounded-full text-muted hover:text-on-surface hover:bg-ice-100/10 transition-colors" aria-label={`Изменить «${x.title}»`} title="Изменить">
          <Icon name="edit" className="text-body-lg" />
        </button>
        <button type="button" onClick={onDelete} className="p-2 rounded-full text-muted hover:text-negative hover:bg-negative/10 transition-colors" aria-label={`Удалить «${x.title}»`} title="Удалить">
          <Icon name="delete" className="text-body-lg" />
        </button>
      </div>
    </li>
  );
}

function ProjectForm({ item, onClose, onDone }: { item: ProjectsItem | 'new' | null; onClose: () => void; onDone: () => void }) {
  const user = useAuth((s) => s.user)!;
  const existing = item && item !== 'new' ? item : null;
  const [form, setForm] = useState({
    title: existing?.title ?? '',
    amount: existing?.amount !== undefined ? String(existing.amount) : '',
    yieldPct: existing?.yieldPct !== undefined ? String(existing.yieldPct) : '',
    startDate: existing?.startDate ?? '',
    status: existing?.status ?? ('planned' as ProjectStatus),
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setBusy(true);
    const input: ProjectsItemInput = {
      title: form.title,
      amount: parseNum(form.amount),
      yieldPct: parseNum(form.yieldPct),
      startDate: form.startDate || undefined,
      status: form.status,
    };
    try {
      if (existing) await projectsApi.update(user, existing.id, input);
      else await projectsApi.create(user, input);
      toast.success(existing ? 'Изменения сохранены' : 'Проект добавлен');
      onDone();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={item !== null}
      title={existing ? 'Проект' : 'Новый проект'}
      onClose={onClose}
      onSubmit={save}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" loading={busy} disabled={!form.title.trim()}>
            {existing ? 'Сохранить' : 'Добавить'}
          </Button>
        </>
      }
    >
      <Field label="Название">
        <TextInput value={form.title} onChange={set('title')} maxLength={200} required />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Вложения, ₸">
          <TextInput value={form.amount} onChange={set('amount')} inputMode="decimal" placeholder="0" />
        </Field>
        <Field label="Доходность, % годовых" hint="Убыток — со знаком минус">
          <TextInput value={form.yieldPct} onChange={set('yieldPct')} inputMode="decimal" placeholder="0" />
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Дата старта">
          <TextInput type="date" value={form.startDate} onChange={set('startDate')} />
        </Field>
        <Field label="Статус">
          <Select value={form.status} onChange={set('status')}>
            {(Object.keys(PROJECT_STATUSES) as ProjectStatus[]).map((s) => (
              <option key={s} value={s}>
                {PROJECT_STATUSES[s]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
