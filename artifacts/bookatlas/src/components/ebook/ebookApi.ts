import { useAuth } from '@clerk/react';
import { useRef } from 'react';
import type { SubmissionIntake } from '@workspace/bookatlas-catalog/publishing';

export type SubmissionStatus = 'uploading' | 'preparing' | 'checking' | 'ready' | 'needs_author' | 'published' | 'rejected';
export interface Finding { rule: string; severity: 'error' | 'warning' | 'info'; message: string; fixable: boolean }
export interface Submission {
  id: string;
  status: SubmissionStatus;
  intake: SubmissionIntake;
  report: null | {
    rounds: { round: number; changes: { rule: string; change: string }[] }[];
    findings: Finding[];
    summary: { errors: number; warnings: number; fixed: number };
    epubVersion: string;
    cover: { width: number; height: number } | null;
    bytes: { before: number; after: number };
  };
  upload: { fileName: string; size: number; parts: number; purged: boolean } | null;
  prepared: { size: number; parts: number } | null;
  cover: { size: number; parts: number } | null;
  coverFix: { kind: 'upload'; width: number; height: number } | { kind: 'enlarge' } | null;
  printLinks: { amazon?: string; lulu?: string };
  epubcheck: { round: number; ran: boolean; messages: unknown[]; checkedAt: string } | null;
  bookId: string | null;
  rejectReason: string | null;
  ownerEmail?: string;
  partBytes: number;
  createdAt: string;
}
export interface FeedbackOverview {
  rules: { id: string; title: string; storeRejections: number; blocking: boolean; automaticFix: boolean }[];
  needsNewRule: { id: string; store: string; message: string; created_at: string }[];
}

export class EbookApiError extends Error {
  constructor(message: string, public status: number, public fields?: Record<string, string>) { super(message); }
}

/** Calls the eBook API with the signed-in account's token; files move in parts of `partBytes`. */
export function useEbookApi() {
  const { getToken } = useAuth();
  const tokenRef = useRef(getToken);
  tokenRef.current = getToken;

  const request = async (path: string, init: RequestInit = {}) => {
    let token: string | null = null;
    try { token = await tokenRef.current(); } catch { token = null; }
    const res = await fetch(path, {
      ...init, credentials: 'include',
      headers: { ...(init.headers ?? {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new EbookApiError(body.error ?? `Request failed (${res.status}).`, res.status, body.fields);
    }
    return res;
  };
  const json = async <T>(path: string, method = 'GET', body?: unknown): Promise<T> => {
    const res = await request(path, body === undefined ? { method } : { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return res.status === 204 ? (undefined as T) : res.json();
  };

  const uploadAndPrepare = async (submission: Submission, file: File, onProgress: (done: number, total: number) => void) => {
    const parts = submission.upload!.parts;
    for (let part = 0; part < parts; part += 1) {
      const blob = file.slice(part * submission.partBytes, (part + 1) * submission.partBytes);
      await request(`/api/ebook-submissions/${submission.id}/upload/${part}`, { method: 'PUT', headers: { 'Content-Type': 'application/octet-stream' }, body: blob });
      onProgress(part + 1, parts);
    }
    return json<Submission>(`/api/ebook-submissions/${submission.id}/prepare`, 'POST', {});
  };

  return {
    list: () => json<{ submissions: Submission[] }>('/api/ebook-submissions').then((r) => r.submissions),
    get: (id: string) => json<Submission>(`/api/ebook-submissions/${id}`),
    async submit(intake: SubmissionIntake, file: File, onProgress: (done: number, total: number) => void) {
      const created = await json<Submission>('/api/ebook-submissions', 'POST', { intake, fileName: file.name, size: file.size });
      return uploadAndPrepare(created, file, onProgress);
    },
    /** A corrected EPUB for a submission that is not published yet; details and cover choice carry over. */
    async reupload(id: string, intake: SubmissionIntake, file: File, onProgress: (done: number, total: number) => void) {
      const restarted = await json<Submission>(`/api/ebook-submissions/${id}/reupload`, 'POST', { intake, fileName: file.name, size: file.size });
      return uploadAndPrepare(restarted, file, onProgress);
    },
    async replaceCover(id: string, file: File) {
      const image = await coverForUpload(file);
      return (await request(`/api/ebook-submissions/${id}/cover`, { method: 'PUT', headers: { 'Content-Type': image.type }, body: image })).json() as Promise<Submission>;
    },
    setPrintLinks: (id: string, links: { amazon?: string; lulu?: string }) => json<Submission>(`/api/ebook-submissions/${id}/print-links`, 'PUT', links),
    enlargeCover: (id: string) => json<Submission>(`/api/ebook-submissions/${id}/cover/enlarge`, 'POST', {}),
    originalCover: (id: string) => json<Submission>(`/api/ebook-submissions/${id}/cover`, 'DELETE'),
    updateIntake: (id: string, intake: SubmissionIntake) => json<Submission>(`/api/ebook-submissions/${id}/intake`, 'PUT', { intake }),
    async download(id: string, file: 'epub' | 'cover') {
      const manifest = await json<{ parts: number; contentType: string }>(`/api/ebook-submissions/${id}/files/${file}`);
      const chunks: Blob[] = [];
      for (let part = 0; part < manifest.parts; part += 1) {
        chunks.push(await (await request(`/api/ebook-submissions/${id}/files/${file}/parts/${part}`)).blob());
      }
      return new Blob(chunks, { type: manifest.contentType });
    },
    publish: (id: string) => json<Submission>(`/api/ebook-submissions/${id}/publish`, 'POST', {}),
    reject: (id: string, reason: string) => json<Submission>(`/api/ebook-submissions/${id}/reject`, 'POST', { reason }),
    feedback: () => json<FeedbackOverview>('/api/ebook-prep/feedback'),
    addFeedback: (store: string, message: string, submissionId?: string) =>
      json<{ matched_rules: string[] }>('/api/ebook-prep/feedback', 'POST', { store, message, submissionId }),
    readerContent: (bookId: string) => json<{ chapters: import('../../types').Chapter[]; access: 'full' | 'preview' }>(`/api/reader/catalog/${bookId}/content`),
    async readerImage(bookId: string, name: string) {
      return URL.createObjectURL(await (await request(`/api/reader/catalog/${bookId}/images/${name}`)).blob());
    },
  };
}

const COVER_BYTES = 4 * 1024 * 1024;

/** JPEG and PNG under 4 MB go as they are; anything else is re-encoded as JPEG at full size. */
async function coverForUpload(file: File): Promise<Blob> {
  if (['image/jpeg', 'image/png'].includes(file.type) && file.size <= COVER_BYTES) return file;
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw new EbookApiError('Use a JPEG or PNG image for the cover.', 415); }
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
  bitmap.close();
  for (const quality of [0.92, 0.85, 0.75]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (blob && blob.size <= COVER_BYTES) return blob;
  }
  throw new EbookApiError('The cover is too large to upload. Export it as a JPEG under 4 MB.', 413);
}

export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
