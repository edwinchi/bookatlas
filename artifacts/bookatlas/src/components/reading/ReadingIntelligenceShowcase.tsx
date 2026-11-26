import React from 'react';
import {
  Accessibility, ArrowRight, Baby, BookOpen, Brain, Check, FileText, Gauge, Headphones, School, Sparkles, Star, TrendingUp, Type, Users, Zap,
} from 'lucide-react';

const BASE = import.meta.env.BASE_URL;
const ri = (id: string) => `${BASE}reading-intelligence#${id}`;

/** The ten Read smarter tools, each with a reason to try it now. */
const TOOLS: { id: string; icon: React.ComponentType<{ className?: string }>; title: string; pitch: string; cta: string }[] = [
  { id: 'fast-read', icon: Zap, title: 'Fast Read', pitch: 'One word or a few at a time, at the speed you choose. Most readers go noticeably faster in their first session.', cta: 'Try Fast Read' },
  { id: 'speed-check', icon: Gauge, title: 'Speed check', pitch: 'Find out how many words a minute you read in about a minute, then watch the number climb.', cta: 'Check my speed' },
  { id: 'listen', icon: Headphones, title: 'Read and listen', pitch: 'A natural voice reads to you while every word lights up. Switch between reading and listening any time.', cta: 'Start listening' },
  { id: 'coach', icon: Brain, title: 'AI coach', pitch: 'Summaries in one minute, explanations at your level, flashcards, quizzes and a map of each chapter’s ideas.', cta: 'Meet your coach' },
  { id: 'aids', icon: Accessibility, title: 'Reading aids', pitch: 'Fonts and spacing for dyslexia, focus modes for attention, high contrast for low vision. Keep what helps.', cta: 'See the aids' },
  { id: 'own-text', icon: FileText, title: 'Your own text', pitch: 'Paste an article or open a PDF or EPUB, and use every tool on it: Fast Read, listening and the coach.', cta: 'Bring my text' },
  { id: 'progress', icon: TrendingUp, title: 'My progress', pitch: 'Daily goals, streaks, a reading heatmap and your speed over time, so you can see yourself improve.', cta: 'See my progress' },
  { id: 'family', icon: Users, title: 'Family', pitch: 'A profile for everyone at home, from toddlers to grandparents, with a weekly family reading challenge.', cta: 'Set up my family' },
  { id: 'young', icon: Baby, title: 'Young readers', pitch: 'Stories that read themselves aloud, letter sounds and word games in five languages, from birth to age 12.', cta: 'Explore for kids' },
  { id: 'schools', icon: School, title: 'Schools and teams', pitch: 'Reading lists, quizzes and progress reports for a class or a team, with one invite code.', cta: 'Start a class' },
];

const YOUNG: { icon: React.ComponentType<{ className?: string }>; title: string; text: string }[] = [
  { icon: Baby, title: 'First words (0–4)', text: 'Animals, colours, food, family, nature, vehicles and shapes to tap and hear, picture books and a Find it game.' },
  { icon: BookOpen, title: '99 stories read aloud', text: '33 at every level: everyday, bedtime, maths and science. Every word lights up as it is read.' },
  { icon: Type, title: 'Letter sounds', text: 'Every letter, and the letters that work together, each with a word and a picture.' },
  { icon: Star, title: 'Word games', text: 'Find the picture, build the word, spell it, and collect stars along the way.' },
];

/**
 * Read smarter on the home page (owner request 2026-11-26): the Reading Intelligence tools, each linked to its
 * section, and the children's programs, worded to make a visitor want to try them. Everything shown is free.
 */
export function ReadingIntelligenceShowcase({ onOpenBook }: { onOpenBook: () => void }) {
  return (
    <section aria-labelledby="ri-showcase-title" className="overflow-hidden rounded-3xl bg-[radial-gradient(ellipse_60%_80%_at_100%_0%,rgba(251,191,36,0.18),transparent),linear-gradient(135deg,#1e1b4b,#312e81_55%,#3b0764)] text-white shadow-xl" data-testid="ri-showcase">
      <div className="px-5 pb-6 pt-8 sm:px-10 sm:pt-10">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-300 ring-1 ring-white/15">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />Read smarter · free with every book
        </p>
        <h2 id="ri-showcase-title" className="mt-4 max-w-3xl font-serif text-3xl font-bold leading-tight sm:text-5xl">Read faster, understand more, and listen to every book</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-indigo-100 sm:text-base">
          Tools built into the BooksAtlas reader that grow with you: Fast Read and a speed check, listening with every word lit up, an AI coach for each chapter, reading aids for dyslexia, attention and low vision, and a record of your progress. Nothing to install and nothing extra to pay.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={ri('fast-read')} data-testid="ri-try-fast-read" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-200">
            <Zap className="h-4 w-4" aria-hidden />Try Fast Read now
          </a>
          <button type="button" onClick={onOpenBook} data-testid="ri-open-book" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-white/10 px-5 text-sm font-bold text-white ring-1 ring-white/25 transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40 cursor-pointer">
            <BookOpen className="h-4 w-4" aria-hidden />Open a book
          </button>
          <a href={`${BASE}reading-intelligence`} className="inline-flex min-h-12 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-indigo-100 underline-offset-4 hover:text-white hover:underline">See everything it can do<ArrowRight className="h-4 w-4" aria-hidden /></a>
        </div>
        <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-indigo-100" aria-label="Why readers like it">
          {['Free with every book you read here', 'Phone, tablet or computer', 'English, French, Spanish, Portuguese and Dutch'].map((t) => (
            <li key={t} className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-300" aria-hidden />{t}</li>
          ))}
        </ul>
      </div>

      <nav aria-label="Reading Intelligence tools" className="hidden border-y border-white/10 bg-black/15 sm:block">
        <ul className="flex gap-1 overflow-x-auto px-4 py-2 sm:px-8 [scrollbar-width:thin]">
          {TOOLS.map((t) => (
            <li key={t.id} className="shrink-0">
              <a href={ri(t.id)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-indigo-100 hover:bg-white/10 hover:text-white"><t.icon className="h-4 w-4" aria-hidden />{t.title}</a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="grid grid-cols-2 gap-2.5 border-t border-white/10 px-4 py-6 sm:gap-3 sm:border-t-0 sm:px-10 lg:grid-cols-5" data-testid="ri-tools">
        {TOOLS.map((t) => (
          <a key={t.id} href={ri(t.id)} className="group flex flex-col rounded-2xl bg-white/[0.07] p-3 ring-1 sm:p-4 ring-white/10 transition hover:-translate-y-0.5 hover:bg-white/[0.12] hover:ring-amber-300/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-400/15 text-amber-300"><t.icon className="h-5 w-5" aria-hidden /></span>
            <span className="mt-3 text-sm font-bold text-white">{t.title}</span>
            <span className="mt-1 line-clamp-3 flex-1 text-[11px] leading-relaxed text-indigo-100 sm:line-clamp-none sm:text-xs">{t.pitch}</span>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-amber-300">{t.cta}<ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden /></span>
          </a>
        ))}
      </div>

      <div className="mx-5 mb-6 rounded-2xl bg-[#fffaf0] p-5 text-slate-900 sm:mx-10 sm:mb-10 sm:p-6" data-testid="ri-young">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-rose-700"><Baby className="h-4 w-4" aria-hidden />For children · free, no account needed</p>
        <h3 className="mt-2 font-serif text-2xl font-bold sm:text-3xl">Stories, letter sounds and word games</h3>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
          From first words to confident reading: picture words and little picture books for the youngest, then stories that read themselves aloud in a natural voice with every word lit up, questions after each story, letter sounds and word games in three levels, in English, French, Spanish, Portuguese and Dutch.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {YOUNG.map((y) => (
            <div key={y.title} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              <p className="flex items-center gap-2 text-sm font-bold text-slate-900"><y.icon className="h-4 w-4 text-indigo-600" aria-hidden />{y.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{y.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <a href={`${BASE}reading-intelligence/young-readers`} data-testid="ri-young-readers" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-bold text-slate-950 hover:bg-amber-300"><Baby className="h-4 w-4" aria-hidden />Open Young readers</a>
          <a href={`${BASE}reading-intelligence/little-ones`} data-testid="ri-little-ones" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-rose-700 px-5 text-sm font-bold text-white hover:bg-rose-600"><Baby className="h-4 w-4" aria-hidden />Little ones (0–3 years)</a>
        </div>
      </div>
    </section>
  );
}
