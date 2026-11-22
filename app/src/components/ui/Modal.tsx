/**
 * Модальное окно. Пока оно открыто, фоновое обновление данных на паузе
 * (suspendLiveSync): пришедший снапшот не пересоберёт форму под руками.
 * Доступность: фокус уходит в окно и не выходит из него по Tab, фон не прокручивается,
 * после закрытия фокус возвращается на кнопку, которая окно открыла.
 * С `onSubmit` содержимое — форма: Enter отправляет её (кнопке действия — type="submit").
 */
import { useEffect, useRef, type FormEvent, type ReactNode } from 'react';
import { suspendLiveSync } from '../../api/db';
import { Icon } from './Icon';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  onSubmit,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  onSubmit?: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const release = suspendLiveSync();
    const trigger = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const items = () => Array.from(box.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    // Первое поле, а не крестик «Закрыть»
    (items().find((el) => el.matches('input, select, textarea')) ?? items()[0])?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return closeRef.current();
      if (e.key !== 'Tab') return;
      const list = items();
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (!box.current?.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      release();
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      trigger?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit?.();
  };
  const body = (
    <>
      <div className="flex items-center justify-between px-card-padding pt-card-padding">
        <h2 className="font-display text-headline-md text-on-surface">{title}</h2>
        <button type="button" className="text-muted hover:text-on-surface p-2 -mr-2 rounded-full hover:bg-ice-100/10" onClick={onClose} aria-label="Закрыть">
          <Icon name="close" />
        </button>
      </div>
      <div className="p-card-padding space-y-4">{children}</div>
      {footer && <div className="px-card-padding pb-card-padding flex justify-end gap-2">{footer}</div>}
    </>
  );
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-obsidian-950/70 backdrop-blur-sm p-0 sm:p-4" onMouseDown={onClose}>
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="glass-card w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-b-none sm:rounded-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {onSubmit ? <form onSubmit={submit}>{body}</form> : body}
      </div>
    </div>
  );
}
