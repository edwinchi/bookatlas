/**
 * Print-ready PDFs (interior and cover) in private storage. Files go straight from the author's browser to
 * Supabase Storage with a one-time signed upload address, because Vercel limits requests to 4.5 MB. The printer
 * fetches them through short-lived signed download addresses. Without Supabase (local stack, tests) files are kept
 * in memory and uploaded through the API.
 */
import { supabase } from '../db/supabaseClient.js';

export const PRINT_BUCKET = 'bookatlas-print';
/** Supabase's per-file limit on the free plan. */
export const MAX_PRINT_FILE_BYTES = 50 * 1024 * 1024;
/** Uploads through the API (local stack only) stay under the request limit. */
export const MAX_MEMORY_UPLOAD_BYTES = 4 * 1024 * 1024;
export type PrintFileKind = 'interior' | 'cover';
export const isPrintFileKind = (v: unknown): v is PrintFileKind => v === 'interior' || v === 'cover';

export class PrintFileError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

const memory = new Map<string, Uint8Array>();
export const storageIsMemory = () => !supabase;

let bucketReady: Promise<void> | null = null;
function ensureBucket() {
  bucketReady ??= (async () => {
    const existing = await supabase!.storage.getBucket(PRINT_BUCKET);
    if (existing.data) return;
    const created = await supabase!.storage.createBucket(PRINT_BUCKET, { public: false, fileSizeLimit: MAX_PRINT_FILE_BYTES, allowedMimeTypes: ['application/pdf'] });
    if (created.error && !/already exists/i.test(created.error.message)) { bucketReady = null; throw new PrintFileError('Private print storage could not be prepared.', 503); }
  })();
  return bucketReady;
}

export const printFilePath = (bookId: string, kind: PrintFileKind, stamp = Date.now()) => `${bookId}/${kind}-${stamp}.pdf`;

/** A one-time address the browser uploads the PDF to (PUT, Content-Type application/pdf). */
export async function uploadTarget(path: string): Promise<{ method: 'PUT'; url: string; direct: boolean }> {
  if (!supabase) return { method: 'PUT', url: '', direct: false };
  await ensureBucket();
  const r = await supabase.storage.from(PRINT_BUCKET).createSignedUploadUrl(path);
  if (r.error || !r.data) throw new PrintFileError('An upload address could not be created. Please retry.', 503);
  return { method: 'PUT', url: r.data.signedUrl, direct: true };
}

/** Size of an uploaded file, or null when it is not there. */
export async function storedSize(path: string): Promise<number | null> {
  if (!supabase) return memory.get(path)?.byteLength ?? null;
  await ensureBucket();
  const slash = path.lastIndexOf('/');
  const r = await supabase.storage.from(PRINT_BUCKET).list(path.slice(0, slash), { search: path.slice(slash + 1), limit: 5 });
  if (r.error) throw new PrintFileError('The upload could not be checked. Please retry.', 503);
  const file = r.data?.find((f) => f.name === path.slice(slash + 1));
  return file ? Number((file.metadata as { size?: number } | null)?.size ?? 0) : null;
}

/** Local stack: the PDF arrives through the API. */
export function putMemory(path: string, bytes: Uint8Array) {
  if (bytes.byteLength > MAX_MEMORY_UPLOAD_BYTES) throw new PrintFileError('Locally, print files are limited to 4 MB.', 413);
  if (!isPdf(bytes)) throw new PrintFileError('Send the file as a PDF.', 415);
  memory.set(path, new Uint8Array(bytes));
}

export const isPdf = (bytes: Uint8Array) => bytes.byteLength > 4 && String.fromCharCode(...bytes.slice(0, 5)) === '%PDF-';

/** An address the printer can fetch the file from for `hours`. */
export async function downloadUrl(path: string, appUrl: string, hours = 72): Promise<string> {
  if (!supabase) return `${appUrl}/print-files/${encodeURIComponent(path)}`;
  await ensureBucket();
  const r = await supabase.storage.from(PRINT_BUCKET).createSignedUrl(path, hours * 3600);
  if (r.error || !r.data) throw new PrintFileError('The print file could not be shared with the printer.', 503);
  return r.data.signedUrl;
}

export async function removePrintFiles(paths: string[]) {
  if (!paths.length) return;
  if (!supabase) { for (const p of paths) memory.delete(p); return; }
  await ensureBucket();
  await supabase.storage.from(PRINT_BUCKET).remove(paths);
}
