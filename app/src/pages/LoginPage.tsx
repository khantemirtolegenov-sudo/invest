/** Вход и (модуль registration) заявка на регистрацию */
import { useState, type FormEvent, type ReactNode } from 'react';
// @module:registration:start
import type { ChangeEvent } from 'react';
// @module:registration:end
import { authApi } from '../api';
import { BrandMark } from '../components/layout/AppLayout';
import { Button } from '../components/ui/Button';
import { Field, TextInput } from '../components/ui/Form';
import { useAuth } from '../store/auth';
import { toast } from '../store/toast';

export function LoginPage() {
  let onRegister: (() => void) | undefined;
  // @module:registration:start
  const [registering, setRegistering] = useState(false);
  if (registering) return <RegisterForm onBack={() => setRegistering(false)} />;
  onRegister = () => setRegistering(true);
  // @module:registration:end
  return <LoginForm onRegister={onRegister} />;
}

function Shell({ subtitle, children, onSubmit }: { subtitle: string; children: ReactNode; onSubmit: (e: FormEvent) => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="glass-card w-full max-w-sm p-6 sm:p-8 space-y-5">
        <div>
          <div className="mb-6"><BrandMark large /></div>
          <div className="eyebrow mt-1">{subtitle}</div>
        </div>
        {children}
      </form>
    </div>
  );
}

function LoginForm({ onRegister }: { onRegister?: () => void }) {
  const setUser = useAuth((s) => s.setUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      setUser(await authApi.login(email, password));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Shell subtitle="Вход в портал" onSubmit={submit}>
      <Field label="Email">
        <TextInput type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </Field>
      <Field label="Пароль">
        <TextInput type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </Field>
      <Button type="submit" className="w-full" loading={busy}>
        Войти
      </Button>
      {onRegister && (
        <button type="button" className="w-full text-body-sm text-muted hover:text-gold transition-colors" onClick={onRegister}>
          Нет аккаунта? Зарегистрироваться
        </button>
      )}
    </Shell>
  );
}

// @module:registration:start
function RegisterForm({ onBack }: { onBack: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', department: '', position: '' });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await authApi.register(form);
      toast.success('Заявка отправлена — войти можно после подтверждения администратором');
      onBack();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Shell subtitle="Заявка на регистрацию" onSubmit={submit}>
      <Field label="Имя и фамилия">
        <TextInput value={form.name} onChange={set('name')} required />
      </Field>
      <Field label="Email">
        <TextInput type="email" value={form.email} onChange={set('email')} required />
      </Field>
      <Field label="Пароль" hint="Не короче 8 символов">
        <TextInput type="password" autoComplete="new-password" value={form.password} onChange={set('password')} required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Отдел">
          <TextInput value={form.department} onChange={set('department')} />
        </Field>
        <Field label="Должность">
          <TextInput value={form.position} onChange={set('position')} />
        </Field>
      </div>
      <Button type="submit" className="w-full" loading={busy}>
        Отправить заявку
      </Button>
      <button type="button" className="w-full text-body-sm text-muted hover:text-gold transition-colors" onClick={onBack}>
        Уже есть аккаунт? Войти
      </button>
    </Shell>
  );
}
// @module:registration:end
