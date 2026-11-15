import { randomUUID } from 'node:crypto';
import type { Chapter } from '@workspace/bookatlas-catalog/types';
import type { Identity } from '../../auth/policy.js';
import { bookatlasDb } from '../db/supabaseClient.js';
import { publicName } from '../reviews/service.js';
import { ReaderError, readerMemory, type Annotation } from './service.js';

/**
 * Reader Phase 3 (cycle 10): shared annotations and popular highlights.
 * - A reader may share a highlight or note with other readers of the book, under their first name and initial.
 *   The quoted text is always taken from the book itself, never from the client.
 * - Popular highlights are anonymous counts: a paragraph shows only once at least POPULAR_MIN readers highlighted it.
 * - Nobody sees notes or highlights on text they may not read (the preview, unless they own the book).
 * - Three reports hide a shared note or group post until an administrator restores or removes it.
 */
export const POPULAR_MIN = 3;
export const REPORTS_TO_HIDE = 3;
const db = () => bookatlasDb;
const reports: { id: string; kind: 'annotation' | 'post'; target_id: string; reporter_id: string; reason: string | null; created_at: string }[] = [];

const own = async (userId: string, id: string) => {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new ReaderError('Not found.', 404);
  const found = !db() ? readerMemory().annotations.find((a) => a.id === id)
    : (await db()!.from('reader_annotations').select('*').eq('id', id).maybeSingle()).data as Annotation | null;
  if (!found || found.user_id !== userId) throw new ReaderError('Not found.', 404);
  return found;
};

/** Share (or stop sharing) one of the reader's highlights or notes. */
export async function setShared(who: Identity, id: string, shared: unknown, chapters: Chapter[]) {
  const a = await own(who.id, id);
  if (a.kind === 'bookmark') throw new ReaderError('Bookmarks are private; share a highlight or a note instead.');
  const on = shared === true;
  const paragraph = chapters[a.chapter_index]?.content[a.paragraph_index];
  if (on && paragraph === undefined) throw new ReaderError('This passage is no longer in the book.', 409);
  const patch: Partial<Annotation> = {
    shared: on, display_name: on ? publicName(who.name || '') : null,
    // The quote comes from the book, so a shared note can never put invented text in the author's mouth.
    ...(on ? { excerpt: paragraph!.slice(0, 300) } : {}), updated_at: new Date().toISOString(),
  };
  if (!db()) { Object.assign(readerMemory().annotations.find((x) => x.id === id)!, patch); return { ...a, ...patch }; }
  const r = await db()!.from('reader_annotations').update(patch).eq('id', id).eq('user_id', who.id);
  if (r.error) throw new ReaderError('Sharing is not available yet. Please retry later.', 503);
  return { ...a, ...patch };
}

/** What a reader may see in this chapter: limited to the paragraphs they can read. */
export async function chapterSocial(viewerId: string, bookId: string, chapter: number, readable: Chapter[]) {
  const visibleParas = readable[chapter]?.content.length ?? 0;
  if (!visibleParas) return { popular: [], notes: [] };
  let rows: Annotation[];
  if (!db()) rows = readerMemory().annotations.filter((a) => a.book_id === bookId && a.chapter_index === chapter && a.kind !== 'bookmark');
  else {
    const r = await db()!.from('reader_annotations').select('id,user_id,kind,color,paragraph_index,excerpt,note,shared,display_name,hidden,created_at,chapter_index,book_id')
      .eq('book_id', bookId).eq('chapter_index', chapter).in('kind', ['highlight', 'note']).limit(20_000);
    if (r.error) throw new ReaderError('Readers’ notes could not be loaded.', 503);
    rows = r.data as Annotation[];
  }
  rows = rows.filter((a) => a.paragraph_index < visibleParas);
  const readersByPara = new Map<number, Set<string>>();
  for (const a of rows) if (a.kind === 'highlight') (readersByPara.get(a.paragraph_index) ?? readersByPara.set(a.paragraph_index, new Set()).get(a.paragraph_index)!).add(a.user_id);
  const popular = [...readersByPara].filter(([, users]) => users.size >= POPULAR_MIN)
    .map(([paragraphIndex, users]) => ({ paragraphIndex, readers: users.size })).sort((a, b) => b.readers - a.readers).slice(0, 20);
  const notes = rows.filter((a) => a.shared && !a.hidden).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 60).map((a) => ({
    id: a.id, name: a.display_name || 'BooksAtlas reader', kind: a.kind, color: a.color, paragraphIndex: a.paragraph_index,
    excerpt: a.excerpt, note: a.note, date: a.created_at, mine: a.user_id === viewerId,
  }));
  return { popular, notes };
}

// ------------------------------------------------------------------------------------------- reports

type Hide = (kind: 'annotation' | 'post', id: string, hidden: boolean) => Promise<void>;
export async function hideTarget(kind: 'annotation' | 'post', id: string, hidden: boolean) {
  if (!db()) {
    if (kind === 'annotation') { const a = readerMemory().annotations.find((x) => x.id === id); if (a) a.hidden = hidden; }
    else { const p = readerMemory().posts.find((x) => x.id === id); if (p) p.status = hidden ? 'hidden' : 'published'; }
    return;
  }
  const r = kind === 'annotation'
    ? await db()!.from('reader_annotations').update({ hidden }).eq('id', id)
    : await db()!.from('reading_group_posts').update({ status: hidden ? 'hidden' : 'published' }).eq('id', id);
  if (r.error) throw new ReaderError('The item could not be updated.', 503);
}

/** Report a shared note or a group post; the third distinct report hides it for review. */
export async function report(reporterId: string, kind: unknown, targetId: unknown, reason: unknown, exists: (kind: 'annotation' | 'post', id: string) => Promise<boolean>, hide: Hide = hideTarget) {
  if (kind !== 'annotation' && kind !== 'post') throw new ReaderError('Unknown item.', 404);
  const id = String(targetId ?? '');
  if (!/^[0-9a-f-]{36}$/.test(id) || !(await exists(kind, id))) throw new ReaderError('Not found.', 404);
  const row = { id: randomUUID(), kind: kind as 'annotation' | 'post', target_id: id, reporter_id: reporterId, reason: typeof reason === 'string' ? reason.trim().slice(0, 300) || null : null, created_at: new Date().toISOString() };
  let count: number;
  if (!db()) {
    if (!reports.some((r) => r.kind === kind && r.target_id === id && r.reporter_id === reporterId)) reports.push(row);
    count = reports.filter((r) => r.kind === kind && r.target_id === id).length;
  } else {
    const ins = await db()!.from('reader_reports').upsert(row, { onConflict: 'kind,target_id,reporter_id', ignoreDuplicates: true });
    if (ins.error) throw new ReaderError('The report could not be sent. Please retry.', 503);
    const c = await db()!.from('reader_reports').select('id', { count: 'exact', head: true }).eq('kind', kind).eq('target_id', id);
    count = c.count ?? 0;
  }
  if (count >= REPORTS_TO_HIDE) await hide(kind, id, true);
  return { reported: true };
}

/** Administrators: reported items, most reported first, with their text. */
export async function reportedItems() {
  let rows = reports;
  if (db()) {
    const r = await db()!.from('reader_reports').select('*').order('created_at', { ascending: false }).limit(2000);
    if (r.error) throw new ReaderError('Reports could not be loaded.', 503);
    rows = r.data as typeof reports;
  }
  const grouped = new Map<string, { kind: 'annotation' | 'post'; id: string; reports: number; reasons: string[]; last: string }>();
  for (const r of rows) {
    const key = `${r.kind}:${r.target_id}`;
    const g = grouped.get(key) ?? { kind: r.kind, id: r.target_id, reports: 0, reasons: [], last: r.created_at };
    g.reports += 1; if (r.reason) g.reasons.push(r.reason); if (r.created_at > g.last) g.last = r.created_at;
    grouped.set(key, g);
  }
  const items = [...grouped.values()].sort((a, b) => b.reports - a.reports || b.last.localeCompare(a.last)).slice(0, 200);
  const details = await Promise.all(items.map(async (g) => {
    if (!db()) {
      const src = g.kind === 'annotation' ? readerMemory().annotations.find((a) => a.id === g.id) : readerMemory().posts.find((p) => p.id === g.id);
      return src;
    }
    const r = g.kind === 'annotation'
      ? await db()!.from('reader_annotations').select('id,book_id,display_name,note,excerpt,hidden').eq('id', g.id).maybeSingle()
      : await db()!.from('reading_group_posts').select('id,group_id,display_name,body,status').eq('id', g.id).maybeSingle();
    return r.data;
  }));
  return items.map((g, i) => {
    const d = details[i] as Record<string, unknown> | undefined | null;
    return {
      ...g, gone: !d, name: (d?.display_name as string) ?? null,
      text: g.kind === 'annotation' ? (d?.note as string) || (d?.excerpt as string) || '' : (d?.body as string) ?? '',
      hidden: g.kind === 'annotation' ? !!d?.hidden : d?.status === 'hidden',
    };
  });
}

export async function eraseReportsBy(userId: string) {
  if (!db()) { for (let i = reports.length - 1; i >= 0; i -= 1) if (reports[i]!.reporter_id === userId) reports.splice(i, 1); return; }
  const r = await db()!.from('reader_reports').delete().eq('reporter_id', userId);
  if (r.error) throw new ReaderError('Could not erase reports.', 503);
}

/** Only shared annotations can be reported. */
export async function sharedAnnotationExists(id: string) {
  if (!db()) return readerMemory().annotations.some((a) => a.id === id && a.shared);
  const r = await db()!.from('reader_annotations').select('id').eq('id', id).eq('shared', true).maybeSingle();
  return !!r.data;
}
