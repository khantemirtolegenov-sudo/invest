/** Кнопка проекта: варианты и размеры — только отсюда, свои кнопки в страницах не рисуем */
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-container shadow-card',
  secondary: 'bg-surface-container-lowest border border-outline-variant text-primary hover:bg-surface-container-low',
  ghost: 'text-primary hover:bg-surface-container',
  danger: 'bg-danger text-on-primary hover:opacity-90',
};
const sizes: Record<Size, string> = { sm: 'px-3 py-1.5 text-body-sm', md: 'px-4 py-2.5 text-body-sm' };

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: string;
  loading?: boolean;
  children?: ReactNode;
}

export function Button({ variant = 'primary', size = 'md', icon, loading, children, className = '', disabled, ...rest }: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : icon && <Icon name={icon} className="text-body-lg" />}
      {children}
    </button>
  );
}
