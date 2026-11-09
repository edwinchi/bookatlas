import { createHash } from 'node:crypto';
import { supabase } from '../db/supabaseClient.js';
import { PrepError } from './archive.js';

/** Vercel caps request and response bodies at 4.5 MB, so files travel and rest in parts. */
export const PART_BYTES = 4 * 1024 * 1024;
export const BUCKET = 'bookatlas-ebooks';

export interface StoredFile { size: number; parts: number; sha256: string; contentType: string }

interface ObjectStore {
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<Uint8Array>;
  remove(keys: string[]): Promise<void>;
}

const memory = new Map<string, Uint8Array>();
const memoryStore: ObjectStore = {
  async put(key, bytes) { memory.set(key, new Uint8Array(bytes)); },
  async get(key) {
    const value = memory.get(key);
    if (!value) throw new PrepError('Stored file not found.', 404);
    return value;
  },
  async remove(keys) { for (const key of keys) memory.delete(key); },
};

let bucketReady: Promise<void> | null = null;
function ensureBucket() {
  bucketReady ??= (async () => {
    const existing = await supabase!.storage.getBucket(BUCKET);
    if (existing.data) return;
    const created = await supabase!.storage.createBucket(BUCKET, { public: false });
    if (created.error && !/already exists/i.test(created.error.message)) {
      bucketReady = null;
      throw new PrepError('Private book storage could not be prepared.', 503);
    }
  })();
  return bucketReady;
}

const supabaseStore: ObjectStore = {
  async put(key, bytes, contentType) {
    await ensureBucket();
    const result = await supabase!.storage.from(BUCKET).upload(key, bytes, { contentType, upsert: true, cacheControl: '0' });
    if (result.error) throw new PrepError('A file could not be saved to private storage.', 503);
  },
  async get(key) {
    await ensureBucket();
    const result = await supabase!.storage.from(BUCKET).download(key);
    if (result.error || !result.data) throw new PrepError('Stored file not found.', 404);
    return new Uint8Array(await result.data.arrayBuffer());
  },
  async remove(keys) {
    if (!keys.length) return;
    await ensureBucket();
    for (let i = 0; i < keys.length; i += 100) {
      const result = await supabase!.storage.from(BUCKET).remove(keys.slice(i, i + 100));
      if (result.error) throw new PrepError('Stored files could not be removed.', 503);
    }
  },
};

const store = (): ObjectStore => (supabase ? supabaseStore : memoryStore);

const partKey = (key: string, index: number) => `${key}/part-${String(index).padStart(4, '0')}`;

async function parallel<T>(items: T[], limit: number, task: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) await task(items[next++]!);
  }));
}

export function sha256(bytes: Uint8Array) { return createHash('sha256').update(bytes).digest('hex'); }

/** Save one part of an upload exactly as received. */
export async function putPart(key: string, index: number, bytes: Uint8Array) {
  if (bytes.byteLength > PART_BYTES) throw new PrepError('Each upload part must be 4 MB or smaller.', 413);
  await store().put(partKey(key, index), bytes, 'application/octet-stream');
}

export async function getPart(key: string, index: number) { return store().get(partKey(key, index)); }

/** Join an object's parts back into one file. */
export async function getFile(key: string, file: Pick<StoredFile, 'parts' | 'size'>) {
  const out = new Uint8Array(file.size);
  let offset = 0;
  const chunks: Uint8Array[] = new Array(file.parts);
  await parallel([...Array(file.parts).keys()], 6, async (i) => { chunks[i] = await getPart(key, i); });
  for (const chunk of chunks) {
    if (offset + chunk.byteLength > file.size) throw new PrepError('The stored file is larger than recorded.', 409);
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  if (offset !== file.size) throw new PrepError('The upload is incomplete: some parts are missing.', 409);
  return out;
}

export async function putFile(key: string, bytes: Uint8Array, contentType: string): Promise<StoredFile> {
  const parts = Math.max(1, Math.ceil(bytes.byteLength / PART_BYTES));
  await parallel([...Array(parts).keys()], 6, async (i) => {
    await store().put(partKey(key, i), bytes.subarray(i * PART_BYTES, (i + 1) * PART_BYTES), 'application/octet-stream');
  });
  return { size: bytes.byteLength, parts, sha256: sha256(bytes), contentType };
}

export async function removeFile(key: string, parts: number) {
  await store().remove([...Array(parts).keys()].map((i) => partKey(key, i)));
}

/** Small single objects (reader content, images, covers). */
export async function putObject(key: string, bytes: Uint8Array, contentType: string) { await store().put(key, bytes, contentType); }
export async function getObject(key: string) { return store().get(key); }
