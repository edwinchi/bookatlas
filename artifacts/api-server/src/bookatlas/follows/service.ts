import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Book } from '@workspace/bookatlas-catalog/types';
import type { Identity } from '../../auth/policy.js';
import { logger } from '../../lib/logger.js';
import { bookatlasDb } from '../db/supabaseClient.js';

/**
 * Follow authors (cycle 5c, master.md "Reader Community"). Following is the reader's explicit consent to an
 * e-mail when that author publishes a new book; each e-mail has a one-click unsubscribe link. E-mails go out
 * through Resend (RESEND_API_KEY, EMAIL_FROM); without them follows are kept and nothing is sent.
 */
export interface Follow { user_id: string; author_slug: string; author_name: string; email: string; created_at: string }
export class FollowError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

const memory: Follow[] = [];
const db = () => bookatlasDb;
const SLUG = /^[a-z0-9-]{2,80}$/;

export async function follow(who: Identity, slug: string, authorName: string) {
  if (!SLUG.test(slug)) throw new FollowError('Author not found.', 404);
  const row: Follow = { user_id: who.id, author_slug: slug, author_name: authorName.slice(0, 120), email: who.email, created_at: new Date().toISOString() };
  if (!db()) { if (!memory.some((f) => f.user_id === who.id && f.author_slug === slug)) memory.push(row); return; }
  const r = await db()!.from('follows').upsert(row, { onConflict: 'user_id,author_slug', ignoreDuplicates: true });
  if (r.error) throw new FollowError('The follow could not be saved.', 503);
}
export async function unfollow(userId: string, slug: string) {
  if (!db()) { const i = memory.findIndex((f) => f.user_id === userId && f.author_slug === slug); if (i >= 0) memory.splice(i, 1); return; }
  const r = await db()!.from('follows').delete().eq('user_id', userId).eq('author_slug', slug);
  if (r.error) throw new FollowError('The follow could not be removed.', 503);
}
export async function followersOf(slug: string): Promise<Follow[]> {
  if (!db()) return memory.filter((f) => f.author_slug === slug);
  const r = await db()!.from('follows').select('user_id,author_slug,author_name,email,created_at').eq('author_slug', slug).limit(50_000);
  if (r.error) throw new FollowError('Followers could not be read.', 503);
  return r.data as Follow[];
}
export async function followerCount(slug: string) {
  if (!db()) return memory.filter((f) => f.author_slug === slug).length;
  const r = await db()!.from('follows').select('user_id', { count: 'exact', head: true }).eq('author_slug', slug);
  return r.count ?? 0;
}
export async function followsOf(userId: string): Promise<Follow[]> {
  if (!db()) return memory.filter((f) => f.user_id === userId);
  const r = await db()!.from('follows').select('user_id,author_slug,author_name,email,created_at').eq('user_id', userId);
  if (r.error) throw new FollowError('Follows could not be read.', 503);
  return r.data as Follow[];
}
export async function eraseFollowsOf(userId: string) {
  if (!db()) { for (let i = memory.length - 1; i >= 0; i -= 1) if (memory[i]!.user_id === userId) memory.splice(i, 1); return; }
  const r = await db()!.from('follows').delete().eq('user_id', userId);
  if (r.error) throw new FollowError('Follows could not be erased.', 503);
}

// ------------------------------------------------------------------------------------------- unsubscribe

const secret = () => process.env.UNSUBSCRIBE_TOKEN_SECRET || process.env.SESSION_SECRET || 'bookatlas-local';
const b64 = (s: string) => Buffer.from(s).toString('base64url');
/** A link token that stops one reader's e-mails about one author, without signing in. */
export function unfollowToken(userId: string, slug: string) {
  const payload = b64(JSON.stringify({ u: userId, a: slug }));
  return `${payload}.${createHmac('sha256', secret()).update(`follow-unsubscribe:${payload}`).digest('base64url')}`;
}
export function readUnfollowToken(token: string): { userId: string; slug: string } | null {
  const [payload, sig] = String(token).split('.');
  if (!payload || !sig) return null;
  const expected = createHmac('sha256', secret()).update(`follow-unsubscribe:${payload}`).digest('base64url');
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try { const v = JSON.parse(Buffer.from(payload, 'base64url').toString()); return SLUG.test(v.a) ? { userId: String(v.u), slug: v.a } : null; } catch { return null; }
}

// ------------------------------------------------------------------------------------------- e-mail

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export const emailConfigured = () => !!process.env.RESEND_API_KEY?.trim() && !!process.env.EMAIL_FROM?.trim();

export function newBookEmail(book: Book, f: Follow, appUrl: string) {
  const link = `${appUrl}/books/${encodeURIComponent(book.id)}`;
  const unsubscribe = `${appUrl}/api/follows/unsubscribe?token=${encodeURIComponent(unfollowToken(f.user_id, f.author_slug))}`;
  const blurb = book.synopsis.replace(/\s+/g, ' ').trim().slice(0, 400);
  return {
    to: [f.email],
    subject: `New from ${book.author}: ${book.title}`,
    html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#0f172a;max-width:560px;margin:auto;padding:16px">
<p style="color:#64748b;font-size:12px">You follow ${esc(book.author)} on BooksAtlas.</p>
<h1 style="font-size:20px;margin:8px 0">${esc(book.title)}</h1>
${book.subtitle ? `<p style="margin:0 0 12px;color:#334155"><em>${esc(book.subtitle)}</em></p>` : ''}
${book.coverImage ? `<p><a href="${link}"><img src="${esc(book.coverImage.startsWith('/') ? appUrl + book.coverImage.replace(/\.jpg$/, '-w360.jpg') : book.coverImage)}" alt="Cover of ${esc(book.title)}" width="180" style="border-radius:8px"></a></p>` : ''}
<p style="line-height:1.5">${esc(blurb)}${book.synopsis.length > 400 ? '…' : ''}</p>
<p><a href="${link}" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:bold">Read a free preview</a></p>
<p style="color:#94a3b8;font-size:11px;margin-top:24px">BooksAtlas · Atlantean Globals Services, Zwolle, the Netherlands. <a href="${unsubscribe}" style="color:#94a3b8">Stop e-mails about ${esc(book.author)}</a>.</p>
</body></html>`,
    headers: { 'List-Unsubscribe': `<${unsubscribe}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  };
}

/** Tell every follower about a newly published book (batches of 100 through Resend); never throws. */
export async function announceToFollowers(book: Book, slug: string, appUrl: string) {
  const followers = await followersOf(slug).catch(() => []);
  if (!followers.length) return { sent: 0, followers: 0 };
  if (!emailConfigured()) {
    logger.warn({ event: 'follows.email_unconfigured', book: book.id, followers: followers.length }, 'New-book e-mails not sent: RESEND_API_KEY and EMAIL_FROM are not set');
    return { sent: 0, followers: followers.length };
  }
  let sent = 0;
  for (let i = 0; i < followers.length; i += 100) {
    const batch = followers.slice(i, i + 100).map((f) => ({ from: process.env.EMAIL_FROM!.trim(), ...newBookEmail(book, f, appUrl) }));
    const res = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`, 'Content-Type': 'application/json' }, body: JSON.stringify(batch),
    }).catch((err) => { logger.warn({ err, event: 'follows.email_failed' }, 'New-book e-mail batch failed'); return null; });
    if (res?.ok) sent += batch.length; else if (res) logger.warn({ status: res.status, event: 'follows.email_failed' }, 'New-book e-mail batch rejected');
  }
  logger.info({ event: 'follows.announced', book: book.id, followers: followers.length, sent }, 'Followers told about a new book');
  return { sent, followers: followers.length };
}
