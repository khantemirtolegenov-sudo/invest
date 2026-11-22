/** Охрана маршрутов. Это UX: закрытые данные сервер и так не отдаст в снапшот */
import type { ReactNode } from 'react';
import { useAuth } from '../../store/auth';
import { canAccessTool, isAdmin } from '../../utils/permissions';
import { EmptyState } from '../ui/States';

const Denied = () => (
  <div className="p-6">
    <EmptyState icon="lock" title="Недостаточно прав" text="Доступ к разделу выдаёт администратор." />
  </div>
);

export function RequireAdmin({ children }: { children: ReactNode }) {
  const user = useAuth((s) => s.user);
  return isAdmin(user) ? <>{children}</> : <Denied />;
}

export function RequireTool({ tool, children }: { tool: string; children: ReactNode }) {
  const user = useAuth((s) => s.user);
  return canAccessTool(user, tool) ? <>{children}</> : <Denied />;
}
