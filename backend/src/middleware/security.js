/** Заголовки безопасности и простой лимит запросов по IP (защита входа от перебора) */

export function securityHeaders(_req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
}

export function rateLimit({ windowMs, max }) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip;
    const rec = hits.get(key);
    if (!rec || now - rec.start > windowMs) hits.set(key, { start: now, count: 1 });
    else if (++rec.count > max) return res.status(429).json({ ok: false, error: 'Слишком много запросов — подождите минуту' });
    if (hits.size > 10_000) hits.clear();
    next();
  };
}
