/** Профиль: своя карточка, смена пароля, (модуль telegram) привязка бота */
import { useState } from 'react';
import { authApi, usersApi } from '../api';
// @module:telegram:start
import { telegramApi } from '../api';
import { useAsync } from '../hooks/useAsync';
// @module:telegram:end
import { Page } from '../components/layout/AppLayout';
import { Button } from '../components/ui/Button';
import { Field, TextInput } from '../components/ui/Form';
import { Icon } from '../components/ui/Icon';
import { useAuth } from '../store/auth';
import { toast } from '../store/toast';

export function ProfilePage() {
  const user = useAuth((s) => s.user)!;
  const setUser = useAuth((s) => s.setUser);
  const [card, setCard] = useState({ name: user.name, department: user.department ?? '', position: user.position ?? '' });
  const [pw, setPw] = useState({ current: '', next: '' });
  const [busy, setBusy] = useState(false);

  const saveCard = async () => {
    try {
      setUser(await usersApi.updateSelf(user, card));
      toast.success('Сохранено');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const changePassword = async () => {
    setBusy(true);
    try {
      setUser(await authApi.changePassword(pw.current, pw.next));
      setPw({ current: '', next: '' });
      toast.success('Пароль изменён');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page title="Профиль" subtitle={user.email}>
      {user.mustChangePassword && (
        <div className="glass-card p-card-padding text-body-sm text-warning flex items-center gap-2 border-warning/25"><Icon name="warning" />У вас временный пароль — смените его ниже.</div>
      )}
      <div className="grid gap-5 lg:grid-cols-2 items-start">
        <form className="glass-card p-card-padding space-y-4" onSubmit={(e) => { e.preventDefault(); void saveCard(); }}>
          <div className="font-display text-headline-md lg:text-display-lg-mobile">Карточка</div>
          <Field label="Имя и фамилия">
            <TextInput value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} />
          </Field>
          <Field label="Отдел">
            <TextInput value={card.department} onChange={(e) => setCard({ ...card, department: e.target.value })} />
          </Field>
          <Field label="Должность">
            <TextInput value={card.position} onChange={(e) => setCard({ ...card, position: e.target.value })} />
          </Field>
          <Button type="submit">Сохранить</Button>
        </form>
        <div className="space-y-5">
          <form className="glass-card p-card-padding space-y-4" onSubmit={(e) => { e.preventDefault(); if (pw.current && pw.next.length >= 8) void changePassword(); }}>
            <div className="font-display text-headline-md lg:text-display-lg-mobile">Пароль</div>
            <Field label="Текущий пароль">
              <TextInput type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
            </Field>
            <Field label="Новый пароль" hint="Не короче 8 символов">
              <TextInput type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
            </Field>
            <Button type="submit" loading={busy} disabled={!pw.current || pw.next.length < 8}>
              Сменить пароль
            </Button>
          </form>
          {/* @module:telegram:start */}
          <TelegramCard />
          {/* @module:telegram:end */}
        </div>
      </div>
    </Page>
  );
}

// @module:telegram:start
function TelegramCard() {
  const { data, loading, reload } = useAsync(() => telegramApi.status(), []);
  if (loading || !data?.enabled) return null;
  const link = async () => {
    try {
      const { url } = await telegramApi.link();
      window.open(url, '_blank', 'noopener');
      toast.info('Откройте бота и нажмите «Запустить», затем обновите страницу');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const unlink = async () => {
    await telegramApi.unlink();
    reload();
  };
  return (
    <div className="glass-card p-card-padding space-y-3">
      <div className="font-display text-headline-md lg:text-display-lg-mobile">Telegram</div>
      <div className="text-body-sm text-on-surface-variant">
        {data.linked ? 'Уведомления приходят в Telegram.' : 'Подключите бота — уведомления будут приходить и в Telegram.'}
      </div>
      {data.linked ? (
        <Button variant="secondary" onClick={unlink}>Отключить</Button>
      ) : (
        <Button icon="send" onClick={link}>Подключить Telegram</Button>
      )}
    </div>
  );
}
// @module:telegram:end
