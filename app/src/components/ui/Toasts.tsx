/** Контейнер тостов (подключён один раз в App) */
import { useToasts } from '../../store/toast';
import { Icon } from './Icon';

const STYLE = {
  success: ['check_circle', 'text-success'],
  error: ['error', 'text-danger'],
  info: ['info', 'text-accent'],
} as const;

export function Toasts() {
  const { items, remove } = useToasts();
  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-50 space-y-2 sm:w-96">
      {items.map((t) => (
        <button key={t.id} onClick={() => remove(t.id)} className="glass-card w-full p-3 flex items-start gap-2 text-left">
          <Icon name={STYLE[t.kind][0]} className={STYLE[t.kind][1]} />
          <span className="text-body-sm text-on-surface">{t.text}</span>
        </button>
      ))}
    </div>
  );
}
