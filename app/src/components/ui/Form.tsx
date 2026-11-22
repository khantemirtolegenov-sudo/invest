/** Поля формы: подпись + ввод в едином стиле */
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

const fieldCls =
  'w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2.5 text-body-sm text-on-surface placeholder:text-muted focus:outline-none focus:border-accent';

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-label-bold uppercase text-on-surface-variant">{label}</span>
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
    <select className={`${fieldCls} ${className}`} {...rest}>
      {children}
    </select>
  );
}
