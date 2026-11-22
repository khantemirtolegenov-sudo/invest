/**
 * Пользователи (только админ): заявки на подтверждение, роли, статусы, гранты к
 * инструментам «только админ», новый сотрудник с временным паролем.
 */
import { useState } from 'react';
import { authApi, toolsApi, usersApi } from '../api';
import { Page } from '../components/layout/AppLayout';
import { Button } from '../components/ui/Button';
import { Field, Select, TextInput, Toggle } from '../components/ui/Form';
import { Modal } from '../components/ui/Modal';
import { CardSkeleton, EmptyState, ErrorState } from '../components/ui/States';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../store/auth';
import { toast } from '../store/toast';
import type { Role, User, UserStatus } from '../types';

const ROLES: Record<Role, string> = { employee: 'Сотрудник', manager: 'Руководитель', admin: 'Администратор' };
const STATUSES: Record<UserStatus, string> = { active: 'Активен', pending: 'Ждёт подтверждения', blocked: 'Заблокирован' };

export function UsersPage() {
  const me = useAuth((s) => s.user)!;
  const { data, loading, error, reload } = useAsync(() => usersApi.list(), []);
  const [creating, setCreating] = useState(false);
  const grantable = toolsApi.grantable();

  const update = async (u: User, patch: Parameters<typeof usersApi.update>[2]) => {
    try {
      await usersApi.update(me, u.id, patch);
      toast.success('Сохранено');
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const resetPassword = async (u: User) => {
    const password = window.prompt(`Новый временный пароль для ${u.name} (не короче 8 символов)`);
    if (!password) return;
    try {
      await authApi.resetPassword(u.id, password);
      toast.success('Пароль задан — при входе сотрудник сменит его');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const pending = data?.filter((u) => u.status === 'pending') ?? [];
  return (
    <Page title="Пользователи" actions={<Button icon="person_add" onClick={() => setCreating(true)}>Добавить</Button>}>
      {loading ? (
        <CardSkeleton />
      ) : error ? (
        <ErrorState text={error} onRetry={reload} />
      ) : !data?.length ? (
        <EmptyState icon="group" title="Пользователей нет" />
      ) : (
        <>
          {pending.length > 0 && (
            <div className="glass-card p-card-padding space-y-2">
              <div className="eyebrow !text-warning">Ждут подтверждения: {pending.length}</div>
              {pending.map((u) => (
                <div key={u.id} className="flex flex-wrap items-center gap-2 justify-between">
                  <span className="text-body-sm">
                    {u.name} · {u.email}
                  </span>
                  <span className="flex gap-2">
                    <Button size="sm" onClick={() => update(u, { status: 'active' })}>Подтвердить</Button>
                    <Button size="sm" variant="secondary" onClick={() => update(u, { status: 'blocked' })}>Отклонить</Button>
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="space-y-2">
            {data.map((u) => (
              <div key={u.id} className="glass-card p-card-padding space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-body-lg font-semibold text-on-surface">{u.name}</div>
                    <div className="text-body-sm text-muted">
                      {u.email}
                      {u.position ? ` · ${u.position}` : ''}
                      {u.department ? ` · ${u.department}` : ''}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full sm:w-auto">
                    <Select value={u.role} onChange={(e) => update(u, { role: e.target.value as Role })} className="sm:!w-auto !py-1.5 !rounded-full">
                      {Object.entries(ROLES).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </Select>
                    <Select value={u.status} onChange={(e) => update(u, { status: e.target.value as UserStatus })} className="sm:!w-auto !py-1.5 !rounded-full">
                      {Object.entries(STATUSES).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </Select>
                    <Button size="sm" variant="ghost" icon="key" className="col-span-2 sm:col-span-1" onClick={() => resetPassword(u)}>Пароль</Button>
                  </div>
                </div>
                {grantable.length > 0 && u.role !== 'admin' && (
                  <div className="flex flex-wrap gap-x-5 gap-y-3 pt-3 border-t border-ice-100/10">
                    {grantable.map((t) => {
                      const on = u.toolAccess?.includes(t.id) ?? false;
                      return (
                        <Toggle
                          key={t.id}
                          label={t.name}
                          checked={on}
                          onChange={() =>
                            update(u, { toolAccess: on ? (u.toolAccess ?? []).filter((x) => x !== t.id) : [...(u.toolAccess ?? []), t.id] })
                          }
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
      <CreateUser open={creating} onClose={() => setCreating(false)} onDone={reload} />
    </Page>
  );
}

function CreateUser({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'employee' as Role, department: '', position: '' });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await authApi.createUser(form);
      toast.success('Сотрудник добавлен — передайте ему временный пароль');
      setForm({ name: '', email: '', password: '', role: 'employee', department: '', position: '' });
      onDone();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={open}
      title="Новый сотрудник"
      onClose={onClose}
      onSubmit={save}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Отмена</Button>
          <Button type="submit" loading={busy}>Добавить</Button>
        </>
      }
    >
      <Field label="Имя и фамилия">
        <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </Field>
      <Field label="Email">
        <TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </Field>
      <Field label="Временный пароль" hint="Не короче 8 символов; при первом входе сотрудник сменит его">
        <TextInput value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Отдел">
          <TextInput value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
        </Field>
        <Field label="Должность">
          <TextInput value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
        </Field>
      </div>
      <Field label="Роль">
        <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
          {Object.entries(ROLES).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </Select>
      </Field>
    </Modal>
  );
}
