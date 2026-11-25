import { useEffect, useRef, useState } from 'react';
import type { Chapter } from '../../types';
import { pickVoice, sentences, type ListenPrefs } from './listening';

export type DeviceState = 'idle' | 'loading' | 'playing' | 'paused';
export type Translated = { text: string; via?: 'device' | 'ai' };

interface Options {
  chapters: () => Chapter[];
  /** The book's language code. */
  bookLang: string;
  prefs: ListenPrefs;
  /** Translates a passage into `to` (on the device when it can, otherwise with BooksAtlas's translator). */
  translate: (text: string, to: string) => Promise<Translated>;
  /** The voice moved to this paragraph (the reader follows it). */
  onPosition: (chapter: number, paragraph: number) => void;
  /** The book ended. */
  onEnd: () => void;
  /**
   * Where in the paragraph's text the voice is: the sentence, and the word when the browser reports it (character
   * offsets into the paragraph as written). Not called while reading a translation.
   */
  onSpoken?: (chapter: number, paragraph: number, sentence: [number, number] | null, word: [number, number] | null) => void;
}

/** Up to this many characters of consecutive paragraphs are translated together (fewer requests). */
const CHUNK = 1800;

/**
 * The free device voice as a real player (owner request 2026-11-17): play, pause and resume where it was,
 * back and forward a paragraph, any speed, any voice, and other languages (each paragraph translated ahead).
 * It reads sentence by sentence because browsers cut off long utterances.
 */
export function useDeviceVoice(o: Options) {
  const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
  // Some phones throw from getVoices() while the speech engine starts, or list voices without a language.
  const readVoices = () => { try { return (synth?.getVoices() ?? []).filter((v) => !!v?.lang); } catch { return []; } };
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(readVoices);
  useEffect(() => {
    if (!synth) return;
    const load = () => setVoices(readVoices());
    load();
    synth.addEventListener?.('voiceschanged', load);
    // Some browsers fill the list late without an event.
    const t = window.setTimeout(load, 800);
    return () => { synth.removeEventListener?.('voiceschanged', load); window.clearTimeout(t); };
  }, [synth]);

  const opts = useRef(o);
  opts.current = o;
  const voicesRef = useRef(voices);
  voicesRef.current = voices;
  const run = useRef(0);
  const pos = useRef({ c: 0, p: 0, s: 0 });
  const [state, setStateRaw] = useState<DeviceState>('idle');
  const stateRef = useRef<DeviceState>('idle');
  const setState = (s: DeviceState) => { stateRef.current = s; setStateRaw(s); };
  const [caption, setCaption] = useState<{ text: string; via?: 'device' | 'ai' } | null>(null);
  const [error, setError] = useState('');
  const [where, setWhere] = useState({ c: 0, p: 0 });
  const cache = useRef(new Map<string, Promise<Translated>>());

  const target = () => opts.current.prefs.lang || opts.current.bookLang;
  const raw = (c: number, p: number) => (opts.current.chapters()[c]?.content[p] ?? '').trim();

  /** The text to say for a paragraph: the original, or its translation (consecutive paragraphs translated together). */
  const textOf = (c: number, p: number): Promise<Translated> => {
    const to = target();
    const original = raw(c, p);
    if (!original || to === opts.current.bookLang) return Promise.resolve({ text: original });
    const key = (i: number) => `${to}:${c}:${i}`;
    const hit = cache.current.get(key(p));
    if (hit) return hit;
    const paras = opts.current.chapters()[c]?.content ?? [];
    const idx = [p];
    let len = original.length;
    for (let q = p + 1; q < paras.length && idx.length < 8; q += 1) {
      const t = raw(c, q);
      if (cache.current.has(key(q))) break;
      if (!t) continue;
      if (len + t.length + 2 > CHUNK) break;
      idx.push(q);
      len += t.length + 2;
    }
    const all = opts.current.translate(idx.map((i) => raw(c, i)).join('\n\n'), to).then((r) => {
      const parts = r.text.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
      return idx.map((_, i) => (parts.length === idx.length ? { text: parts[i]!, via: r.via } : { text: i === 0 ? r.text : '', via: r.via }));
    });
    all.catch(() => idx.forEach((i) => cache.current.delete(key(i))));
    idx.forEach((i, n) => cache.current.set(key(i), all.then((a) => a[n]!)));
    return cache.current.get(key(p))!;
  };

  const speak = async (me: number, c: number, p: number, s: number): Promise<void> => {
    if (me !== run.current || !synth) return;
    const list = opts.current.chapters();
    const chapter = list[c];
    if (!chapter) { finish(); return; }
    if (p >= chapter.content.length) {
      if (c + 1 < list.length) return speak(me, c + 1, 0, 0);
      finish();
      return;
    }
    pos.current = { c, p, s };
    setWhere({ c, p });
    opts.current.onPosition(c, p);
    const translating = target() !== opts.current.bookLang;
    if (translating) setState('loading');
    let said: Translated;
    try { said = await textOf(c, p); } catch (e) {
      if (me !== run.current) return;
      setError(e instanceof Error ? e.message : 'The translation could not be loaded.');
      pause();
      return;
    }
    if (me !== run.current) return;
    if (!said.text) return speak(me, c, p + 1, 0);
    // Translate the next paragraphs while this one is read.
    if (translating) void textOf(c, p + 1).catch(() => undefined);
    setState('playing');
    const parts = sentences(said.text);
    // Where each sentence starts in the paragraph as printed (for the read-along highlight).
    const printed = opts.current.chapters()[c]?.content[p] ?? '';
    const lead = printed.length - printed.trimStart().length;
    const starts: number[] = [];
    { let from = 0; for (const part of parts) { const at = said.text.indexOf(part, from); starts.push(at < 0 ? -1 : lead + at); if (at >= 0) from = at + part.length; } }
    const say = (i: number) => {
      if (me !== run.current) return;
      if (i >= parts.length) { void speak(me, c, p + 1, 0); return; }
      pos.current = { c, p, s: i };
      setCaption(translating ? { text: parts[i]!, via: said.via } : null);
      const lang = target();
      const voice = pickVoice(voicesRef.current, lang, opts.current.prefs.voiceURI);
      try {
        const u = new SpeechSynthesisUtterance(parts[i]!);
        u.rate = Math.min(4, Math.max(0.5, opts.current.prefs.rate || 1));
        u.lang = voice?.lang ?? lang;
        // A voice the engine no longer has (an Android voice pack removed) is refused: the language alone still works.
        try { if (voice) u.voice = voice; } catch { /* keep the language */ }
        const begin = starts[i] ?? -1;
        if (!translating && begin >= 0) {
          const sentence: [number, number] = [begin, begin + parts[i]!.length];
          opts.current.onSpoken?.(c, p, sentence, null);
          u.onboundary = (e) => {
            if (me !== run.current || e.name !== 'word') return;
            const from = begin + e.charIndex;
            const len = e.charLength || (/^[^\s]+/.exec(parts[i]!.slice(e.charIndex))?.[0].length ?? 0);
            if (len > 0) opts.current.onSpoken?.(c, p, sentence, [from, from + len]);
          };
        } else opts.current.onSpoken?.(c, p, null, null);
        u.onend = () => say(i + 1);
        u.onerror = (e) => {
          if (me !== run.current || e.error === 'interrupted' || e.error === 'canceled') return;
          setError('The device voice stopped. Press play to continue.');
          pause();
        };
        synth.speak(u);
      } catch {
        setError('This device could not read this passage aloud. Press play to try again.');
        pause();
      }
    };
    say(Math.min(s, parts.length - 1));
  };

  const start = (c: number, p: number, s = 0) => {
    if (!synth) { setError('This browser has no voice to read aloud.'); return; }
    synth.cancel();
    run.current += 1;
    setError('');
    void speak(run.current, c, p, s);
  };
  function pause() {
    run.current += 1;
    synth?.cancel();
    setState('paused');
  }
  const resume = () => start(pos.current.c, pos.current.p, pos.current.s);
  function stop() {
    run.current += 1;
    synth?.cancel();
    setState('idle');
    setCaption(null);
  }
  function finish() { stop(); opts.current.onEnd(); }

  /** Forward to the next paragraph, or back to the start of this one (then the one before). */
  const skip = (dir: 1 | -1) => {
    const { c, p, s } = pos.current;
    const list = opts.current.chapters();
    let to = { c, p: p + 1 };
    if (dir < 0) {
      if (s > 0) to = { c, p };
      else if (p > 0) to = { c, p: p - 1 };
      else if (c > 0) to = { c: c - 1, p: Math.max(0, (list[c - 1]?.content.length ?? 1) - 1) };
      else to = { c: 0, p: 0 };
    }
    goTo(to.c, to.p);
  };
  /** Moves the voice to a paragraph; it keeps playing, or waits there when paused. */
  const goTo = (c: number, p: number) => {
    if (stateRef.current === 'paused') {
      pos.current = { c, p, s: 0 };
      setWhere({ c, p });
      opts.current.onPosition(c, p);
      return;
    }
    start(c, p);
  };
  /** A new speed, voice or language takes effect from the current sentence. */
  const refresh = () => { if (stateRef.current === 'playing' || stateRef.current === 'loading') start(pos.current.c, pos.current.p, pos.current.s); };

  useEffect(() => () => { run.current += 1; synth?.cancel(); }, [synth]);

  return { supported: !!synth, voices, state, caption, error, setError, where, start, pause, resume, stop, skip, goTo, refresh };
}
