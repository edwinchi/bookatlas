import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'wouter';
import * as Tabs from '@radix-ui/react-tabs';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import * as RadioGroup from '@radix-ui/react-radio-group';
import { ArrowLeft, Baby, Check, Ear, Delete, Puzzle, RotateCcw, Sparkles, Square, Star, Volume2, X, BookOpen, Type as TypeIcon, Image as ImageIcon, PenLine } from 'lucide-react';
import { useAccount } from '../../auth/AuthContext';
import { useEbookApi } from '../ebook/ebookApi';
import { useActiveReader } from './family';
import { loadReaderFont } from '../reader/readingAids';
import { useSpeaker } from './useSpeaker';
import { tappedWord } from './youngVoice';
import { ENGLISH, YOUNG_LANGS, YoungContext, loadYoung, startLang, useYoung, type YoungContent, type YoungLangId } from './youngLang';
import { SelectBox } from '../ui/select-box';
import { FirstWordsPanel } from './FirstWordsPanel';
import { FocusGym } from './FocusGymPanel';
import { LEVELS, STORIES, STORY_TOPICS, isListenWord, listenWord, pictureRound, sameWord, scramble, storyStars, topicOf, type Level, type Story, type StoryTopic } from './youngReaders';

/** The shapes, numbers and geometry symbols of a maths or science story, as small tiles. */
function Symbols({ symbols, big: large = false }: { symbols?: string[]; big?: boolean }) {
  if (!symbols?.length) return null;
  return (
    <span className="flex flex-wrap gap-1" aria-hidden data-testid="story-symbols">
      {symbols.map((s, i) => <span key={i} className={`inline-grid place-items-center rounded-lg bg-indigo-50 font-bold tabular-nums text-indigo-700 ring-1 ring-indigo-100 ${large ? 'min-w-10 h-10 px-2 text-xl' : 'min-w-7 h-7 px-1.5 text-sm'}`}>{s}</span>)}
    </span>
  );
}

/** A value from the address (links from Little ones and class lists open the right place). */
const qp = (k: string) => { try { return new URLSearchParams(window.location.search).get(k); } catch { return null; } };

/** Stars earned on this device; for a signed-in family they count for the reader who is playing. */
function useStars() {
  const { account } = useAccount();
  const api = useEbookApi();
  const reader = useActiveReader();
  const key = `bookatlas:young-stars:${reader.id}`;
  const read = () => { try { return Number(localStorage.getItem(key)) || 0; } catch { return 0; } };
  const [stars, setStars] = useState(read);
  useEffect(() => { setStars(read()); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const add = useCallback((n: number) => {
    if (n <= 0) return;
    setStars((s) => { const v = s + n; try { localStorage.setItem(key, String(v)); } catch { /* this device */ } return v; });
    if (account) void api.familyActivity({ profileId: reader.id, stars: n }).catch(() => undefined);
  }, [account, api, key, reader.id]);
  return { stars, add, reader };
}

const pill = 'min-h-11 rounded-full px-4 text-sm font-bold text-slate-700 data-[state=on]:bg-indigo-600 data-[state=on]:text-white data-[state=active]:bg-indigo-600 data-[state=active]:text-white bg-white ring-1 ring-slate-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer';
const big = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-base font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300 cursor-pointer disabled:opacity-50';

// ------------------------------------------------------------------------------------------------ stories

/** A story read aloud: the sentence lights up, and the word too where the device reports it. Tap a word to hear it. */
/**
 * Stories a reader finished (answered the questions), kept on this device for each family profile (phase 7). The best
 * score is kept: a story read again only counts if it went better.
 */
function useStoriesDone(readerId: string) {
  const key = `bookatlas:young-done:${readerId}`;
  const read = (): Record<string, number> => { try { const v = JSON.parse(localStorage.getItem(key) || '{}'); return v && typeof v === 'object' ? v : {}; } catch { return {}; } };
  const [done, setDone] = useState<Record<string, number>>(read);
  useEffect(() => { setDone(read()); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const mark = useCallback((id: string, right: number) => {
    setDone((d) => { if ((d[id] ?? -1) >= right) return d; const v = { ...d, [id]: right }; try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* this device */ } return v; });
  }, [key]);
  return { done, mark };
}

function StoryReader({ story, onStars, onBack, onDone }: { story: Story; onStars: (n: number) => void; onBack: () => void; onDone: (right: number) => void }) {
  const speaker = useSpeaker();
  const [playing, setPlaying] = useState(false);
  const [at, setAt] = useState<{ p: number; word: number | null } | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);
  // Each paragraph as words with their position, to match the voice's place.
  const paras = useMemo(() => story.paragraphs.map((t) => [...t.matchAll(/\S+/g)].map((m) => ({ text: m[0], start: m.index ?? 0 }))), [story]);
  // Listen and catch (2026-11-26, attention training): one word comes back in the story; tap when you hear it.
  const target = useMemo(() => listenWord(story.paragraphs), [story]);
  // Shown as the story writes it (a name keeps its capital).
  const targetShown = useMemo(() => { if (!target) return ''; for (const words of paras) for (const w of words) if (isListenWord(w.text, target.word)) return w.text.replace(/[^\p{L}’']/gu, '').replace(/[’']s$/, ''); return target.word; }, [paras, target]);
  const [catchOn, setCatchOn] = useState(false);
  const [caught, setCaught] = useState<string[]>([]);
  const [catchNote, setCatchNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [catchDone, setCatchDone] = useState<number | null>(null);
  const spoken = useRef<{ p: number; i: number; at: number }[]>([]);
  const partNow = useRef(-1);
  const wordsReported = useRef(false);
  const caughtRef = useRef<string[]>([]);
  const play = (withCatch = false) => {
    if (playing) { speaker.stop(); setPlaying(false); setAt(null); return; }
    setPlaying(true);
    setCatchOn(withCatch);
    if (withCatch) { setCaught([]); caughtRef.current = []; setCatchNote(null); setCatchDone(null); }
    spoken.current = []; partNow.current = -1; wordsReported.current = false;
    speaker.say(story.paragraphs, {
      onPart: (p) => { partNow.current = p; setAt({ p, word: null }); },
      onWord: (p, ch) => {
        const w = paras[p]!.findIndex((x, i) => ch >= x.start && (i === paras[p]!.length - 1 || ch < paras[p]![i + 1]!.start));
        if (w >= 0) { wordsReported.current = true; spoken.current = [...spoken.current.slice(-12), { p, i: w, at: Date.now() }]; }
        setAt({ p, word: w < 0 ? null : w });
      },
      onEnd: () => {
        setPlaying(false); setAt(null);
        if (withCatch && target) {
          const n = caughtRef.current.length;
          setCatchDone(n);
          const stars = n >= target.times ? 2 : n > 0 ? 1 : 0;
          if (stars) onStars(stars);
        }
      },
    });
  };
  // A tap counts for a time the word was said in the last two seconds (or in this paragraph, when the device's
  // voice does not report words), each time once.
  const heard = () => {
    if (!target) return;
    const free = (p: number, i: number) => !caughtRef.current.includes(`${p}:${i}`) && isListenWord(paras[p]![i]!.text, target.word);
    const recent = spoken.current.filter((s) => Date.now() - s.at < 2000 && free(s.p, s.i)).pop();
    let hit = recent ? `${recent.p}:${recent.i}` : null;
    if (!hit && !wordsReported.current && partNow.current >= 0) {
      const i = paras[partNow.current]!.findIndex((_, k) => free(partNow.current, k));
      if (i >= 0) hit = `${partNow.current}:${i}`;
    }
    if (hit) {
      caughtRef.current = [...caughtRef.current, hit];
      setCaught(caughtRef.current);
      setCatchNote({ ok: true, text: `Caught it! ${caughtRef.current.length} of ${target.times}` });
    } else setCatchNote({ ok: false, text: `Not yet. Keep listening for “${targetShown}”.` });
  };
  const right = story.questions.filter((q, i) => answers[i] === q.answer).length;
  const check = () => { setChecked(true); onStars(storyStars(right, story.questions.length)); onDone(right); };
  return (
    <div className="space-y-6">
      <button type="button" onClick={() => { speaker.stop(); onBack(); }} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-indigo-700 cursor-pointer"><ArrowLeft className="h-4 w-4" aria-hidden />All stories</button>
      <article className="rounded-3xl bg-white p-6 ring-1 ring-slate-200 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <h2 className="flex items-center gap-3 font-serif text-3xl font-bold text-slate-900"><span aria-hidden className="text-4xl text-indigo-600">{story.picture}</span>{story.title}</h2>
            <Symbols symbols={story.symbols} big />
          </div>
          {speaker.supported && (
            <button type="button" onClick={() => play(false)} data-testid="story-read-to-me" className={`${big} ${playing ? 'bg-slate-900 text-white' : 'bg-amber-400 text-slate-950 hover:bg-amber-300'}`}>
              {playing ? <Square className="h-5 w-5" aria-hidden /> : <Volume2 className="h-5 w-5" aria-hidden />}{playing ? 'Stop' : 'Read to me'}
            </button>
          )}
        </div>
        <div className="mt-6 space-y-4 font-reader-clear text-2xl leading-relaxed text-slate-900 sm:text-[1.7rem]">
          {paras.map((words, p) => (
            <p key={p} className={`rounded-xl px-2 py-1 transition-colors ${at?.p === p ? 'bg-indigo-50' : ''}`}>
              {words.map((w, i) => (
                <React.Fragment key={i}>
                  <button type="button" onClick={() => speaker.say([tappedWord(w.text)], { rate: 0.75 })}
                    className={`rounded-md px-0.5 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer ${at?.p === p && at.word === i ? 'bg-amber-300' : ''}`}>{w.text}</button>{' '}
                </React.Fragment>
              ))}
            </p>
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-500">Tap any word to hear it.</p>
      </article>

      {speaker.supported && target && (
        <section aria-labelledby="listen-catch" className="rounded-3xl bg-gradient-to-br from-sky-50 to-indigo-50 p-6 ring-1 ring-sky-200 sm:p-8" data-testid="listen-catch">
          <h3 id="listen-catch" className="flex items-center gap-2 text-xl font-bold text-slate-900"><Ear className="h-5 w-5 text-sky-600" aria-hidden />Listen and catch</h3>
          <p className="mt-2 text-base text-slate-700">Close your eyes or look away from the words. The word <strong className="rounded-lg bg-white px-2 py-0.5 font-reader-clear text-lg text-sky-800 ring-1 ring-sky-200">{targetShown}</strong> comes {target.times} times. Each time you hear it, tap <em>I heard it!</em></p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {catchOn && playing ? (
              <button type="button" onClick={heard} data-testid="catch-heard" className={`${big} min-h-16 bg-sky-700 px-8 text-lg text-white hover:bg-sky-800`}><Ear className="h-6 w-6" aria-hidden />I heard it!</button>
            ) : (
              <button type="button" onClick={() => play(true)} disabled={playing} data-testid="catch-start" className={`${big} bg-sky-700 text-white hover:bg-sky-800`}><Volume2 className="h-5 w-5" aria-hidden />{catchDone === null ? 'Start listening' : 'Play again'}</button>
            )}
            {catchOn && playing && <button type="button" onClick={() => play()} className={`${big} bg-white text-slate-700 ring-1 ring-slate-200`}><Square className="h-5 w-5" aria-hidden />Stop</button>}
            <span className="flex gap-1" role="img" aria-label={`${caught.length} of ${target.times} caught`}>
              {Array.from({ length: target.times }, (_, i) => <span key={i} aria-hidden className={`grid h-9 w-9 place-items-center rounded-full text-lg ring-2 transition ${i < caught.length ? 'bg-sky-500 text-white ring-sky-500 scale-110' : 'bg-white text-slate-300 ring-slate-200'}`}>{i < caught.length ? '★' : '·'}</span>)}
            </span>
          </div>
          <p role="status" aria-live="polite" className={`mt-3 min-h-6 text-base font-semibold ${catchNote?.ok ? 'text-sky-800' : 'text-slate-600'}`}>
            {catchDone !== null
              ? catchDone >= target.times ? `You caught all ${target.times}! Great listening: 2 stars.` : catchDone > 0 ? `You caught ${catchDone} of ${target.times}: 1 star. Play again to catch them all.` : 'Play again and listen closely for the word.'
              : catchNote?.text ?? ''}
          </p>
        </section>
      )}

      <section aria-labelledby="story-questions" className="rounded-3xl bg-white p-6 ring-1 ring-slate-200 sm:p-8">
        <h3 id="story-questions" className="flex items-center gap-2 text-xl font-bold text-slate-900"><Sparkles className="h-5 w-5 text-amber-500" aria-hidden />What happened?</h3>
        <div className="mt-4 space-y-5">
          {story.questions.map((q, qi) => (
            <fieldset key={qi} className="space-y-2">
              <legend className="text-lg font-semibold text-slate-900">{qi + 1}. {q.question}</legend>
              <RadioGroup.Root value={answers[qi] === undefined ? '' : String(answers[qi])} onValueChange={(v) => { if (!checked) setAnswers((a) => ({ ...a, [qi]: Number(v) })); }} className="grid gap-2 sm:grid-cols-3" aria-label={q.question}>
                {q.options.map((o, oi) => {
                  const state = !checked ? '' : oi === q.answer ? 'bg-emerald-100 ring-emerald-500' : answers[qi] === oi ? 'bg-rose-100 ring-rose-400' : '';
                  return (
                    <RadioGroup.Item key={oi} value={String(oi)} disabled={checked}
                      className={`flex min-h-12 items-center gap-2 rounded-2xl px-4 text-left text-base font-semibold ring-1 ring-slate-200 data-[state=checked]:ring-2 data-[state=checked]:ring-indigo-500 data-[state=checked]:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer ${state}`}>
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full ring-2 ring-slate-300"><RadioGroup.Indicator className="h-2.5 w-2.5 rounded-full bg-indigo-600" /></span>{o}
                    </RadioGroup.Item>
                  );
                })}
              </RadioGroup.Root>
            </fieldset>
          ))}
        </div>
        {!checked ? (
          <button type="button" onClick={check} disabled={Object.keys(answers).length < story.questions.length} data-testid="story-check" className={`${big} mt-6 bg-indigo-600 text-white hover:bg-indigo-500`}><Check className="h-5 w-5" aria-hidden />Check my answers</button>
        ) : (
          <div role="status" className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl bg-amber-50 p-4 text-lg font-bold text-amber-950">
            <span>{right === story.questions.length ? 'All right, well done!' : `${right} of ${story.questions.length} right.`}</span>
            <span className="flex" aria-label={`${storyStars(right, story.questions.length)} stars`}>{Array.from({ length: storyStars(right, story.questions.length) }, (_, i) => <Star key={i} className="h-6 w-6 fill-amber-400 text-amber-500" aria-hidden />)}</span>
            <button type="button" onClick={() => { setAnswers({}); setChecked(false); }} className="ml-auto inline-flex items-center gap-1 text-sm text-indigo-700 cursor-pointer"><RotateCcw className="h-4 w-4" aria-hidden />Try again</button>
          </div>
        )}
      </section>
    </div>
  );
}

function Stories({ level, onStars, readerId, startStory }: { level: Level; onStars: (n: number) => void; readerId: string; startStory: string | null }) {
  const { stories } = useYoung();
  const { done, mark } = useStoriesDone(readerId);
  const { account } = useAccount();
  const api = useEbookApi();
  const [openId, setOpenId] = useState<string | null>(startStory);
  // Which kind of story is shown (owner request 2026-11-26): all, everyday, bedtime, maths or science; kept on this device.
  const [topic, setTopicState] = useState<StoryTopic | 'all'>(() => { try { const v = localStorage.getItem('bookatlas:young-topic'); return v && (v === 'all' || STORY_TOPICS.some((t) => t.id === v)) ? v as StoryTopic | 'all' : 'all'; } catch { return 'all'; } });
  const setTopic = (v: StoryTopic | 'all') => { setTopicState(v); try { localStorage.setItem('bookatlas:young-topic', v); } catch { /* this device */ } };
  // Changing the level closes the open story (not the first render, which may open one from a class link).
  const shownLevel = useRef(level);
  useEffect(() => { if (shownLevel.current !== level) { shownLevel.current = level; setOpenId(null); } }, [level]);
  // Signed in: the result is kept with the account too, so a teacher sees it when the story is on a class list.
  const finished = (id: string, right: number) => { mark(id, right); if (account) void api.youngStoryDone(id, right).catch(() => undefined); };
  // The story follows the language: switching language while reading shows the same story translated.
  const open = stories.find((s) => s.id === openId) ?? null;
  if (open) return <StoryReader key={`${open.id}:${open.title}`} story={open} onStars={onStars} onBack={() => setOpenId(null)} onDone={(right) => finished(open.id, right)} />;
  const atLevel = stories.filter((s) => s.level === level);
  const here = topic === 'all' ? atLevel : atLevel.filter((s) => topicOf(s) === topic);
  const read = atLevel.filter((s) => s.id in done).length;
  return (
    <div className="space-y-4">
    <p className="flex items-center gap-2 text-sm font-semibold text-slate-700" data-testid="stories-read">
      <span className="inline-flex h-2 w-24 overflow-hidden rounded-full bg-slate-200" aria-hidden><span className="h-full rounded-full bg-emerald-500" style={{ width: `${here.length ? (read / here.length) * 100 : 0}%` }} /></span>
      {read} of {atLevel.length} stories read at this level
    </p>
    <ToggleGroup.Root type="single" value={topic} onValueChange={(v) => v && setTopic(v as StoryTopic | 'all')} aria-label="Kind of story" className="flex flex-wrap gap-2" data-testid="story-topics">
      <ToggleGroup.Item value="all" className={pill}>All · {atLevel.length}</ToggleGroup.Item>
      {STORY_TOPICS.map((t) => (
        <ToggleGroup.Item key={t.id} value={t.id} className={pill} data-testid={`topic-${t.id}`}><span aria-hidden className="mr-1">{t.icon}</span>{t.name} · {atLevel.filter((s) => topicOf(s) === t.id).length}</ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
    <div className="grid gap-4 sm:grid-cols-2">
      {here.map((s) => (
        <button key={s.id} type="button" onClick={() => setOpenId(s.id)} data-testid={`story-${s.id}`}
          className="flex items-center gap-4 rounded-3xl bg-white p-5 text-left ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-amber-50 text-4xl text-indigo-600" aria-hidden>{s.picture}</span>
          <span className="min-w-0 flex-1 space-y-1"><span className="block font-serif text-xl font-bold text-slate-900">{s.title}</span><span className="block text-sm text-slate-500">{STORY_TOPICS.find((t) => t.id === topicOf(s))!.name} · {s.paragraphs.join(' ').split(/\s+/).length} words · {s.questions.length} questions</span><Symbols symbols={s.symbols} /></span>
          {s.id in done && <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-500 text-white" title={`Read · ${done[s.id]} of ${s.questions.length} right`} data-testid="story-done"><Check className="h-5 w-5" aria-hidden /><span className="sr-only">Read, {done[s.id]} of {s.questions.length} right</span></span>}
        </button>
      ))}
    </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ letter sounds

function LetterSounds() {
  const young = useYoung();
  const speaker = useSpeaker();
  const [last, setLast] = useState<string | null>(null);
  const groups: { id: 'letters' | 'pairs' | 'vowels'; title: string }[] = [
    { id: 'letters', title: 'Letters' }, { id: 'pairs', title: 'Letters that work together' }, { id: 'vowels', title: 'Long sounds' },
  ];
  return (
    <div className="space-y-6">
      {!speaker.supported && <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">This browser has no voice to read aloud. Try Chrome, Edge or Safari.</p>}
      {groups.map((g) => (
        <section key={g.id} aria-label={g.title}>
          <h3 className="mb-3 text-lg font-bold text-slate-900">{g.title}</h3>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-9">
            {young.sounds.filter((s) => s.group === g.id).map((s) => (
              <button key={s.id} type="button" onClick={() => { setLast(s.id); speaker.say([s.say]); }} aria-label={`${s.label}: ${s.word}`}
                className={`flex aspect-square flex-col items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer ${last === s.id ? 'ring-2 ring-indigo-500' : ''}`}>
                <span className="font-reader-clear text-3xl font-bold text-slate-900">{s.label}</span>
                <span className="text-xl" aria-hidden>{s.picture}</span>
                <span className="text-[11px] font-semibold text-slate-500">{s.word}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ word games

function Feedback({ ok, onNext, word }: { ok: boolean; onNext: () => void; word: string }) {
  return (
    <div role="status" className={`flex flex-wrap items-center gap-3 rounded-2xl p-4 text-lg font-bold ${ok ? 'bg-emerald-50 text-emerald-900' : 'bg-rose-50 text-rose-900'}`}>
      {ok ? <><Star className="h-6 w-6 fill-amber-400 text-amber-500" aria-hidden />Yes! That is “{word}”.</> : <><X className="h-6 w-6" aria-hidden />Not quite: it is “{word}”.</>}
      <button type="button" onClick={onNext} data-testid="game-next" className={`${big} ml-auto bg-indigo-600 text-white hover:bg-indigo-500`}>Next</button>
    </div>
  );
}

function FindThePicture({ level, onStars }: { level: Level; onStars: (n: number) => void }) {
  const { words } = useYoung();
  const speaker = useSpeaker();
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const r = useMemo(() => pictureRound(level, round, 3, words), [level, round, words]);
  useEffect(() => { setPicked(null); }, [level, round, words]);
  const choose = (w: string) => { if (picked) return; setPicked(w); if (w === r.target.word) onStars(1); };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-reader-clear text-4xl font-bold text-slate-900" data-testid="picture-word">{r.target.word}</p>
        {speaker.supported && <button type="button" onClick={() => speaker.say([r.target.word], { rate: 0.75 })} aria-label={`Hear the word ${r.target.word}`} className="grid h-12 w-12 place-items-center rounded-full bg-amber-400 text-slate-950 hover:bg-amber-300 cursor-pointer"><Volume2 className="h-5 w-5" /></button>}
      </div>
      <p className="text-sm text-slate-600">Which picture shows this word?</p>
      <div className="grid grid-cols-3 gap-3">
        {r.choices.map((c) => (
          <button key={c.word} type="button" onClick={() => choose(c.word)} aria-label={c.word} disabled={!!picked}
            className={`grid aspect-square place-items-center rounded-3xl text-6xl transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer sm:text-7xl ${picked && c.word === r.target.word ? 'bg-emerald-100 ring-4 ring-emerald-500' : picked === c.word ? 'bg-rose-100 ring-4 ring-rose-400' : 'bg-white ring-1 ring-slate-200'}`}>{c.picture}</button>
        ))}
      </div>
      {picked && <Feedback ok={picked === r.target.word} word={r.target.word} onNext={() => setRound((n) => n + 1)} />}
    </div>
  );
}

function BuildTheWord({ level, onStars }: { level: Level; onStars: (n: number) => void }) {
  const { words } = useYoung();
  const [round, setRound] = useState(0);
  const target = words[level][(round * 5 + 3) % words[level].length]!;
  const tiles = useMemo(() => scramble(target.word, round * 31 + level), [target.word, round, level]);
  const [used, setUsed] = useState<number[]>([]);
  useEffect(() => { setUsed([]); }, [level, round, target.word]);
  const built = used.map((i) => tiles[i]).join('');
  const done = used.length === tiles.length;
  const ok = done && built === target.word;
  useEffect(() => { if (ok) onStars(1); }, [ok]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-5">
      <p className="flex items-center gap-3 text-sm text-slate-600"><span className="text-6xl" aria-hidden>{target.picture}</span>Put the letters in order to spell the picture.</p>
      <div className="flex min-h-16 flex-wrap gap-2 rounded-2xl bg-white p-3 ring-1 ring-slate-200" aria-label="Your word" data-testid="build-answer">
        {used.map((i, k) => <span key={k} className="grid h-14 w-12 place-items-center rounded-xl bg-indigo-600 font-reader-clear text-3xl font-bold text-white">{tiles[i]}</span>)}
      </div>
      <div className="flex flex-wrap gap-2">
        {tiles.map((t, i) => (
          <button key={i} type="button" disabled={used.includes(i) || done} onClick={() => setUsed((u) => [...u, i])} aria-label={`Letter ${t}`} data-testid="build-tile"
            className="grid h-14 w-12 place-items-center rounded-xl bg-amber-100 font-reader-clear text-3xl font-bold text-slate-900 ring-1 ring-amber-300 hover:bg-amber-200 disabled:opacity-25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer">{t}</button>
        ))}
        <button type="button" onClick={() => setUsed((u) => u.slice(0, -1))} disabled={!used.length || done} aria-label="Take back the last letter" className="grid h-14 w-12 place-items-center rounded-xl bg-white ring-1 ring-slate-200 disabled:opacity-30 cursor-pointer"><Delete className="h-5 w-5" /></button>
      </div>
      {done && <Feedback ok={ok} word={target.word} onNext={() => setRound((n) => n + 1)} />}
    </div>
  );
}

function SpellIt({ level, onStars }: { level: Level; onStars: (n: number) => void }) {
  const { words } = useYoung();
  const speaker = useSpeaker();
  const [round, setRound] = useState(0);
  const target = words[level][(round * 7 + 1) % words[level].length]!;
  const [value, setValue] = useState('');
  const [result, setResult] = useState<boolean | null>(null);
  useEffect(() => { setValue(''); setResult(null); }, [level, round, target.word]);
  const check = (e: React.FormEvent) => { e.preventDefault(); if (result !== null || !value.trim()) return; const ok = sameWord(value, target.word); setResult(ok); if (ok) onStars(1); };
  return (
    <form onSubmit={check} className="space-y-5">
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-6xl" aria-hidden>{target.picture}</span>
        {speaker.supported && <button type="button" onClick={() => speaker.say([target.word], { rate: 0.7 })} className={`${big} bg-amber-400 text-slate-950 hover:bg-amber-300`}><Volume2 className="h-5 w-5" aria-hidden />Hear the word</button>}
      </div>
      <label className="block">
        <span className="text-sm text-slate-600">Type the word you hear and see.</span>
        <input value={value} onChange={(e) => setValue(e.target.value)} disabled={result !== null} autoComplete="off" autoCapitalize="off" spellCheck={false} data-testid="spell-input"
          className="mt-2 block w-full max-w-sm rounded-2xl border border-slate-300 bg-white px-4 py-3 font-reader-clear text-3xl font-bold tracking-wider text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
      </label>
      {result === null ? <button type="submit" disabled={!value.trim()} className={`${big} bg-indigo-600 text-white hover:bg-indigo-500`}><Check className="h-5 w-5" aria-hidden />Check</button>
        : <Feedback ok={result} word={target.word} onNext={() => setRound((n) => n + 1)} />}
    </form>
  );
}

function WordGames({ level, onStars }: { level: Level; onStars: (n: number) => void }) {
  return (
    <Tabs.Root defaultValue="picture" className="space-y-5">
      <Tabs.List aria-label="Word games" className="flex flex-wrap gap-2">
        <Tabs.Trigger value="picture" className={`${pill} inline-flex items-center gap-1.5`}><ImageIcon className="h-4 w-4" aria-hidden />Find the picture</Tabs.Trigger>
        <Tabs.Trigger value="build" className={`${pill} inline-flex items-center gap-1.5`}><Puzzle className="h-4 w-4" aria-hidden />Build the word</Tabs.Trigger>
        <Tabs.Trigger value="spell" className={`${pill} inline-flex items-center gap-1.5`}><PenLine className="h-4 w-4" aria-hidden />Spell it</Tabs.Trigger>
      </Tabs.List>
      <div className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-200 sm:p-6">
        <Tabs.Content value="picture" className="focus-visible:outline-none"><FindThePicture level={level} onStars={onStars} /></Tabs.Content>
        <Tabs.Content value="build" className="focus-visible:outline-none"><BuildTheWord level={level} onStars={onStars} /></Tabs.Content>
        <Tabs.Content value="spell" className="focus-visible:outline-none"><SpellIt level={level} onStars={onStars} /></Tabs.Content>
      </div>
    </Tabs.Root>
  );
}

// ------------------------------------------------------------------------------------------------ page

/**
 * Young readers (Reading Intelligence phase 2): stories read aloud with the words lit up and questions after them,
 * letter sounds, and word games, in three reading levels. Free, no account needed; stars count for a family profile.
 */
export default function YoungReadersPage() {
  useEffect(() => {
    const title = document.title;
    document.title = 'Young readers: stories, letter sounds and word games | BooksAtlas';
    loadReaderFont('clear');
    return () => { document.title = title; };
  }, []);
  const { stars, add, reader } = useStars();
  // A link from a class reading list: ?story=<id> opens that story at its level.
  const startStory = useMemo(() => { try { const id = new URLSearchParams(window.location.search).get('story'); return STORIES.some((s) => s.id === id) ? id : null; } catch { return null; } }, []);
  const [langId, setLangId] = useState<YoungLangId>(() => { let saved: string | null = null; try { saved = localStorage.getItem('bookatlas:young-lang'); } catch { /* this device */ } return startLang(saved, typeof navigator === 'undefined' ? undefined : navigator.language); });
  const [content, setContent] = useState<YoungContent>(ENGLISH);
  useEffect(() => {
    let live = true;
    void loadYoung(langId).then((c) => { if (live) setContent(c); }).catch(() => { if (live) setContent(ENGLISH); });
    try { localStorage.setItem('bookatlas:young-lang', langId); } catch { /* this device */ }
    return () => { live = false; };
  }, [langId]);
  const [level, setLevel] = useState<Level>(() => { const s = STORIES.find((x) => x.id === startStory); if (s) return s.level; const fromLink = Number(qp('level')); if ([1, 2, 3].includes(fromLink)) return fromLink as Level; try { return (Number(localStorage.getItem('bookatlas:young-level')) as Level) || 1; } catch { return 1; } });
  const pickLevel = (v: string) => { if (!v) return; const l = Number(v) as Level; setLevel(l); try { localStorage.setItem('bookatlas:young-level', String(l)); } catch { /* this device */ } };
  return (
    <YoungContext.Provider value={content}>
    <main className="min-h-[100dvh] bg-[#fffaf0]" lang={content.voice.slice(0, 2)}>
      <header className="bg-[radial-gradient(ellipse_70%_120%_at_90%_0%,rgba(250,204,21,0.35),transparent),linear-gradient(to_bottom,#3730a3,#312e81)] px-4 pb-8 pt-6 text-white sm:px-6">
        <div className="mx-auto max-w-5xl">
          <Link href="/reading-intelligence" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-indigo-100 hover:text-white"><ArrowLeft className="h-4 w-4" aria-hidden />Reading Intelligence</Link>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-serif text-4xl font-bold sm:text-5xl">Young readers</h1>
              <p className="mt-2 max-w-xl text-indigo-100">Stories that read themselves aloud, letter sounds and word games. Pick a language and a level, then play.</p>
              <a href={`${import.meta.env.BASE_URL}reading-intelligence/little-ones`} className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-amber-200 underline-offset-4 hover:underline">For babies and toddlers (0–3 years): Little ones</a>
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/20" aria-live="polite">
              <Star className="h-7 w-7 fill-amber-300 text-amber-300" aria-hidden />
              <span className="text-2xl font-extrabold tabular-nums" data-testid="young-stars">{stars}</span>
              <span className="text-sm text-indigo-100">stars{reader.name ? ` for ${reader.name}` : ''}</span>
            </div>
          </div>
          <label className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-100">Language
            <SelectBox value={langId} onChange={(e) => setLangId(e.target.value as YoungLangId)} aria-label="Language of the stories and words" data-testid="young-lang"
              className="min-w-[10rem] rounded-xl bg-white/10 px-3 py-2 text-sm font-bold text-white ring-1 ring-white/30 focus:outline-none focus:ring-2 focus:ring-amber-300">
              {YOUNG_LANGS.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </SelectBox>
          </label>
          <ToggleGroup.Root type="single" value={String(level)} onValueChange={pickLevel} aria-label="Reading level" className="mt-4 flex flex-wrap gap-2">
            {LEVELS.map((l) => (
              <ToggleGroup.Item key={l.id} value={String(l.id)} className="rounded-2xl bg-white/10 px-4 py-2 text-left ring-1 ring-white/20 data-[state=on]:bg-white data-[state=on]:text-indigo-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 cursor-pointer">
                <span className="block text-sm font-bold">Level {l.id}: {l.name}</span><span className="block text-xs opacity-80">Ages {l.ages}</span>
              </ToggleGroup.Item>
            ))}
          </ToggleGroup.Root>
        </div>
      </header>

      <Tabs.Root defaultValue={startStory ? 'stories' : ['first', 'stories', 'sounds', 'games'].includes(qp('tab') ?? '') ? qp('tab')! : reader.kind === 'early' || window.location.hash === '#first-words' ? 'first' : 'stories'} className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Tabs.List aria-label="Activities" className="mb-6 flex flex-wrap gap-2">
          <Tabs.Trigger value="first" className={`${pill} inline-flex items-center gap-1.5`} data-testid="young-tab-first"><Baby className="h-4 w-4" aria-hidden />First words</Tabs.Trigger>
          <Tabs.Trigger value="stories" className={`${pill} inline-flex items-center gap-1.5`} data-testid="young-tab-stories"><BookOpen className="h-4 w-4" aria-hidden />Stories</Tabs.Trigger>
          <Tabs.Trigger value="sounds" className={`${pill} inline-flex items-center gap-1.5`} data-testid="young-tab-sounds"><TypeIcon className="h-4 w-4" aria-hidden />Letter sounds</Tabs.Trigger>
          <Tabs.Trigger value="games" className={`${pill} inline-flex items-center gap-1.5`} data-testid="young-tab-games"><Puzzle className="h-4 w-4" aria-hidden />Word games</Tabs.Trigger>
          <Tabs.Trigger value="focus" className={`${pill} inline-flex items-center gap-1.5`} data-testid="young-tab-focus"><Star className="h-4 w-4" aria-hidden />Focus and calm</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="first" className="focus-visible:outline-none"><FirstWordsPanel onStars={add} /></Tabs.Content>
        <Tabs.Content value="stories" className="focus-visible:outline-none"><Stories level={level} onStars={add} readerId={reader.id} startStory={startStory} /></Tabs.Content>
        <Tabs.Content value="sounds" className="focus-visible:outline-none"><LetterSounds /></Tabs.Content>
        <Tabs.Content value="games" className="focus-visible:outline-none"><WordGames level={level} onStars={add} /></Tabs.Content>
        <Tabs.Content value="focus" className="focus-visible:outline-none"><FocusGym forKids /></Tabs.Content>
        <p className="mt-10 text-sm text-slate-600">Grown-ups: add your children as readers under <Link href="/reading-intelligence#family" className="font-bold text-indigo-700 hover:underline">Family reading</Link> to follow their stars, reading time and quiz scores.</p>
      </Tabs.Root>
    </main>
    </YoungContext.Provider>
  );
}
