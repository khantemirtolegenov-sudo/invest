/** 404: адрес не найден. Сервер отдаёт эту же страницу со статусом 404 (backend/src/server.js). */
import { Link } from 'react-router-dom';
import { Page } from '../components/layout/AppLayout';
import { Icon } from '../components/ui/Icon';

export function NotFoundPage() {
  return (
    <Page title="Такой страницы нет" subtitle="Адрес мог устареть, или раздел переименовали.">
      <div className="glass-card p-card-padding flex flex-wrap items-center justify-between gap-4">
        <span className="flex items-center gap-3 text-body-sm text-on-surface-variant">
          <Icon name="search_off" className="text-headline-md text-muted" />
          Проверьте адрес или вернитесь к портфелю.
        </span>
        <Link to="/" className="hub-link !mx-0 text-body-sm text-on-surface">
          На главную
        </Link>
      </div>
    </Page>
  );
}
