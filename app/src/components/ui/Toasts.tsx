/** Контейнер тостов (подключён один раз в App). Тон — по смыслу: успех / ошибка / информация. */
import { useToasts } from '../../store/toast';
import { Icon } from './Icon';

const STYLE = {
  success: ['check_circle', 'text-positive', 'bg-positive'],
  error: ['error', 'text-negative', 'bg-negative'],
  info: ['info', 'text-info', 'bg-info'],
} as const;

export function Toasts() {
  const { items, remove } = useToasts();
  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-[60] space-y-2 sm:w-96" role="status" aria-live="polite">
      {items.map((t) => (
        <button key={t.id} onClick={() => remove(t.id)} className="glass-card relative overflow-hidden w-full pl-4 pr-3 py-3 flex items-start gap-2.5 text-left">
          <span className={`absolute left-0 inset-y-0 w-0.5 ${STYLE[t.kind][2]}`} />
          <Icon name={STYLE[t.kind][0]} className={STYLE[t.kind][1]} />
          <span className="text-body-sm text-on-surface">{t.text}</span>
        </button>
      ))}
    </div>
  );
}
