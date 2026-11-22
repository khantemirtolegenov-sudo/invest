/**
 * Каркас приложения: боковая панель (desktop, от lg = 1100px) и шапка с меню (mobile).
 * Инструменты в меню — из витрины (коллекция tools) с учётом доступа: новая карточка
 * появляется в меню сама, отдельной правки навигации не нужно.
 */
import { useState, type ReactNode } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { authApi, notificationsApi, toolsApi } from '../../api';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../store/auth';
import { isAdmin } from '../../utils/permissions';
import { Icon } from '../ui/Icon';

export const PROJECT_NAME = '{{PROJECT_NAME}}';

function NavItem({ to, icon, label, badge, onClick }: { to: string; icon: string; label: string; badge?: number; onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-body-sm font-medium transition-colors ${
          isActive ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container'
        }`
      }
    >
      <Icon name={icon} className="text-body-lg" />
      <span className="flex-1 truncate">{label}</span>
      {badge ? <span className="min-w-5 px-1.5 rounded-full bg-danger text-on-primary text-label-bold text-center">{badge}</span> : null}
    </NavLink>
  );
}

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const user = useAuth((s) => s.user)!;
  const { data: tools } = useAsync(() => toolsApi.visible(user), [user.id]);
  const { data: unread } = useAsync(async () => notificationsApi.unreadCount(user), [user.id]);
  return (
    <nav className="space-y-1">
      <NavItem to="/" icon="home" label="Главная" onClick={onNavigate} />
      <NavItem to="/notifications" icon="notifications" label="Уведомления" badge={unread ?? 0} onClick={onNavigate} />
      {(tools ?? []).length > 0 && <div className="pt-4 pb-1 px-3 text-label-bold uppercase text-muted">Инструменты</div>}
      {(tools ?? []).map((t) => (
        <NavItem key={t.id} to={t.path ?? '/'} icon={t.icon ?? 'widgets'} label={t.name} onClick={onNavigate} />
      ))}
      {isAdmin(user) && (
        <>
          <div className="pt-4 pb-1 px-3 text-label-bold uppercase text-muted">Администрирование</div>
          <NavItem to="/users" icon="group" label="Пользователи" onClick={onNavigate} />
        </>
      )}
    </nav>
  );
}

export function AppLayout() {
  const user = useAuth((s) => s.user)!;
  const setUser = useAuth((s) => s.setUser);
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const logout = () => {
    authApi.logout();
    setUser(null);
    navigate('/');
  };
  const account = (
    <div className="flex items-center gap-2">
      <NavLink to="/profile" className="flex-1 min-w-0 flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-container" onClick={() => setMenu(false)}>
        <span className="w-8 h-8 rounded-full bg-primary-fixed text-primary text-label-bold flex items-center justify-center shrink-0">
          {user.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block text-body-sm font-semibold text-on-surface truncate">{user.name}</span>
          <span className="block text-label-bold text-muted truncate">{user.position || user.email}</span>
        </span>
      </NavLink>
      <button className="text-muted hover:text-danger p-1" onClick={logout} title="Выйти" aria-label="Выйти">
        <Icon name="logout" />
      </button>
    </div>
  );
  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 h-screen sticky top-0 border-r border-outline-variant/50 bg-surface-container-lowest p-4 gap-4">
        <div className="px-3 py-2 text-headline-md text-primary">{PROJECT_NAME}</div>
        <div className="flex-1 overflow-y-auto">
          <Nav />
        </div>
        {account}
      </aside>
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between bg-surface-container-lowest border-b border-outline-variant/50 px-4 py-3">
        <span className="text-headline-md text-primary">{PROJECT_NAME}</span>
        <button onClick={() => setMenu((m) => !m)} aria-label="Меню">
          <Icon name={menu ? 'close' : 'menu'} />
        </button>
      </header>
      {menu && (
        <div className="lg:hidden fixed inset-x-0 top-14 bottom-0 z-30 bg-surface-container-lowest p-4 flex flex-col gap-4 overflow-y-auto">
          <Nav onNavigate={() => setMenu(false)} />
          {account}
        </div>
      )}
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}

/** Заголовок страницы и контейнер — единый отступ на всех экранах */
export function Page({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="px-4 lg:px-container-padding py-6 lg:py-8 max-w-6xl mx-auto space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-display-lg-mobile lg:text-display-lg text-on-surface">{title}</h1>
          {subtitle && <p className="text-body-lg text-on-surface-variant mt-1">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}
