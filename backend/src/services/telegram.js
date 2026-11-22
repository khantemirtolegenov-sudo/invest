/**
 * Модуль telegram: уведомления портала дублируются в Telegram-бот.
 *
 * Устройство (transactional outbox): новое уведомление ставится в очередь
 * telegram_outbox ТОЙ ЖЕ транзакцией, что и запись в базу (routes/db.js → enqueue).
 * Отправка идёт отдельным циклом: недоступность Telegram не ломает синк, а пакет,
 * который откатился, ничего не отправит. Привязка чата — одноразовой ссылкой
 * из профиля (`/start <токен>`), chat_id — персональные данные, в снапшот не уходят.
 * Без TELEGRAM_BOT_TOKEN модуль молчит, портал работает как обычно.
 */
import crypto from 'node:crypto';
import { config } from '../config.js';
import { query } from '../db/connection.js';

const API = () => `https://api.telegram.org/bot${config.telegramToken}`;
export const telegramEnabled = () => Boolean(config.telegramToken);

/** Поставить уведомления в очередь (внутри транзакции синка) */
export async function enqueue(client, notifications) {
  if (!telegramEnabled()) return;
  for (const n of notifications ?? []) {
    if (!n?.userId) continue;
    const text = [n.title, n.text].filter(Boolean).join('\n');
    await client.query('INSERT INTO telegram_outbox (user_id, text, created_at) VALUES ($1, $2, $3)', [n.userId, text, new Date().toISOString()]);
  }
}

/** Одноразовая ссылка привязки (живёт 30 минут) */
export async function linkUrl(userId) {
  const token = crypto.randomBytes(16).toString('hex');
  await query('INSERT INTO telegram_link_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)', [
    token,
    userId,
    new Date(Date.now() + 30 * 60_000).toISOString(),
  ]);
  return `https://t.me/${config.telegramUsername}?start=${token}`;
}

export async function linkStatus(userId) {
  return { enabled: telegramEnabled(), linked: (await query('SELECT 1 FROM telegram_links WHERE user_id = $1', [userId])).length > 0 };
}

export const unlink = (userId) => query('DELETE FROM telegram_links WHERE user_id = $1', [userId]);

async function call(method, body) {
  const res = await fetch(`${API()}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(35_000),
  });
  return res.json();
}

let offset = 0;
let running = false;

async function pollUpdates() {
  const data = await call('getUpdates', { offset, timeout: 25, allowed_updates: ['message'] });
  for (const u of data?.result ?? []) {
    offset = u.update_id + 1;
    const text = u.message?.text ?? '';
    const chatId = u.message?.chat?.id;
    const m = /^\/start\s+([a-f0-9]{32})$/.exec(text);
    if (!chatId) continue;
    if (!m) {
      await call('sendMessage', { chat_id: chatId, text: 'Чтобы получать уведомления, откройте ссылку привязки из профиля в портале.' });
      continue;
    }
    const rows = await query('DELETE FROM telegram_link_tokens WHERE token = $1 RETURNING user_id, expires_at', [m[1]]);
    const row = rows[0];
    if (!row || row.expires_at < new Date().toISOString()) {
      await call('sendMessage', { chat_id: chatId, text: 'Ссылка устарела — получите новую в профиле портала.' });
      continue;
    }
    await query(
      `INSERT INTO telegram_links (user_id, chat_id, linked_at) VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET chat_id = EXCLUDED.chat_id, linked_at = EXCLUDED.linked_at`,
      [row.user_id, String(chatId), new Date().toISOString()],
    );
    await call('sendMessage', { chat_id: chatId, text: 'Готово: уведомления портала будут приходить сюда.' });
  }
}

async function sendPending() {
  const rows = await query(
    `SELECT o.id, o.text, l.chat_id FROM telegram_outbox o JOIN telegram_links l ON l.user_id = o.user_id
     WHERE o.sent_at IS NULL AND o.attempts < 5 ORDER BY o.id LIMIT 20`,
  );
  for (const r of rows) {
    const res = await call('sendMessage', { chat_id: r.chat_id, text: r.text }).catch(() => null);
    if (res?.ok) await query('UPDATE telegram_outbox SET sent_at = $2 WHERE id = $1', [r.id, new Date().toISOString()]);
    else await query('UPDATE telegram_outbox SET attempts = attempts + 1 WHERE id = $1', [r.id]);
  }
  // непривязанным отправлять некуда — старые задания убираем
  await query("DELETE FROM telegram_outbox WHERE created_at < $1", [new Date(Date.now() - 7 * 86400_000).toISOString()]);
}

export function startTelegram() {
  if (!telegramEnabled() || running) return;
  running = true;
  const loop = async () => {
    while (running) {
      try {
        await pollUpdates();
        await sendPending();
      } catch (e) {
        console.error('[telegram]', e.message);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  };
  void loop();
  console.log('[telegram] бот запущен');
}

export function stopTelegram() {
  running = false;
}
