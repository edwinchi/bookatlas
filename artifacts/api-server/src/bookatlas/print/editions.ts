/**
 * The printed edition of a published book (owner request 2026-11-24): the author chooses the format and price and
 * uploads a print-ready interior PDF and full-wrap cover PDF. Lulu checks both files; once they pass and the price
 * covers the printing, the book page offers printed copies, printed on demand and shipped to the reader.
 */
import type { Book } from '@workspace/bookatlas-catalog/types';
import { PAPERS, TRIM_SIZES, type PaperId, type TrimSizeId } from '@workspace/bookatlas-catalog/publishing';
import type { Identity } from '../../auth/policy.js';
import { logger } from '../../lib/logger.js';
import { saveSubmission, submissionForBook } from '../ebookPrep/submissions.js';
import { MAX_PRINT_FILE_BYTES, downloadUrl, printFilePath, putMemory, removePrintFiles, storageIsMemory, storedSize, uploadTarget, type PrintFileKind } from './files.js';
import { lulu, luluConfigured, LuluError } from './lulu.js';
import { minimumPrintPrice, podPackageId, printPriceCents, type Binding, type PrintSpec } from './pricing.js';

export class PrintError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

type CheckState = { id: number; status: string; errors: string[]; pageCount?: number; checkedAt: string };
export interface PrintEditionData {
  spec: PrintSpec;
  podPackageId: string;
  priceCents: number | null;
  /** From Lulu's interior check: the printed page count. */
  pageCount: number | null;
  files: Partial<Record<PrintFileKind, { path: string; size: number; uploadedAt: string } | { pending: string }>>;
  checks: Partial<Record<PrintFileKind, CheckState>>;
  /** Lulu's printing + fulfilment cost of one copy shipped in the Netherlands, excluding tax (cents). */
  unitCostExcl: number | null;
  /** The author's choice; the book is only offered when everything else is ready too. */
  wanted: boolean;
  updatedAt: string;
}

export interface PrintCatalog { get(id: string): Promise<Book | null>; save(book: Book): Promise<void> }
let catalog: PrintCatalog | null = null;
let appUrl = '';
export function setPrintCatalog(c: PrintCatalog | null, url = '') { catalog = c; appUrl = url; }

const BOOK_ID = /^atlas-ebook-[0-9a-f]{8}$/;
const PASSED = { interior: ['VALIDATED', 'NORMALIZED'], cover: ['NORMALIZED', 'VALIDATED'] } as const;
const passed = (kind: PrintFileKind, c?: CheckState) => !!c && (PASSED[kind] as readonly string[]).includes(c.status);
const failed = (c?: CheckState) => c?.status === 'ERROR';

async function ownedBook(who: Identity, bookId: string) {
  if (!BOOK_ID.test(bookId)) throw new PrintError('Book not found.', 404);
  const submission = await submissionForBook(bookId);
  if (!submission || (submission.owner_id !== who.id && who.role !== 'admin')) throw new PrintError('Book not found.', 404);
  return submission;
}

const fresh = (spec: PrintSpec): PrintEditionData => ({
  spec, podPackageId: podPackageId(spec), priceCents: null, pageCount: null, files: {}, checks: {}, unitCostExcl: null, wanted: true, updatedAt: new Date().toISOString(),
});

function specFrom(input: unknown, current?: PrintSpec): PrintSpec {
  const b = (input ?? {}) as Record<string, unknown>;
  const trimSize = (b.trimSize ?? current?.trimSize ?? '6x9') as TrimSizeId;
  const paper = (b.paper ?? current?.paper ?? 'cream') as PaperId;
  const binding = (b.binding ?? current?.binding ?? 'paperback') as Binding;
  if (!TRIM_SIZES.some((t) => t.id === trimSize)) throw new PrintError('Choose one of the listed trim sizes.');
  if (!PAPERS.some((p) => p.id === paper)) throw new PrintError('Choose white, cream or colour paper.');
  if (binding !== 'paperback' && binding !== 'hardcover') throw new PrintError('Choose paperback or hardcover.');
  return { trimSize, paper, binding };
}

/** Why the edition is not on sale yet (empty when it can be sold). */
export function missing(e: PrintEditionData | undefined, configured = luluConfigured()): string[] {
  if (!e) return ['Set up the printed edition.'];
  const out: string[] = [];
  if (!configured) out.push('BooksAtlas is finishing its printer account; printed copies go on sale once it is live.');
  if (!e.files.interior || 'pending' in e.files.interior) out.push('Upload the interior PDF.');
  else if (!passed('interior', e.checks.interior)) out.push(failed(e.checks.interior) ? 'The interior PDF did not pass the printer\'s check.' : 'The interior PDF is being checked.');
  if (!e.files.cover || 'pending' in e.files.cover) out.push('Upload the cover PDF.');
  else if (!passed('cover', e.checks.cover)) out.push(failed(e.checks.cover) ? 'The cover PDF did not pass the printer\'s check.' : 'The cover PDF is being checked.');
  if (e.priceCents == null) out.push('Set the price per copy.');
  else if (e.unitCostExcl != null && e.priceCents < minimumPrintPrice(e.unitCostExcl)) out.push(`Raise the price to at least €${(minimumPrintPrice(e.unitCostExcl) / 100).toFixed(2)} to cover printing.`);
  if (!e.wanted) out.push('You took the printed edition off sale.');
  return out;
}

/** Puts the book's printed edition on (or off) the book page to match the edition's state. */
async function syncBook(bookId: string, e: PrintEditionData | undefined) {
  if (!catalog) return;
  const book = await catalog.get(bookId);
  if (!book) return;
  const sell = !!e && missing(e).length === 0;
  const { printEdition: _old, ...rest } = book;
  const next: Book = sell ? { ...rest, printEdition: { price: e!.priceCents! / 100, binding: e!.spec.binding, trimSize: e!.spec.trimSize, paper: e!.spec.paper, pageCount: e!.pageCount! } } : rest;
  if (JSON.stringify(next.printEdition ?? null) === JSON.stringify(book.printEdition ?? null)) return;
  await catalog.save(next);
  logger.info({ event: sell ? 'print.on_sale' : 'print.off_sale', book: bookId }, sell ? 'Printed edition on sale' : 'Printed edition off sale');
}

/** Ask Lulu what one copy costs to print (shipped in NL), to set the minimum price. Null when unknown. */
async function unitCost(e: PrintEditionData) {
  if (!luluConfigured() || !e.pageCount) return null;
  try {
    const cost = await lulu().cost({ podPackageId: e.podPackageId, pageCount: e.pageCount, quantity: 1, level: 'MAIL', address: { street1: 'Damrak 1', city: 'Amsterdam', postcode: '1012 LG', countryCode: 'NL', phone: '+31 20 000 0000' } });
    if (cost.currency !== 'EUR') { logger.error({ event: 'print.currency', currency: cost.currency }, 'The Lulu account does not bill in euros'); return null; }
    return cost.printExcl + cost.fulfilmentExcl;
  } catch (err) {
    if (err instanceof LuluError && err.status === 422) throw new PrintError('The printer does not offer this format at this page count. Choose another trim size, paper or binding.', 422);
    throw err;
  }
}

/** Starts or refreshes Lulu's file checks; the cover check needs the page count from the interior check. */
async function advanceChecks(e: PrintEditionData): Promise<boolean> {
  if (!luluConfigured()) return false;
  let changed = false;
  const now = new Date().toISOString();
  for (const kind of ['interior', 'cover'] as const) {
    const file = e.files[kind];
    if (!file || 'pending' in file) continue;
    const c = e.checks[kind];
    if (c && (passed(kind, c) || failed(c))) continue;
    if (kind === 'cover' && !passed('interior', e.checks.interior)) continue;
    const url = await downloadUrl(file.path, appUrl, 6);
    const r = c ? await (kind === 'interior' ? lulu().interiorCheck(c.id) : lulu().coverCheck(c.id))
      : kind === 'interior' ? await lulu().validateInterior(url) : await lulu().validateCover(url, e.podPackageId, e.pageCount!);
    e.checks[kind] = { id: r.id, status: r.status, errors: r.errors.slice(0, 10), pageCount: r.pageCount, checkedAt: now };
    if (kind === 'interior' && r.pageCount && r.pageCount !== e.pageCount) { e.pageCount = r.pageCount; e.unitCostExcl = null; }
    changed = true;
  }
  if (e.pageCount && e.unitCostExcl == null) { e.unitCostExcl = await unitCost(e); changed = changed || e.unitCostExcl != null; }
  return changed;
}

async function store(bookId: string, e: PrintEditionData | undefined) {
  const row = await submissionForBook(bookId);
  if (!row) throw new PrintError('Book not found.', 404);
  await saveSubmission(row, { data: { printEdition: e } });
  await syncBook(bookId, e);
}

function view(bookId: string, e: PrintEditionData | undefined) {
  const file = (k: PrintFileKind) => {
    const f = e?.files[k];
    return !f ? null : 'pending' in f ? { uploaded: false } : { uploaded: true, size: f.size, uploadedAt: f.uploadedAt };
  };
  const check = (k: PrintFileKind) => {
    const c = e?.checks[k];
    return c ? { status: passed(k, c) ? 'passed' : failed(c) ? 'failed' : 'checking', errors: c.errors } : null;
  };
  return {
    bookId,
    configured: luluConfigured(),
    maxFileBytes: MAX_PRINT_FILE_BYTES,
    directUpload: !storageIsMemory(),
    edition: e ? {
      spec: e.spec, priceCents: e.priceCents, pageCount: e.pageCount, wanted: e.wanted,
      files: { interior: file('interior'), cover: file('cover') }, checks: { interior: check('interior'), cover: check('cover') },
      unitCostExclCents: e.unitCostExcl, minimumPriceCents: e.unitCostExcl != null ? minimumPrintPrice(e.unitCostExcl) : null,
    } : null,
    missing: missing(e),
    onSale: !!e && missing(e).length === 0,
  };
}

export async function getEdition(who: Identity, bookId: string) {
  const submission = await ownedBook(who, bookId);
  const e = submission.data.printEdition;
  if (e) {
    try {
      if (await advanceChecks(e)) await store(bookId, e);
    } catch (err) {
      if (err instanceof PrintError) throw err;
      logger.warn({ err, event: 'print.check_failed', book: bookId }, 'Print file check could not be refreshed');
    }
  }
  const after = (await submissionForBook(bookId))?.data.printEdition;
  let dimensions: { widthMm: number; heightMm: number } | null = null;
  if (after?.pageCount && luluConfigured()) dimensions = await lulu().coverDimensions(after.podPackageId, after.pageCount).catch(() => null);
  return { ...view(bookId, after), coverDimensions: dimensions };
}

/** Format, price and on/off sale. Changing the format restarts the cover check (its size depends on it). */
export async function saveEdition(who: Identity, bookId: string, body: unknown) {
  const submission = await ownedBook(who, bookId);
  const b = (body ?? {}) as Record<string, unknown>;
  const before = submission.data.printEdition;
  const spec = specFrom(b, before?.spec);
  const e: PrintEditionData = before ? structuredClone(before) : fresh(spec);
  const code = podPackageId(spec);
  if (code !== e.podPackageId) {
    e.spec = spec; e.podPackageId = code; e.unitCostExcl = null;
    delete e.checks.cover;
  }
  if ('price' in b) {
    try { e.priceCents = b.price === null || b.price === '' ? null : printPriceCents(b.price); } catch (err) { throw new PrintError((err as Error).message, 422); }
  }
  if (typeof b.wanted === 'boolean') e.wanted = b.wanted;
  e.updatedAt = new Date().toISOString();
  if (e.pageCount && e.unitCostExcl == null) e.unitCostExcl = await unitCost(e);
  if (e.priceCents != null && e.unitCostExcl != null && e.priceCents < minimumPrintPrice(e.unitCostExcl)) {
    throw new PrintError(`Printing one copy costs €${(e.unitCostExcl / 100).toFixed(2)} before VAT; the lowest price that leaves you something is €${(minimumPrintPrice(e.unitCostExcl) / 100).toFixed(2)}.`, 422);
  }
  await advanceChecks(e).catch((err) => logger.warn({ err, event: 'print.check_failed', book: bookId }, 'Print file check could not start'));
  await store(bookId, e);
  return getEdition(who, bookId);
}

/** Step 1 of an upload: where the browser sends the PDF. */
export async function startUpload(who: Identity, bookId: string, kind: PrintFileKind, size: unknown) {
  const submission = await ownedBook(who, bookId);
  const bytes = Number(size);
  if (!Number.isSafeInteger(bytes) || bytes < 1) throw new PrintError('Choose a PDF file.');
  if (bytes > MAX_PRINT_FILE_BYTES) throw new PrintError(`Print files can be up to ${MAX_PRINT_FILE_BYTES / 1024 / 1024} MB. Export the PDF with compressed images (300 dpi is enough).`, 413);
  const e = submission.data.printEdition ? structuredClone(submission.data.printEdition) : fresh(specFrom({}));
  const path = printFilePath(bookId, kind);
  e.files[kind] = { pending: path };
  e.updatedAt = new Date().toISOString();
  await store(bookId, e);
  const target = await uploadTarget(path);
  return { ...target, url: target.direct ? target.url : `/api/print/editions/${bookId}/files/${kind}` };
}

/** Local stack: the PDF itself, through the API. */
export async function receiveMemoryUpload(who: Identity, bookId: string, kind: PrintFileKind, bytes: Uint8Array) {
  if (!storageIsMemory()) throw new PrintError('Upload the file to the address you were given.', 409);
  const submission = await ownedBook(who, bookId);
  const f = submission.data.printEdition?.files[kind];
  if (!f || !('pending' in f)) throw new PrintError('Start the upload first.', 409);
  try { putMemory(f.pending, bytes); } catch (err) { throw new PrintError((err as Error).message, (err as { status?: number }).status ?? 400); }
  return finishUpload(who, bookId, kind);
}

/** Step 2: the browser says the upload is done; the file is checked and Lulu's file check starts. */
export async function finishUpload(who: Identity, bookId: string, kind: PrintFileKind) {
  const submission = await ownedBook(who, bookId);
  const e = submission.data.printEdition ? structuredClone(submission.data.printEdition) : undefined;
  const f = e?.files[kind];
  if (!e || !f || !('pending' in f)) throw new PrintError('Start the upload first.', 409);
  const size = await storedSize(f.pending);
  if (!size) throw new PrintError('The upload did not arrive. Please try again.', 409);
  const replaced = Object.values(submission.data.printEdition?.files ?? {}).flatMap((x) => (x && 'path' in x && x.path !== f.pending && x.path.includes(`/${kind}-`) ? [x.path] : []));
  e.files[kind] = { path: f.pending, size, uploadedAt: new Date().toISOString() };
  delete e.checks[kind];
  // A new interior can change the page count, so the cover is checked again too.
  if (kind === 'interior') { delete e.checks.cover; e.pageCount = null; e.unitCostExcl = null; }
  await advanceChecks(e).catch((err) => logger.warn({ err, event: 'print.check_failed', book: bookId }, 'Print file check could not start'));
  await store(bookId, e);
  await removePrintFiles(replaced).catch(() => undefined);
  return getEdition(who, bookId);
}

/** What an order needs from the edition; null when the printed edition is not on sale. */
export async function editionForOrder(bookId: string) {
  if (!BOOK_ID.test(bookId)) return null;
  const submission = await submissionForBook(bookId);
  const e = submission?.data.printEdition;
  if (!submission || !e || missing(e).length) return null;
  const interior = e.files.interior as { path: string }, cover = e.files.cover as { path: string };
  return { edition: e, title: submission.data.intake.title, interiorPath: interior.path, coverPath: cover.path };
}
