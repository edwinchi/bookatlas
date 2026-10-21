import type { PublishingJobInput, PublishingJob as JobView } from '@workspace/api-zod';
import type { BudgetLedger } from './budget.js';
import type { Manuscript } from './epub.js';
import { bookatlasDb } from '../db/supabaseClient.js';
import { readJson } from './storage.js';

export class PublishingError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export interface JobData {
  config: Omit<PublishingJobInput, 'base64'>;
  source: { key: string; sha256: string; mimeType: string; pageCount?: number };
  ledger: BudgetLedger;
  progress: { extracted: boolean; outlined: boolean; chapters: number; audio: number; epub: boolean };
  audioDurations: number[];
  retryCount: number;
  pendingCall?: string;
  verification?: { pdf?: boolean; image?: boolean };
  lastProviderFailure?: { status: number; kind: string };
  lastProviderResult?: {
    finishReason: string; modelVersion?: string;
    inputTokens?: number; outputTokens?: number; thoughtTokens?: number;
  };
  error?: string;
}
export interface Job {
  id: string; owner_id: string; status: JobView['status']; stage: string; version: number;
  lease_token: string | null; lease_until: string | null; is_test: boolean;
  data: JobData; created_at: string; updated_at: string;
}

export function database() {
  if (!bookatlasDb) throw new PublishingError('Supabase is not configured.', 503);
  return bookatlasDb;
}
export async function loadJob(id: string): Promise<Job> {
  const result = await database().from('publishing_jobs').select('*').eq('id', id).maybeSingle();
  if (result.error) throw new PublishingError('Could not read the publishing job.', 503);
  if (!result.data) throw new PublishingError('Publishing job not found.', 404);
  return result.data as Job;
}
export async function insertJob(job: Job) {
  const result = await database().from('publishing_jobs').insert(job);
  if (result.error?.code === '23505') return loadJob(job.id);
  if (result.error) throw new PublishingError('Could not persist the job. Generation was not started.', 503);
  return job;
}
export async function updateJob(job: Job, patch: Partial<Job>, worker = false): Promise<Job> {
  let query = database().from('publishing_jobs').update({
    ...patch, version: job.version + 1, updated_at: new Date().toISOString(),
  }).eq('id', job.id).eq('version', job.version);
  if (worker) {
    query = query.eq('status', 'running').eq('lease_token', job.lease_token!);
  }
  const result = await query.select('*').maybeSingle();
  if (result.error) throw new PublishingError('Could not checkpoint the publishing job.', 503);
  if (!result.data) throw new PublishingError('The job changed in another request. Refresh before continuing.', 409);
  return result.data as Job;
}

export async function viewJob(job: Job, includeText = true, reader = false): Promise<JobView> {
  const prefix = reader ? `/api/reader/books/${job.id}` : `/api/manager/publishing-jobs/${job.id}`;
  let chapters: JobView['chapters'] = [];
  if (includeText && job.data.progress.chapters) {
    const manuscript = await readJson<Manuscript>(job.id, 'manuscript.json');
    chapters = manuscript.chapters.map((chapter, i) => ({
      title: chapter.title, text: chapter.text,
      ...(i < job.data.progress.audio ? {
        audioUrl: `${prefix}/assets/chapter-${i + 1}.wav`,
        durationSeconds: job.data.audioDurations[i],
      } : {}),
    }));
  }
  const result: JobView = {
    id: job.id, title: job.data.config.title, author: job.data.config.author,
    status: job.status, stage: job.stage, isTest: job.is_test,
    budgetUsd: reader ? 0 : job.data.ledger.limitMicros / 1_000_000,
    reservedUsd: reader ? 0 : job.data.ledger.reservedMicros / 1_000_000,
    createdAt: job.created_at, updatedAt: job.updated_at, chapters,
    canPublish: job.status === 'review' && job.data.progress.epub &&
      (!job.data.config.includeAudio || job.data.progress.audio === job.data.config.chapterCount),
    ...(job.data.error && !reader ? { error: job.data.error } : {}),
    ...(job.data.progress.epub ? { epubUrl: `${prefix}/assets/book.epub` } : {}),
  };
  if (!reader) {
    const messages = await database().from('publishing_messages')
      .select('recipient,kind,status,error').eq('job_id', job.id).order('created_at');
    if (messages.error) throw new PublishingError('Could not read delivery records.', 503);
    result.messages = (messages.data ?? []).map(row => ({
      recipient: row.recipient, kind: row.kind, status: row.status,
      ...(row.error ? { error: row.error } : {}),
    }));
  }
  return result;
}
