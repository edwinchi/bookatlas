import { randomUUID } from 'node:crypto';
import type { SubmissionIntake } from '@workspace/bookatlas-catalog/publishing';
import { bookatlasDb } from '../db/supabaseClient.js';
import { PrepError } from './archive.js';
import type { PrepReport } from './engine.js';
import type { EpubcheckMessage } from './rules.js';
import type { StoredFile } from './store.js';

export type SubmissionStatus = 'uploading' | 'preparing' | 'checking' | 'ready' | 'needs_author' | 'published' | 'rejected';

export interface SubmissionData {
  ownerEmail: string;
  intake: SubmissionIntake;
  upload?: { fileName: string; size: number; parts: number; sha256?: string; purged?: boolean };
  prepared?: StoredFile;
  cover?: StoredFile;
  report?: PrepReport;
  epubcheck?: { round: number; ran: boolean; messages: EpubcheckMessage[]; checkedAt: string };
  rejectReason?: string;
  /** The author's answer to the cover findings, applied on every preparation from the original upload. */
  coverFix?: { kind: 'upload'; file: StoredFile; width: number; height: number } | { kind: 'enlarge' };
  /** Where the printed book is sold; shown on the book page. */
  printLinks?: { amazon?: string; lulu?: string };
  /** A new version of this published book: publishing replaces its text under the same id. */
  replacesBookId?: string;
  version: number;
}

export interface Submission {
  id: string;
  owner_id: string;
  status: SubmissionStatus;
  data: SubmissionData;
  book_id: string | null;
  lease_until: string | null;
  purge_after: string | null;
  created_at: string;
  updated_at: string;
}

export interface Feedback { id: string; submission_id: string | null; store: string; message: string; matched_rules: string[]; created_at: string }

const memorySubmissions = new Map<string, Submission>();
const memoryFeedback: Feedback[] = [];

const clone = <T>(value: T): T => structuredClone(value);

export async function createSubmission(ownerId: string, ownerEmail: string, intake: SubmissionIntake, upload: SubmissionData['upload']) {
  const now = new Date().toISOString();
  const row: Submission = {
    id: randomUUID(), owner_id: ownerId, status: 'uploading', data: { ownerEmail, intake, upload, version: 1 },
    book_id: null, lease_until: null, purge_after: null, created_at: now, updated_at: now,
  };
  if (!bookatlasDb) { memorySubmissions.set(row.id, clone(row)); return row; }
  const result = await bookatlasDb.from('ebook_submissions').insert(row);
  if (result.error) throw new PrepError('The submission could not be saved.', 503);
  return row;
}

export async function loadSubmission(id: string): Promise<Submission> {
  if (!bookatlasDb) {
    const row = memorySubmissions.get(id);
    if (!row) throw new PrepError('Submission not found.', 404);
    return clone(row);
  }
  const result = await bookatlasDb.from('ebook_submissions').select('*').eq('id', id).maybeSingle();
  if (result.error) throw new PrepError('The submission could not be read.', 503);
  if (!result.data) throw new PrepError('Submission not found.', 404);
  return result.data as Submission;
}

/** The first submission of a book: its author. Later versions share the book id. */
export async function submissionForBook(bookId: string): Promise<Submission | null> {
  if (!bookatlasDb) {
    const rows = [...memorySubmissions.values()].filter((row) => row.book_id === bookId).sort((a, b) => a.created_at.localeCompare(b.created_at));
    return clone(rows[0] ?? null);
  }
  const result = await bookatlasDb.from('ebook_submissions').select('*').eq('book_id', bookId).order('created_at', { ascending: true }).limit(1);
  if (result.error) throw new PrepError('The submission could not be read.', 503);
  return ((result.data as Submission[])[0]) ?? null;
}

/** Account erasure (TASK-0006): remove a submission that never reached the store. */
export async function deleteSubmission(id: string) {
  if (!bookatlasDb) { memorySubmissions.delete(id); return; }
  // Store feedback may point at the submission; keep the message, drop the link.
  const unlink = await bookatlasDb.from('prep_feedback').update({ submission_id: null }).eq('submission_id', id);
  if (unlink.error) throw new PrepError('The submission could not be erased.', 503);
  const result = await bookatlasDb.from('ebook_submissions').delete().eq('id', id);
  if (result.error) throw new PrepError('The submission could not be erased.', 503);
}

/** Account erasure: a published book stays on sale, without its author's email or account link. */
export async function anonymiseSubmission(row: Submission) {
  const data = { ...row.data, ownerEmail: '' };
  if (!bookatlasDb) { memorySubmissions.set(row.id, clone({ ...row, owner_id: ERASED_OWNER, data })); return; }
  const result = await bookatlasDb.from('ebook_submissions').update({ owner_id: ERASED_OWNER, data, updated_at: new Date().toISOString() }).eq('id', row.id);
  if (result.error) throw new PrepError('The submission could not be anonymised.', 503);
}

export const ERASED_OWNER = 'erased-account';

/** Save with optimistic concurrency: fails if someone else saved since `row` was loaded. */
export async function saveSubmission(row: Submission, changes: Partial<Omit<Submission, 'id' | 'owner_id' | 'data'>> & { data?: Partial<SubmissionData> }) {
  const next: Submission = {
    ...row, ...changes,
    data: { ...row.data, ...changes.data, version: row.data.version + 1 },
    updated_at: new Date().toISOString(),
  };
  if (!bookatlasDb) {
    const current = memorySubmissions.get(row.id);
    if (!current || current.data.version !== row.data.version) throw new PrepError('The submission changed meanwhile; reload and retry.', 409);
    memorySubmissions.set(row.id, clone(next));
    return next;
  }
  const result = await bookatlasDb.from('ebook_submissions')
    .update({ status: next.status, data: next.data, book_id: next.book_id, lease_until: next.lease_until, purge_after: next.purge_after, updated_at: next.updated_at })
    .eq('id', row.id).eq('data->>version', String(row.data.version)).select('id');
  if (result.error) throw new PrepError('The submission could not be saved.', 503);
  if (!result.data?.length) throw new PrepError('The submission changed meanwhile; reload and retry.', 409);
  return next;
}

export async function listSubmissions(ownerId?: string): Promise<Submission[]> {
  if (!bookatlasDb) {
    return [...memorySubmissions.values()].filter((s) => !ownerId || s.owner_id === ownerId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at)).map(clone);
  }
  let query = bookatlasDb.from('ebook_submissions').select('*').order('created_at', { ascending: false }).limit(200);
  if (ownerId) query = query.eq('owner_id', ownerId);
  const result = await query;
  if (result.error) throw new PrepError('Submissions could not be loaded.', 503);
  return result.data as Submission[];
}

/** The oldest submission waiting for EPUBCheck whose lease is free. */
export async function nextForCheck(): Promise<Submission | null> {
  const now = new Date().toISOString();
  if (!bookatlasDb) {
    return clone([...memorySubmissions.values()]
      .filter((s) => s.status === 'checking' && (!s.lease_until || s.lease_until < now))
      .sort((a, b) => a.updated_at.localeCompare(b.updated_at))[0] ?? null);
  }
  const result = await bookatlasDb.from('ebook_submissions').select('*').eq('status', 'checking')
    .or(`lease_until.is.null,lease_until.lt.${now}`).order('updated_at', { ascending: true }).limit(1);
  if (result.error) throw new PrepError('The check queue could not be read.', 503);
  return (result.data?.[0] as Submission | undefined) ?? null;
}

/** Submissions whose raw upload has passed its retention date (D4: 90 days after publish or reject). */
export async function expiredUploads(): Promise<Submission[]> {
  const now = new Date().toISOString();
  const all = bookatlasDb
    ? await (async () => {
      const result = await bookatlasDb.from('ebook_submissions').select('*').lt('purge_after', now).limit(50);
      if (result.error) throw new PrepError('Retention sweep failed.', 503);
      return result.data as Submission[];
    })()
    : [...memorySubmissions.values()].filter((s) => s.purge_after && s.purge_after < now).map(clone);
  return all.filter((s) => s.data.upload && !s.data.upload.purged);
}

export async function addFeedback(entry: Omit<Feedback, 'id' | 'created_at'>) {
  const row: Feedback = { ...entry, id: randomUUID(), created_at: new Date().toISOString() };
  if (!bookatlasDb) { memoryFeedback.unshift(row); return row; }
  const result = await bookatlasDb.from('prep_feedback').insert(row);
  if (result.error) throw new PrepError('The store feedback could not be saved.', 503);
  return row;
}

export async function listFeedback(): Promise<Feedback[]> {
  if (!bookatlasDb) return memoryFeedback.map(clone);
  const result = await bookatlasDb.from('prep_feedback').select('*').order('created_at', { ascending: false }).limit(500);
  if (result.error) throw new PrepError('Store feedback could not be loaded.', 503);
  return result.data as Feedback[];
}

/** Rules a store has rejected a book for at least once; their warnings now block publishing. */
export async function learnedBlockingRules() {
  const counts = new Map<string, number>();
  for (const f of await listFeedback()) for (const rule of f.matched_rules) counts.set(rule, (counts.get(rule) ?? 0) + 1);
  return [...counts.keys()];
}
