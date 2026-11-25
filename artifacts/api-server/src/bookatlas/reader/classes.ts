import { randomBytes, randomUUID } from 'node:crypto';
import type { Identity } from '../../auth/policy.js';
import { bookatlasDb } from '../db/supabaseClient.js';
import { publicName } from '../reviews/service.js';
import { ReaderError, readerMemory, type Progress, type Session } from './service.js';

/**
 * Schools and teams (Reading Intelligence phase 3, owner request 2026-11-25). A teacher or team lead makes a
 * class, shares its invite code and sets a reading list; members see the list and their own progress; the
 * teacher sees each member's progress on the list and their reading time this week. Members are told this when
 * they join. Names appear as first name and initial.
 */
export const MAX_CLASS_MEMBERS = 300;
export const MAX_OWNED_CLASSES = 10;
export const MAX_CLASS_BOOKS = 25;

export interface ReadingClass { id: string; owner_id: string; name: string; kind: 'class' | 'team'; invite_code: string; books: string[]; created_at: string }
export interface ClassMember { class_id: string; user_id: string; display_name: string; role: 'teacher' | 'member'; joined_at: string }

const db = () => bookatlasDb;
const local = { classes: [] as ReadingClass[], members: [] as ClassMember[] };
export const classMemory = () => local;
const fail = (r: { error: unknown }) => { if (r.error) throw new ReaderError('Schools and teams are not available right now. Please try again later.', 503); };
const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/<[^>]*>/g, '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '');
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const inviteCode = () => [...randomBytes(8)].map((b) => ALPHABET[b % ALPHABET.length]).join('');
const BOOK = /^[\w.-]{1,120}$/;
const ID = /^[0-9a-f-]{36}$/;
type Titles = (id: string) => Promise<string | null>;

async function classById(id: string): Promise<ReadingClass | null> {
  if (!ID.test(id)) return null;
  if (!db()) return local.classes.find((c) => c.id === id) ?? null;
  const r = await db()!.from('reading_classes').select('*').eq('id', id).maybeSingle();
  fail(r);
  return r.data as ReadingClass | null;
}
async function membersOf(classId: string): Promise<ClassMember[]> {
  if (!db()) return local.members.filter((m) => m.class_id === classId);
  const r = await db()!.from('reading_class_members').select('*').eq('class_id', classId).order('joined_at').limit(MAX_CLASS_MEMBERS + 5);
  fail(r);
  return r.data as ClassMember[];
}
async function membershipsOf(userId: string): Promise<ClassMember[]> {
  if (!db()) return local.members.filter((m) => m.user_id === userId);
  const r = await db()!.from('reading_class_members').select('*').eq('user_id', userId).limit(200);
  fail(r);
  return r.data as ClassMember[];
}
async function memberClass(who: Identity, id: string) {
  const c = await classById(id);
  if (!c) throw new ReaderError('Class not found.', 404);
  const members = await membersOf(c.id);
  const me = members.find((m) => m.user_id === who.id);
  if (!me && who.role !== 'admin') throw new ReaderError('Class not found.', 404);
  return { c, members, me, teacher: c.owner_id === who.id };
}
const booksWithTitles = async (ids: string[], titles: Titles) => (await Promise.all(ids.map(async (id) => ({ id, title: await titles(id) })))).filter((b): b is { id: string; title: string } => !!b.title);
const summary = (c: ReadingClass, members: number, role: string, books: { id: string; title: string }[]) => ({
  id: c.id, name: c.name, kind: c.kind, role, members: Math.max(0, members - 1), books, createdAt: c.created_at,
  ...(role === 'teacher' ? { inviteCode: c.invite_code } : {}),
});

export async function myClasses(who: Identity, titles: Titles) {
  const mine = await membershipsOf(who.id);
  const out = [];
  for (const m of mine) {
    const c = await classById(m.class_id);
    if (c) out.push(summary(c, (await membersOf(c.id)).length, m.role, await booksWithTitles(c.books, titles)));
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createClass(who: Identity, body: Record<string, unknown>) {
  const name = clean(body.name, 80);
  if (name.length < 2) throw new ReaderError('Give the class a name.');
  const kind = body.kind === 'team' ? 'team' : 'class';
  const owned = (await membershipsOf(who.id)).filter((m) => m.role === 'teacher').length;
  if (owned >= MAX_OWNED_CLASSES) throw new ReaderError(`You can run up to ${MAX_OWNED_CLASSES} classes and teams.`, 409);
  const now = new Date().toISOString();
  const c: ReadingClass = { id: randomUUID(), owner_id: who.id, name, kind, invite_code: inviteCode(), books: [], created_at: now };
  const m: ClassMember = { class_id: c.id, user_id: who.id, display_name: publicName(who.name || ''), role: 'teacher', joined_at: now };
  if (!db()) { local.classes.push(c); local.members.push(m); }
  else { fail(await db()!.from('reading_classes').insert(c)); fail(await db()!.from('reading_class_members').insert(m)); }
  return summary(c, 1, 'teacher', []);
}

export async function joinClass(who: Identity, body: Record<string, unknown>, titles: Titles) {
  const code = clean(body.code, 20).toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length < 6) throw new ReaderError('Enter the invite code from your teacher or team lead.');
  let c: ReadingClass | null;
  if (!db()) c = local.classes.find((x) => x.invite_code === code) ?? null;
  else { const r = await db()!.from('reading_classes').select('*').eq('invite_code', code).maybeSingle(); fail(r); c = r.data as ReadingClass | null; }
  if (!c) throw new ReaderError('No class has this invite code. Check it and try again.', 404);
  const members = await membersOf(c.id);
  const existing = members.find((m) => m.user_id === who.id);
  if (!existing) {
    if (members.length >= MAX_CLASS_MEMBERS) throw new ReaderError('This class is full.', 409);
    const m: ClassMember = { class_id: c.id, user_id: who.id, display_name: publicName(who.name || ''), role: 'member', joined_at: new Date().toISOString() };
    if (!db()) local.members.push(m); else fail(await db()!.from('reading_class_members').insert(m));
  }
  return summary(c, members.length + (existing ? 0 : 1), existing?.role ?? 'member', await booksWithTitles(c.books, titles));
}

export async function setClassBooks(who: Identity, id: string, body: Record<string, unknown>, titles: Titles) {
  const { c, teacher } = await memberClass(who, id);
  if (!teacher) throw new ReaderError('Only the teacher or team lead can change the reading list.', 403);
  const ids = [...new Set((Array.isArray(body.books) ? body.books : []).filter((b): b is string => typeof b === 'string' && BOOK.test(b)))].slice(0, MAX_CLASS_BOOKS);
  const books = await booksWithTitles(ids, titles);
  const kept = books.map((b) => b.id);
  if (!db()) c.books = kept; else fail(await db()!.from('reading_classes').update({ books: kept }).eq('id', c.id));
  return { books };
}

/** A member leaves, the teacher removes a member, or the teacher closes the class. */
export async function leaveClass(who: Identity, id: string, userId?: string) {
  const { c, teacher } = await memberClass(who, id);
  const target = userId ?? who.id;
  if (target !== who.id && !teacher) throw new ReaderError('Only the teacher or team lead can remove members.', 403);
  if (target === c.owner_id) {
    // The teacher leaving closes the class for everyone.
    if (!db()) { local.classes = local.classes.filter((x) => x.id !== c.id); local.members = local.members.filter((m) => m.class_id !== c.id); }
    else fail(await db()!.from('reading_classes').delete().eq('id', c.id));
    return { closed: true };
  }
  if (!db()) local.members = local.members.filter((m) => !(m.class_id === c.id && m.user_id === target));
  else fail(await db()!.from('reading_class_members').delete().eq('class_id', c.id).eq('user_id', target));
  return { closed: false };
}

/** Monday of this week (UTC). */
const weekStart = (now: Date) => { const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d; };

/**
 * The class: its reading list and, for the teacher, every member's progress on each book and their reading time
 * this week; for a member, their own progress only.
 */
export async function classDetail(who: Identity, id: string, titles: Titles, now = new Date()) {
  const { c, members, teacher } = await memberClass(who, id);
  const books = await booksWithTitles(c.books, titles);
  const visible = teacher ? members.filter((m) => m.role === 'member') : members.filter((m) => m.user_id === who.id);
  const ids = visible.map((m) => m.user_id);
  const bookIds = books.map((b) => b.id);
  let progress: Pick<Progress, 'user_id' | 'book_id' | 'progress_percent' | 'updated_at'>[] = [];
  let sessions: Pick<Session, 'user_id' | 'seconds' | 'started_at'>[] = [];
  const since = weekStart(now).toISOString();
  if (ids.length) {
    if (!db()) {
      progress = [...readerMemory().progress.values()].filter((p) => ids.includes(p.user_id) && bookIds.includes(p.book_id));
      sessions = readerMemory().sessions.filter((s) => ids.includes(s.user_id) && s.started_at >= since);
    } else {
      if (bookIds.length) {
        const r = await db()!.from('reader_progress').select('user_id,book_id,progress_percent,updated_at').in('user_id', ids).in('book_id', bookIds).limit(10_000);
        fail(r); progress = r.data as typeof progress;
      }
      const s = await db()!.from('reading_sessions').select('user_id,seconds,started_at').in('user_id', ids).gte('started_at', since).limit(20_000);
      fail(s); sessions = s.data as typeof sessions;
    }
  }
  const rows = visible.map((m) => {
    const mine = progress.filter((p) => p.user_id === m.user_id);
    const perBook = Object.fromEntries(bookIds.map((b) => [b, Math.round(mine.find((p) => p.book_id === b)?.progress_percent ?? 0)]));
    const done = Object.values(perBook).filter((v) => v >= 98).length;
    const last = mine.map((p) => p.updated_at).sort().pop() ?? null;
    return {
      userId: m.user_id, name: m.display_name, joinedAt: m.joined_at, books: perBook, finished: done,
      average: bookIds.length ? Math.round(Object.values(perBook).reduce((a, b) => a + b, 0) / bookIds.length) : 0,
      weekMinutes: Math.round(sessions.filter((s) => s.user_id === m.user_id).reduce((n, s) => n + s.seconds, 0) / 60),
      lastRead: last,
    };
  });
  const teacherName = members.find((m) => m.role === 'teacher')?.display_name ?? '';
  return {
    ...summary(c, members.length, teacher ? 'teacher' : 'member', books), teacher: teacherName,
    rows,
    totals: teacher ? {
      members: rows.length,
      weekMinutes: rows.reduce((n, r) => n + r.weekMinutes, 0),
      averageProgress: rows.length ? Math.round(rows.reduce((n, r) => n + r.average, 0) / rows.length) : 0,
      activeThisWeek: rows.filter((r) => r.weekMinutes > 0).length,
    } : null,
  };
}
