import type { FamilyActivity, FamilyProfile, FamilyView } from '../reading/family';
import type { CheckpointBand, CheckpointQuestion, CheckpointReason } from '../reader/checkpoints';
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
export interface ReaderNarration { /** Sulafat or Charon, or the Kokoro voice name for a book narrated on the owner's computer. */ voice: string; seconds: number; access: 'full' | 'preview'; audioPrice?: number; segments: { n: number; chapter: number; from: number; to: number; seconds: number; /** The part's size, for the continuous stream. */ bytes?: number }[]; /** Plays the whole audiobook from the part's address (readers who have it). */ key?: string }
export interface NarrationQuote { bookId: string; title: string; words: number; priceCents: number; hours: number; voices: NarrationVoice[]; current: NarrationSummary | null; free?: boolean; sale?: NarrationSale | null }
/** Cycle 9: how readers get the finished audiobook (audioPrice 0 = included with the eBook). */
export interface NarrationSale { ebookPrice: number; audioPrice: number; audioPricedAt: string | null }
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

export type AnnotationKind = 'highlight' | 'bookmark' | 'note';
export interface Annotation {
  id: string; book_id: string; kind: AnnotationKind; color: string | null; chapter_index: number; paragraph_index: number;
  excerpt: string; note: string | null; created_at: string; updated_at: string;
  /** Phase 3: shared with other readers of the book under `display_name`. */
  shared?: boolean; display_name?: string | null; hidden?: boolean;
}
export interface SharedNote { id: string; name: string; kind: 'highlight' | 'note'; color: string | null; paragraphIndex: number; excerpt: string; note: string | null; date: string; mine: boolean }
export interface ChapterSocial { popular: { paragraphIndex: number; readers: number }[]; notes: SharedNote[] }
export interface Achievement { id: string; title: string; description: string; icon: string; points: number; target: number; current: number; unlocked: boolean }
export interface AchievementsView { achievements: Achievement[]; points: number; unlocked: number; goal: { minutes: number; today: number; met: boolean } }
export interface GroupSummary { id: string; bookId: string; bookTitle: string | null; name: string; members: number; role: 'owner' | 'member' | null; createdAt: string; inviteCode?: string }
export interface GroupPost { id: string; name: string; chapterIndex: number | null; body: string; date: string; mine: boolean; hidden: boolean; canDelete: boolean }
export interface GroupDetail extends GroupSummary { inviteCode: string; memberNames: { name: string; role: string; me: boolean }[]; posts: GroupPost[] }
export interface SyncedProgress { book_id: string; chapter_index: number; paragraph_index: number; progress_percent: number; device: string | null; updated_at: string }
/** Schools and teams (Reading Intelligence phase 3). */
export interface ClassSummary { id: string; name: string; kind: 'class' | 'team'; role: 'teacher' | 'member'; members: number; books: { id: string; title: string }[]; createdAt: string; inviteCode?: string }
export interface ClassRow { userId: string; name: string; joinedAt: string; books: Record<string, number>; finished: number; average: number; weekMinutes: number; lastRead: string | null; quizzes: Record<string, number | null>; stories: Record<string, { right: number; total: number } | null> }
export interface ClassQuizQuestion { question: string; options: string[]; answer?: number; explanation?: string }
export interface ClassQuizScore { right: number; total: number; answers: number[]; at: string }
export interface ClassQuiz { id: string; bookId: string; chapterIndex: number; chapterTitle: string; due: string | null; createdAt: string; questions: ClassQuizQuestion[]; score?: ClassQuizScore | null }
export interface ClassReport {
  id: string; name: string; kind: 'class' | 'team'; teacher: string; generatedAt: string;
  books: { id: string; title: string }[]; due: Record<string, string>; quizzes: { id: string; bookId: string; chapterTitle: string; due: string | null }[];
  weeks: string[]; rows: (ClassRow & { weekly: number[] })[];
  totals: ClassDetail['totals'];
}
export interface ClassDetail extends ClassSummary {
  teacher: string; rows: ClassRow[]; due: Record<string, string>; quizzes: ClassQuiz[];
  totals: { members: number; weekMinutes: number; averageProgress: number; activeThisWeek: number; quizAverage: number | null } | null;
}
/** Reading e-mails (phase 5): the weekly summary and the streak reminder, both opt-in. */
export interface ReadingEmails { weekly: boolean; streak: boolean; email: string | null; available: boolean }
export interface ReadingStats {
  totalMinutes: number; words: number; wordsPerMinute: number | null; streakDays: number; booksStarted: number; booksFinished: number;
  sessions: number; last30: { day: string; minutes: number }[];
  /** Minutes read in each hour of the day (UTC). */
  byHourUtc?: number[]; bestStreakDays?: number; todayMinutes?: number;
  /** The last 12 weeks of sessions as [start, minutes, words], for the reading heatmap (master build plan M5). */
  activity?: [string, number, number][];
  /** Words a minute while reading: the last five sessions, all of them, and the best long one. */
  speed?: { current: number | null; average: number | null; best: number | null };
}

export interface AskResult {
  answer: string; access: 'full' | 'preview'; remaining: number;
  sources: { n: number; chapterIndex: number; paragraphIndex: number; chapterTitle: string; excerpt: string; cited: boolean }[];
}
export type StudyKind = 'summary_short' | 'summary' | 'summary_full' | 'key_concepts' | 'flashcards' | 'quiz';
export type ExplainLevel = 'child' | 'student' | 'professional' | 'expert';
export interface StudyResult {
  chapterIndex: number; cached: boolean;
  summary?: string; points?: string[];
  concepts?: { term: string; explanation: string }[];
  cards?: { front: string; back: string }[];
  questions?: { question: string; options: string[]; answer: number; explanation: string }[];
}
export interface Definition { word: string; pronunciation: string; partOfSpeech: string; definitions: string[]; synonyms: string[]; example: string; origin: string }

/** A visitor's message from the "Start my book" form (owner request 2026-11-18). */
export interface BookEnquiry {
  id: string; createdAt: string; topic: string; name: string; email: string; title: string; formats: string[];
  trimSize: string; paper: string; pages: number | null; message: string; status: 'new' | 'answered'; answeredAt: string | null;
}

export function useEbookApi() {
  const { getToken } = useAuth();
  const tokenRef = useRef(getToken);
  tokenRef.current = getToken;

  const request = async (path: string, init: RequestInit = {}) => {
    // The sign-in token, waited for at most 6 seconds: a stalled sign-in service must not leave a request (and the
    // player waiting on it) hanging for ever (found on an Android phone 2026-11-23). The sign-in cookie still goes along.
    let token: string | null = null;
    try { token = await Promise.race([tokenRef.current(), new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000))]); } catch { token = null; }
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
    // Reading insights for authors (phase 9).
    authorInsights: () => json<AuthorInsightsData>('/api/author/insights'),
    /** Author hub (cycle 6): files fetched with the sign-in token, returned as blobs. */
    salesCsv: async () => (await request('/api/author/sales.csv')).blob(),
    statementHtml: async (month: string) => (await request(`/api/author/statements/${month}`)).text(),
    payout: () => json<PayoutView>('/api/author/payout'),
    // BooksAtlas Reader sync (cycle 7).
    readerState: (bookId: string) => json<{ progress: SyncedProgress | null; annotations: Annotation[] }>(`/api/reader/state/${encodeURIComponent(bookId)}`),
    saveReaderProgress: (bookId: string, body: { chapterIndex: number; paragraphIndex: number; progressPercent: number; device: string; at: string }) =>
      json<SyncedProgress>(`/api/reader/progress/${encodeURIComponent(bookId)}`, 'PUT', body),
    addAnnotation: (body: { bookId: string; kind: AnnotationKind; color?: string; chapterIndex: number; paragraphIndex: number; excerpt: string; note?: string }) =>
      json<Annotation>('/api/reader/annotations', 'POST', body),
    updateAnnotation: (id: string, body: { note?: string; color?: string }) => json<Annotation>(`/api/reader/annotations/${id}`, 'PATCH', body),
    deleteAnnotation: (id: string) => json<void>(`/api/reader/annotations/${id}`, 'DELETE'),
    searchAnnotations: (q: string) => json<{ annotations: Annotation[] }>(`/api/reader/annotations?q=${encodeURIComponent(q)}`).then((r) => r.annotations),
    readerPreferences: () => json<{ settings: Record<string, unknown> | null; updated_at: string | null }>('/api/reader/preferences'),
    saveReaderPreferences: (settings: Record<string, unknown>) => json<{ settings: Record<string, unknown> }>('/api/reader/preferences', 'PUT', settings),
    recordReadingSession: (body: { bookId: string; startedAt: string; seconds: number; paragraphs: number; words: number; device: string }) =>
      json<unknown>('/api/reader/sessions', 'POST', body),
    readingStats: () => json<ReadingStats>('/api/reader/stats'),
    readingEmails: () => json<ReadingEmails>('/api/reader/digest'),
    setReadingEmails: (body: { weekly?: boolean; streak?: boolean }) => json<ReadingEmails>('/api/reader/digest', 'PUT', body),
    // Reader Phase 3 (cycle 10): achievements, shared notes, reports, reading groups.
    achievements: () => json<AchievementsView>('/api/reader/achievements'),
    // Reading Intelligence phase 2 (2026-11-25): family profiles and their reading.
    family: () => json<FamilyView>('/api/reader/family'),
    saveFamily: (body: { profiles: FamilyProfile[]; challenge?: { weeklyMinutes: number } }) => json<FamilyView>('/api/reader/family', 'PUT', body),
    familyActivity: (body: FamilyActivity & { profileId: string }) => json<void>('/api/reader/family/activity', 'POST', body),
    // Reading Intelligence phase 3 (2026-11-25): schools and teams.
    classes: () => json<{ classes: ClassSummary[] }>('/api/reader/classes').then((r) => r.classes),
    createClass: (body: { name: string; kind: 'class' | 'team' }) => json<ClassSummary>('/api/reader/classes', 'POST', body),
    joinClass: (code: string) => json<ClassSummary>('/api/reader/classes/join', 'POST', { code }),
    classDetail: (id: string) => json<ClassDetail>(`/api/reader/classes/${id}`),
    setClassBooks: (id: string, books: string[], due?: Record<string, string>) => json<{ books: { id: string; title: string }[]; due: Record<string, string> }>(`/api/reader/classes/${id}/books`, 'PUT', due ? { books, due } : { books }),
    classReport: (id: string, weeks: number) => json<ClassReport>(`/api/reader/classes/${id}/report?weeks=${weeks}`),
    youngStoryDone: (storyId: string, right: number) => json<{ storyId: string; best: { right: number; total: number; at: string } }>('/api/reader/young/stories', 'POST', { storyId, right }),
    publishClassQuiz: (id: string, body: { bookId: string; chapterIndex: number; chapterTitle: string; questions: ClassQuizQuestion[]; due: string | null }) => json<{ quiz: ClassQuiz }>(`/api/reader/classes/${id}/quizzes`, 'POST', body),
    removeClassQuiz: (id: string, quizId: string) => json<{ ok: boolean }>(`/api/reader/classes/${id}/quizzes/${quizId}`, 'DELETE'),
    answerClassQuiz: (id: string, quizId: string, answers: number[]) => json<{ score: ClassQuizScore; quiz: ClassQuiz; alreadyAnswered: boolean }>(`/api/reader/classes/${id}/quizzes/${quizId}/answers`, 'POST', { answers }),
    leaveClass: (id: string, userId = 'me') => json<{ closed: boolean }>(`/api/reader/classes/${id}/members/${encodeURIComponent(userId)}`, 'DELETE'),
    shareAnnotation: (id: string, bookId: string, shared: boolean) => json<Annotation>(`/api/reader/annotations/${id}/share`, 'PATCH', { bookId, shared }),
    chapterSocial: (bookId: string, chapter: number) => json<ChapterSocial>(`/api/reader/social/${encodeURIComponent(bookId)}/${chapter}`),
    report: (kind: 'annotation' | 'post', targetId: string, reason?: string) => json<{ reported: boolean }>('/api/reader/reports', 'POST', { kind, targetId, reason }),
    readingGroups: (bookId?: string) => json<{ groups: GroupSummary[] }>(`/api/reader/groups${bookId ? `?bookId=${encodeURIComponent(bookId)}` : ''}`).then((r) => r.groups),
    createGroup: (bookId: string, name: string) => json<GroupSummary>('/api/reader/groups', 'POST', { bookId, name }),
    joinGroup: (code: string) => json<GroupSummary>('/api/reader/groups/join', 'POST', { code }),
    readingGroup: (id: string) => json<GroupDetail>(`/api/reader/groups/${id}`),
    postToGroup: (id: string, body: string, chapterIndex: number | null) => json<GroupPost>(`/api/reader/groups/${id}/posts`, 'POST', { body, chapterIndex }),
    deleteGroupPost: (id: string, postId: string) => json<void>(`/api/reader/groups/${id}/posts/${postId}`, 'DELETE'),
    leaveGroup: (id: string) => json<{ deleted: boolean }>(`/api/reader/groups/${id}/membership`, 'DELETE'),
    readerReports: () => json<{ items: { kind: 'annotation' | 'post'; id: string; reports: number; reasons: string[]; last: string; gone: boolean; name: string | null; text: string; hidden: boolean }[] }>('/api/manager/reader-reports').then((r) => r.items),
    moderateReaderItem: (kind: 'annotation' | 'post', id: string, action: 'hide' | 'restore') => json<{ ok: boolean }>(`/api/manager/reader-reports/${kind}/${id}/${action}`, 'POST'),
    // Reader Phase 2 (cycle 8): AI on the text the reader may read.
    readerAiConfig: () => json<{ dailyLimit: number; languages: Record<string, string> }>('/api/reader/ai/config'),
    askBook: (body: { bookId: string; question: string; chapterIndex: number; history: { role: 'user' | 'assistant'; text: string }[] }) =>
      json<AskResult>('/api/reader/ai/ask', 'POST', body),
    studyChapter: <K extends StudyKind>(body: { bookId: string; chapterIndex: number; kind: K }) => json<StudyResult & { kind: K; remaining: number }>('/api/reader/ai/study', 'POST', body),
    explainPassage: (body: { bookId: string; text: string; context?: string; mode: 'explain' | 'simplify' | ExplainLevel }) => json<{ mode: string; answer: string; cached?: boolean; remaining: number }>('/api/reader/ai/explain', 'POST', body),
    translatePassage: (body: { bookId: string; text: string; target: string }) => json<{ language: string; translation: string; remaining: number }>('/api/reader/ai/translate', 'POST', body),
    defineWord: (body: { bookId: string; word: string; context: string }) => json<Definition & { remaining: number }>('/api/reader/ai/define', 'POST', body),
    // Comprehension checkpoints (master build plan M4).
    checkpointQuestions: (body: { bookId: string; chapterIndex: number; from?: number; to?: number }) =>
      json<{ chapterIndex: number; from: number; to: number; questions: CheckpointQuestion[]; remaining: number }>('/api/reader/ai/checkpoint', 'POST', body),
    saveCheckpoint: (body: { bookId: string; chapterIndex: number; right: number; total: number; reason: CheckpointReason }) =>
      json<{ band: CheckpointBand; summary: CheckpointSummary }>('/api/reader/checkpoints', 'POST', body),
    checkpoints: () => json<CheckpointSummary>('/api/reader/checkpoints'),
    // Flashcards with spaced repetition (master build plan M8).
    flashcardDeck: (bookId?: string) => json<FlashcardDeck>(`/api/reader/flashcards${bookId ? `?bookId=${encodeURIComponent(bookId)}` : ''}`),
    saveFlashcards: (body: { bookId: string; chapterIndex?: number | null; cards: { question: string; answer: string }[] }) => json<{ added: number; skipped: number; total: number }>('/api/reader/flashcards', 'POST', body),
    reviewFlashcard: (id: string, score: 1 | 2 | 3 | 4) => json<{ card: Flashcard; nextInDays: number }>(`/api/reader/flashcards/${encodeURIComponent(id)}/review`, 'POST', { score }),
    removeFlashcard: (id: string) => json<{ removed: boolean; total: number }>(`/api/reader/flashcards/${encodeURIComponent(id)}`, 'DELETE'),
    // Knowledge maps (master build plan M10).
    knowledgeMap: (body: { bookId: string; chapterIndex: number }) => json<{ chapterIndex: number; title: string; nodes: import('../reader/knowledgeMap').MapNode[]; edges: import('../reader/knowledgeMap').MapEdge[]; remaining: number }>('/api/reader/ai/map', 'POST', body),
    flashcardsFromPassage: (body: { bookId: string; text: string }) => json<{ chapterIndex: number; cards: { question: string; answer: string }[]; remaining: number }>('/api/reader/ai/flashcards', 'POST', body),
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
    setAudioPrice: (bookId: string, audioPrice: number) => json<NarrationSale>(`/api/narration/books/${encodeURIComponent(bookId)}/sale`, 'PUT', { audioPrice }),
    orderNarration: (bookId: string, voice: NarrationVoice) => json<{ url: string | null; free?: boolean }>(`/api/narration/books/${encodeURIComponent(bookId)}/order`, 'POST', { voice }),
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
    enquiries: () => json<{ enquiries: BookEnquiry[] }>('/api/manager/book-enquiries').then((r) => r.enquiries),
    setEnquiryAnswered: (id: string, answered: boolean) => json<{ enquiry: BookEnquiry }>(`/api/manager/book-enquiries/${id}/answered`, 'POST', { answered }).then((r) => r.enquiry),
    addFeedback: (store: string, message: string, submissionId?: string) =>
      json<{ matched_rules: string[] }>('/api/ebook-prep/feedback', 'POST', { store, message, submissionId }),
    /** The book's natural narration, if any: every segment for entitled readers, the preview part otherwise. */
    /** Gives up after 15 seconds and tries once more, so Listen never waits on a stalled connection. */
    readerNarration: async (bookId: string) => {
      const once = async () => {
        const signal = typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(15_000) : undefined;
        return (await (await request(`/api/reader/catalog/${bookId}/narration`, { signal })).json() as { narration: ReaderNarration | null }).narration;
      };
      try { return await once(); } catch (e) { if (e instanceof EbookApiError && e.status < 500) throw e; return once(); }
    },
    /** A part's address. The player streams it: phones refuse the audio as a blob (found 2026-11-23). */
    // The whole audiobook from a part as one stream, so playback continues with the phone locked (2026-11-26).
    narrationStreamUrl: (bookId: string, from: number, key?: string) => `/api/reader/catalog/${encodeURIComponent(bookId)}/narration/stream/${from}${key ? `?k=${encodeURIComponent(key)}` : ''}`,
    narrationAudioUrl: (bookId: string, n: number, key?: string) => `/api/reader/catalog/${encodeURIComponent(bookId)}/narration/${n}${key ? `?k=${encodeURIComponent(key)}` : ''}`,
    readerContent: (bookId: string) => json<{ chapters: import('../../types').Chapter[]; access: 'full' | 'preview' }>(`/api/reader/catalog/${bookId}/content`),
    async readerImage(bookId: string, name: string) {
      try { return URL.createObjectURL(await this.readerImageBlob(bookId, name)); } catch (e) {
        // Offline reading (phase 11): the picture saved with the book on this device.
        const saved = await import('../reader/offlineBooks').then((m) => m.offlinePicture(bookId, name));
        if (saved) return URL.createObjectURL(saved);
        throw e;
      }
    },
    async readerImageBlob(bookId: string, name: string) {
      return (await request(`/api/reader/catalog/${bookId}/images/${name}`)).blob();
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

/** A reader's checkpoint results (master build plan M4): the specification's ComprehensionMetrics. */
export interface CheckpointSummary {
  totalCheckpoints: number; averageScore: number | null; band: CheckpointBand | null; lastFive: number | null; trend: 'up' | 'down' | 'steady' | null;
  recent: { bookId: string; chapterIndex: number; score: number; right: number; total: number; reason: CheckpointReason; at: string }[];
}

/** A card in the reader's review deck (master build plan M8). */
export interface Flashcard {
  id: string; bookId: string; chapterIndex: number | null; question: string; answer: string;
  difficulty: number; reviews: number; lapses: number; createdAt: string; due: string; lastReviewedAt: string | null;
}
export interface FlashcardDeck { total: number; dueCount: number; newCount: number; retention: number | null; nextDue: string | null; due: Flashcard[]; cards: Flashcard[] }

/** Mirrors GET /api/author/insights (reader/authorInsights.ts): aggregates only, from 5 readers. */
export interface AuthorInsightsData {
  minReaders: number;
  books: {
    bookId: string; title: string; readers: number; enoughReaders: boolean;
    finished?: number; completionRate?: number; medianProgress?: number;
    chapters?: { index: number; title: string; reached: number; stoppedHere: number }[];
    biggestDrop?: { index: number; title: string; drop: number } | null;
    minutesRead?: number; minutesPerReader?: number; wordsPerMinute?: number | null;
    activeLast30?: number; daily?: { day: string; readers: number }[];
    passages?: { chapterIndex: number; paragraphIndex: number; excerpt: string; readers: number }[];
  }[];
}
