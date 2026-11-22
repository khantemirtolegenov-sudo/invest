/**
 * Кнопка проекта: варианты и размеры — только отсюда, свои кнопки в страницах не рисуем.
 * Основа — «жидкое стекло» glisse (преломление, отклик на нажатие). Золото (filled) —
 * только у главного действия экрана; остальное — прозрачное стекло цвета ice.
 */
import { Button as GlassButton } from 'glisse';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const variants: Record<Variant, string> = {
  primary: 'hub-btn-primary',
  secondary: '',
  ghost: 'hub-btn-ghost',
  danger: '',
};
const sizes: Record<Size, string> = { sm: 'hub-btn-sm', md: '' };

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: string;
  loading?: boolean;
  children?: ReactNode;
}

export function Button({ variant = 'primary', size = 'md', icon, loading, children, className = '', disabled, type = 'button', ...rest }: Props) {
  const glyph = loading ? (
    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
  ) : icon ? (
    <Icon name={icon} className="text-body-lg" />
  ) : undefined;
  return (
    <GlassButton
      type={type}
      variant={variant === 'primary' ? 'filled' : 'glass'}
      destructive={variant === 'danger'}
      icon={glyph}
      className={`hub-btn ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {children}
    </GlassButton>
  );
}
