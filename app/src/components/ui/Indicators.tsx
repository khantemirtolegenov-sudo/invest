/**
 * Язык показателей. Правила палитры (см. tailwind.config.js):
 * - positive / negative — ТОЛЬКО финансовый результат относительно понятной базы;
 * - warning — риски, требующие внимания; info — нейтральные события; neutral — нет изменений.
 * - Gold сюда не входит: он не обозначает прибыль.
 * Цвет всегда продублирован знаком, иконкой или текстом — интерфейс читается и без цвета.
 */
import type { ReactNode } from 'react';
import { Icon } from './Icon';

export type Tone = 'positive' | 'negative' | 'warning' | 'info' | 'neutral';

const TONE: Record<Tone, { text: string; bg: string; icon: string }> = {
  positive: { text: 'text-positive', bg: 'bg-positive/10 border-positive/25', icon: 'trending_up' },
  negative: { text: 'text-negative', bg: 'bg-negative/10 border-negative/25', icon: 'trending_down' },
  warning: { text: 'text-warning', bg: 'bg-warning/10 border-warning/25', icon: 'warning' },
  info: { text: 'text-info', bg: 'bg-info/10 border-info/25', icon: 'info' },
  neutral: { text: 'text-neutral', bg: 'bg-neutral/10 border-neutral/25', icon: 'remove' },
};

/** Метка статуса: иконка + текст в тоне показателя */
export function Badge({ tone = 'neutral', icon, children }: { tone?: Tone; icon?: string; children: ReactNode }) {
  const t = TONE[tone];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-label-bold ${t.text} ${t.bg}`}>
      <Icon name={icon ?? t.icon} className="text-body-sm" />
      {children}
    </span>
  );
}

/** Изменение показателя со знаком: +12,4 % / −3,1 % / 0 %. Цвет — по знаку, знак — всегда. */
export function Delta({ value, suffix = ' %', digits = 1, base }: { value: number; suffix?: string; digits?: number; base?: string }) {
  const tone: Tone = value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral';
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  const num = Math.abs(value).toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return (
    <span className={`inline-flex items-center gap-1 tabular-nums font-semibold ${TONE[tone].text}`} title={base ? `к ${base}` : undefined}>
      <Icon name={value > 0 ? 'arrow_upward' : value < 0 ? 'arrow_downward' : 'remove'} className="text-body-sm" />
      {sign}
      {num}
      {suffix}
      {base && <span className="font-normal text-muted">&nbsp;к {base}</span>}
    </span>
  );
}

/** KPI-плитка: подпись капителью, крупная цифра антиквой, необязательная дельта */
export function Stat({ label, value, delta, hint }: { label: string; value: ReactNode; delta?: ReactNode; hint?: string }) {
  return (
    <div className="glass-card p-card-padding space-y-2">
      <div className="eyebrow">{label}</div>
      <div className="font-display text-display-lg-mobile lg:text-display-lg text-on-surface tabular-nums">{value}</div>
      {(delta || hint) && (
        <div className="flex flex-wrap items-center gap-2 text-body-sm">
          {delta}
          {hint && <span className="text-muted">{hint}</span>}
        </div>
      )}
    </div>
  );
}

/** Прогресс выполнения — золото (это интерфейсный акцент, не финансовый результат) */
export function Progress({ value, label }: { value: number; label?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex justify-between text-body-sm">
          <span className="text-on-surface-variant">{label}</span>
          <span className="tabular-nums text-on-surface">{Math.round(v)} %</span>
        </div>
      )}
      <div className="h-1 rounded-full bg-ice-100/10 overflow-hidden" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-gold" style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}
