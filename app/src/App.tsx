/**
 * Корень приложения: восстановление сессии, загрузка снапшота, маршруты.
 * Страницы — именованные экспорты, подключаются лениво через named().
 * Новый инструмент = lazy-страница + маршрут под RequireTool (генератор впишет сам по меткам @gen:*).
 */
import { lazy, Suspense, useEffect, useState, type ComponentType } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { authApi } from './api';
import { AppLayout } from './components/layout/AppLayout';
import { RequireAdmin, RequireTool } from './components/layout/guards';
import { Spinner } from './components/ui/States';
import { Toasts } from './components/ui/Toasts';
import { useAuth } from './store/auth';
import { LoginPage } from './pages/LoginPage';

const named = <T extends Record<string, unknown>, K extends keyof T>(p: Promise<T>, key: K) =>
  p.then((m) => ({ default: m[key] as unknown as ComponentType }));

const HomePage = lazy(() => named(import('./pages/HomePage'), 'HomePage'));
const NotificationsPage = lazy(() => named(import('./pages/NotificationsPage'), 'NotificationsPage'));
const ProfilePage = lazy(() => named(import('./pages/ProfilePage'), 'ProfilePage'));
const UsersPage = lazy(() => named(import('./pages/UsersPage'), 'UsersPage'));
// @gen:lazy-pages

// RequireTool используется маршрутами инструментов (их добавляет генератор)
void RequireTool;

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner />
    </div>
  );
}

export function App() {
  const user = useAuth((s) => s.user);
  const setUser = useAuth((s) => s.setUser);
  const [booting, setBooting] = useState(authApi.hasToken());

  useEffect(() => {
    if (!booting) return;
    authApi
      .restore()
      .then(setUser)
      .finally(() => setBooting(false));
  }, [booting, setUser]);

  if (booting) return <Loading />;
  return (
    <BrowserRouter>
      <Toasts />
      {!user ? (
        <LoginPage />
      ) : (
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={user.mustChangePassword ? <Navigate to="/profile" replace /> : <HomePage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route
                path="/users"
                element={
                  <RequireAdmin>
                    <UsersPage />
                  </RequireAdmin>
                }
              />
              {/* @gen:routes */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
      )}
    </BrowserRouter>
  );
}
