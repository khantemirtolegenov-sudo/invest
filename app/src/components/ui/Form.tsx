/**
 * Поля формы: подпись капителью + ввод в едином стиле. Нативные элементы (а не Input
 * из glisse) — чтобы сохранить привычный onChange и автозаполнение браузера; вид — то же
 * дымчатое стекло. Переключатель — Switch из glisse с золотым «включено».
 */
import { Switch as GlassSwitch } from 'glisse';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

const fieldCls =
  'w-full bg-ice-100/5 border border-ice-100/10 rounded-lg px-3.5 py-2.5 text-body-sm text-on-surface placeholder:text-muted ' +
  'transition-colors hover:border-ice-100/20 focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/40 focus:bg-ice-100/10 disabled:opacity-50';

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="block eyebrow">{label}</span>
      {children}
      {hint && <span className="block text-body-sm text-muted">{hint}</span>}
    </label>
  );
}

export function TextInput({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldCls} ${className}`} {...rest} />;
}

export function TextArea({ className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${fieldCls} resize-y ${className}`} rows={3} {...rest} />;
}

export function Select({ className = '', children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`hub-select ${fieldCls} pr-9 ${className}`} {...rest}>
      {children}
    </select>
  );
}

/** Переключатель с подписью (вместо чекбокса там, где это «вкл/выкл») */
export function Toggle({ label, checked, onChange, disabled }: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className="inline-flex items-center gap-2.5 text-body-sm text-on-surface-variant cursor-pointer select-none">
      <GlassSwitch checked={checked} onCheckedChange={onChange} disabled={disabled} aria-label={typeof label === 'string' ? label : undefined} />
      <span className={checked ? 'text-on-surface' : ''}>{label}</span>
    </label>
  );
}
