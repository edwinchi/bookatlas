import type { Request, Response, NextFunction } from 'express';

type Rule = { prefix: string; limit: number };
type Window = { count: number; resetAt: number };

/** Most specific prefix wins, so `/api/account/export` can be stricter than `/api/account`. */
export function ruleFor(path: string, rules: readonly Rule[]): Rule | undefined {
  return rules
    .filter(rule => path === rule.prefix || path.startsWith(`${rule.prefix}/`))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];
}

/**
 * Fixed-window, per-client limiter for abuse-prone routes. It runs before identity resolution so
 * floods never reach the identity provider. State is per process: on serverless or multiple
 * replicas the effective limit is per instance, which still caps bursts from a single client.
 */
export function rateLimit(rules: readonly Rule[], windowMs = 60_000, now = () => Date.now()) {
  const windows = new Map<string, Window>();
  return (req: Request, res: Response, next: NextFunction) => {
    const path = req.originalUrl.split('?')[0].replace(/\/+$/, '');
    const rule = ruleFor(path, rules);
    if (!rule) { next(); return; }
    const at = now();
    if (windows.size > 10_000) {
      for (const [key, window] of windows) if (window.resetAt <= at) windows.delete(key);
    }
    const key = `${rule.prefix}|${req.ip}`;
    let window = windows.get(key);
    if (!window || window.resetAt <= at) {
      window = { count: 0, resetAt: at + windowMs };
      windows.set(key, window);
    }
    window.count += 1;
    res.setHeader('RateLimit-Limit', String(rule.limit));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, rule.limit - window.count)));
    if (window.count > rule.limit) {
      const retryAfter = Math.ceil((window.resetAt - at) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      req.log?.warn({ event: 'ratelimit.blocked', path: rule.prefix }, 'Rate limit exceeded');
      res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
      return;
    }
    next();
  };
}
