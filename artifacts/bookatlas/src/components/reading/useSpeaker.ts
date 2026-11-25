import { useCallback, useEffect, useRef } from 'react';

/** The device voice for children's reading: a clear English voice, a little slower than usual. */
export function useSpeaker() {
  const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
  const run = useRef(0);
  const stop = useCallback(() => { run.current += 1; try { synth?.cancel(); } catch { /* nothing to stop */ } }, [synth]);
  useEffect(() => stop, [stop]);
  const voice = () => {
    try {
      const vs = (synth?.getVoices() ?? []).filter((v) => v?.lang && /^en[-_]/i.test(v.lang));
      return vs.find((v) => /natural|neural|premium|enhanced/i.test(v.name ?? '')) ?? vs.find((v) => v.default) ?? vs[0] ?? null;
    } catch { return null; }
  };
  /** Says the parts one after the other; `onPart` and `onWord` follow along, `onEnd` when done. */
  const say = useCallback((parts: string[], o: { rate?: number; onPart?: (i: number) => void; onWord?: (part: number, char: number) => void; onEnd?: () => void } = {}) => {
    if (!synth) return false;
    stop();
    const me = run.current;
    const next = (i: number) => {
      if (me !== run.current) return;
      if (i >= parts.length) { o.onEnd?.(); return; }
      o.onPart?.(i);
      try {
        const u = new SpeechSynthesisUtterance(parts[i]!);
        const v = voice();
        u.lang = v?.lang ?? 'en-GB';
        try { if (v) u.voice = v; } catch { /* the language is enough */ }
        u.rate = o.rate ?? 0.85;
        u.onboundary = (e) => { if (me === run.current && e.name === 'word') o.onWord?.(i, e.charIndex); };
        u.onend = () => next(i + 1);
        u.onerror = () => { if (me === run.current) o.onEnd?.(); };
        synth.speak(u);
      } catch { o.onEnd?.(); }
    };
    next(0);
    return true;
  }, [synth, stop]);
  return { supported: !!synth, say, stop };
}

