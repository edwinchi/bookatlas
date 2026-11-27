import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { Brain, Check, Flame, Grid3x3, Moon, Play, RotateCcw, Search, Sparkles, Star, Wind } from 'lucide-react';
import { useActiveReader } from './family';
import {
  addResult, emptyFocus, focusLevel, focusStreak, gridSize, huntBoard, numberGrid, starRound, starScore, targetSeconds, todaysPlan, young,
  type FocusProgress, type GameId,
} from './focusGym';
import { PRACTICES, phaseAt, scaleFor, totalSeconds, type Practice } from './breathing';
import { GYM_EN, GYM_TEXT, localPractice, spokenCue, type GymText } from './focusKids';
import { useYoung } from './youngLang';
import { useSpeaker } from './useSpeaker';

const KEY = (id: string) => `bookatlas:focus:${id}`;
/** The focus gym's progress on this device, for the family profile that is playing. */
export function useFocusProgress() {
  const reader = useActiveReader();
  const read = (): FocusProgress => { try { const v = JSON.parse(localStorage.getItem(KEY(reader.id)) || 'null'); return v && v.levels ? { ...emptyFocus(), ...v } : emptyFocus(); } catch { return emptyFocus(); } };
  const [p, setP] = useState<FocusProgress>(read);
  useEffect(() => { setP(read()); }, [reader.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = useCallback((next: FocusProgress) => { setP(next); try { localStorage.setItem(KEY(reader.id), JSON.stringify(next)); } catch { /* this device */ } }, [reader.id]);
  return { p, save, reader };
}

const GAMES: Record<GameId, { name: string; icon: React.ComponentType<{ className?: string }>; what: string; trains: string }> = {
  breath: { name: 'Breathing corner', icon: Wind, what: 'Eight breathing practices, from box breathing to the 4-7-8 bedtime breath, to settle before you read.', trains: 'Calm and settling down' },
  numbers: { name: 'Number hunt', icon: Grid3x3, what: 'Tap the numbers in order, 1, 2, 3… as fast as you can, eyes on the middle.', trains: 'Steady scanning' },
  stars: { name: 'Star catcher', icon: Star, what: 'Tap every star, never a moon. It gets quicker as you improve.', trains: 'Holding back the impulse' },
  words: { name: 'Word hunt', icon: Search, what: 'Find every copy of the word among look-alikes, as careful reading needs.', trains: 'Careful looking' },
};

const big = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-base font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300 cursor-pointer disabled:opacity-50';

function Done({ score, note, onAgain, onBack, t }: { score: number; note: string; onAgain: () => void; onBack: () => void; t: GymText }) {
  const stars = score >= 85 ? 3 : score >= 60 ? 2 : 1;
  return (
    <div className="space-y-4 text-center" role="status" data-testid="focus-done">
      <p className="text-4xl" aria-label={t.starsAria(stars)}>{'⭐'.repeat(stars)}<span className="opacity-25">{'⭐'.repeat(3 - stars)}</span></p>
      <p className="text-3xl font-extrabold tabular-nums text-slate-900">{score}</p>
      <p className="text-sm text-slate-600">{note}</p>
      <div className="flex justify-center gap-2">
        <button type="button" onClick={onAgain} className={`${big} bg-indigo-600 text-white hover:bg-indigo-500`}><RotateCcw className="h-5 w-5" aria-hidden />{t.again}</button>
        <button type="button" onClick={onBack} className={`${big} bg-white text-slate-800 ring-1 ring-slate-200`}>{t.allExercises}</button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------- number hunt

function NumberHunt({ level, kid, onFinish, t }: { level: number; kid: boolean; onFinish: (score: number, seconds: number, note: string) => void; t: GymText }) {
  const size = gridSize(level, kid ? 'child' : 'adult');
  const [seed] = useState(() => Date.now() % 100000);
  const cells = useMemo(() => numberGrid(size, seed), [size, seed]);
  const [next, setNext] = useState(1);
  const [wrong, setWrong] = useState<number | null>(null);
  const [errors, setErrors] = useState(0);
  const started = useRef<number | null>(null);
  const tap = (n: number) => {
    if (started.current === null) started.current = performance.now();
    if (n !== next) { setWrong(n); setErrors((e) => e + 1); try { navigator.vibrate?.(30); } catch { /* none */ } window.setTimeout(() => setWrong(null), 300); return; }
    if (n === size * size) {
      const seconds = Math.round((performance.now() - started.current) / 100) / 10;
      const target = targetSeconds(size, level, kid ? 'child' : 'adult');
      const score = Math.max(0, Math.min(100, Math.round((target / seconds) * 85) - errors * 3));
      onFinish(score, seconds, t.numbersNote(size * size, seconds, errors, target));
      return;
    }
    setNext(n + 1);
  };
  return (
    <div className="space-y-3">
      <p className="text-center text-lg font-bold text-slate-900" aria-live="polite">{t.find} <span className="text-indigo-700" data-testid="number-next">{next}</span></p>
      <div className="mx-auto grid max-w-sm gap-1.5" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }} data-testid="number-grid">
        {cells.map((n) => (
          <button key={n} type="button" onClick={() => tap(n)} disabled={n < next} aria-label={`${n}`}
            className={`aspect-square rounded-xl text-xl font-extrabold tabular-nums ring-1 transition-colors motion-reduce:transition-none cursor-pointer disabled:cursor-default ${n < next ? 'bg-emerald-50 text-emerald-300 ring-emerald-100' : wrong === n ? 'bg-rose-100 text-rose-700 ring-rose-300' : 'bg-white text-slate-900 ring-slate-200 hover:bg-indigo-50'}`}>{n}</button>
        ))}
      </div>
      <p className="text-center text-xs text-slate-500">{t.numbersHelp}</p>
    </div>
  );
}

// ------------------------------------------------------------------------------------------- star catcher

function StarCatcher({ level, kid, onFinish, t }: { level: number; kid: boolean; onFinish: (score: number, note: string) => void; t: GymText }) {
  const round = useMemo(() => starRound(level, kid ? 'child' : 'adult', Date.now() % 100000, kid ? 20 : 30), [level, kid]);
  const [i, setI] = useState(-1);
  const tapped = useRef<boolean[]>([]);
  const [flash, setFlash] = useState<'good' | 'bad' | null>(null);
  useEffect(() => {
    if (i >= round.items.length) {
      const s = starScore(round.items, tapped.current);
      onFinish(s.score, t.starsNote(s.hits, s.wrong, s.misses));
      return;
    }
    const timer = window.setTimeout(() => { setFlash(null); setI((x) => x + 1); }, i < 0 ? 900 : round.ms);
    return () => window.clearTimeout(timer);
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps
  const item = round.items[i];
  const tap = () => {
    if (i < 0 || !item || tapped.current[i]) return;
    tapped.current[i] = true;
    setFlash(item === 'star' ? 'good' : 'bad');
    if (item === 'moon') try { navigator.vibrate?.(40); } catch { /* none */ }
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); tap(); } };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });
  return (
    <div className="space-y-3 text-center">
      <p className="text-sm text-slate-600">{i < 0 ? t.getReady : t.of(Math.min(i + 1, round.items.length), round.items.length)}</p>
      <button type="button" onClick={tap} data-testid="star-pad" aria-label={item === 'star' ? t.starAria : item === 'moon' ? t.moonAria : t.getReady.replace('…', '')}
        className={`mx-auto grid h-56 w-56 place-items-center rounded-full ring-4 transition-colors motion-reduce:transition-none cursor-pointer ${flash === 'good' ? 'bg-emerald-50 ring-emerald-300' : flash === 'bad' ? 'bg-rose-50 ring-rose-300' : 'bg-slate-900 ring-slate-700'}`}>
        {item === 'star' ? <Star className="h-28 w-28 fill-amber-300 text-amber-400" aria-hidden /> : item === 'moon' ? <Moon className="h-28 w-28 fill-slate-300 text-slate-400" aria-hidden /> : <Sparkles className="h-16 w-16 text-indigo-300" aria-hidden />}
      </button>
      <p className="text-xs text-slate-500">{t.starHelp}</p>
    </div>
  );
}

// ------------------------------------------------------------------------------------------- word hunt

function WordHunt({ level, kid, onFinish, t }: { level: number; kid: boolean; onFinish: (score: number, seconds: number, note: string) => void; t: GymText }) {
  const board = useMemo(() => huntBoard(level, kid ? 'child' : 'adult', Date.now() % 1000), [level, kid]);
  const [found, setFound] = useState<number[]>([]);
  const [wrong, setWrong] = useState(0);
  const [shake, setShake] = useState<number | null>(null);
  const started = useRef(performance.now());
  const tap = (i: number) => {
    if (found.includes(i)) return;
    if (board.cells[i] !== board.target) { setWrong((w) => w + 1); setShake(i); window.setTimeout(() => setShake(null), 300); return; }
    const next = [...found, i];
    setFound(next);
    if (next.length === board.answers.length) {
      const seconds = Math.round((performance.now() - started.current) / 100) / 10;
      const target = board.cells.length * (kid ? 0.9 : 0.6);
      const score = Math.max(0, Math.min(100, Math.round(Math.min(1, target / seconds) * 80 + 20 - wrong * 10)));
      onFinish(score, seconds, t.huntNote(board.answers.length, seconds, wrong));
    }
  };
  const cols = Math.round(Math.sqrt(board.cells.length));
  return (
    <div className="space-y-3">
      <p className="text-center text-lg font-bold text-slate-900">{t.findEvery} <span className={`rounded-lg bg-amber-100 px-2 py-0.5 ${kid ? 'text-2xl' : 'font-reader-clear'}`} data-testid="hunt-target">{board.target}</span> <span className="text-sm font-semibold text-slate-500">({t.of(found.length, board.answers.length)})</span></p>
      <div className="mx-auto grid max-w-md gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} data-testid="hunt-grid">
        {board.cells.map((c, i) => (
          <button key={i} type="button" onClick={() => tap(i)} aria-pressed={found.includes(i)}
            className={`min-h-11 rounded-lg px-1 ring-1 transition-colors motion-reduce:transition-none cursor-pointer ${kid ? 'text-3xl' : 'font-reader-clear text-sm sm:text-base'} ${found.includes(i) ? 'bg-emerald-100 ring-emerald-300' : shake === i ? 'bg-rose-100 ring-rose-300' : 'bg-white ring-slate-200 hover:bg-indigo-50'}`}>{c}</button>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------- breathing

/** One practice, guided breath by breath: the circle grows and shrinks with the breath (still, with reduced motion). */
function BreathGuide({ practice, onFinish, onBack, t: tx, voice }: { practice: Practice; onFinish: () => void; onBack: () => void; t: GymText; voice: boolean }) {
  const [t, setT] = useState(0);
  // Children hear each step said aloud (in the young readers' language), so they can breathe with their eyes closed.
  const speaker = useSpeaker();
  const said = useRef('');
  const total = totalSeconds(practice);
  useEffect(() => {
    if (t >= total) { onFinish(); return; }
    const id = window.setTimeout(() => setT((x) => x + 1), 1000);
    return () => window.clearTimeout(id);
  }, [t]); // eslint-disable-line react-hooks/exhaustive-deps
  const at = phaseAt(practice, t);
  const key = at ? `${at.round}:${at.index}` : '';
  useEffect(() => {
    if (!voice || !at || said.current === key) return;
    said.current = key;
    const cue = spokenCue(practice, at.index);
    if (cue) speaker.say([cue], { rate: 0.8 });
  }, [key, voice]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => speaker.stop(), []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!at) return null;
  const scale = scaleFor(practice, at.index);
  const colour = at.phase.kind === 'in' || at.phase.kind === 'sniff' ? 'from-sky-300 to-indigo-400' : at.phase.kind.startsWith('hold') ? 'from-violet-300 to-indigo-400' : 'from-emerald-300 to-teal-400';
  return (
    <div className="space-y-4 text-center" data-testid="breath-guide">
      <p className="text-sm font-semibold text-slate-600">{practice.emoji} {practice.name} · {tx.breathOf(at.round, practice.rounds)}</p>
      <div className="mx-auto grid h-60 w-60 place-items-center" aria-hidden>
        <div className={`grid place-items-center rounded-full bg-gradient-to-br ${colour} text-4xl text-white shadow-lg ease-in-out motion-reduce:!transform-none motion-reduce:transition-none`}
          style={{ width: '14rem', height: '14rem', transform: `scale(${scale})`, transition: `transform ${at.phase.seconds}s ease-in-out, background 0.6s` }}>
          {practice.forKids ? practice.emoji : <span className="text-5xl font-extrabold tabular-nums">{at.left}</span>}
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900" aria-live="polite" data-testid="breath-cue">{at.phase.cue}</p>
      <p className="text-sm tabular-nums text-slate-500">{at.left} s · {total - t} s {tx.left}</p>
      <button type="button" onClick={onBack} className="text-sm font-semibold text-slate-500 hover:text-slate-800 cursor-pointer">{tx.chooseAnother}</button>
    </div>
  );
}

/** The breathing corner (owner request 2026-11-26): many practices, for before reading, when restless or at bedtime. */
function Breathing({ kid, onFinish, t }: { kid: boolean; onFinish: (name: string) => void; t: GymText }) {
  const [voice, setVoiceState] = useState(() => { try { return localStorage.getItem('bookatlas:breath-voice') !== 'off'; } catch { return true; } });
  const setVoice = (on: boolean) => { setVoiceState(on); try { localStorage.setItem('bookatlas:breath-voice', on ? 'on' : 'off'); } catch { /* this device */ } };
  const [when, setWhen] = useState<'all' | 'reading' | 'restless' | 'bedtime'>('all');
  const [chosen, setChosen] = useState<Practice | null>(null);
  const list = PRACTICES.filter((x) => x.forKids === kid && (when === 'all' || x.when.includes(when))).map((x) => (kid ? localPractice(x, t) : x));
  if (chosen) return <BreathGuide key={chosen.id} practice={chosen} t={t} voice={kid && voice} onFinish={() => onFinish(chosen.name)} onBack={() => setChosen(null)} />;
  return (
    <div className="space-y-3" data-testid="breathing">
      <ToggleGroup.Root type="single" value={when} onValueChange={(v) => v && setWhen(v as typeof when)} aria-label="When" className="flex flex-wrap gap-1.5">
        {(['all', 'reading', 'restless', 'bedtime'] as const).map((w) => (
          <ToggleGroup.Item key={w} value={w} className="min-h-9 rounded-full bg-white px-3 text-xs font-bold text-slate-600 ring-1 ring-slate-200 data-[state=on]:bg-indigo-600 data-[state=on]:text-white cursor-pointer">{t.when[w]}</ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
      <ul className="grid gap-2 sm:grid-cols-2">
        {list.map((x) => (
          <li key={x.id}>
            <button type="button" onClick={() => setChosen(x)} data-testid={`breath-${x.id}`} className="flex w-full items-start gap-3 rounded-2xl bg-slate-50 p-3 text-left ring-1 ring-slate-200 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer">
              <span className="text-2xl" aria-hidden>{x.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-slate-900">{x.name} <span className="font-normal text-slate-500">· {Math.round(totalSeconds(x) / 6) / 10} min</span></span>
                <span className="mt-0.5 block text-xs leading-relaxed text-slate-600">{x.intro}</span>
                <span className="mt-1 block text-[11px] font-semibold text-indigo-700">{x.when.map((w) => t.when[w]).join(' · ')}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {kid && <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={voice} onChange={(e) => setVoice(e.target.checked)} className="h-4 w-4 accent-indigo-600" data-testid="breath-voice" />{t.sayAloud}</label>}
      <p className="text-[11px] text-slate-500">{t.safety}</p>
    </div>
  );
}

// ------------------------------------------------------------------------------------------- the gym

/**
 * The focus gym (owner request 2026-11-26): today's plan, a streak and a level, and four short exercises. Adults
 * and teens get words and faster rounds; children get pictures, smaller grids and a slower pace.
 */
export function FocusGym({ forKids = false }: { forKids?: boolean }) {
  const { p, save, reader } = useFocusProgress();
  const kid = forKids || young(reader.kind);
  const lang = useYoung().id;
  const t = kid ? GYM_TEXT[lang] : GYM_EN;
  const nameOf = (g: GameId) => (kid ? t.games[g].name : GAMES[g].name);
  // A #breathing link (from the home page or Little ones' bedtime plan) opens the breathing practices at once.
  const fromLink = useRef(typeof window !== 'undefined' && window.location.hash === '#breathing');
  const [game, setGame] = useState<GameId | null>(fromLink.current ? 'breath' : null);
  const [run, setRun] = useState(0);
  useEffect(() => {
    if (!fromLink.current) return;
    const id = window.setTimeout(() => document.getElementById('breathing')?.scrollIntoView({ block: 'start' }), 400);
    return () => window.clearTimeout(id);
  }, []);
  const [result, setResult] = useState<{ score: number; note: string } | null>(null);
  const plan = todaysPlan(p);
  const streak = focusStreak(p);
  const finish = (g: GameId, score: number, note: string, seconds?: number) => {
    save(addResult(p, { game: g, at: new Date().toISOString(), level: p.levels[g], score, seconds }));
    setResult({ score, note });
  };
  const start = (g: GameId) => { setGame(g); setResult(null); setRun((r) => r + 1); };
  if (game) {
    const info = GAMES[game];
    return (
      <div id={game === 'breath' ? 'breathing' : undefined} className="scroll-mt-24 space-y-4 rounded-3xl bg-white p-5 ring-1 ring-slate-200 sm:p-6" data-testid={`focus-game-${game}`}>
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-lg font-bold text-slate-900"><info.icon className="h-5 w-5 text-indigo-600" aria-hidden />{nameOf(game)}</p>
          {game !== 'breath' && <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-800">{t.level(p.levels[game])}</span>}
        </div>
        {result ? (
          <Done t={t} score={result.score} note={result.note} onAgain={() => start(game)} onBack={() => { setGame(null); setResult(null); }} />
        ) : game === 'numbers' ? <NumberHunt t={t} key={run} level={p.levels.numbers} kid={kid} onFinish={(s, sec, n) => finish('numbers', s, n, sec)} />
          : game === 'stars' ? <StarCatcher t={t} key={run} level={p.levels.stars} kid={kid} onFinish={(s, n) => finish('stars', s, n)} />
            : game === 'words' ? <WordHunt t={t} key={run} level={p.levels.words} kid={kid} onFinish={(s, sec, n) => finish('words', s, n, sec)} />
              : <Breathing t={t} key={run} kid={kid} onFinish={(name) => finish('breath', 100, kid ? t.calmDone(name) : `${name} finished. Settled: a good moment to start reading.`)} />}
        {!result && <button type="button" onClick={() => setGame(null)} className="text-sm font-semibold text-slate-500 hover:text-slate-800 cursor-pointer">{t.stop}</button>}
      </div>
    );
  }
  return (
    <div className="space-y-4" data-testid="focus-gym">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-900" data-testid="focus-streak"><Flame className="h-4 w-4" aria-hidden />{t.streak(streak)}</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-sm font-bold text-indigo-900"><Brain className="h-4 w-4" aria-hidden />{t.focusLevel(focusLevel(p))}</span>
        <span className="text-xs text-slate-500">{t.plan(plan.items.map(nameOf).join(', '))}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(['breath', 'numbers', 'stars', 'words'] as GameId[]).map((g) => {
          const info = GAMES[g];
          const inPlan = plan.items.includes(g), done = plan.done.includes(g);
          return (
            <div key={g} className={`flex flex-col rounded-2xl bg-white p-4 ring-1 ${inPlan && !done ? 'ring-amber-300' : 'ring-slate-200'}`}>
              <p className="flex items-center gap-2 text-sm font-bold text-slate-900"><info.icon className="h-4 w-4 text-indigo-600" aria-hidden />{nameOf(g)}
                {done ? <Check className="ml-auto h-4 w-4 text-emerald-600" aria-label={t.doneToday} /> : inPlan ? <span className="ml-auto rounded-full bg-amber-100 px-2 text-[10px] font-bold text-amber-900">{t.today}</span> : null}</p>
              <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-600">{kid ? t.games[g].what : info.what}</p>
              <p className="mt-2 text-[11px] text-slate-500">{t.trains} {kid ? t.games[g].trains : info.trains}{g !== 'breath' ? ` · ${t.level(p.levels[g]).toLowerCase()}` : ''}</p>
              <button type="button" onClick={() => start(g)} data-testid={`focus-start-${g}`} className="mt-3 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 text-sm font-bold text-white hover:bg-indigo-500 cursor-pointer"><Play className="h-4 w-4" aria-hidden />{t.start}</button>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-500">{t.footer}</p>
    </div>
  );
}

/** The age choice for the gym when no family profile says it (Read smarter page). */
export function FocusGymSection() {
  const { reader } = useFocusProgress();
  const [who, setWho] = useState<'adult' | 'kid'>(young(reader.kind) ? 'kid' : 'adult');
  return (
    <div className="space-y-4">
      <ToggleGroup.Root type="single" value={who} onValueChange={(v) => v && setWho(v as 'adult' | 'kid')} aria-label="Who is training" className="inline-flex gap-1 rounded-xl bg-slate-100 p-1">
        <ToggleGroup.Item value="adult" className="rounded-lg px-3 py-1.5 text-sm font-bold text-slate-600 data-[state=on]:bg-white data-[state=on]:text-slate-900 data-[state=on]:shadow-sm cursor-pointer">Teens and adults</ToggleGroup.Item>
        <ToggleGroup.Item value="kid" data-testid="focus-for-kids" className="rounded-lg px-3 py-1.5 text-sm font-bold text-slate-600 data-[state=on]:bg-white data-[state=on]:text-slate-900 data-[state=on]:shadow-sm cursor-pointer">Children</ToggleGroup.Item>
      </ToggleGroup.Root>
      <FocusGym key={who} forKids={who === 'kid'} />
    </div>
  );
}
