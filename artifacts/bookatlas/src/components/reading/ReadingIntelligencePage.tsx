import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import * as Toggle from '@radix-ui/react-toggle';
import * as Tooltip from '@radix-ui/react-tooltip';
import { SelectBox } from '../ui/select-box';
import { Accessibility, ArrowLeft, AudioLines, Baby, Bold, BookOpen, Brain, Flame, Focus, Gauge, GraduationCap, FileText, Star, Headphones, Languages, Library, Loader2, MessageSquareText, Rows3, School, Sparkles, Target, Timer, TrendingUp, Type, Users, Zap, Clock, CalendarDays, Activity, Layers } from 'lucide-react';
import { useAccount } from '../../auth/AuthContext';
import { useEbookApi, type CheckpointSummary, type ReadingStats } from '../ebook/ebookApi';
import { BANDS } from '../reader/checkpoints';
import { ReadingHeatmap } from './ReadingHeatmap';
import { FlashcardReview } from '../reader/FlashcardReview';
import { WEEKDAY_NAMES, aggregateHeatmapData, consistencyLabel, consistencyScore, dailyActivity, hourLabel, peakDay, peakHour } from './heatmap';
import { FastReadPlayer, SpeedCheck, useSpeedTests } from '../reader/FastReadPanel';
import { ReaderAchievements } from '../reader/ReaderAchievements';
import { BoldStarts } from '../reader/readingAids';
import { SAMPLE_PASSAGE, speedPlan, summarizeTests } from '../reader/fastRead';
import { FamilyPanel, NextStepCard, WhoIsReading, useFamily } from './FamilySection';
import { OwnText } from './OwnTextPanel';
import { SchoolsSection } from './SchoolsSection';
import { GoalsPanel } from './GoalsPanel';

const BASE = import.meta.env.BASE_URL;
const STORE = BASE;
const SIGN_IN = `${BASE}sign-in?redirect_url=${encodeURIComponent(`${BASE}reading-intelligence#progress`)}`;
const SAMPLE_PARAS = SAMPLE_PASSAGE.split('\n\n');

const SECTIONS = [
  { id: 'fast-read', label: 'Fast Read', icon: Zap },
  { id: 'speed-check', label: 'Speed check', icon: Gauge },
  { id: 'listen', label: 'Read and listen', icon: Headphones },
  { id: 'coach', label: 'AI coach', icon: Brain },
  { id: 'aids', label: 'Reading aids', icon: Accessibility },
  { id: 'own-text', label: 'Your own text', icon: FileText },
  { id: 'progress', label: 'My progress', icon: TrendingUp },
  { id: 'family', label: 'Family', icon: Users },
  { id: 'young', label: 'Young readers', icon: Baby },
  { id: 'schools', label: 'Schools and teams', icon: School },
] as const;

function Section({ id, icon: Icon, eyebrow, title, intro, children }: { id: string; icon: React.ComponentType<{ className?: string }>; eyebrow: string; title: string; intro: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20 py-10 sm:py-14">
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-600"><Icon className="h-4 w-4" aria-hidden />{eyebrow}</p>
      <h2 id={`${id}-title`} className="mt-2 font-serif text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">{intro}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Feature({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <p className="flex items-center gap-2 text-sm font-bold text-slate-900"><Icon className="h-4 w-4 text-indigo-600" aria-hidden />{title}</p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">{children}</p>
    </div>
  );
}

function Tile({ label, value, note, icon: Icon }: { label: string; value: string; note?: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500"><Icon className="h-3.5 w-3.5" aria-hidden />{label}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900">{value}</p>
      {note && <p className="text-[11px] text-slate-500">{note}</p>}
    </div>
  );
}

/** A chart value on hover (Radix tooltip). */
function Tip({ text, children }: { text: string; children: React.ReactElement }) {
  return (
    <Tooltip.Root delayDuration={0}>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side="top" sideOffset={4} className="z-50 rounded-md bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white shadow">{text}</Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/** Minutes read on each of the last 30 days: one series, thin bars, a tooltip on each day, and a table for screen readers. */
function DaysChart({ days }: { days: ReadingStats['last30'] }) {
  const max = Math.max(10, ...days.map((d) => d.minutes));
  const fmt = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return (
    <figure className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <figcaption className="text-sm font-bold text-slate-900">Minutes read, last 30 days</figcaption>
      <div className="relative mt-4 h-36">
        <div className="absolute inset-x-0 top-0 border-t border-dashed border-slate-200" />
        <span className="absolute -top-2 right-0 bg-white pl-1 text-[10px] text-slate-400">{max} min</span>
        <div className="absolute inset-0 flex items-end gap-[2px] border-b border-slate-300">
          {days.map((d) => (
            <Tip key={d.day} text={`${fmt(d.day)}: ${d.minutes} min`}>
              <div className="group relative flex h-full flex-1 items-end">
                <div className="w-full rounded-t-[4px] bg-indigo-600 transition-colors group-hover:bg-indigo-800" style={{ height: `${d.minutes ? Math.max(3, (d.minutes / max) * 100) : 0}%` }} />
              </div>
            </Tip>
          ))}
        </div>
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-slate-400" aria-hidden><span>{fmt(days[0]!.day)}</span><span>Today</span></div>
      <table className="sr-only"><caption>Minutes read per day</caption><tbody>{days.map((d) => <tr key={d.day}><th scope="row">{fmt(d.day)}</th><td>{d.minutes} minutes</td></tr>)}</tbody></table>
    </figure>
  );
}

function SpeedSummary({ tests }: { tests: ReturnType<typeof useSpeedTests>['tests'] }) {
  const s = summarizeTests(tests);
  const [target, setTarget] = useState(500);
  if (!s.count) return <p className="rounded-2xl bg-white p-4 text-sm text-slate-600 ring-1 ring-slate-200">No speed checks yet. Take one above, then come back to follow your progress.</p>;
  const plan = speedPlan(s.latest!, target);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile icon={Gauge} label="Latest" value={`${s.latest}`} note="words a minute" />
        <Tile icon={TrendingUp} label="Average" value={`${s.average}`} note={`over ${s.count} check${s.count === 1 ? '' : 's'}`} />
        <Tile icon={Flame} label="Best" value={`${s.best}`} note="words a minute" />
        <Tile icon={Target} label="Change" value={s.change === null ? '–' : `${s.change > 0 ? '+' : ''}${s.change}`} note="since your first check" />
      </div>
      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <label className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-900">
          <Target className="h-4 w-4 text-indigo-600" aria-hidden />My goal
          <SelectBox value={target} onChange={(e) => setTarget(Number(e.target.value))} aria-label="Target speed" className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-semibold">
            {[300, 400, 500, 600, 800].map((t) => <option key={t} value={t}>{t} words a minute</option>)}
          </SelectBox>
        </label>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
          {plan.weeks === 0
            ? `You already read at ${s.latest} words a minute. Keep checking that you remember what you read: a chapter quiz is the best test.`
            : `From ${s.latest} to ${target} words a minute takes about ${plan.weeks} week${plan.weeks === 1 ? '' : 's'} with ${plan.minutesPerDay} minutes of Fast Read a day. Raise the speed by about 25 words a minute each week (week 1: ${plan.steps[0]}, week ${plan.weeks}: ${target}) and take a chapter quiz now and then to keep the meaning.`}
        </p>
      </div>
    </div>
  );
}

/** Comprehension checkpoints (master build plan M4): average, band, how many and the trend. */
function CheckpointsCard() {
  const api = useEbookApi();
  const [s, setS] = useState<CheckpointSummary | null>(null);
  useEffect(() => { api.checkpoints().then(setS).catch(() => setS(null)); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!s) return null;
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200" data-testid="checkpoints-card">
      <p className="flex items-center gap-2 text-sm font-bold text-slate-900"><Brain className="h-4 w-4 text-indigo-600" aria-hidden />Comprehension checkpoints</p>
      {!s.totalCheckpoints || s.averageScore === null || !s.band
        ? <p className="mt-2 text-sm text-slate-600">In the reader, a quick check of four questions comes at the end of a chapter (or every 1,000 words or 10 minutes, as you choose in the reader's settings, under Aids). You can start one any time from the reading assistant. Your scores show here.</p>
        : (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-3xl font-extrabold tabular-nums text-slate-900">{s.averageScore}%</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${BANDS[s.band].className}`}>{BANDS[s.band].label}</span>
            <span className="text-sm text-slate-600">{s.totalCheckpoints} checkpoint{s.totalCheckpoints === 1 ? '' : 's'}{s.lastFive !== null ? ` · last five ${s.lastFive}%` : ''}{s.trend === 'up' ? ' · improving' : s.trend === 'down' ? ' · lower lately: try reading a little slower' : ''}</span>
          </div>
        )}
    </div>
  );
}

/**
 * Reading behaviour and performance (master build plan M5, specification AN-001/002): peak hour and day,
 * consistency over four weeks, and current, average and best words a minute while reading.
 */
function ReadingBehaviour({ stats }: { stats: ReadingStats }) {
  const now = new Date();
  const activity = stats.activity ?? [];
  const cells = aggregateHeatmapData(activity, now.getTimezoneOffset());
  const hour = peakHour(cells), day = peakDay(cells);
  const consistency = consistencyScore(dailyActivity(activity, now.getTimezoneOffset(), now));
  const sp = stats.speed;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-6" data-testid="reading-behaviour">
      <Tile icon={Clock} label="Peak hour" value={hour === null ? '–' : hourLabel(hour)} note={hour === null ? 'read a little to see it' : 'when you read most'} />
      <Tile icon={CalendarDays} label="Peak day" value={day === null ? '–' : WEEKDAY_NAMES[day]!} note="over the last 12 weeks" />
      <Tile icon={Activity} label="Consistency" value={`${consistency}`} note={`${consistencyLabel(consistency)} · out of 100, last 4 weeks`} />
      <Tile icon={Gauge} label="Current speed" value={sp?.current ? `${sp.current}` : '–'} note="words a minute, last 5 sessions" />
      <Tile icon={TrendingUp} label="Average speed" value={sp?.average ? `${sp.average}` : '–'} note="words a minute, all reading" />
      <Tile icon={Flame} label="Best speed" value={sp?.best ? `${sp.best}` : '–'} note="one session of 3+ minutes" />
    </div>
  );
}

function Progress({ speed, fam }: { speed: ReturnType<typeof useSpeedTests>; fam: ReturnType<typeof useFamily> }) {
  const { account } = useAccount();
  const api = useEbookApi();
  const [stats, setStats] = useState<ReadingStats | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!account) return;
    api.readingStats().then(setStats).catch((e) => setError(e instanceof Error ? e.message : 'Your reading could not be loaded.'));
  }, [account?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-4">
      <NextStepCard fam={fam} tests={speed.tests} todayMinutes={stats?.todayMinutes ?? 0} streak={stats?.streakDays ?? 0} />
      {!account ? (
        <div className="flex flex-col gap-3 rounded-2xl bg-indigo-50 p-5 ring-1 ring-indigo-100 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-indigo-950">Sign in to see your reading time, streak, books finished and words per minute here, on every device. Your speed checks on this device stay below.</p>
          <a href={SIGN_IN} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-500">Sign in</a>
        </div>
      ) : error ? <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>
        : !stats ? <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />Loading your reading…</p>
          : (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="progress-tiles">
                <Tile icon={Timer} label="Time reading" value={stats.totalMinutes >= 120 ? `${Math.round(stats.totalMinutes / 60)} h` : `${stats.totalMinutes} min`} note={`${stats.todayMinutes ?? 0} min today`} />
                <Tile icon={Flame} label="Streak" value={`${stats.streakDays} day${stats.streakDays === 1 ? '' : 's'}`} note={stats.bestStreakDays ? `best ${stats.bestStreakDays} days` : 'read today to start one'} />
                <Tile icon={Library} label="Books" value={`${stats.booksFinished} finished`} note={`${stats.booksStarted} started`} />
                <Tile icon={Gauge} label="While reading" value={stats.wordsPerMinute ? `${stats.wordsPerMinute}` : '–'} note={stats.wordsPerMinute ? 'words a minute in the reader' : 'shows after a few minutes of reading'} />
              </div>
              <ReadingBehaviour stats={stats} />
              <div className="grid gap-3 lg:grid-cols-2">
                <ReadingHeatmap activity={stats.activity ?? []} />
                <DaysChart days={stats.last30} />
              </div>
              <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"><p className="mb-3 text-sm font-bold text-slate-900">Daily goal and achievements</p><ReaderAchievements api={api} /></div>
              <CheckpointsCard />
              <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200" data-testid="flashcards-card">
                <p className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900"><Layers className="h-4 w-4 text-indigo-600" aria-hidden />Flashcard review</p>
                <FlashcardReview api={api} />
              </div>
              <GoalsPanel stats={stats} />
            </>
          )}
      <h3 className="pt-2 text-sm font-bold text-slate-900">Reading speed</h3>
      <SpeedSummary tests={speed.tests} />
    </div>
  );
}

/**
 * Reading Intelligence (owner request 2026-11-25): one page for the reading tools in BooksAtlas, with a working
 * Fast Read demo and speed check, and the reader's own progress.
 */
export default function ReadingIntelligencePage() {
  useEffect(() => {
    const title = document.title;
    document.title = 'Reading Intelligence: read faster, understand more | BooksAtlas';
    const id = window.location.hash.slice(1);
    if (id) requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }));
    return () => { document.title = title; };
  }, []);
  const speed = useSpeedTests();
  const fam = useFamily();
  const [boldDemo, setBoldDemo] = useState(true);
  const demoParas = useMemo(() => SAMPLE_PARAS, []);

  return (
    <Tooltip.Provider>
    <main className="min-h-[100dvh] bg-slate-50">
      <header className="relative overflow-hidden bg-[radial-gradient(ellipse_60%_120%_at_85%_0%,rgba(250,204,21,0.18),transparent),linear-gradient(to_bottom,#232272,#1c1b5a)] px-4 pb-10 pt-6 text-white sm:px-6">
        <div className="mx-auto max-w-6xl">
          <Link href="/" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-indigo-100 hover:text-white"><ArrowLeft className="h-4 w-4" aria-hidden />Back to BooksAtlas</Link>
          <p className="mt-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-300"><Sparkles className="h-4 w-4" aria-hidden />Reading Intelligence</p>
          <h1 className="mt-2 max-w-3xl font-serif text-3xl font-bold sm:text-5xl">Read faster, understand more, and listen to every book</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-indigo-100 sm:text-base">Tools built into the BooksAtlas reader that grow with you: Fast Read and a speed check, listening with every word lit up, an AI coach for each chapter, reading aids for dyslexia, attention and low vision, and a record of your progress. Free with every book you read here.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#fast-read" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-bold text-slate-950 hover:bg-amber-300"><Zap className="h-4 w-4" aria-hidden />Try Fast Read now</a>
            <a href={STORE} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/10 px-5 text-sm font-bold text-white ring-1 ring-white/25 hover:bg-white/20"><BookOpen className="h-4 w-4" aria-hidden />Open a book</a>
            <WhoIsReading family={fam.family} accountName={fam.accountName} dark />
          </div>
        </div>
      </header>

      <nav aria-label="On this page" className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2 sm:px-6">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900"><s.icon className="h-3.5 w-3.5" aria-hidden />{s.label}</a>
          ))}
        </div>
      </nav>

      <div className="mx-auto max-w-6xl divide-y divide-slate-200 px-4 sm:px-6">
        <Section id="fast-read" icon={Zap} eyebrow="Fast Read" title="One word at a time, at the speed you choose"
          intro="Your eyes stay in one place while the words come to them, so there is no time lost moving along the line. Start slow, then raise the speed a little each day. In any book, open Fast Read from the lightning button in the reader and it starts where you are.">
          <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
            <FastReadPlayer paragraphs={demoParas} />
            <div className="space-y-3">
              <Feature icon={Zap} title="One word">Each word appears on the same spot, with the letter your eye should rest on marked in red. Pauses are longer after a full stop or a long word.</Feature>
              <Feature icon={Rows3} title="Word groups">Groups of 2 to 8 words, ending at a full stop, so you take in a phrase at a glance.</Feature>
              <Feature icon={Gauge} title="100 to 1,500 words a minute">Change the speed while you read: the arrow keys jump 25 words and change the speed, and space pauses. The speed coach suggests a speed from your sessions and quiz scores.</Feature>
            </div>
          </div>
          <div className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-sm font-bold text-slate-900"><Bold className="h-4 w-4 text-indigo-600" aria-hidden />Bold word starts</p>
              <Toggle.Root pressed={boldDemo} onPressedChange={setBoldDemo} aria-label="Bold word starts" className="min-h-10 rounded-full bg-slate-100 px-4 text-xs font-bold text-slate-700 hover:bg-slate-200 data-[state=on]:bg-indigo-600 data-[state=on]:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer">{boldDemo ? 'Bold starts on' : 'Bold starts off'}</Toggle.Root>
            </div>
            <p className="mt-3 font-serif-book text-[17px] leading-relaxed text-slate-800">{boldDemo ? <BoldStarts text={SAMPLE_PARAS[1]!} /> : SAMPLE_PARAS[1]}</p>
            <p className="mt-2 text-[11px] text-slate-500">The start of each word in bold leads the eye along the line. Turn it on in the reader under Aa → Aids.</p>
          </div>
        </Section>

        <Section id="speed-check" icon={Gauge} eyebrow="Speed check" title="How fast do you read today?"
          intro="Read a short passage at your usual pace and press Done. Your words per minute are kept, so you can see yourself improve. Most adults read 200 to 300 words a minute; what matters is that you still understand what you read.">
          <div className="grid gap-6 lg:grid-cols-2">
            <SpeedCheck text={SAMPLE_PASSAGE} source="sample" onResult={speed.add} />
            <SpeedSummary tests={speed.tests} />
          </div>
        </Section>

        <Section id="own-text" icon={FileText} eyebrow="Your own text" title="Fast Read anything you need to read"
          intro="Paste an article, a report or your notes, or open an EPUB, Word, PDF or web page. Then Fast Read it, read it with bold word starts, or check your speed on it. It stays on your device: nothing is uploaded.">
          <OwnText />
        </Section>

        <Section id="listen" icon={Headphones} eyebrow="Read and listen" title="Read, listen, or both at once"
          intro="Every book you can read on BooksAtlas can also be read aloud, on any phone, tablet or computer. Switch between reading and listening and keep your place.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Feature icon={AudioLines} title="Words light up">While your device’s voice reads, the sentence and the word being spoken are marked on the page, so you can follow along.</Feature>
            <Feature icon={Headphones} title="Natural-voice audiobooks">Books with a narrated edition play in a natural studio voice, with each word lighting up as it is spoken, from the lock screen too.</Feature>
            <Feature icon={Gauge} title="Half speed to 3×">Slow down for a hard passage or speed up for a familiar one. The pace you choose is kept.</Feature>
            <Feature icon={Languages} title="In your own language">Listen in 40 languages: the book is translated paragraph by paragraph as it is read.</Feature>
            <Feature icon={Type} title="Choose the voice">Pick any voice your device has, grouped by language and country, and hear a sample first.</Feature>
            <Feature icon={BookOpen} title="Pick up where you stopped">Reading and listening share one place in the book, on all your devices.</Feature>
          </div>
        </Section>

        <Section id="coach" icon={Brain} eyebrow="AI coach" title="Understand and remember what you read"
          intro="Speed means little if the meaning is lost. The AI coach works from the text of the book you are reading, points to the page it used, and never makes up what the book does not say.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Feature icon={MessageSquareText} title="Ask the book">Ask anything about the book and get an answer with links to the passages it came from.</Feature>
            <Feature icon={Timer} title="Summaries in three lengths">A one-minute summary, a five-minute summary, or a complete one for each chapter.</Feature>
            <Feature icon={GraduationCap} title="Explained for you">Select a passage and have it explained for a child, a student or a professional.</Feature>
            <Feature icon={Brain} title="Quizzes and flashcards">Test yourself on a chapter, or learn its key ideas with cards that flip.</Feature>
            <Feature icon={Languages} title="Define and translate">Tap a word for its meaning and pronunciation, or translate a passage into another language.</Feature>
            <Feature icon={Sparkles} title="Key concepts">The names, ideas and terms that matter in each chapter, in a sentence or two.</Feature>
          </div>
          <p className="mt-3 text-[11px] text-slate-500">Open the coach with the cap icon in the reader. Signed-in readers get a number of free AI requests every day.</p>
        </Section>

        <Section id="aids" icon={Accessibility} eyebrow="Reading aids" title="Reading made easier for every reader"
          intro="Small changes can make a big difference for readers with dyslexia, attention difficulties or low vision. Find them in the reader under Aa → Aids, and keep what helps.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Feature icon={Type} title="Dyslexia-friendly font">Wide letters with extra space between letters and words.</Feature>
            <Feature icon={Type} title="Clear letters">A font whose letters are shaped to be told apart easily, for low vision.</Feature>
            <Feature icon={Bold} title="Bold word starts">The first letters of each word in bold, so the eye finds words faster.</Feature>
            <Feature icon={Focus} title="Focus modes and zen">Line, paragraph or spotlight focus keeps attention on what you are reading; zen hides everything but the text.</Feature>
            <Feature icon={Layers} title="Flashcards that come back">Save flashcards from a chapter or a passage; grade each one Again, Hard, Good or Easy and it returns after 1, 3, 7 or 14 days.</Feature>
            <Feature icon={Brain} title="Comprehension checkpoints">Four quick questions at the end of a chapter, every 1,000 words or every 10 minutes, scored from excellent to needs improvement; the score tunes your speed coach.</Feature>
            <Feature icon={Rows3} title="Reading guide">A clear band follows your finger or mouse and shades the lines above and below.</Feature>
            <Feature icon={Accessibility} title="Large text and strong contrast">Text up to 34 pixels, night and black themes, your own colours and brightness.</Feature>
          </div>
        </Section>

        <Section id="progress" icon={TrendingUp} eyebrow="My progress" title="Your reading, day by day"
          intro="Time spent reading, your streak and daily goal, the books you finished, how fast you read and when you like to read. Ask for a weekly summary or a streak reminder by e-mail if you like. Only you can see it.">
          <Progress speed={speed} fam={fam} />
        </Section>

        <Section id="family" icon={Users} eyebrow="Family reading" title="One account, every reader in the family"
          intro="Add up to six readers. Choose who is reading on each phone or tablet, and their reading time, quiz scores and stars count for them. Set a weekly goal you reach together.">
          <FamilyPanel fam={fam} />
        </Section>

        <Section id="young" icon={Baby} eyebrow="Young readers" title="Stories, letter sounds and word games"
          intro="From first words to confident reading: picture words and little picture books for the youngest, then stories that read themselves aloud in a natural voice with every word lit up, questions after each story, letter sounds and word games in three levels, in English, French, Spanish, Portuguese and Dutch, each with its own natural voice. Free, with no account needed.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Feature icon={Baby} title="First words (0–4)">Animals, colours, food, family, nature, vehicles and shapes to tap and hear, picture books and a Find it game.</Feature>
            <Feature icon={BookOpen} title="99 stories read aloud">33 at every level: everyday, bedtime, maths and science stories. Tap Read to me and follow the words; tap any word to hear it again.</Feature>
            <Feature icon={Type} title="Letter sounds">Every letter, and the letters that work together, with a word and a picture.</Feature>
            <Feature icon={Star} title="Word games">Find the picture, build the word and spell it, and collect stars.</Feature>
          </div>
          <a href={`${BASE}reading-intelligence/young-readers`} data-testid="open-young-readers" className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-amber-400 px-5 text-base font-bold text-slate-950 hover:bg-amber-300"><Baby className="h-5 w-5" aria-hidden />Open Young readers</a>
        </Section>

        <Section id="schools" icon={School} eyebrow="Schools and teams" title="Read together as a class or a team"
          intro="Teachers and team leads make a class, share its invite code, choose the books and set due dates and quizzes. Members see what to read and by when; the teacher sees how far each member is in every book, their quiz scores and how long they read this week.">
          <SchoolsSection />
        </Section>
      </div>
    </main>
    </Tooltip.Provider>
  );
}
