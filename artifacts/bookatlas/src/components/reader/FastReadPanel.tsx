import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Slider from '@radix-ui/react-slider';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import * as Tabs from '@radix-ui/react-tabs';
import * as ProgressBar from '@radix-ui/react-progress';
import { ChevronLeft, ChevronRight, Gauge, Pause, Play, RotateCcw, Rewind, Timer, X, Zap } from 'lucide-react';
import { useAccount } from '../../auth/AuthContext';
import { activeReader, defaultsFor } from '../reading/family';
import { useEbookApi } from '../ebook/ebookApi';
import type { Chapter } from '../../types';
import {
  MAX_GROUP, MAX_WPM, MIN_GROUP, MIN_WPM, buildSteps, clampGroup, clampWpm, focusIndex, measuredWpm,
  readLocalTests, saveLocalTests, wordsOf, type SpeedTest,
} from './fastRead';

const PREFS = 'bookatlas:fast-read:v1';
type Mode = 'word' | 'group';
function readPrefs(): { wpm: number; mode: Mode; group: number } {
  try {
    const v = JSON.parse(localStorage.getItem(PREFS) || 'null');
    return { wpm: clampWpm(v?.wpm ?? defaultsFor(activeReader().kind).wpm), mode: v?.mode === 'group' ? 'group' : 'word', group: clampGroup(v?.group ?? 3) };
  } catch { return { wpm: 300, mode: 'word', group: 3 }; }
}
const savePrefs = (p: { wpm: number; mode: Mode; group: number }) => { try { localStorage.setItem(PREFS, JSON.stringify(p)); } catch { /* optional */ } };
/** Sets the Fast Read speed from elsewhere (the adaptive coach); open players follow at once. */
export function setFastReadSpeed(wpm: number) {
  savePrefs({ ...readPrefs(), wpm: clampWpm(wpm) });
  window.dispatchEvent(new Event('bookatlas:fast-read-prefs'));
}

const btn = 'grid h-11 w-11 place-items-center rounded-full text-slate-700 ring-1 ring-slate-200 bg-white hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-40 cursor-pointer';
const item = 'min-h-10 flex-1 rounded-lg px-3 text-xs font-bold text-slate-600 data-[state=on]:bg-white data-[state=on]:text-slate-900 data-[state=on]:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer';

const minutesLeft = (ms: number) => (ms < 60_000 ? `${Math.max(1, Math.round(ms / 1000))} s left` : `${Math.round(ms / 60_000)} min left`);

/** A single word with its focus letter marked and lined up on the middle of the screen. */
function FocusWord({ word }: { word: string }) {
  const i = focusIndex(word);
  return (
    <span className="grid w-full grid-cols-[1fr_auto_1fr] items-baseline font-serif-book" aria-hidden>
      <span className="text-right">{word.slice(0, i)}</span>
      <span className="text-rose-600">{word[i]}</span>
      <span className="text-left">{word.slice(i + 1)}</span>
    </span>
  );
}

/**
 * The Fast Read player: one word or a short group of words at a time, at 100 to 1,000 words a minute, with pause,
 * a step back, restart and the time left. Used in the reader and as the demo on the Reading Intelligence page.
 */
export function FastReadPlayer({ paragraphs, firstParagraph = 0, startParagraph, onPosition, onEnd, endLabel, autoFocus }: {
  paragraphs: string[]; firstParagraph?: number; startParagraph?: number;
  /** The paragraph on screen (the reader jumps there when Fast Read closes). */
  onPosition?: (paragraph: number) => void;
  /** Offered when the text ends (e.g. "Next chapter"). */
  onEnd?: () => void; endLabel?: string; autoFocus?: boolean;
}) {
  const [prefs, setPrefsState] = useState(readPrefs);
  useEffect(() => { const reload = () => setPrefsState(readPrefs()); window.addEventListener('bookatlas:fast-read-prefs', reload); return () => window.removeEventListener('bookatlas:fast-read-prefs', reload); }, []);
  const setPrefs = (p: Partial<typeof prefs>) => setPrefsState((old) => { const next = { ...old, ...p }; savePrefs(next); return next; });
  const steps = useMemo(() => buildSteps(paragraphs, prefs.mode === 'word' ? 1 : prefs.group, prefs.wpm, firstParagraph), [paragraphs, prefs.mode, prefs.group, prefs.wpm, firstParagraph]);
  // The position is kept in words, so changing speed or group size keeps the place.
  const wordAt = useRef(0);
  const startWord = useMemo(() => {
    if (startParagraph === undefined) return 0;
    let n = 0;
    for (let p = 0; p < paragraphs.length && firstParagraph + p < startParagraph; p += 1) n += wordsOf(paragraphs[p]!).length;
    return n;
  }, [paragraphs, firstParagraph, startParagraph]);
  const indexForWord = useCallback((w: number) => {
    let n = 0;
    for (let i = 0; i < steps.length; i += 1) { if (n + steps[i]!.words > w) return i; n += steps[i]!.words; }
    return Math.max(0, steps.length - 1);
  }, [steps]);
  const [idx, setIdx] = useState(() => 0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => { wordAt.current = startWord; setIdx(indexForWord(startWord)); setPlaying(false); }, [paragraphs, startWord]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setIdx(indexForWord(wordAt.current)); }, [steps]); // eslint-disable-line react-hooks/exhaustive-deps
  const step = steps[idx];

  const go = useCallback((i: number) => {
    const next = Math.min(Math.max(0, i), Math.max(0, steps.length - 1));
    let w = 0; for (let k = 0; k < next; k += 1) w += steps[k]!.words;
    wordAt.current = w;
    setIdx(next);
  }, [steps]);

  useEffect(() => {
    if (!playing || !step) return;
    const t = window.setTimeout(() => {
      if (idx >= steps.length - 1) { setPlaying(false); return; }
      go(idx + 1);
    }, step.ms);
    return () => window.clearTimeout(t);
  }, [playing, idx, step, steps.length, go]);
  useEffect(() => { if (step) onPosition?.(step.paragraph); }, [step?.paragraph]); // eslint-disable-line react-hooks/exhaustive-deps

  const back = () => { let w = wordAt.current - 10; if (w < 0) w = 0; wordAt.current = w; setIdx(indexForWord(w)); };
  const toggle = () => { if (!steps.length) return; if (idx >= steps.length - 1 && !playing) go(0); setPlaying((p) => !p); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'k') { e.preventDefault(); toggle(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); back(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); go(idx + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setPrefs({ wpm: clampWpm(prefs.wpm + 25) }); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setPrefs({ wpm: clampWpm(prefs.wpm - 25) }); }
  };
  const left = steps.slice(idx).reduce((n, s) => n + s.ms, 0);
  const pct = steps.length > 1 ? Math.round((idx / (steps.length - 1)) * 100) : 0;
  const atEnd = steps.length > 0 && idx >= steps.length - 1 && !playing;

  return (
    <div className="space-y-4 outline-none" tabIndex={0} onKeyDown={onKey} autoFocus={autoFocus} aria-label="Fast Read player. Space plays and pauses, the arrow keys step and change the speed." data-testid="fast-read-player">
      <div className="relative grid min-h-40 place-items-center overflow-hidden rounded-2xl bg-white px-4 py-8 ring-1 ring-slate-200 sm:min-h-48">
        <span className="pointer-events-none absolute inset-x-0 top-6 mx-auto h-3 w-px bg-rose-300" aria-hidden />
        <span className="pointer-events-none absolute inset-x-0 bottom-6 mx-auto h-3 w-px bg-rose-300" aria-hidden />
        <p className="w-full text-center text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl" aria-live="off" data-testid="fast-read-word">
          {!step ? <span className="text-base text-slate-500">Nothing to read here.</span>
            : prefs.mode === 'word' ? <FocusWord word={step.text} /> : <span className="font-serif-book">{step.text}</span>}
        </p>
        <span className="sr-only" aria-live="polite">{playing ? '' : step ? `Paused at: ${step.text}` : ''}</span>
      </div>

      <ProgressBar.Root value={pct} aria-label="Progress" className="relative h-1.5 overflow-hidden rounded-full bg-slate-200">
        <ProgressBar.Indicator className="h-full rounded-full bg-indigo-600 transition-[width]" style={{ width: `${pct}%` }} />
      </ProgressBar.Root>
      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
        <span>{pct}%</span><span className="flex items-center gap-1"><Timer className="h-3.5 w-3.5" aria-hidden />{steps.length ? minutesLeft(left) : ''}</span>
      </div>

      <div className="flex items-center justify-center gap-3">
        <button type="button" className={btn} onClick={() => { go(0); setPlaying(false); }} aria-label="Start again"><RotateCcw className="h-4 w-4" /></button>
        <button type="button" className={btn} onClick={back} aria-label="Back 10 words"><Rewind className="h-4 w-4" /></button>
        <button type="button" onClick={toggle} disabled={!steps.length} data-testid="fast-read-play"
          className="grid h-14 w-14 place-items-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300 disabled:opacity-40 cursor-pointer"
          aria-label={playing ? 'Pause' : 'Play'}>{playing ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 translate-x-0.5" />}</button>
        <button type="button" className={btn} onClick={() => go(idx + 1)} aria-label="Next word"><ChevronRight className="h-4 w-4" /></button>
        {atEnd && onEnd
          ? <button type="button" onClick={onEnd} className="min-h-11 rounded-full bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer">{endLabel ?? 'Continue'}</button>
          : <span className="h-11 w-11" aria-hidden />}
      </div>

      <div className="space-y-2 rounded-2xl bg-slate-100 p-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700"><Gauge className="h-4 w-4 text-indigo-600" aria-hidden />Speed</span>
          <span className="text-sm font-extrabold tabular-nums text-slate-900" data-testid="fast-read-wpm">{prefs.wpm} words a minute</span>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setPrefs({ wpm: clampWpm(prefs.wpm - 25) })} aria-label="Slower" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-lg font-bold ring-1 ring-slate-200 cursor-pointer">−</button>
          <Slider.Root value={[prefs.wpm]} min={MIN_WPM} max={MAX_WPM} step={10} onValueChange={([v]) => setPrefs({ wpm: clampWpm(v ?? prefs.wpm) })} className="relative flex h-6 w-full touch-none select-none items-center cursor-pointer">
            <Slider.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-slate-300"><Slider.Range className="absolute h-full rounded-full bg-indigo-600" /></Slider.Track>
            <Slider.Thumb aria-label="Words per minute" className="block h-5 w-5 rounded-full bg-white shadow ring-2 ring-indigo-600 focus-visible:outline-none focus-visible:ring-4" />
          </Slider.Root>
          <button type="button" onClick={() => setPrefs({ wpm: clampWpm(prefs.wpm + 25) })} aria-label="Faster" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-lg font-bold ring-1 ring-slate-200 cursor-pointer">+</button>
        </div>
        <ToggleGroup.Root type="single" value={prefs.mode} onValueChange={(v) => v && setPrefs({ mode: v as Mode })} aria-label="Show" className="flex gap-1 rounded-xl bg-slate-200/70 p-1">
          <ToggleGroup.Item value="word" className={item}>One word</ToggleGroup.Item>
          <ToggleGroup.Item value="group" className={item}>Word groups</ToggleGroup.Item>
        </ToggleGroup.Root>
        {prefs.mode === 'group' && (
          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-xs font-semibold text-slate-600">Words per group</span>
            <ToggleGroup.Root type="single" value={String(prefs.group)} onValueChange={(v) => v && setPrefs({ group: Number(v) })} aria-label="Words per group" className="flex items-center gap-1">
              {Array.from({ length: MAX_GROUP - MIN_GROUP + 1 }, (_, i) => i + MIN_GROUP).map((n) => (
                <ToggleGroup.Item key={n} value={String(n)}
                  className="h-8 w-8 rounded-lg bg-white text-xs font-bold text-slate-700 ring-1 ring-slate-200 data-[state=on]:bg-slate-900 data-[state=on]:text-white data-[state=on]:ring-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer">{n}</ToggleGroup.Item>
              ))}
            </ToggleGroup.Root>
          </div>
        )}
      </div>
    </div>
  );
}

/** Speed-check results: on the account when signed in (with the reader settings), otherwise on this device. */
export function useSpeedTests() {
  const { account } = useAccount();
  const api = useEbookApi();
  const apiRef = useRef(api);
  apiRef.current = api;
  const [tests, setTests] = useState<SpeedTest[]>(readLocalTests);
  useEffect(() => {
    if (!account) return;
    let live = true;
    apiRef.current.readerPreferences().then((r) => {
      const saved = Array.isArray(r.settings?.speedTests) ? (r.settings!.speedTests as SpeedTest[]) : [];
      if (!live) return;
      // Checks done while signed out on this device join the account's list.
      const merged = new Map<string, SpeedTest>();
      for (const t of [...saved, ...readLocalTests()]) merged.set(t.at, t);
      const list = [...merged.values()].sort((a, b) => a.at.localeCompare(b.at)).slice(-30);
      setTests(list);
      saveLocalTests(list);
      if (list.length !== saved.length) void apiRef.current.saveReaderPreferences({ speedTests: list }).catch(() => undefined);
    }).catch(() => undefined);
    return () => { live = false; };
  }, [account?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const add = useCallback((t: SpeedTest) => {
    setTests((old) => {
      const list = [...old, t].slice(-30);
      saveLocalTests(list);
      if (account) void apiRef.current.saveReaderPreferences({ speedTests: list }).catch(() => undefined);
      return list;
    });
  }, [account]);
  return { tests, add, signedIn: !!account };
}

/**
 * The reading-speed check: read a passage at your normal pace, press Done, and see your words per minute.
 */
export function SpeedCheck({ text, source, onResult }: { text: string; source: SpeedTest['source']; onResult: (t: SpeedTest) => void }) {
  const [phase, setPhase] = useState<'ready' | 'reading' | 'done'>('ready');
  const started = useRef(0);
  const [result, setResult] = useState<{ wpm: number | null; seconds: number } | null>(null);
  const words = useMemo(() => wordsOf(text).length, [text]);
  const paras = useMemo(() => text.split(/\n\s*\n/).filter(Boolean), [text]);
  const finish = () => {
    const seconds = Math.round((performance.now() - started.current) / 1000);
    const wpm = measuredWpm(words, seconds);
    setResult({ wpm, seconds });
    setPhase('done');
    if (wpm) onResult({ at: new Date().toISOString(), wpm, words, seconds, source });
  };
  return (
    <div className="space-y-3" data-testid="speed-check">
      {phase === 'ready' && (
        <div className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <p className="text-sm text-slate-700">Read the passage ({words} words) at your usual pace, the way you would read a book, then press <strong>Done</strong>. Don’t skim: understanding counts more than speed.</p>
          <button type="button" onClick={() => { started.current = performance.now(); setPhase('reading'); }} data-testid="speed-check-start"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-500 cursor-pointer"><Timer className="h-4 w-4" aria-hidden />Start the timer</button>
        </div>
      )}
      {phase === 'reading' && (
        <div className="space-y-3">
          <div className="max-h-[50dvh] space-y-3 overflow-y-auto rounded-2xl bg-white p-4 font-serif-book text-[17px] leading-relaxed text-slate-900 ring-1 ring-slate-200">
            {paras.map((p, i) => <p key={i}>{p}</p>)}
          </div>
          <button type="button" onClick={finish} data-testid="speed-check-done"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-500 cursor-pointer">Done</button>
        </div>
      )}
      {phase === 'done' && result && (
        <div className="space-y-2 rounded-2xl bg-white p-4 ring-1 ring-slate-200" role="status">
          {result.wpm
            ? <p className="text-sm text-slate-700"><span className="block text-3xl font-extrabold text-slate-900" data-testid="speed-check-result">{result.wpm} words a minute</span>{words} words in {result.seconds} seconds. {result.wpm < 200 ? 'A careful, steady pace.' : result.wpm < 300 ? 'About the pace of most adult readers.' : result.wpm < 450 ? 'Faster than most readers.' : 'Very fast. Check you kept the meaning with a chapter quiz.'}</p>
            : <p className="text-sm text-slate-700">That was too quick to measure. Read the whole passage, then press Done.</p>}
          <button type="button" onClick={() => { setResult(null); setPhase('ready'); }} className="text-xs font-bold text-indigo-700 hover:underline cursor-pointer">Check again</button>
        </div>
      )}
    </div>
  );
}

/** About 250 words from the reader's place in the chapter, for a speed check in a book. */
export function passageFrom(content: string[], from: number, target = 250) {
  const out: string[] = [];
  let n = 0;
  for (let p = Math.max(0, from); p < content.length && n < target; p += 1) {
    const t = content[p]!.trim();
    if (!t) continue;
    out.push(t);
    n += wordsOf(t).length;
  }
  return out.join('\n\n');
}

/**
 * Fast Read in the reader: the chapter from the reader's place, with a speed check on the same text. When it
 * closes, the reader opens at the paragraph Fast Read reached.
 */
export function FastReadDialog({ open, onOpenChange, container, chapters, chapterIndex, paragraphIndex, onClose }: {
  open: boolean; onOpenChange: (o: boolean) => void; container: HTMLElement | null;
  chapters: Chapter[]; chapterIndex: number; paragraphIndex: number;
  onClose: (chapter: number, paragraph: number) => void;
}) {
  const [chapter, setChapter] = useState(chapterIndex);
  const [start, setStart] = useState(paragraphIndex);
  const [tab, setTab] = useState<'read' | 'check'>('read');
  const reached = useRef({ c: chapterIndex, p: paragraphIndex });
  const speed = useSpeedTests();
  useEffect(() => { if (open) { setChapter(chapterIndex); setStart(paragraphIndex); setTab('read'); reached.current = { c: chapterIndex, p: paragraphIndex }; } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const current = chapters[chapter];
  const paragraphs = useMemo(() => current?.content ?? [], [current]);
  const close = (o: boolean) => { if (!o) onClose(reached.current.c, reached.current.p); onOpenChange(o); };
  const latest = speed.tests[speed.tests.length - 1];
  return (
    <Dialog.Root open={open} onOpenChange={close}>
      <Dialog.Portal container={container ?? undefined}>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-slate-950/40 data-[state=open]:animate-fade-in" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-[71] flex max-h-[92dvh] flex-col rounded-t-3xl bg-slate-50 text-slate-900 shadow-2xl outline-none data-[state=open]:animate-sheet-up motion-reduce:animate-none sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[34rem] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
          onOpenAutoFocus={(e) => { e.preventDefault(); (document.querySelector('[data-testid="fast-read-player"]') as HTMLElement | null)?.focus(); }}>
          <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-slate-300 sm:hidden" aria-hidden />
          <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-3">
            <Dialog.Title className="flex items-center gap-2 text-base font-bold"><Zap className="h-4 w-4 text-amber-500" />Fast Read</Dialog.Title>
            <Dialog.Description className="sr-only">The chapter one word or a few words at a time, at the speed you choose.</Dialog.Description>
            <Dialog.Close aria-label="Close Fast Read" className="grid h-10 w-10 place-items-center rounded-full text-slate-500 hover:bg-slate-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"><X className="h-5 w-5" /></Dialog.Close>
          </div>
          <Tabs.Root value={tab} onValueChange={(v) => setTab(v as 'read' | 'check')} className="flex min-h-0 flex-1 flex-col">
          <Tabs.List aria-label="Fast Read" className="mx-5 flex shrink-0 gap-1 rounded-xl bg-slate-200/70 p-1">
            {(['read', 'check'] as const).map((t) => (
              <Tabs.Trigger key={t} value={t}
                className="flex-1 rounded-lg px-2 py-2 text-xs font-bold text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer">
                {t === 'read' ? 'Read fast' : 'Check my speed'}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <button type="button" onClick={() => { setChapter((c) => c - 1); setStart(0); }} disabled={chapter <= 0} aria-label="Previous chapter" className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-200/70 disabled:opacity-30 cursor-pointer"><ChevronLeft className="h-4 w-4" /></button>
              <p className="min-w-0 truncate text-center text-xs font-bold text-slate-600">{current?.title ?? ''}</p>
              <button type="button" onClick={() => { setChapter((c) => c + 1); setStart(0); }} disabled={chapter >= chapters.length - 1} aria-label="Next chapter" className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-200/70 disabled:opacity-30 cursor-pointer"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <Tabs.Content value="read" className="focus-visible:outline-none">
              <FastReadPlayer paragraphs={paragraphs} startParagraph={start}
                onPosition={(p) => { reached.current = { c: chapter, p }; }}
                onEnd={chapter < chapters.length - 1 ? () => { setChapter((c) => c + 1); setStart(0); } : undefined} endLabel="Next chapter" />
            </Tabs.Content>
            <Tabs.Content value="check" className="focus-visible:outline-none">
              <div className="space-y-3">
                {latest && <p className="text-xs text-slate-500">Your last check: <strong className="text-slate-800">{latest.wpm} words a minute</strong>{speed.signedIn ? '' : ' (kept on this device; sign in to keep it on every device)'}.</p>}
                <SpeedCheck text={passageFrom(paragraphs, start)} source="book" onResult={speed.add} />
              </div>
            </Tabs.Content>
          </div>
          </Tabs.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
