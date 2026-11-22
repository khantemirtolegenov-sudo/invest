/**
 * Три состояния каждого экрана — обязательны: загрузка, ошибка (с «Повторить»), пусто.
 */
import type { ReactNode } from 'react';
import { Button } from './Button';
import { Icon } from './Icon';

export function Spinner({ className = '' }: { className?: string }) {
  return <span className={`inline-block w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin ${className}`} />;
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="glass-card p-card-padding animate-pulse">
          <div className="h-4 w-1/3 bg-ice-100/[0.07] rounded mb-3" />
          <div className="h-3 w-2/3 bg-ice-100/[0.04] rounded" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon = 'inbox', title, text, action }: { icon?: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="glass-card p-card-padding text-center py-12 space-y-2">
      <Icon name={icon} className="text-display-lg text-muted/60" />
      <div className="font-display text-headline-md text-on-surface">{title}</div>
      {text && <div className="text-body-sm text-muted max-w-md mx-auto">{text}</div>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ text = 'Не удалось загрузить данные', onRetry }: { text?: string; onRetry?: () => void }) {
  return (
    <div className="glass-card p-card-padding text-center py-10 space-y-3">
      <Icon name="error" className="text-display-lg text-negative" />
      <div className="text-body-sm text-on-surface">{text}</div>
      {onRetry && (
        <Button variant="secondary" icon="refresh" onClick={onRetry}>
          Повторить
        </Button>
      )}
    </div>
  );
}
