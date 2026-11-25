import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import * as ProgressBar from '@radix-ui/react-progress';
import { ArrowLeft, ArrowRight, BookHeart, Ear, Grid3x3, Search, Square, Star, Timer, Volume2 } from 'lucide-react';
import { useActiveReader } from './family';
import { useSpeaker } from './useSpeaker';
import { ALL_FIRST_WORDS, FIRST_WORDS, PICTURE_BOOKS, emptyFirstProgress, findRound, readFirstProgress, recognition, wordKey, type FirstWordsProgress, type PictureBook } from './firstWords';

const pill = 'inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 data-[state=active]:bg-rose-500 data-[state=active]:text-white data-[state=on]:bg-rose-500 data-[state=on]:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer';

/** First-words progress on this device, per reader: words heard, pictures found, listening time. */
function useFirstProgress() {
  const reader = useActiveReader();
  const key = `bookatlas:first-words:${reader.id}`;
  const read = () => { try { return readFirstProgress(JSON.parse(localStorage.getItem(key) || 'null')); } catch { return emptyFirstProgress(); } };
  const [p, setP] = useState<FirstWordsProgress>(read);
  useEffect(() => { setP(read()); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const update = useCallback((fn: (p: FirstWordsProgress) => FirstWordsProgress) => {
    setP((old) => { const next = fn(old); try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* this device */ } return next; });
  }, [key]);
  return { p, update };
}

/** Counts listening time while a voice speaks (for the progress strip). */
function useListenClock(update: ReturnType<typeof useFirstProgress>['update']) {
  const started = useRef<number | null>(null);
  const start = () => { if (started.current === null) started.current = performance.now(); };
  const stop = useCallback(() => {
    if (started.current === null) return;
    const s = Math.round((performance.now() - started.current) / 1000);
    started.current = null;
    if (s > 0) update((p) => ({ ...p, listenSeconds: p.listenSeconds + Math.min(s, 600) }));
  }, [update]);
  useEffect(() => stop, [stop]);
  return { start, stop };
}

function WordCards({ onHeard, clock }: { onHeard: (key: string) => void; clock: ReturnType<typeof useListenClock> }) {
  const speaker = useSpeaker();
  const [group, setGroup] = useState(FIRST_WORDS[0]!.id);
  const [shown, setShown] = useState<{ word: string; picture: string } | null>(null);
  const g = FIRST_WORDS.find((x) => x.id === group)!;
  const say = (w: { word: string; picture: string }) => {
    setShown(w);
    onHeard(wordKey(group, w.word));
    clock.start();
    speaker.say([w.word], { rate: 0.7, onEnd: clock.stop });
  };
  return (
    <div className="space-y-5">
      <ToggleGroup.Root type="single" value={group} onValueChange={(v) => { if (v) { setGroup(v); setShown(null); } }} aria-label="Word group" className="flex flex-wrap gap-2">
        {FIRST_WORDS.map((x) => <ToggleGroup.Item key={x.id} value={x.id} className={pill}><span aria-hidden>{x.icon}</span>{x.name}</ToggleGroup.Item>)}
      </ToggleGroup.Root>
      {shown && (
        <div className="flex items-center justify-center gap-6 rounded-3xl bg-white py-6 ring-1 ring-rose-200" aria-live="polite">
          <span className="text-8xl" aria-hidden>{shown.picture}</span>
          <span className="font-reader-clear text-5xl font-bold text-slate-900 sm:text-6xl">{shown.word}</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {g.words.map((w) => (
          <button key={w.word} type="button" onClick={() => say(w)} aria-label={w.word} data-testid={`first-word-${w.word}`}
            className="flex aspect-square flex-col items-center justify-center gap-2 rounded-3xl bg-white ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer">
            <span className="text-6xl sm:text-7xl" aria-hidden>{w.picture}</span>
            <span className="font-reader-clear text-xl font-bold text-slate-800">{w.word}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function BookReader({ book, onBack, clock }: { book: PictureBook; onBack: () => void; clock: ReturnType<typeof useListenClock> }) {
  const speaker = useSpeaker();
  const [page, setPage] = useState(0);
  const [word, setWord] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const pg = book.pages[page]!;
  const words = useMemo(() => [...pg.text.matchAll(/\S+/g)].map((m) => ({ text: m[0], start: m.index ?? 0 })), [pg.text]);
  const read = useCallback((i: number, onDone?: () => void) => {
    const text = book.pages[i]!.text;
    const ws = [...text.matchAll(/\S+/g)].map((m) => m.index ?? 0);
    setPlaying(true); clock.start();
    speaker.say([text], {
      rate: 0.75,
      onWord: (_p, ch) => { let k = ws.length - 1; while (k > 0 && ws[k]! > ch) k -= 1; setWord(k); },
      onEnd: () => { setWord(null); setPlaying(false); clock.stop(); onDone?.(); },
    });
  }, [book, speaker, clock]);
  // Read the whole book, page after page.
  const readAll = (from: number) => { setPage(from); read(from, () => { if (from + 1 < book.pages.length) window.setTimeout(() => readAll(from + 1), 700); }); };
  const go = (i: number) => { speaker.stop(); setPlaying(false); setWord(null); clock.stop(); setPage(i); };
  useEffect(() => () => { speaker.stop(); clock.stop(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-4">
      <button type="button" onClick={() => { go(0); onBack(); }} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-indigo-700 cursor-pointer"><ArrowLeft className="h-4 w-4" aria-hidden />All picture books</button>
      <div className="rounded-[2rem] bg-white p-6 text-center ring-1 ring-slate-200 sm:p-10" data-testid="picture-book-page">
        <p className="text-sm font-bold text-slate-400">{book.title} · {page + 1} of {book.pages.length}</p>
        <div className="my-6 text-[7rem] leading-none sm:text-[9rem]" aria-hidden>{pg.picture}</div>
        <p className="font-reader-clear text-4xl font-bold leading-snug text-slate-900 sm:text-5xl">
          {words.map((w, i) => <React.Fragment key={i}><span className={`rounded-lg px-1 transition-colors ${word === i ? 'bg-amber-300' : ''}`}>{w.text}</span>{' '}</React.Fragment>)}
        </p>
      </div>
      <div className="flex items-center justify-center gap-3">
        <button type="button" onClick={() => go(page - 1)} disabled={page === 0} aria-label="Page before" className="grid h-14 w-14 place-items-center rounded-full bg-white ring-1 ring-slate-200 disabled:opacity-30 cursor-pointer"><ArrowLeft className="h-6 w-6" /></button>
        <button type="button" onClick={() => (playing ? go(page) : readAll(page))} data-testid="picture-book-read"
          className="inline-flex min-h-14 items-center gap-2 rounded-full bg-rose-500 px-6 text-lg font-bold text-white hover:bg-rose-400 cursor-pointer">
          {playing ? <Square className="h-5 w-5" aria-hidden /> : <Volume2 className="h-5 w-5" aria-hidden />}{playing ? 'Stop' : 'Read to me'}
        </button>
        <button type="button" onClick={() => go(page + 1)} disabled={page >= book.pages.length - 1} aria-label="Next page" data-testid="picture-book-next" className="grid h-14 w-14 place-items-center rounded-full bg-white ring-1 ring-slate-200 disabled:opacity-30 cursor-pointer"><ArrowRight className="h-6 w-6" /></button>
      </div>
    </div>
  );
}

function PictureBooks({ clock }: { clock: ReturnType<typeof useListenClock> }) {
  const [open, setOpen] = useState<PictureBook | null>(null);
  if (open) return <BookReader book={open} onBack={() => setOpen(null)} clock={clock} />;
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {PICTURE_BOOKS.map((b) => (
        <button key={b.id} type="button" onClick={() => setOpen(b)} data-testid={`picture-book-${b.id}`}
          className="flex flex-col items-center gap-3 rounded-3xl bg-white p-6 text-center ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer">
          <span className="text-7xl" aria-hidden>{b.cover}</span>
          <span className="font-serif text-xl font-bold text-slate-900">{b.title}</span>
          <span className="text-sm text-slate-500">{b.pages.length} pages</span>
        </button>
      ))}
    </div>
  );
}

function FindIt({ onResult, onStars }: { onResult: (right: boolean) => void; onStars: (n: number) => void }) {
  const speaker = useSpeaker();
  const [group, setGroup] = useState<string>('all');
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const r = useMemo(() => findRound(round, group === 'all' ? null : group), [round, group]);
  const ask = useCallback(() => speaker.say([`Find the ${r.target.word}!`], { rate: 0.8 }), [speaker, r.target.word]);
  useEffect(() => { setPicked(null); const t = window.setTimeout(ask, 300); return () => window.clearTimeout(t); }, [r]); // eslint-disable-line react-hooks/exhaustive-deps
  const choose = (w: string) => {
    if (picked) return;
    setPicked(w);
    const right = w === r.target.word;
    onResult(right);
    if (right) { onStars(1); speaker.say([`Yes! The ${r.target.word}!`], { rate: 0.85 }); window.setTimeout(() => setRound((n) => n + 1), 1600); }
    else { speaker.say([`That is the ${w}. Try again!`], { rate: 0.85 }); window.setTimeout(() => setPicked(null), 1400); }
  };
  return (
    <div className="space-y-5">
      <ToggleGroup.Root type="single" value={group} onValueChange={(v) => { if (v) { setGroup(v); setRound(0); } }} aria-label="Pictures from" className="flex flex-wrap gap-2">
        <ToggleGroup.Item value="all" className={pill}>All words</ToggleGroup.Item>
        {FIRST_WORDS.map((x) => <ToggleGroup.Item key={x.id} value={x.id} className={pill}><span aria-hidden>{x.icon}</span>{x.name}</ToggleGroup.Item>)}
      </ToggleGroup.Root>
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-reader-clear text-3xl font-bold text-slate-900">Find the <span className="text-rose-600" data-testid="find-it-word">{r.target.word}</span>!</p>
        <button type="button" onClick={ask} aria-label="Say it again" className="grid h-12 w-12 place-items-center rounded-full bg-amber-400 text-slate-950 hover:bg-amber-300 cursor-pointer"><Ear className="h-5 w-5" /></button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {r.choices.map((c) => (
          <button key={c.word + c.picture} type="button" onClick={() => choose(c.word)} aria-label={c.word}
            className={`grid aspect-[4/3] place-items-center rounded-[2rem] text-7xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer sm:text-8xl ${picked === c.word ? (c.word === r.target.word ? 'scale-105 bg-emerald-100 ring-4 ring-emerald-500' : 'bg-rose-100 ring-4 ring-rose-400') : 'bg-white ring-1 ring-slate-200 hover:-translate-y-0.5'}`}>{c.picture}</button>
        ))}
      </div>
    </div>
  );
}

/**
 * First words (Reading Intelligence phase 3) for the youngest readers: words to hear, little picture books read
 * aloud with each word lit up, and "Find it". A grown-up sees words heard, pictures found and listening time.
 */
export function FirstWordsPanel({ onStars }: { onStars: (n: number) => void }) {
  const { p, update } = useFirstProgress();
  const clock = useListenClock(update);
  const total = ALL_FIRST_WORDS.length;
  const rec = recognition(p);
  return (
    <div className="space-y-6">
      <Tabs.Root defaultValue="words" className="space-y-5">
        <Tabs.List aria-label="First words" className="flex flex-wrap gap-2">
          <Tabs.Trigger value="words" className={pill} data-testid="first-tab-words"><Grid3x3 className="h-4 w-4" aria-hidden />Words</Tabs.Trigger>
          <Tabs.Trigger value="books" className={pill} data-testid="first-tab-books"><BookHeart className="h-4 w-4" aria-hidden />Picture books</Tabs.Trigger>
          <Tabs.Trigger value="find" className={pill} data-testid="first-tab-find"><Search className="h-4 w-4" aria-hidden />Find it</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="words" className="focus-visible:outline-none">
          <WordCards clock={clock} onHeard={(k) => update((x) => (x.heard.includes(k) ? x : { ...x, heard: [...x.heard, k] }))} />
        </Tabs.Content>
        <Tabs.Content value="books" className="focus-visible:outline-none"><PictureBooks clock={clock} /></Tabs.Content>
        <Tabs.Content value="find" className="focus-visible:outline-none">
          <FindIt onStars={onStars} onResult={(right) => update((x) => ({ ...x, tries: x.tries + 1, found: x.found + (right ? 1 : 0) }))} />
        </Tabs.Content>
      </Tabs.Root>

      <section aria-label="Progress" className="grid gap-3 rounded-3xl bg-white p-5 ring-1 ring-slate-200 sm:grid-cols-3" data-testid="first-progress">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500"><Ear className="h-4 w-4" aria-hidden />Words heard</p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900">{p.heard.length} <span className="text-sm font-semibold text-slate-500">of {total}</span></p>
          <ProgressBar.Root value={p.heard.length} max={total} aria-label="Words heard" className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><ProgressBar.Indicator className="h-full rounded-full bg-rose-500" style={{ width: `${(p.heard.length / total) * 100}%` }} /></ProgressBar.Root>
        </div>
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500"><Star className="h-4 w-4" aria-hidden />Right picture</p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900">{rec === null ? '–' : `${rec}%`}</p>
          <p className="text-xs text-slate-500">{p.tries ? `${p.found} of ${p.tries} tries in Find it` : 'Play Find it to see this'}</p>
        </div>
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500"><Timer className="h-4 w-4" aria-hidden />Listening time</p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900">{p.listenSeconds < 60 ? `${p.listenSeconds} s` : `${Math.round(p.listenSeconds / 60)} min`}</p>
          <p className="text-xs text-slate-500">Words and picture books read aloud</p>
        </div>
      </section>
    </div>
  );
}
