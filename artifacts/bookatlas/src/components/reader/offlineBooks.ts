/**
 * Offline reading (phase 11, owner request 2026-11-25). A reader saves a book on this device: its text and
 * pictures go into IndexedDB, so the reader opens it with no connection. Reading position and reading time made
 * offline wait in a small queue and are sent when the connection is back. Nothing leaves the device; the copy
 * is only what this reader may already read (the whole book when bought, else the preview).
 */
import type { Book, Chapter } from '../../types';

export interface OfflineBook {
  id: string;
  /** What the shelf and the reader need to open the book without the catalogue. */
  book: Pick<Book, 'id' | 'title' | 'author' | 'coverImage'> & Partial<Book>;
  chapters: Chapter[]; access: 'full' | 'preview'; savedAt: string; bytes: number; pictures: number;
}

const DB = 'bookatlas-offline';
const VERSION = 1;
const hasIdb = () => typeof indexedDB !== 'undefined';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('books')) db.createObjectStore('books', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('images')) db.createObjectStore('images');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function run<T>(store: 'books' | 'images', mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await open();
  return new Promise<T | undefined>((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const r = fn(tx.objectStore(store));
    tx.oncomplete = () => { db.close(); resolve(r ? r.result : undefined); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error); };
  });
}

/** The pictures a book's text uses. */
export const picturesOf = (chapters: Chapter[]) => [...new Set(chapters.flatMap((c) => (c.figures ?? []).map((f) => f.src)))];
/** About how much room the text takes. */
export const textBytes = (chapters: Chapter[]) => chapters.reduce((n, c) => n + c.title.length + c.content.reduce((m, p) => m + p.length, 0), 0) * 2;
export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export async function saveOffline(entry: Omit<OfflineBook, 'savedAt' | 'bytes' | 'pictures'>, loadPicture: (name: string) => Promise<Blob>): Promise<OfflineBook> {
  if (!hasIdb()) throw new Error('This browser cannot keep books for offline reading.');
  // Ask the browser not to clear saved books when space runs low (it may say no; the books still save).
  try { await navigator.storage?.persist?.(); } catch { /* not offered */ }
  let pictureBytes = 0, pictures = 0;
  for (const name of picturesOf(entry.chapters)) {
    try {
      const blob = await loadPicture(name);
      await run('images', 'readwrite', (s) => s.put(blob, `${entry.id}/${name}`));
      pictureBytes += blob.size; pictures += 1;
    } catch { /* a picture that fails to load is left out; the text still saves */ }
  }
  const saved: OfflineBook = { ...entry, savedAt: new Date().toISOString(), bytes: textBytes(entry.chapters) + pictureBytes, pictures };
  await run('books', 'readwrite', (s) => s.put(saved));
  window.dispatchEvent(new Event('bookatlas:offline-books'));
  return saved;
}

export async function offlineBook(id: string): Promise<OfflineBook | null> {
  if (!hasIdb()) return null;
  try { return (await run<OfflineBook>('books', 'readonly', (s) => s.get(id))) ?? null; } catch { return null; }
}

export async function offlineBooks(): Promise<OfflineBook[]> {
  if (!hasIdb()) return [];
  try { return ((await run<OfflineBook[]>('books', 'readonly', (s) => s.getAll())) ?? []).sort((a, b) => b.savedAt.localeCompare(a.savedAt)); } catch { return []; }
}

export async function offlinePicture(bookId: string, name: string): Promise<Blob | null> {
  if (!hasIdb()) return null;
  try { return (await run<Blob>('images', 'readonly', (s) => s.get(`${bookId}/${name}`))) ?? null; } catch { return null; }
}

export async function removeOffline(id: string) {
  if (!hasIdb()) return;
  const saved = await offlineBook(id);
  for (const name of saved ? picturesOf(saved.chapters) : []) await run('images', 'readwrite', (s) => s.delete(`${id}/${name}`)).catch(() => undefined);
  await run('books', 'readwrite', (s) => s.delete(id));
  window.dispatchEvent(new Event('bookatlas:offline-books'));
}

// ------------------------------------------------------------------------------------------- the offline queue

/** Reading position and reading time made while offline, sent when the connection is back. */
export type Pending =
  | { kind: 'progress'; bookId: string; body: Record<string, unknown>; at: string }
  | { kind: 'session'; bookId: string; body: Record<string, unknown>; at: string };

/** One position per book (the latest), every reading session, at most 200 items. */
export function queuePending(list: Pending[], item: Pending): Pending[] {
  const next = item.kind === 'progress' ? list.filter((p) => !(p.kind === 'progress' && p.bookId === item.bookId)) : [...list];
  next.push(item);
  return next.slice(-200);
}

const QUEUE_KEY = 'bookatlas:offline-queue';
export function readQueue(): Pending[] {
  try { const v = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); return Array.isArray(v) ? v.filter((p) => p && (p.kind === 'progress' || p.kind === 'session') && typeof p.bookId === 'string') : []; } catch { return []; }
}
function writeQueue(list: Pending[]) { try { localStorage.setItem(QUEUE_KEY, JSON.stringify(list)); } catch { /* storage full or off */ } }
export function addPending(item: Pending) { writeQueue(queuePending(readQueue(), item)); }

/** Sends what waited; what still fails stays for next time. */
export async function flushQueue(send: (p: Pending) => Promise<unknown>) {
  const list = readQueue();
  if (!list.length) return 0;
  const left: Pending[] = [];
  for (const p of list) { try { await send(p); } catch { left.push(p); } }
  writeQueue(left);
  return list.length - left.length;
}
