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
  prepared: { size: number; parts: number; sha256?: string } | null;
  cover: { size: number; parts: number } | null;
  coverFix: { kind: 'upload'; width: number; height: number } | { kind: 'enlarge' } | null;
  printLinks: { amazon?: string; lulu?: string };
  replacesBookId: string | null;
  epubcheck: { round: number; ran: boolean; messages: unknown[]; checkedAt: string } | null;
  bookId: string | null;
  rejectReason: string | null;
  ownerEmail?: string;
  partBytes: number;
  createdAt: string;
  updatedAt?: string;
}
/** Mirrors GET /api/author/sales (payments/authorSales.ts); amounts in euro cents. */
export interface SalesWindow { units: number; grossCents: number; shareCents: number; refunds: number }
export interface AuthorSales {
  currency: string;
  authorShare: number;
  shareNote: string;
  totals: { last30Days: SalesWindow; last12Months: SalesWindow; allTime: SalesWindow };
  monthly: { month: string; units: number; netCents: number; shareCents: number }[];
  books: { bookId: string; title: string; units: number; refunds: number; grossCents: number; vatCents: number; netCents: number; shareCents: number; lastSaleAt: string | null }[];
  recent: { at: string; bookId: string; title: string; country: string | null; grossCents: number; shareCents: number; refunded: boolean }[];
}
export type NarrationVoice = 'Sulafat' | 'Charon';
export type NarrationStatus = 'awaiting_payment' | 'paid' | 'approved' | 'running' | 'done' | 'failed' | 'declined' | 'refunded';
export interface NarrationSummary { id: string; bookId: string; title: string; voice: NarrationVoice; status: NarrationStatus; priceCents: number; words: number; done: number; total: number; seconds: number; error: string | null; createdAt: string; updatedAt: string }
export interface ReaderNarration { voice: NarrationVoice; seconds: number; access: 'full' | 'preview'; segments: { n: number; chapter: number; from: number; to: number; seconds: number }[] }
export interface NarrationQuote { bookId: string; title: string; words: number; priceCents: number; hours: number; voices: NarrationVoice[]; current: NarrationSummary | null }
export interface ReaderReview { id: string; name: string; rating: number; title: string | null; body: string; verifiedPurchase: boolean; date: string; edited: boolean }
export interface BookReviews { average: number; count: number; breakdown: { stars: number; count: number }[]; reviews: ReaderReview[] }
export interface MyReview { canReview: boolean; reason?: string; verifiedPurchase?: boolean; review: (ReaderReview & { hidden: boolean }) | null }
export interface BusinessPeriod {
  period: 'month' | 'quarter' | 'year' | 'all'; orders: number; refunds: number; grossCents: number; vatCents: number;
  vat: { ebooks9Cents: number; services21Cents: number }; ebookSalesNetCents: number; commissionCents: number; authorsShareCents: number;
  narrationNetCents: number; narrationCostCents: number; stripeFeesEstimateCents: number; marginCents: number;
}
export interface BusinessSummary {
  currency: string; commissionRate: number; users: { total: number; newThisMonth: number };
  catalogue: { publishedBooks: number; waitingForReview: number }; narration: { open: number; done: number };
  periods: BusinessPeriod[]; monthly: { month: string; grossCents: number; orders: number }[];
  topBooks: { bookId: string; title: string; author: string; units: number; netCents: number }[];
  authorsOwed: { ownerId: string; author: string; email: string; units: number; owedCents: number }[];
  countries: Record<string, number>; notes: string;
}
export interface FeedbackOverview {
  rules: { id: string; title: string; storeRejections: number; blocking: boolean; automaticFix: boolean }[];
  needsNewRule: { id: string; store: string; message: string; created_at: string }[];
}

type Check = 'ok' | 'review' | 'fix' | 'manual' | 'n/a';
/** Mirrors the API's readiness package (ebookPrep/readiness.ts). */
export interface ReadinessPackage {
  score: number;
  verdict: string;
  summary: string;
  issues: { severity: 'error' | 'warning'; text: string }[];
  corrections: string[];
  chapters: { title: string; words: number; paragraphs: number; images: number; editing: Check; formatting: Check; duplication: Check; factCheck: Check; imagesCheck: Check; ready: boolean; notes: string[] }[];
  kdpEbook: { label: string; status: Check; detail: string }[];
  kdpPrint: { label: string; status: Check; detail: string }[];
  lulu: { label: string; status: Check; detail: string }[];
  metadata: { title: string; subtitle?: string; author: string; contributors: string[]; language: string; categories: string[]; keywords: string[]; isbn: { ebook?: string; print?: string } };
  description: string;
  copyright: string;
  markdown: string;
}

export class EbookApiError extends Error {
  constructor(message: string, public status: number, public fields?: Record<string, string>) { super(message); }
}

/** Calls the eBook API with the signed-in account's token; files move in parts of `partBytes`. */
export type PayoutView = { configured: false } | {
  configured: true; accountHolder: string; iban: string; bic: string | null; address: string; country: string;
  taxId: string | null; vatId: string | null; business: boolean; updatedAt: string;
};
export interface PayoutInput { accountHolder: string; iban: string; bic?: string; address: string; country: string; taxId?: string; vatId?: string; business: boolean }

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
    authorSales: () => json<AuthorSales>('/api/author/sales'),
    /** Author hub (cycle 6): files fetched with the sign-in token, returned as blobs. */
    salesCsv: async () => (await request('/api/author/sales.csv')).blob(),
    statementHtml: async (month: string) => (await request(`/api/author/statements/${month}`)).text(),
    payout: () => json<PayoutView>('/api/author/payout'),
    savePayout: (body: PayoutInput) => json<PayoutView>('/api/author/payout', 'PUT', body),
    // Follow authors (cycle 5c).
    followState: (slug: string) => json<{ following: boolean }>(`/api/follows/${slug}/mine`),
    follow: (slug: string) => json<{ following: boolean }>(`/api/follows/${slug}`, 'POST', {}),
    unfollow: (slug: string) => json<{ following: boolean }>(`/api/follows/${slug}`, 'DELETE'),
    business: () => json<BusinessSummary>('/api/manager/business'),
    // Reader reviews (TASK-0009).
    bookReviews: (bookId: string) => json<BookReviews>(`/api/catalog/books/${encodeURIComponent(bookId)}/reviews`),
    myReview: (bookId: string) => json<MyReview>(`/api/reviews/books/${encodeURIComponent(bookId)}/mine`),
    saveReview: (bookId: string, review: { rating: number; title: string; body: string }) => json<ReaderReview>(`/api/reviews/books/${encodeURIComponent(bookId)}`, 'PUT', review),
    deleteReview: (bookId: string) => json<void>(`/api/reviews/books/${encodeURIComponent(bookId)}`, 'DELETE'),
    // Natural audiobook narration (TASK-0008).
    narrationQuote: (bookId: string) => json<NarrationQuote>(`/api/narration/books/${encodeURIComponent(bookId)}`),
    orderNarration: (bookId: string, voice: NarrationVoice) => json<{ url: string }>(`/api/narration/books/${encodeURIComponent(bookId)}/order`, 'POST', { voice }),
    confirmNarration: (sessionId: string) => json<{ paid: boolean }>('/api/narration/confirm', 'POST', { sessionId }),
    narrationSample: async (voice: NarrationVoice) => URL.createObjectURL(await (await request(`/api/narration/samples/${voice}`)).blob()),
    narrations: () => json<{ narrations: (NarrationSummary & { ownerId: string; estimateMicros: number; spentMicros: number })[] }>('/api/manager/narrations').then((r) => r.narrations),
    decideNarration: (id: string, decision: 'approve' | 'decline' | 'resume') => json<NarrationSummary>(`/api/manager/narrations/${id}/${decision}`, 'POST', {}),
    /** "Fill in with AI": an excerpt of the manuscript in, checked suggestions for the form out. */
    suggestMetadata: (body: { excerpt: string; headings: string[]; known: Record<string, string | undefined> }) =>
      json<{ source: 'ai' | 'book'; suggestion: Partial<SubmissionIntake> }>('/api/ai/book-metadata', 'POST', body),
    list: () => json<{ submissions: Submission[] }>('/api/ebook-submissions').then((r) => r.submissions),
    get: (id: string) => json<Submission>(`/api/ebook-submissions/${id}`),
    async submit(intake: SubmissionIntake, file: File, onProgress: (done: number, total: number) => void) {
      const created = await json<Submission>('/api/ebook-submissions', 'POST', { intake, fileName: file.name, size: file.size });
      return uploadAndPrepare(created, file, onProgress);
    },
    /** A corrected EPUB for a published book: a new submission that replaces it once published. */
    async newVersion(id: string, intake: SubmissionIntake, file: File, onProgress: (done: number, total: number) => void) {
      const created = await json<Submission>(`/api/ebook-submissions/${id}/new-version`, 'POST', { intake, fileName: file.name, size: file.size });
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
    readiness: (id: string) => json<ReadinessPackage>(`/api/ebook-submissions/${id}/readiness`),
    setPrice: (id: string, price: number) => json<Submission>(`/api/ebook-submissions/${id}/price`, 'PUT', { price }),
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
    /** The book's natural narration, if any: every segment for entitled readers, the preview part otherwise. */
    readerNarration: (bookId: string) => json<{ narration: ReaderNarration | null }>(`/api/reader/catalog/${bookId}/narration`).then((r) => r.narration),
    narrationAudio: async (bookId: string, n: number) => URL.createObjectURL(await (await request(`/api/reader/catalog/${bookId}/narration/${n}`)).blob()),
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
