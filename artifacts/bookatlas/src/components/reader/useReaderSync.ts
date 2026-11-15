import { useCallback, useEffect, useRef, useState } from 'react';
import type { Chapter, ReaderSettings } from '../../types';
import { sanitizeReaderSettings } from '../../utils/readerSettings';
import { EbookApiError, type Annotation, type AnnotationKind, type SyncedProgress, type useEbookApi } from '../ebook/ebookApi';

type Api = ReturnType<typeof useEbookApi>;

/** "Phone", "Tablet" or "Computer", so "continue where you left off" can say where. */
export function deviceLabel() {
  if (typeof navigator === 'undefined') return 'Computer';
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'Tablet';
  if (/Mobi|Android|iPhone/i.test(ua)) return 'Phone';
  return 'Computer';
}

const words = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);

/**
 * BooksAtlas Reader sync (cycle 7). Signed in: highlights, bookmarks and notes are saved to the account,
 * the place is saved as you read, settings follow you, and reading time is recorded for statistics.
 * Signed out (or offline): everything keeps working on this device and nothing is sent.
 */
export function useReaderSync(opts: {
  api: Api; signedIn: boolean; bookId: string; chapters: Chapter[];
  chapterIndex: number; paragraphIndex: number; progressPercent: number;
  settings: ReaderSettings; onRemoteSettings: (s: ReaderSettings) => void;
}) {
  const { api, signedIn, bookId, chapters, chapterIndex, paragraphIndex, progressPercent, settings, onRemoteSettings } = opts;
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [remote, setRemote] = useState<SyncedProgress | null>(null);
  const [status, setStatus] = useState<'local' | 'loading' | 'synced' | 'offline'>(signedIn ? 'loading' : 'local');
  const device = useRef(deviceLabel()).current;
  // The place: saved 1.5 s after the reader stops moving (and when the reader closes).
  const place = useRef({ chapterIndex, paragraphIndex, progressPercent });
  place.current = { chapterIndex, paragraphIndex, progressPercent };
  // "Continue on your phone" is offered only until the reader moves on from where this device opened.
  const posAtLoad = useRef('');
  useEffect(() => {
    if (remote && posAtLoad.current && posAtLoad.current !== `${chapterIndex}:${paragraphIndex}`) setRemote(null);
  }, [chapterIndex, paragraphIndex]);
  const openedAt = useRef(new Date().toISOString());

  // Load the account's marks and place for this book.
  useEffect(() => {
    if (!signedIn) { setStatus('local'); return; }
    let cancelled = false;
    setStatus('loading');
    api.readerState(bookId).then((s) => {
      if (cancelled) return;
      setAnnotations(s.annotations);
      posAtLoad.current = `${place.current.chapterIndex}:${place.current.paragraphIndex}`;
      setRemote(s.progress);
      setStatus('synced');
    }).catch(() => { if (!cancelled) setStatus('offline'); });
    return () => { cancelled = true; };
  }, [bookId, signedIn]);

  // Settings: the account's settings replace this device's on open; changes are saved a second later.
  const settingsLoaded = useRef(false);
  useEffect(() => {
    settingsLoaded.current = false;
    if (!signedIn) return;
    api.readerPreferences().then((p) => {
      if (p.settings && Object.keys(p.settings).length) onRemoteSettings(sanitizeReaderSettings({ ...settings, ...p.settings }));
    }).catch(() => undefined).finally(() => { settingsLoaded.current = true; });
  }, [signedIn]);
  useEffect(() => {
    if (!signedIn || !settingsLoaded.current) return;
    const t = setTimeout(() => { api.saveReaderPreferences({ ...settings }).catch(() => undefined); }, 1000);
    return () => clearTimeout(t);
  }, [signedIn, settings.theme, settings.fontFamily, settings.fontSize, settings.lineHeight, settings.marginWidth]);


  const savePlace = useCallback(() => {
    if (!signedIn) return;
    api.saveReaderProgress(bookId, { ...place.current, device, at: new Date().toISOString() }).catch(() => undefined);
  }, [signedIn, bookId]);
  useEffect(() => {
    if (!signedIn || status === 'loading') return;
    const t = setTimeout(savePlace, 1500);
    return () => clearTimeout(t);
  }, [chapterIndex, paragraphIndex, signedIn, status]);

  // Reading time: counted only while the page is visible and the reader moved in the last 2 minutes.
  const session = useRef({ seconds: 0, paragraphs: new Set<string>(), lastActive: Date.now() });
  useEffect(() => { session.current.lastActive = Date.now(); session.current.paragraphs.add(`${chapterIndex}:${paragraphIndex}`); }, [chapterIndex, paragraphIndex]);
  useEffect(() => {
    const touch = () => { session.current.lastActive = Date.now(); };
    window.addEventListener('pointerdown', touch); window.addEventListener('keydown', touch); window.addEventListener('scroll', touch, true);
    const tick = setInterval(() => {
      if (document.visibilityState === 'visible' && Date.now() - session.current.lastActive < 120_000) session.current.seconds += 5;
    }, 5000);
    return () => { clearInterval(tick); window.removeEventListener('pointerdown', touch); window.removeEventListener('keydown', touch); window.removeEventListener('scroll', touch, true); };
  }, []);
  const flushSession = useCallback(() => {
    const s = session.current;
    if (!signedIn || s.seconds < 5) return;
    const read = [...s.paragraphs].map((k) => k.split(':').map(Number)).map(([c, p]) => chapters[c!]?.content[p!] ?? '');
    api.recordReadingSession({ bookId, startedAt: openedAt.current, seconds: s.seconds, paragraphs: s.paragraphs.size, words: read.reduce((n, t) => n + words(t), 0), device }).catch(() => undefined);
    session.current = { seconds: 0, paragraphs: new Set(), lastActive: Date.now() };
    openedAt.current = new Date().toISOString();
  }, [signedIn, bookId, chapters]);
  // Every 5 minutes, when the tab is hidden, and when the reader closes.
  useEffect(() => {
    const every = setInterval(flushSession, 300_000);
    const hide = () => { if (document.visibilityState === 'hidden') { flushSession(); savePlace(); } };
    document.addEventListener('visibilitychange', hide);
    return () => { clearInterval(every); document.removeEventListener('visibilitychange', hide); flushSession(); savePlace(); };
  }, [flushSession, savePlace]);

  // Marks. Signed out they live only in this session; signed in they are saved, optimistic first.
  const localId = () => `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const add = async (kind: AnnotationKind, at: { chapterIndex: number; paragraphIndex: number }, extra: { color?: string; note?: string } = {}) => {
    const excerpt = (chapters[at.chapterIndex]?.content[at.paragraphIndex] ?? '').slice(0, 600);
    const now = new Date().toISOString();
    const draft: Annotation = { id: localId(), book_id: bookId, kind, color: kind === 'highlight' ? extra.color ?? 'yellow' : null, chapter_index: at.chapterIndex, paragraph_index: at.paragraphIndex, excerpt, note: extra.note ?? null, created_at: now, updated_at: now };
    setAnnotations((list) => [draft, ...list.filter((a) => !(kind !== 'note' && a.kind === kind && a.chapter_index === at.chapterIndex && a.paragraph_index === at.paragraphIndex))]);
    if (!signedIn) return draft;
    try {
      const saved = await api.addAnnotation({ bookId, kind, chapterIndex: at.chapterIndex, paragraphIndex: at.paragraphIndex, excerpt, ...extra });
      setAnnotations((list) => [saved, ...list.filter((a) => a.id !== draft.id && a.id !== saved.id)]);
      return saved;
    } catch (e) {
      setAnnotations((list) => list.filter((a) => a.id !== draft.id));
      throw e instanceof EbookApiError ? e : new Error('Could not save. Please retry.');
    }
  };
  const remove = async (id: string) => {
    const before = annotations;
    setAnnotations((list) => list.filter((a) => a.id !== id));
    if (!signedIn || id.startsWith('local-')) return;
    try { await api.deleteAnnotation(id); } catch (e) { setAnnotations(before); throw e; }
  };
  const update = async (id: string, patch: { note?: string; color?: string }) => {
    setAnnotations((list) => list.map((a) => (a.id === id ? { ...a, ...patch, updated_at: new Date().toISOString() } : a)));
    if (!signedIn || id.startsWith('local-')) return;
    const saved = await api.updateAnnotation(id, patch);
    setAnnotations((list) => list.map((a) => (a.id === id ? saved : a)));
  };

  /** Phase 3 (cycle 10): share a highlight or note with other readers of the book, or stop sharing it. */
  const share = async (id: string, shared: boolean) => {
    if (!signedIn || id.startsWith('local-')) throw new Error('Sign in to share with other readers.');
    const saved = await api.shareAnnotation(id, bookId, shared);
    setAnnotations((list) => list.map((a) => (a.id === id ? saved : a)));
  };

  return { annotations, add, remove, update, share, remote, status, device, dismissRemote: () => setRemote(null) };
}

/** Markdown of the book's highlights, bookmarks and notes, for "Export". */
export function annotationsMarkdown(title: string, author: string, chapters: Chapter[], list: Annotation[]) {
  const sorted = [...list].sort((a, b) => a.chapter_index - b.chapter_index || a.paragraph_index - b.paragraph_index);
  const lines = [`# ${title}`, `*${author}*`, '', `Exported from BooksAtlas on ${new Date().toLocaleDateString('en-GB')}.`, ''];
  let chapter = -1;
  for (const a of sorted) {
    if (a.chapter_index !== chapter) { chapter = a.chapter_index; lines.push(`## ${chapters[chapter]?.title ?? `Chapter ${chapter + 1}`}`, ''); }
    const label = a.kind === 'highlight' ? `Highlight (${a.color})` : a.kind === 'bookmark' ? 'Bookmark' : 'Note';
    if (a.excerpt) lines.push(`> ${a.excerpt.replace(/\n+/g, ' ')}`);
    lines.push(`*${label}*${a.note ? `: ${a.note}` : ''}`, '');
  }
  return lines.join('\n');
}
