/**
 * Модальное окно. Пока оно открыто, фоновое обновление данных на паузе
 * (suspendLiveSync): пришедший снапшот не пересоберёт форму под руками.
 */
import { useEffect, type ReactNode } from 'react';
import { suspendLiveSync } from '../../api/db';
import { Icon } from './Icon';

export function Modal({ open, title, onClose, children, footer }: { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const release = suspendLiveSync();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      release();
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-on-surface/40 p-0 sm:p-4" onMouseDown={onClose}>
      <div className="glass-card w-full sm:max-w-lg max-h-screen overflow-y-auto" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-card-padding pt-card-padding">
          <h2 className="text-headline-md text-on-surface">{title}</h2>
          <button className="text-muted hover:text-on-surface" onClick={onClose} aria-label="Закрыть">
            <Icon name="close" />
          </button>
        </div>
        <div className="p-card-padding space-y-4">{children}</div>
        {footer && <div className="px-card-padding pb-card-padding flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
