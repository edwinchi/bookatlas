import type { Book } from '@workspace/bookatlas-catalog/types';
import { normaliseIsbn, validateIntake, type SubmissionIntake } from '@workspace/bookatlas-catalog/publishing';
import type { Identity } from '../../auth/policy.js';
import { MAX_UPLOAD_BYTES, PrepError } from './archive.js';
import { matchStoreMessage, prepareEpub, type PrepReport } from './engine.js';
import { decodeImage, imageSize } from './images.js';
import { hasPurchase } from '../payments/purchases.js';
import { logger } from '../../lib/logger.js';
import { RULES, type EpubcheckMessage } from './rules.js';
import { previewChapters, readerContent, sampleChapters, type ReaderContent } from './content.js';
import { PART_BYTES, getFile, getObject, getPart, putFile, putObject, putPart, removeFile, sha256 } from './store.js';
import {
  addFeedback, createSubmission, expiredUploads, learnedBlockingRules, listFeedback, listSubmissions,
  loadSubmission, nextForCheck, saveSubmission, submissionForBook, type Submission, type SubmissionData,
} from './submissions.js';

export const MAX_CHECK_ROUNDS = 3;
const RETENTION_DAYS = 90;
const LEASE_MINUTES = 10;

const uploadKey = (id: string) => `submissions/${id}/upload`;
const preparedKey = (id: string) => `submissions/${id}/prepared-epub`;
const coverKey = (id: string) => `submissions/${id}/front-cover`;
const coverUploadKey = (id: string) => `submissions/${id}/cover-upload`;
const EDITABLE = ['needs_author', 'ready', 'checking'];

export const workerConfigured = () => (process.env.EBOOK_WORKER_TOKEN?.trim().length ?? 0) >= 32;

function owned(row: Submission, who: Identity) {
  if (row.owner_id !== who.id && who.role !== 'admin') throw new PrepError('Submission not found.', 404);
  return row;
}

export function view(row: Submission, who: Identity) {
  const d = row.data;
  return {
    id: row.id, status: row.status, intake: d.intake, report: d.report ?? null,
    upload: d.upload ? { fileName: d.upload.fileName, size: d.upload.size, parts: d.upload.parts, purged: !!d.upload.purged } : null,
    prepared: d.prepared ? { size: d.prepared.size, parts: d.prepared.parts, sha256: d.prepared.sha256 } : null,
    cover: d.cover ? { size: d.cover.size, parts: d.cover.parts } : null,
    coverFix: d.coverFix ? (d.coverFix.kind === 'upload' ? { kind: 'upload', width: d.coverFix.width, height: d.coverFix.height } : { kind: 'enlarge' }) : null,
    epubcheck: d.epubcheck ?? null, bookId: row.book_id, rejectReason: d.rejectReason ?? null,
    ownerEmail: who.role === 'admin' ? d.ownerEmail : undefined,
    partBytes: PART_BYTES, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function checkIntakeAndFile(intake: SubmissionIntake, fileName: string, size: number) {
  const errors = validateIntake(intake);
  if (Object.keys(errors).length) throw Object.assign(new PrepError('Some details are missing or invalid.', 422), { fields: errors });
  if (!/\.epub$/i.test(fileName) || fileName.length > 200) throw new PrepError('Upload an .epub file.');
  if (!Number.isSafeInteger(size) || size < 1 || size > MAX_UPLOAD_BYTES) throw new PrepError('The EPUB must be between 1 byte and 150 MB.', 413);
  return { fileName, size, parts: Math.ceil(size / PART_BYTES) };
}

export async function startSubmission(who: Identity, intake: SubmissionIntake, fileName: string, size: number) {
  return createSubmission(who.id, who.email, intake, checkIntakeAndFile(intake, fileName, size));
}

/**
 * The author replaces the EPUB with a corrected one before publishing. The details and the cover
 * choice carry over; the old upload is deleted and the new one is prepared like a first upload.
 */
export async function restartUpload(who: Identity, id: string, intake: SubmissionIntake, fileName: string, size: number) {
  const row = owned(await loadSubmission(id), who);
  if (![...EDITABLE, 'uploading'].includes(row.status)) throw new PrepError('The EPUB can be replaced only before publishing.', 409);
  const upload = checkIntakeAndFile(intake, fileName, size);
  const previous = row.data.upload;
  if (previous && !previous.purged) await removeFile(uploadKey(id), previous.parts);
  return saveSubmission(row, { status: 'uploading', lease_until: null, data: { intake, upload, report: undefined, epubcheck: undefined } });
}

export async function uploadPart(who: Identity, id: string, index: number, bytes: Uint8Array) {
  const row = owned(await loadSubmission(id), who);
  if (row.status !== 'uploading' || !row.data.upload) throw new PrepError('This submission is not accepting uploads.', 409);
  if (!Number.isInteger(index) || index < 0 || index >= row.data.upload.parts) throw new PrepError('Unknown upload part.');
  const expected = index === row.data.upload.parts - 1 ? row.data.upload.size - index * PART_BYTES : PART_BYTES;
  if (bytes.byteLength !== expected) throw new PrepError(`Part ${index + 1} must be ${expected} bytes.`);
  await putPart(uploadKey(id), index, bytes);
}

async function coverOption(row: Submission) {
  const fix = row.data.coverFix;
  if (!fix) return undefined;
  return fix.kind === 'upload' ? { replacement: await getFile(coverUploadKey(row.id), fix.file) } : { enlarge: true };
}

async function runPreparation(row: Submission, source: Uint8Array, epubcheck: EpubcheckMessage[] = [], round = 0) {
  let result;
  try {
    result = prepareEpub(source, row.data.intake, { epubcheck, blockingRules: await learnedBlockingRules(), cover: await coverOption(row) });
  } catch (error) {
    const message = error instanceof PrepError ? error.message : 'The EPUB could not be read. Export it again from your writing tool and re-upload.';
    const report: PrepReport = {
      rounds: [], findings: [{ rule: 'container', severity: 'error', message, fixable: false }],
      summary: { errors: 1, warnings: 0, fixed: 0 }, epubVersion: '', cover: null,
      bytes: { before: source.byteLength, after: 0 }, sha256: '', blockingRules: [],
    };
    return saveSubmission(row, { status: 'needs_author', data: { report } });
  }
  const prepared = await putFile(preparedKey(row.id), result.epub, 'application/epub+zip');
  const cover = result.frontCover ? await putFile(coverKey(row.id), result.frontCover, 'image/jpeg') : undefined;
  const blocked = result.report.summary.errors > 0;
  return saveSubmission(row, {
    status: blocked ? 'needs_author' : workerConfigured() ? 'checking' : 'ready',
    lease_until: null,
    data: {
      prepared, cover, report: result.report,
      epubcheck: { round, ran: false, messages: [], checkedAt: new Date().toISOString() },
    },
  });
}

/** Prepare from the author's original upload (first run, or after the author corrects details). */
export async function prepareSubmission(who: Identity, id: string) {
  let row = owned(await loadSubmission(id), who);
  if (!['uploading', 'needs_author', 'ready', 'checking'].includes(row.status)) throw new PrepError('This submission can no longer be prepared.', 409);
  const upload = row.data.upload;
  if (!upload || upload.purged) throw new PrepError('The original upload is no longer stored.', 409);
  row = await saveSubmission(row, { status: 'preparing' });
  try {
    const source = await getFile(uploadKey(id), upload);
    row = await saveSubmission(row, { data: { upload: { ...upload, sha256: sha256(source) } } });
    return await runPreparation(row, source);
  } catch (error) {
    await saveSubmission(await loadSubmission(id), { status: 'uploading' }).catch(() => undefined);
    throw error;
  }
}

export async function updateIntake(who: Identity, id: string, intake: SubmissionIntake) {
  const row = owned(await loadSubmission(id), who);
  if (!EDITABLE.includes(row.status)) throw new PrepError('Details can be changed only before publishing.', 409);
  const errors = validateIntake(intake);
  if (Object.keys(errors).length) throw Object.assign(new PrepError('Some details are missing or invalid.', 422), { fields: errors });
  await saveSubmission(row, { data: { intake } });
  return prepareSubmission(who, id);
}

/**
 * The author answers a cover finding: upload a replacement front cover, enlarge the current one,
 * or go back to the cover in the EPUB. The book is then prepared again from the original upload.
 */
export async function setCoverFix(who: Identity, id: string, fix: { upload: Uint8Array } | 'enlarge' | 'original') {
  const row = owned(await loadSubmission(id), who);
  if (!EDITABLE.includes(row.status)) throw new PrepError('The cover can be changed only before publishing.', 409);
  const previous = row.data.coverFix;
  const dropPrevious = async () => { if (previous?.kind === 'upload') await removeFile(coverUploadKey(id), previous.file.parts); };
  let next: SubmissionData['coverFix'];
  if (typeof fix === 'object') {
    const bytes = fix.upload;
    const size = imageSize(bytes);
    if (!size) throw new PrepError('Upload the front cover as a JPEG or PNG image.', 415);
    try { decodeImage(bytes); } catch { throw new PrepError('The image could not be read. Export it again as JPEG or PNG.'); }
    if (size.width >= size.height) throw new PrepError(`The image is ${size.width} × ${size.height}. Upload the front cover only, taller than it is wide.`);
    if (size.height < 1000) throw new PrepError(`The image is ${size.width} × ${size.height}; stores need at least 1000 pixels on the long side.`);
    await dropPrevious();
    next = { kind: 'upload', file: await putFile(coverUploadKey(id), bytes, bytes[0] === 0x89 ? 'image/png' : 'image/jpeg'), ...size };
  } else {
    await dropPrevious();
    if (fix === 'enlarge') next = { kind: 'enlarge' };
  }
  await saveSubmission(row, { data: { coverFix: next } });
  return prepareSubmission(who, id);
}

export async function submissionFile(who: Identity, id: string, file: 'epub' | 'cover', part?: number) {
  const row = owned(await loadSubmission(id), who);
  const stored = file === 'epub' ? row.data.prepared : row.data.cover;
  if (!stored) throw new PrepError('This file has not been prepared yet.', 404);
  if (part === undefined) return { manifest: { size: stored.size, parts: stored.parts, sha256: stored.sha256, contentType: stored.contentType } };
  if (!Number.isInteger(part) || part < 0 || part >= stored.parts) throw new PrepError('Unknown file part.', 404);
  return { bytes: await getPart(file === 'epub' ? preparedKey(id) : coverKey(id), part), contentType: 'application/octet-stream' };
}

export const listFor = async (who: Identity) => (await listSubmissions(who.role === 'admin' ? undefined : who.id)).map((r) => view(r, who));
export const getFor = async (who: Identity, id: string) => view(owned(await loadSubmission(id), who), who);

// --- Worker ----------------------------------------------------------------------------------

export async function claimCheck() {
  await purgeExpired().catch(() => undefined);
  const row = await nextForCheck();
  if (!row?.data.prepared) return null;
  const leased = await saveSubmission(row, { lease_until: new Date(Date.now() + LEASE_MINUTES * 60_000).toISOString() });
  return { id: leased.id, size: leased.data.prepared!.size, parts: leased.data.prepared!.parts, sha256: leased.data.prepared!.sha256 };
}

export async function checkPart(id: string, part: number) {
  const row = await loadSubmission(id);
  if (row.status !== 'checking' || !row.data.prepared) throw new PrepError('Nothing to check.', 409);
  if (!Number.isInteger(part) || part < 0 || part >= row.data.prepared.parts) throw new PrepError('Unknown file part.', 404);
  return getPart(preparedKey(id), part);
}

/**
 * EPUBCheck feedback re-enters the preparation loop: if the engine can fix what EPUBCheck found,
 * the fixed file is checked again, up to MAX_CHECK_ROUNDS.
 */
export async function recordCheck(id: string, sha: string, messages: EpubcheckMessage[]) {
  const row = await loadSubmission(id);
  if (row.status !== 'checking' || !row.data.prepared) throw new PrepError('This submission is not waiting for a check.', 409);
  if (sha !== row.data.prepared.sha256) throw new PrepError('The checked file is not the current prepared file.', 409);
  const round = (row.data.epubcheck?.round ?? 0) + 1;
  const prepared = await getFile(preparedKey(id), row.data.prepared);
  const result = prepareEpub(prepared, row.data.intake, { epubcheck: messages, blockingRules: await learnedBlockingRules() });
  const failed = messages.some((m) => m.severity === 'ERROR' || m.severity === 'FATAL');
  if (failed && result.report.rounds.length && round < MAX_CHECK_ROUNDS) {
    const next = await putFile(preparedKey(id), result.epub, 'application/epub+zip');
    const report = { ...result.report, rounds: [...(row.data.report?.rounds ?? []), ...result.report.rounds.map((r) => ({ ...r, round: r.round + 100 * round }))] };
    return saveSubmission(row, { status: 'checking', lease_until: null, data: { prepared: next, report, epubcheck: { round, ran: true, messages, checkedAt: new Date().toISOString() } } });
  }
  const report = { ...result.report, rounds: row.data.report?.rounds ?? [], bytes: row.data.report?.bytes ?? result.report.bytes, sha256: row.data.prepared.sha256 };
  return saveSubmission(row, {
    status: report.summary.errors ? 'needs_author' : 'ready', lease_until: null,
    data: { report, epubcheck: { round, ran: true, messages, checkedAt: new Date().toISOString() } },
  });
}

// --- Admin -------------------------------------------------------------------------------------

const bookId = (submissionId: string) => `atlas-ebook-${submissionId.slice(0, 8)}`;
const bookKey = (id: string, name: string) => `books/${id}/${name}`;

export async function publishSubmission(id: string, onPublished: (book: Book, categories: string[]) => void) {
  const row = await loadSubmission(id);
  if (row.status !== 'ready' || !row.data.prepared) throw new PrepError('Only a ready submission can be published.', 409);
  const intake = row.data.intake;
  const target = bookId(row.id);
  const epub = await getFile(preparedKey(id), row.data.prepared);
  const content = readerContent(epub, intake.title);
  if (!content.chapters.length) throw new PrepError('No readable chapters were found in the prepared book.', 422);
  for (let i = 0; i < content.images.length; i += 8) {
    await Promise.all(content.images.slice(i, i + 8).map((img) => putObject(bookKey(target, `images/${img.name}`), img.bytes, img.contentType)));
  }
  const imageTypes = Object.fromEntries(content.images.map((img) => [img.name, img.contentType]));
  await putObject(bookKey(target, 'content.json'), new TextEncoder().encode(JSON.stringify({ chapters: content.chapters, imageTypes })), 'application/json');
  if (row.data.cover) await putObject(bookKey(target, 'cover.jpg'), await getFile(coverKey(id), row.data.cover), 'image/jpeg');
  contentCache.delete(target);

  const words = content.chapters.reduce((n, c) => n + c.content.reduce((m, p) => m + p.split(/\s+/).length, 0), 0);
  const price = Math.round(Number(intake.price) * 100) / 100;
  const book: Book = {
    id: target, hasReaderContent: true,
    title: intake.title.trim(), subtitle: intake.subtitle?.trim() || undefined, author: intake.author.trim(),
    authorBio: intake.authorBio?.trim() || `${intake.author.trim()} is the author of ${intake.title.trim()}.`,
    coverImage: row.data.cover ? `/api/catalog/covers/${target}.jpg` : '',
    price, originalPrice: price, isDeal: false, isBestseller: false, isNewRelease: true,
    rating: 0, reviewCount: 0, format: 'ebook',
    genres: intake.categories, primaryGenre: intake.categories[0]!,
    pageCount: Math.max(1, Math.round(words / 275)),
    publishDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    publisher: intake.copyrightHolder.trim(), isbn: intake.ebookIsbn ? normaliseIsbn(intake.ebookIsbn) : '',
    language: intake.language, synopsis: intake.description.trim(), editorialReview: '',
    sampleChapters: sampleChapters(content.chapters), superPointsEarned: Math.round(price * 10),
    tags: intake.keywords, reviews: [], readingTimeHours: Math.max(1, Math.round(words / 250 / 60)),
  };
  onPublished(book, intake.categories);
  return saveSubmission(row, {
    status: 'published', book_id: target,
    purge_after: new Date(Date.now() + RETENTION_DAYS * 86_400_000).toISOString(),
  });
}

export async function rejectSubmission(id: string, reason: string) {
  const row = await loadSubmission(id);
  if (['published', 'rejected'].includes(row.status)) throw new PrepError('This submission is already closed.', 409);
  return saveSubmission(row, {
    status: 'rejected', data: { rejectReason: reason.slice(0, 1000) },
    purge_after: new Date(Date.now() + RETENTION_DAYS * 86_400_000).toISOString(),
  });
}

/** Learning loop: a store's rejection message strengthens the rules that answer it, or queues a new rule. */
export async function recordFeedback(submissionId: string | null, store: string, message: string) {
  if (submissionId) await loadSubmission(submissionId);
  const matched = matchStoreMessage(message);
  return addFeedback({ submission_id: submissionId, store: store.slice(0, 60), message: message.slice(0, 2000), matched_rules: matched });
}

export async function feedbackOverview() {
  const entries = await listFeedback();
  const seen = new Map<string, number>();
  for (const f of entries) for (const r of f.matched_rules) seen.set(r, (seen.get(r) ?? 0) + 1);
  return {
    rules: RULES.map((r) => ({ id: r.id, title: r.title, storeRejections: seen.get(r.id) ?? 0, blocking: (seen.get(r.id) ?? 0) > 0, automaticFix: !!r.fix })),
    needsNewRule: entries.filter((f) => !f.matched_rules.length),
    entries,
  };
}

/** Retention (D4): delete raw uploads 90 days after a submission closes. Prepared files stay while on sale. */
export async function purgeExpired() {
  for (const row of await expiredUploads()) {
    await removeFile(uploadKey(row.id), row.data.upload!.parts);
    if (row.data.coverFix?.kind === 'upload') await removeFile(coverUploadKey(row.id), row.data.coverFix.file.parts);
    if (row.status === 'rejected' && row.data.prepared) await removeFile(preparedKey(row.id), row.data.prepared.parts);
    await saveSubmission(row, { data: { upload: { ...row.data.upload!, purged: true } } });
  }
}

// --- Reader -------------------------------------------------------------------------------------

const contentCache = new Map<string, { chapters: ReaderContent['chapters']; imageTypes: Record<string, string> }>();

export async function bookContent(id: string) {
  if (!/^atlas-ebook-[0-9a-f]{8}$/.test(id)) throw new PrepError('Book not found.', 404);
  const cached = contentCache.get(id);
  if (cached) return cached;
  const parsed = JSON.parse(new TextDecoder().decode(await getObject(bookKey(id, 'content.json'))));
  if (contentCache.size > 20) contentCache.delete(contentCache.keys().next().value!);
  contentCache.set(id, parsed);
  return parsed as { chapters: ReaderContent['chapters']; imageTypes: Record<string, string> };
}

const authors = new Map<string, string | null>();

/**
 * Who reads the whole book: signed-in readers of a free book, admins, the book's author, and its
 * buyers (TASK-0004). Everyone else, signed in or not, gets the preview.
 */
async function readerAccess(id: string, who: Identity | undefined, price: number | undefined): Promise<'full' | 'preview'> {
  if (!who) return 'preview';
  if (who.role === 'admin' || price === 0) return 'full';
  // A purchases outage (or the table not created yet) shows the preview rather than an error.
  if (await hasPurchase(who.id, id).catch((err) => { logger.warn({ err }, 'Purchase lookup failed'); return false; })) return 'full';
  if (!authors.has(id)) authors.set(id, (await submissionForBook(id))?.owner_id ?? null);
  return authors.get(id) === who.id ? 'full' : 'preview';
}

export async function readableContent(id: string, who: Identity | undefined, price: number | undefined) {
  const { chapters } = await bookContent(id);
  const access = await readerAccess(id, who, price);
  return { access, chapters: access === 'full' ? chapters : previewChapters(chapters) };
}

export async function bookImage(id: string, name: string, who: Identity | undefined, price: number | undefined) {
  if (!/^img-\d{4}\.(jpg|png|gif|webp)$/.test(name)) throw new PrepError('Image not found.', 404);
  const { chapters, imageTypes } = await bookContent(id);
  const contentType = imageTypes[name];
  if (!contentType) throw new PrepError('Image not found.', 404);
  if (await readerAccess(id, who, price) === 'preview' && !previewChapters(chapters).some((c) => c.figures?.some((f) => f.src === name))) {
    throw new PrepError('Buy this book to see the rest of it.', 403);
  }
  return { bytes: await getObject(bookKey(id, `images/${name}`)), contentType };
}

export async function bookCover(id: string) {
  if (!/^atlas-ebook-[0-9a-f]{8}$/.test(id)) throw new PrepError('Cover not found.', 404);
  return getObject(bookKey(id, 'cover.jpg'));
}
