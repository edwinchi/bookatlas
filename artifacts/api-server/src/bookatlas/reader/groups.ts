import { randomBytes, randomUUID } from 'node:crypto';
import type { Identity } from '../../auth/policy.js';
import { bookatlasDb } from '../db/supabaseClient.js';
import { publicName } from '../reviews/service.js';
import { ReaderError, readerMemory, type GroupMember, type GroupPost, type ReadingGroup } from './service.js';

/**
 * Reading groups (Reader Phase 3, cycle 10): a private group around one book. The creator shares an invite
 * link; members discuss the book, optionally per chapter (readers who are not there yet see a spoiler guard).
 * Members appear by first name and initial only. Posts can be reported (three reports hide them).
 */
export const MAX_MEMBERS = 50;
export const MAX_OWNED = 20;
const BOOK = /^[\w.-]{1,120}$/;
const db = () => bookatlasDb;
const mem = () => readerMemory();
const fail = (r: { error: unknown }, what: string) => { if (r.error) throw new ReaderError(`${what} is not available right now. Please retry.`, 503); };
const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/<[^>]*>/g, '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max) : '');
/** 10 characters without look-alikes (no 0/O, 1/I/L). */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const inviteCode = () => [...randomBytes(10)].map((b) => ALPHABET[b % ALPHABET.length]).join('');

async function groupById(id: string): Promise<ReadingGroup | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  if (!db()) return mem().groups.find((g) => g.id === id) ?? null;
  const r = await db()!.from('reading_groups').select('*').eq('id', id).maybeSingle();
  fail(r, 'Reading groups');
  return r.data as ReadingGroup | null;
}
async function membersOf(groupId: string): Promise<GroupMember[]> {
  if (!db()) return mem().members.filter((m) => m.group_id === groupId);
  const r = await db()!.from('reading_group_members').select('*').eq('group_id', groupId).order('joined_at').limit(MAX_MEMBERS + 5);
  fail(r, 'Reading groups');
  return r.data as GroupMember[];
}
async function membershipsOf(userId: string): Promise<GroupMember[]> {
  if (!db()) return mem().members.filter((m) => m.user_id === userId);
  const r = await db()!.from('reading_group_members').select('*').eq('user_id', userId).limit(500);
  fail(r, 'Reading groups');
  return r.data as GroupMember[];
}
/** The group and its members, if `who` belongs to it (administrators may look at any group). */
async function memberGroup(who: Identity, id: string) {
  const group = await groupById(id);
  if (!group) throw new ReaderError('Group not found.', 404);
  const members = await membersOf(group.id);
  const me = members.find((m) => m.user_id === who.id);
  if (!me && who.role !== 'admin') throw new ReaderError('Group not found.', 404);
  return { group, members, me };
}

const summary = (g: ReadingGroup, members: number, role: string | null, title?: string) => ({ id: g.id, bookId: g.book_id, bookTitle: title ?? null, name: g.name, members, role, createdAt: g.created_at });

export async function createGroup(who: Identity, body: Record<string, unknown>, bookTitle: (id: string) => Promise<string | null>) {
  const bookId = String(body.bookId ?? '');
  if (!BOOK.test(bookId)) throw new ReaderError('Unknown book.', 404);
  const title = await bookTitle(bookId);
  if (!title) throw new ReaderError('Unknown book.', 404);
  const name = clean(body.name, 80) || `${title.slice(0, 60)} readers`;
  if (name.length < 2) throw new ReaderError('Give the group a name.');
  const owned = (await membershipsOf(who.id)).filter((m) => m.role === 'owner').length;
  if (owned >= MAX_OWNED) throw new ReaderError(`You can run up to ${MAX_OWNED} reading groups.`, 409);
  const now = new Date().toISOString();
  const group: ReadingGroup = { id: randomUUID(), book_id: bookId, name, owner_id: who.id, invite_code: inviteCode(), created_at: now };
  const member: GroupMember = { group_id: group.id, user_id: who.id, display_name: publicName(who.name || ''), role: 'owner', joined_at: now };
  if (!db()) { mem().groups.push(group); mem().members.push(member); }
  else {
    fail(await db()!.from('reading_groups').insert(group), 'Reading groups');
    fail(await db()!.from('reading_group_members').insert(member), 'Reading groups');
  }
  return { ...summary(group, 1, 'owner', title), inviteCode: group.invite_code };
}

export async function myGroups(who: Identity, bookId: string | undefined, bookTitle: (id: string) => Promise<string | null>) {
  const mine = await membershipsOf(who.id);
  const groups = (await Promise.all(mine.map((m) => groupById(m.group_id)))).filter((g): g is ReadingGroup => !!g && (!bookId || g.book_id === bookId));
  return Promise.all(groups.map(async (g) => summary(g, (await membersOf(g.id)).length, mine.find((m) => m.group_id === g.id)!.role, await bookTitle(g.book_id) ?? undefined)));
}

export async function joinGroup(who: Identity, code: unknown, bookTitle: (id: string) => Promise<string | null>) {
  const invite = String(code ?? '').trim().toUpperCase();
  if (!/^[A-Z0-9]{10}$/.test(invite)) throw new ReaderError('That invite code is not valid.', 404);
  let group: ReadingGroup | null;
  if (!db()) group = mem().groups.find((g) => g.invite_code === invite) ?? null;
  else { const r = await db()!.from('reading_groups').select('*').eq('invite_code', invite).maybeSingle(); fail(r, 'Reading groups'); group = r.data as ReadingGroup | null; }
  if (!group) throw new ReaderError('That invite code is not valid.', 404);
  const members = await membersOf(group.id);
  const me = members.find((m) => m.user_id === who.id);
  if (!me) {
    if (members.length >= MAX_MEMBERS) throw new ReaderError(`This group is full (${MAX_MEMBERS} members).`, 409);
    const row: GroupMember = { group_id: group.id, user_id: who.id, display_name: publicName(who.name || ''), role: 'member', joined_at: new Date().toISOString() };
    if (!db()) mem().members.push(row);
    else fail(await db()!.from('reading_group_members').upsert(row, { onConflict: 'group_id,user_id', ignoreDuplicates: true }), 'Reading groups');
  }
  return summary(group, members.length + (me ? 0 : 1), me?.role ?? 'member', await bookTitle(group.book_id) ?? undefined);
}

/** The group page: members, posts (newest first) and, for its owner, the invite code. */
export async function groupDetail(who: Identity, id: string, bookTitle: (id: string) => Promise<string | null>) {
  const { group, members, me } = await memberGroup(who, id);
  let posts: GroupPost[];
  if (!db()) posts = mem().posts.filter((p) => p.group_id === group.id);
  else { const r = await db()!.from('reading_group_posts').select('*').eq('group_id', group.id).order('created_at', { ascending: false }).limit(300); fail(r, 'Reading groups'); posts = r.data as GroupPost[]; }
  posts = posts.filter((p) => p.status === 'published' || p.user_id === who.id).sort((a, b) => b.created_at.localeCompare(a.created_at));
  return {
    ...summary(group, members.length, me?.role ?? null, await bookTitle(group.book_id) ?? undefined),
    // Every member may invite friends; the code is only ever shown inside the group.
    inviteCode: group.invite_code,
    memberNames: members.map((m) => ({ name: m.display_name, role: m.role, me: m.user_id === who.id })),
    posts: posts.map((p) => ({ id: p.id, name: p.display_name, chapterIndex: p.chapter_index, body: p.body, date: p.created_at, mine: p.user_id === who.id, hidden: p.status === 'hidden', canDelete: p.user_id === who.id || me?.role === 'owner' || who.role === 'admin' })),
  };
}

export async function addPost(who: Identity, id: string, body: Record<string, unknown>) {
  const { group, me } = await memberGroup(who, id);
  if (!me) throw new ReaderError('Join the group to post.', 403);
  const text = clean(body.body, 2000);
  if (!text) throw new ReaderError('Write something first.');
  const chapter = body.chapterIndex === null || body.chapterIndex === undefined ? null : Number(body.chapterIndex);
  if (chapter !== null && (!Number.isInteger(chapter) || chapter < 0 || chapter > 10_000)) throw new ReaderError('Invalid chapter.');
  const row: GroupPost = { id: randomUUID(), group_id: group.id, user_id: who.id, display_name: me.display_name, chapter_index: chapter, body: text, status: 'published', created_at: new Date().toISOString() };
  if (!db()) mem().posts.push(row);
  else fail(await db()!.from('reading_group_posts').insert(row), 'Posting');
  return { id: row.id, name: row.display_name, chapterIndex: row.chapter_index, body: row.body, date: row.created_at, mine: true, hidden: false, canDelete: true };
}

export async function deletePost(who: Identity, groupId: string, postId: string) {
  const { me } = await memberGroup(who, groupId);
  let post: GroupPost | null;
  if (!db()) post = mem().posts.find((p) => p.id === postId && p.group_id === groupId) ?? null;
  else { const r = await db()!.from('reading_group_posts').select('*').eq('id', postId).eq('group_id', groupId).maybeSingle(); fail(r, 'Reading groups'); post = r.data as GroupPost | null; }
  if (!post) throw new ReaderError('Post not found.', 404);
  if (post.user_id !== who.id && me?.role !== 'owner' && who.role !== 'admin') throw new ReaderError('Only the writer or the group owner can remove this post.', 403);
  if (!db()) mem().posts.splice(mem().posts.indexOf(post), 1);
  else fail(await db()!.from('reading_group_posts').delete().eq('id', postId), 'Reading groups');
}

/** Leave a group (removing your posts); when its owner leaves, the group and its discussion are deleted. */
export async function leaveGroup(who: Identity, id: string) {
  const { group, me } = await memberGroup(who, id);
  if (!me) throw new ReaderError('Group not found.', 404);
  if (me.role === 'owner') return deleteGroup(group.id);
  // Leaving takes the member's posts with them (they could not delete them afterwards).
  if (!db()) { mem().members.splice(mem().members.indexOf(me), 1); mem().posts = mem().posts.filter((p) => !(p.group_id === group.id && p.user_id === who.id)); }
  else {
    fail(await db()!.from('reading_group_posts').delete().eq('group_id', group.id).eq('user_id', who.id), 'Reading groups');
    fail(await db()!.from('reading_group_members').delete().eq('group_id', group.id).eq('user_id', who.id), 'Reading groups');
  }
  return { deleted: false };
}

async function deleteGroup(id: string) {
  if (!db()) {
    const m = mem();
    m.groups = m.groups.filter((g) => g.id !== id); m.members = m.members.filter((x) => x.group_id !== id); m.posts = m.posts.filter((p) => p.group_id !== id);
    return { deleted: true };
  }
  // Members and posts cascade.
  fail(await db()!.from('reading_groups').delete().eq('id', id), 'Reading groups');
  return { deleted: true };
}

export async function postExists(id: string) {
  if (!db()) return mem().posts.some((p) => p.id === id);
  const r = await db()!.from('reading_group_posts').select('id').eq('id', id).maybeSingle();
  return !!r.data;
}

export async function groupCount(userId: string) {
  return (await membershipsOf(userId).catch(() => [])).length;
}

/** Data export: the account's groups and posts. */
export async function groupDataOf(userId: string) {
  const memberships = await membershipsOf(userId);
  let posts: GroupPost[];
  if (!db()) posts = mem().posts.filter((p) => p.user_id === userId);
  else { const r = await db()!.from('reading_group_posts').select('*').eq('user_id', userId).limit(10_000); fail(r, 'Reading groups'); posts = r.data as GroupPost[]; }
  return { memberships, posts };
}

/** Erasure: owned groups are deleted; the account leaves other groups and its posts are removed. */
export async function eraseGroupData(userId: string) {
  for (const m of (await membershipsOf(userId)).filter((x) => x.role === 'owner')) await deleteGroup(m.group_id);
  if (!db()) {
    const m = mem();
    m.members = m.members.filter((x) => x.user_id !== userId); m.posts = m.posts.filter((p) => p.user_id !== userId);
    return;
  }
  fail(await db()!.from('reading_group_posts').delete().eq('user_id', userId), 'Erasure');
  fail(await db()!.from('reading_group_members').delete().eq('user_id', userId), 'Erasure');
}
