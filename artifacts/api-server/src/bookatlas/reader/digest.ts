import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Identity } from '../../auth/policy.js';
import { bookatlasDb } from '../db/supabaseClient.js';
import { logger } from '../../lib/logger.js';
import { DEFAULT_DAILY_GOAL } from './achievements.js';
import { readFamily, summarize } from './family.js';
import { ReaderError, getPreferences, readerMemory, readingStats, saveSettingsKey } from './service.js';

/**
 * Reading goals and streak e-mails (Reading Intelligence phase 5, owner request 2026-11-25). Both are opt-in and
 * off by default: a weekly summary on Sunday (minutes, days read, the daily goal, the streak and each family
 * profile's week) and a reminder on an evening when a streak of 2+ days would break. Sent through Resend by a
 * daily cron; every e-mail has a one-click link that stops both. The address is the reader's own sign-in address.
 */
export interface DigestSettings { weekly: boolean; streak: boolean; email: string; name: string; lastWeekly?: string; lastStreak?: string }
export const DIGEST_KEY = 'digest';
const EMAIL = /^[^\s@<>"]{1,64}@[^\s@<>"]{1,190}\.[a-z]{2,}$/i;

export function readDigest(raw: unknown): DigestSettings | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;
  if (typeof d.email !== 'string' || !EMAIL.test(d.email)) return null;
  const day = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
  return { weekly: d.weekly === true, streak: d.streak === true, email: d.email, name: typeof d.name === 'string' ? d.name.slice(0, 60) : '', lastWeekly: day(d.lastWeekly), lastStreak: day(d.lastStreak) };
}

/** What the reader sees: the two switches and the address they go to. */
export async function getDigest(userId: string) {
  const d = readDigest((await getPreferences(userId))?.settings?.[DIGEST_KEY]);
  return { weekly: d?.weekly ?? false, streak: d?.streak ?? false, email: d?.email ?? null };
}

export async function setDigest(who: Identity, body: Record<string, unknown>) {
  if (!who.email || !EMAIL.test(who.email)) throw new ReaderError('Your account has no e-mail address to send to.', 409);
  const old = readDigest((await getPreferences(who.id))?.settings?.[DIGEST_KEY]);
  const next: DigestSettings = {
    weekly: typeof body.weekly === 'boolean' ? body.weekly : old?.weekly ?? false,
    streak: typeof body.streak === 'boolean' ? body.streak : old?.streak ?? false,
    email: who.email, name: (who.name ?? '').trim().split(/\s+/)[0]?.slice(0, 60) ?? '',
    lastWeekly: old?.lastWeekly, lastStreak: old?.lastStreak,
  };
  await saveSettingsKey(who.id, DIGEST_KEY, next);
  return { weekly: next.weekly, streak: next.streak, email: next.email };
}

// ------------------------------------------------------------------------------------------- unsubscribe

const secret = () => process.env.UNSUBSCRIBE_TOKEN_SECRET || process.env.SESSION_SECRET || 'bookatlas-local';
const sign = (payload: string) => createHmac('sha256', secret()).update(`reading-digest:${payload}`).digest('base64url');
export const digestToken = (userId: string) => { const p = Buffer.from(userId).toString('base64url'); return `${p}.${sign(p)}`; };
export function readDigestToken(token: unknown): string | null {
  const [p, sig] = String(token ?? '').split('.');
  if (!p || !sig) return null;
  const a = Buffer.from(sig), b = Buffer.from(sign(p));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const id = Buffer.from(p, 'base64url').toString();
  return /^[\w-]{1,80}$/.test(id) ? id : null;
}
/** The one-click link: both e-mails stop. */
export async function unsubscribeDigest(token: unknown) {
  const userId = readDigestToken(token);
  if (!userId) return false;
  const d = readDigest((await getPreferences(userId))?.settings?.[DIGEST_KEY]);
  if (d) await saveSettingsKey(userId, DIGEST_KEY, { ...d, weekly: false, streak: false });
  return true;
}

// ------------------------------------------------------------------------------------------- the e-mails

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const page = (body: string, unsubscribe: string) => `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#0f172a;max-width:560px;margin:auto;padding:16px">
${body}
<p style="color:#94a3b8;font-size:11px;margin-top:24px">You asked for reading e-mails on BooksAtlas · Atlantean Globals Services, Zwolle, the Netherlands. <a href="${unsubscribe}" style="color:#94a3b8">Stop these e-mails</a>.</p>
</body></html>`;
const button = (href: string, label: string) => `<p><a href="${href}" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:bold">${label}</a></p>`;
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

export interface WeekSummary {
  minutes: number; daysRead: number; goalMinutes: number | null; goalDays: number; streak: number; bestStreak: number; booksFinished: number;
  family: { name: string; minutes: number; streak: number }[];
}

export function weeklyEmail(d: DigestSettings, w: WeekSummary, appUrl: string, unsubscribe: string) {
  const hi = d.name ? `Hi ${esc(d.name)},` : 'Hi,';
  const goal = w.goalMinutes ? `<li>Your goal of ${w.goalMinutes} minutes a day: reached on ${plural(w.goalDays, 'day')}</li>` : '';
  const fam = w.family.length ? `<h2 style="font-size:16px;margin:20px 0 6px">Your family</h2><ul style="padding-left:18px;line-height:1.6">${w.family.map((f) => `<li>${esc(f.name)}: ${f.minutes} minutes${f.streak > 1 ? `, ${f.streak}-day streak` : ''}</li>`).join('')}</ul>` : '';
  const lead = w.minutes ? `You read for <strong>${w.minutes} minutes</strong> this week, on ${plural(w.daysRead, 'day')}.` : 'You did not read on BooksAtlas this week. A few pages tonight is a good start.';
  return {
    to: [d.email],
    subject: w.minutes ? `Your reading week: ${w.minutes} minutes${w.streak > 1 ? `, ${w.streak}-day streak` : ''}` : 'Your reading week on BooksAtlas',
    html: page(`<p>${hi}</p><p style="font-size:16px;line-height:1.5">${lead}</p>
<ul style="padding-left:18px;line-height:1.6">${goal}<li>Streak: ${plural(w.streak, 'day')} (best ${plural(w.bestStreak, 'day')})</li><li>Books finished so far: ${w.booksFinished}</li></ul>${fam}
${button(`${appUrl}/reading-intelligence#progress`, 'See your reading')}`, unsubscribe),
    headers: { 'List-Unsubscribe': `<${unsubscribe}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  };
}

export function streakEmail(d: DigestSettings, streak: number, appUrl: string, unsubscribe: string) {
  return {
    to: [d.email],
    subject: `Keep your ${streak}-day reading streak`,
    html: page(`<p>${d.name ? `Hi ${esc(d.name)},` : 'Hi,'}</p><p style="font-size:16px;line-height:1.5">You have read <strong>${streak} days in a row</strong>. Read for a few minutes before midnight (UTC) and it keeps going.</p>
${button(`${appUrl}/`, 'Open your books')}`, unsubscribe),
    headers: { 'List-Unsubscribe': `<${unsubscribe}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  };
}

// ------------------------------------------------------------------------------------------- the daily run

type Email = { to: string[]; subject: string; html: string; headers: Record<string, string> };
export type Send = (emails: Email[]) => Promise<number>;
export const digestEmailConfigured = () => !!process.env.RESEND_API_KEY?.trim() && !!process.env.EMAIL_FROM?.trim();

/** Through Resend, 100 at a time; returns how many were accepted. Never throws. */
export const resendBatch: Send = async (emails) => {
  let sent = 0;
  for (let i = 0; i < emails.length; i += 100) {
    const batch = emails.slice(i, i + 100).map((e) => ({ from: process.env.EMAIL_FROM!.trim(), ...e }));
    const res = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`, 'Content-Type': 'application/json' }, body: JSON.stringify(batch),
    }).catch((err) => { logger.warn({ err, event: 'digest.email_failed' }, 'Reading e-mail batch failed'); return null; });
    if (res?.ok) sent += batch.length; else if (res) logger.warn({ status: res.status, event: 'digest.email_failed' }, 'Reading e-mail batch rejected');
  }
  return sent;
};

/** Readers who switched on at least one reading e-mail. */
async function subscribers(): Promise<{ userId: string; settings: Record<string, unknown> }[]> {
  if (!bookatlasDb) return [...readerMemory().prefs.entries()].map(([userId, p]) => ({ userId, settings: p.settings })).filter((r) => r.settings[DIGEST_KEY]);
  const r = await bookatlasDb.from('reader_preferences').select('user_id,settings').not(`settings->${DIGEST_KEY}`, 'is', null).limit(5000);
  if (r.error) throw new ReaderError('Reading e-mails could not be read.', 503);
  return (r.data as { user_id: string; settings: Record<string, unknown> }[]).map((x) => ({ userId: x.user_id, settings: x.settings }));
}

/**
 * Once a day (Vercel Cron, about 17:00 UTC): streak reminders for readers who have not read today, and on Sunday the
 * weekly summary. Each reader gets each e-mail at most once a day.
 */
export async function runDigest(appUrl: string, send: Send, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const sunday = now.getUTCDay() === 0;
  const out: { email: Email; userId: string; key: 'lastWeekly' | 'lastStreak' }[] = [];
  for (const s of await subscribers()) {
    const d = readDigest(s.settings[DIGEST_KEY]);
    if (!d || (!d.weekly && !d.streak)) continue;
    const wantWeekly = d.weekly && sunday && d.lastWeekly !== today;
    const wantStreak = d.streak && d.lastStreak !== today;
    if (!wantWeekly && !wantStreak) continue;
    const stats = await readingStats(s.userId, now);
    const unsubscribe = `${appUrl}/api/reader/digest/unsubscribe?token=${encodeURIComponent(digestToken(s.userId))}`;
    if (wantWeekly) {
      const week = stats.last30.slice(-7);
      const goal = typeof s.settings.dailyGoalMinutes === 'number' ? s.settings.dailyGoalMinutes : DEFAULT_DAILY_GOAL;
      const fam = readFamily(s.settings.family);
      out.push({
        userId: s.userId, key: 'lastWeekly',
        email: weeklyEmail(d, {
          minutes: week.reduce((n, x) => n + x.minutes, 0), daysRead: week.filter((x) => x.minutes > 0).length,
          goalMinutes: goal, goalDays: goal ? week.filter((x) => x.minutes >= goal).length : 0,
          streak: stats.streakDays, bestStreak: stats.bestStreakDays, booksFinished: stats.booksFinished,
          family: fam.profiles.map((p) => { const x = summarize(fam.stats[p.id], now); return { name: p.name, minutes: x.weekMinutes, streak: x.streak }; }),
        }, appUrl, unsubscribe),
      });
    }
    if (wantStreak && stats.streakDays >= 2 && stats.todayMinutes === 0) out.push({ userId: s.userId, key: 'lastStreak', email: streakEmail(d, stats.streakDays, appUrl, unsubscribe) });
  }
  if (!out.length) return { weekly: 0, streak: 0, sent: 0 };
  const sent = await send(out.map((o) => o.email));
  // Marked as sent only when the batch went out, so a failed day is tried again tomorrow.
  if (sent > 0) {
    for (const o of out) {
      const d = readDigest((await getPreferences(o.userId))?.settings?.[DIGEST_KEY]);
      if (d) await saveSettingsKey(o.userId, DIGEST_KEY, { ...d, [o.key]: today });
    }
  }
  return { weekly: out.filter((o) => o.key === 'lastWeekly').length, streak: out.filter((o) => o.key === 'lastStreak').length, sent };
}
