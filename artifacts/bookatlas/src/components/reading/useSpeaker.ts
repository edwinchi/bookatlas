import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { YoungContext } from './youngLang';
import { clipKey, wordAtTime, youngAudioDir, type ClipManifest } from './youngVoice';

/**
 * The recorded natural voice, loaded once per language and visit: the list of clips and their word timings. English
 * is Kokoro (phase 4), the other languages Piper (phase 6). Missing or unreachable clips are fine; the device voice
 * reads instead.
 */
const manifests = new Map<string, Promise<ClipManifest | null>>();
const loadManifest = (lang: string) => {
  if (!manifests.has(lang)) {
    manifests.set(lang, typeof fetch === 'undefined' ? Promise.resolve(null)
      : fetch(`${import.meta.env.BASE_URL}${youngAudioDir(lang)}/clips.json`, { cache: 'no-cache' })
        .then((r) => (r.ok ? r.json() as Promise<ClipManifest> : null))
        .then((m) => (m && typeof m === 'object' && m.clips ? m : null))
        .catch(() => null));
  }
  return manifests.get(lang)!;
};

type SayOptions = { rate?: number; onPart?: (i: number) => void; onWord?: (part: number, char: number) => void; onEnd?: () => void };
/** The clips were recorded at the children's pace (the device voice's 0.85); other rates play a little faster or slower. */
const RECORDED_RATE = 0.85;

/** Reads children's texts aloud: the recorded natural voice where there is one, otherwise a clear device voice. */
export function useSpeaker() {
  const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
  const canPlay = typeof window !== 'undefined' && typeof Audio !== 'undefined';
  const [clips, setClips] = useState<ClipManifest | null>(null);
  // The language of the young readers' pages: its recorded clips, or the device voice in that language.
  const young = useContext(YoungContext);
  const lang = young.voice;
  const run = useRef(0);
  const audio = useRef<HTMLAudioElement | null>(null);
  const frame = useRef(0);
  useEffect(() => { let live = true; setClips(null); void loadManifest(young.id).then((m) => { if (live) setClips(m); }); return () => { live = false; }; }, [young.id]);
  const stop = useCallback(() => {
    run.current += 1;
    cancelAnimationFrame(frame.current);
    try { audio.current?.pause(); } catch { /* nothing playing */ }
    try { synth?.cancel(); } catch { /* nothing to stop */ }
  }, [synth]);
  useEffect(() => stop, [stop]);
  const voice = () => {
    try {
      const want = lang.toLowerCase().replace('_', '-');
      const vs = (synth?.getVoices() ?? []).filter((v) => v?.lang && v.lang.toLowerCase().replace('_', '-').slice(0, 2) === want.slice(0, 2));
      const exact = vs.filter((v) => v.lang.toLowerCase().replace('_', '-') === want);
      const pick = (list: SpeechSynthesisVoice[]) => list.find((v) => /natural|neural|premium|enhanced/i.test(v.name ?? '')) ?? list.find((v) => v.default) ?? list[0];
      return pick(exact) ?? pick(vs) ?? null;
    } catch { return null; }
  };

  /** The device voice, from part `from` on. */
  const device = (parts: string[], o: SayOptions, me: number, from = 0) => {
    if (!synth) { o.onEnd?.(); return false; }
    const next = (i: number) => {
      if (me !== run.current) return;
      if (i >= parts.length) { o.onEnd?.(); return; }
      o.onPart?.(i);
      try {
        const u = new SpeechSynthesisUtterance(parts[i]!);
        const v = voice();
        u.lang = v?.lang ?? lang;
        try { if (v) u.voice = v; } catch { /* the language is enough */ }
        u.rate = o.rate ?? RECORDED_RATE;
        u.onboundary = (e) => { if (me === run.current && e.name === 'word') o.onWord?.(i, e.charIndex); };
        u.onend = () => next(i + 1);
        u.onerror = () => { if (me === run.current) o.onEnd?.(); };
        synth.speak(u);
      } catch { o.onEnd?.(); }
    };
    next(from);
    return true;
  };

  /** The recorded voice, part after part, with the word being said reported as it plays. */
  const recorded = (parts: string[], o: SayOptions, me: number, m: ClipManifest) => {
    const el = audio.current ?? (audio.current = new Audio());
    el.preload = 'auto';
    const rate = Math.min(1.4, Math.max(0.6, (o.rate ?? RECORDED_RATE) / RECORDED_RATE));
    const next = (i: number) => {
      if (me !== run.current) return;
      cancelAnimationFrame(frame.current);
      if (i >= parts.length) { o.onEnd?.(); return; }
      const key = clipKey(parts[i]!);
      const timing = m.clips[key];
      if (!timing) { device(parts, o, me, i); return; }
      o.onPart?.(i);
      let last: number | null = null;
      const follow = () => {
        if (me !== run.current) return;
        const ch = wordAtTime(parts[i]!, timing, el.currentTime);
        if (ch !== null && ch !== last) { last = ch; o.onWord?.(i, ch); }
        frame.current = requestAnimationFrame(follow);
      };
      el.onended = () => next(i + 1);
      el.onerror = () => { if (me === run.current) device(parts, o, me, i); };
      el.src = `${import.meta.env.BASE_URL}${youngAudioDir(young.id)}/${key}.mp3`;
      el.playbackRate = rate;
      try { (el as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = true; } catch { /* the default keeps the pitch */ }
      el.play().then(() => { frame.current = requestAnimationFrame(follow); })
        .catch(() => { if (me === run.current) device(parts, o, me, i); });
    };
    next(0);
    return true;
  };

  /** Says the parts one after the other; `onPart` and `onWord` follow along, `onEnd` when done. */
  const say = useCallback((parts: string[], o: SayOptions = {}) => {
    stop();
    const me = run.current;
    if (canPlay && clips && parts.length && clips.clips[clipKey(parts[0]!)]) return recorded(parts, o, me, clips);
    return device(parts, o, me);
  }, [synth, stop, clips, canPlay, young.id, lang]); // eslint-disable-line react-hooks/exhaustive-deps
  const natural = !!clips;
  return { supported: !!synth || (canPlay && natural), natural, say, stop };
}
