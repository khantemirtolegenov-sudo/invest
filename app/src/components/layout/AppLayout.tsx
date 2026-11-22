/**
 * Каркас приложения: боковая панель (desktop, от lg = 1100px) и шапка с меню (mobile).
 * Инструменты в меню — из витрины (коллекция tools) с учётом доступа: новая карточка
 * появляется в меню сама, отдельной правки навигации не нужно.
 * Вид: панель и шапка — стекло glisse; активный пункт — тонкая золотая черта, не заливка
 * (золото — 5%-акцент, его не должно быть много).
 */
import { Glass } from 'glisse';
import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { authApi, notificationsApi, toolsApi } from '../../api';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../store/auth';
import { isAdmin } from '../../utils/permissions';
import { Icon } from '../ui/Icon';

export const PROJECT_NAME = 'Invest Hub';

/** Знак бренда: монограмма в золотом кольце + название антиквой */
export function BrandMark({ large }: { large?: boolean }) {
  return (
    <span className="flex items-center gap-2.5 min-w-0">
      <span className={`${large ? "w-11 h-11 text-headline-md" : "w-8 h-8 text-body-lg"} shrink-0 rounded-full border border-gold/50 flex items-center justify-center font-display text-gold leading-none`}>
        {PROJECT_NAME.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 1).toUpperCase() || '·'}
      </span>
      <span className={`font-display ${large ? "text-display-lg-mobile" : "text-headline-md"} text-on-surface truncate tracking-tight`}>{PROJECT_NAME}</span>
    </span>
  );
}

function NavItem({ to, icon, label, badge, onClick }: { to: string; icon: string; label: string; badge?: number; onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onClick}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-lg text-body-sm transition-colors ${
          isActive ? 'bg-ice-100/10 text-on-surface font-medium' : 'text-muted hover:text-on-surface hover:bg-ice-100/5'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-full transition-colors ${isActive ? 'bg-gold' : 'bg-transparent'}`} />
          <Icon name={icon} className={`text-body-lg ${isActive ? 'text-gold' : ''}`} />
          <span className="flex-1 truncate">{label}</span>
          {badge ? (
            <span className="min-w-5 px-1.5 rounded-full bg-info/15 text-info text-label-bold text-center tabular-nums" aria-label={`Непрочитанных: ${badge}`}>
              {badge}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  );
}

function Section({ children }: { children: ReactNode }) {
  return <div className="pt-6 pb-2 px-4 eyebrow">{children}</div>;
}

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const user = useAuth((s) => s.user)!;
  const { data: tools } = useAsync(() => toolsApi.visible(user), [user.id]);
  const { data: unread } = useAsync(async () => notificationsApi.unreadCount(user), [user.id]);
  return (
    <nav className="space-y-0.5">
      <NavItem to="/" icon="space_dashboard" label="Главная" onClick={onNavigate} />
      <NavItem to="/notifications" icon="notifications" label="Уведомления" badge={unread ?? 0} onClick={onNavigate} />
      {(tools ?? []).length > 0 && <Section>Инструменты</Section>}
      {(tools ?? []).map((t) => (
        <NavItem key={t.id} to={t.path ?? '/'} icon={t.icon ?? 'widgets'} label={t.name} onClick={onNavigate} />
      ))}
      {isAdmin(user) && (
        <>
          <Section>Администрирование</Section>
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
  const location = useLocation();
  const [menu, setMenu] = useState(false);
  useEffect(() => setMenu(false), [location.pathname]);
  useEffect(() => {
    document.body.style.overflow = menu ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menu]);
  const logout = () => {
    authApi.logout();
    setUser(null);
    navigate('/');
  };
  const account = (
    <div className="flex items-center gap-2 pt-4 border-t border-ice-100/10">
      <NavLink to="/profile" className="flex-1 min-w-0 flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-ice-100/5 transition-colors" onClick={() => setMenu(false)}>
        <span className="w-9 h-9 rounded-full bg-gold-soft text-gold font-display text-body-lg flex items-center justify-center shrink-0 border border-gold/30">
          {user.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block text-body-sm font-medium text-on-surface truncate">{user.name}</span>
          <span className="block text-label-bold font-normal text-muted truncate" title={user.position || user.email}>{user.position || user.email}</span>
        </span>
      </NavLink>
      <button className="text-muted hover:text-on-surface p-2 rounded-full hover:bg-ice-100/10 transition-colors" onClick={logout} title="Выйти" aria-label="Выйти">
        <Icon name="logout" />
      </button>
    </div>
  );
  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden lg:block w-72 shrink-0 h-screen sticky top-0 p-3">
        <Glass className="hub-panel h-full flex flex-col p-4 gap-2">
          <div className="px-2 pt-2 pb-5">
            <BrandMark />
          </div>
          <div className="flex-1 overflow-y-auto -mx-1 px-1">
            <Nav />
          </div>
          {account}
        </Glass>
      </aside>
      <header className="lg:hidden sticky top-0 z-40 px-3 pt-3">
        <Glass className="hub-panel flex items-center justify-between pl-4 pr-2 h-14">
          <BrandMark />
          <button
            className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface hover:bg-ice-100/10"
            onClick={() => setMenu((m) => !m)}
            aria-label={menu ? 'Закрыть меню' : 'Открыть меню'}
            aria-expanded={menu}
          >
            <Icon name={menu ? 'close' : 'menu'} />
          </button>
        </Glass>
      </header>
      {menu && (
        <div className="lg:hidden fixed inset-x-0 top-20 bottom-0 z-30 px-3 pb-3">
          <div className="glass-card h-full p-4 flex flex-col gap-4 overflow-y-auto">
            <div className="flex-1">
              <Nav onNavigate={() => setMenu(false)} />
            </div>
            {account}
          </div>
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
    <div className="px-4 lg:px-container-padding py-6 lg:py-10 max-w-6xl mx-auto space-y-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-display-lg-mobile lg:text-display-lg text-on-surface break-words">{title}</h1>
            {subtitle && <p className="text-body-lg text-muted mt-1.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
        <div className="gold-rule" />
      </div>
      {children}
    </div>
  );
}
