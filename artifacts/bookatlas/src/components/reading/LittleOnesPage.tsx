import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import * as Dialog from '@radix-ui/react-dialog';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { ArrowLeft, ArrowRight, Baby, BookHeart, Check, ExternalLink, Eye, HeartHandshake, Info, Lightbulb, MessageCircleHeart, Music, Sparkles, Square, Volume2, X } from 'lucide-react';
import { SelectBox } from '../ui/select-box';
import { useActiveReader } from './family';
import { useSpeaker } from './useSpeaker';
import {
  CONTRAST_PATTERNS, LITTLE_EN, activityLink, activityMinutes, emptyLittle, fill, lastWeek, loadLittle, monthsOld, readLittle, toggleDone,
  type Activity, type ContrastPattern, type LittleContent, type LittleProgress, type Rhyme, type StageId,
} from './littleOnes';
import { ENGLISH, YOUNG_LANGS, YoungContext, loadYoung, startLang, type YoungContent, type YoungLangId } from './youngLang';

/** The program in the chosen language (owner request 2026-11-26). */
const LittleContext = createContext<LittleContent>(LITTLE_EN);
const useLittleContent = () => useContext(LittleContext);

const BASE = import.meta.env.BASE_URL;

/** This child's plan and ticks, on this device, for the family profile that is reading. */
function useLittle() {
  const reader = useActiveReader();
  const key = `bookatlas:little-ones:${reader.id}`;
  const read = () => { try { return readLittle(JSON.parse(localStorage.getItem(key) || 'null')); } catch { return emptyLittle(); } };
  const [p, setP] = useState<LittleProgress>(read);
  useEffect(() => { setP(read()); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = (next: LittleProgress) => { setP(next); try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* this device */ } };
  return { p, save, reader };
}

// ------------------------------------------------------------------------------------------- contrast cards

/** A high-contrast card drawn as SVG: black and white, with red from about 3 months. It never moves or flashes. */
export function ContrastCard({ pattern, colour, className = '' }: { pattern: ContrastPattern; colour: boolean; className?: string }) {
  const names = useLittleContent().patterns;
  const k = '#0a0a0a', w = '#ffffff', r = colour ? '#dc2626' : '#0a0a0a';
  const shape = (() => {
    switch (pattern) {
      case 'bullseye': return [48, 38, 28, 18, 8].map((rad, i) => <circle key={rad} cx="50" cy="50" r={rad} fill={i === 4 ? r : i % 2 ? w : k} />);
      case 'stripes': return [10, 30, 50, 70].map((x) => <rect key={x} x={x} y="4" width="10" height="92" fill={x === 50 ? r : k} />);
      case 'checker': return Array.from({ length: 16 }, (_, i) => ((Math.floor(i / 4) + i) % 2 ? null : <rect key={i} x={4 + (i % 4) * 23} y={4 + Math.floor(i / 4) * 23} width="23" height="23" fill={i === 5 ? r : k} />));
      case 'face': return <><circle cx="50" cy="50" r="42" fill="none" stroke={k} strokeWidth="7" /><circle cx="35" cy="40" r="7" fill={k} /><circle cx="65" cy="40" r="7" fill={k} /><path d="M30 60 Q50 80 70 60" fill="none" stroke={r} strokeWidth="7" strokeLinecap="round" /></>;
      case 'zigzag': return [25, 50, 75].map((y, i) => <polyline key={y} points={`6,${y + 8} 20,${y - 8} 34,${y + 8} 48,${y - 8} 62,${y + 8} 76,${y - 8} 90,${y + 8}`} fill="none" stroke={i === 1 ? r : k} strokeWidth="7" strokeLinejoin="round" />);
      case 'dots': return Array.from({ length: 9 }, (_, i) => <circle key={i} cx={20 + (i % 3) * 30} cy={20 + Math.floor(i / 3) * 30} r="10" fill={i === 4 ? r : k} />);
      case 'triangle': return <><polygon points="50,8 94,88 6,88" fill={k} /><polygon points="50,40 72,80 28,80" fill={colour ? r : w} /></>;
      case 'star': return <polygon points="50,5 61,38 96,38 68,59 79,93 50,72 21,93 32,59 4,38 39,38" fill={r} stroke={k} strokeWidth={colour ? 3 : 0} />;
      case 'diamond': return [44, 30, 16].map((s, i) => <polygon key={s} points={`50,${50 - s} ${50 + s},50 50,${50 + s} ${50 - s},50`} fill={i === 1 ? w : i === 2 ? r : k} />);
      case 'cross': return <><rect x="38" y="6" width="24" height="88" fill={k} /><rect x="6" y="38" width="88" height="24" fill={k} /><rect x="38" y="38" width="24" height="24" fill={r} /></>;
      case 'circle': return <><circle cx="50" cy="50" r="40" fill={k} /><circle cx="50" cy="50" r="12" fill={colour ? r : w} /></>;
      case 'grid': return <>{[20, 40, 60, 80].map((x) => <rect key={`v${x}`} x={x - 3} y="6" width="6" height="88" fill={k} />)}{[20, 40, 60, 80].map((y) => <rect key={`h${y}`} x="6" y={y - 3} width="88" height="6" fill={y === 40 ? r : k} />)}</>;
    }
  })();
  return <svg viewBox="0 0 100 100" className={className} role="img" aria-label={names[pattern]}><rect width="100" height="100" fill={w} />{shape}</svg>;
}

function ContrastViewer({ colour, onClose }: { colour: boolean; onClose: () => void }) {
  const { ui, patterns } = useLittleContent();
  const [i, setI] = useState(0);
  const pattern = CONTRAST_PATTERNS[i]!;
  const go = (d: number) => setI((x) => (x + d + CONTRAST_PATTERNS.length) % CONTRAST_PATTERNS.length);
  return (
    <Dialog.Root open onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-white" />
        <Dialog.Content className="fixed inset-0 z-[81] flex flex-col bg-white outline-none" data-testid="contrast-viewer"
          onKeyDown={(e) => { if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); go(1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); } }}>
          <div className="flex items-center justify-between px-4 py-3">
            <Dialog.Title className="text-sm font-bold text-slate-900">{patterns[pattern]} · {fill(ui.cardOf, { n: i + 1, total: CONTRAST_PATTERNS.length })}</Dialog.Title>
            <Dialog.Close className="grid h-11 w-11 place-items-center rounded-full text-slate-700 hover:bg-slate-100 cursor-pointer" aria-label={ui.close}><X className="h-5 w-5" /></Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">{ui.holdHint}</Dialog.Description>
          <button type="button" onClick={() => go(1)} className="flex flex-1 items-center justify-center p-4 cursor-pointer" aria-label={ui.nextCard} data-testid="contrast-card">
            <ContrastCard pattern={pattern} colour={colour} className="h-full max-h-[70dvh] w-full max-w-[70dvh]" />
          </button>
          <div className="flex items-center justify-between gap-3 px-4 pb-6 text-sm text-slate-600">
            <button type="button" onClick={() => go(-1)} className="grid h-12 w-12 place-items-center rounded-full ring-1 ring-slate-200 cursor-pointer" aria-label={ui.previousCard}><ArrowLeft className="h-5 w-5" /></button>
            <p className="text-center text-xs">{ui.holdHint}</p>
            <button type="button" onClick={() => go(1)} className="grid h-12 w-12 place-items-center rounded-full ring-1 ring-slate-200 cursor-pointer" aria-label={ui.nextCard}><ArrowRight className="h-5 w-5" /></button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ------------------------------------------------------------------------------------------- rhymes

function RhymePlayer({ rhyme, onClose }: { rhyme: Rhyme; onClose: () => void }) {
  const { ui } = useLittleContent();
  const speaker = useSpeaker();
  const [at, setAt] = useState<number | null>(null);
  const play = () => {
    if (at !== null) { speaker.stop(); setAt(null); return; }
    setAt(0);
    speaker.say(rhyme.lines.map((l) => l.text), { rate: rhyme.kind === 'lullaby' ? 0.8 : 0.9, onPart: (p) => setAt(p), onEnd: () => setAt(null) });
  };
  return (
    <Dialog.Root open onOpenChange={(o) => { if (!o) { speaker.stop(); onClose(); } }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-slate-950/50" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-[81] mx-auto max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-[#fffaf0] p-6 shadow-2xl outline-none sm:inset-y-0 sm:my-auto sm:h-fit sm:rounded-3xl" data-testid="rhyme-player">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600">{rhyme.kind === 'lullaby' ? ui.lullaby : ui.rhymeActions}</p>
              <Dialog.Title className="font-serif text-2xl font-bold text-slate-900">{rhyme.title}</Dialog.Title>
            </div>
            <Dialog.Close className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-600 hover:bg-white cursor-pointer" aria-label={ui.close}><X className="h-5 w-5" /></Dialog.Close>
          </div>
          <Dialog.Description className="mt-1 text-sm text-slate-600">{ui.sayIt}</Dialog.Description>
          <ol className="mt-5 space-y-3">
            {rhyme.lines.map((l, i) => (
              <li key={i} className={`rounded-2xl px-3 py-2 transition-colors motion-reduce:transition-none ${at === i ? 'bg-amber-100' : ''}`}>
                <p className="font-reader-clear text-xl font-bold leading-snug text-slate-900">{l.text}</p>
                {l.action && <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-600"><HeartHandshake className="h-3.5 w-3.5 shrink-0 text-rose-500" aria-hidden />{l.action}</p>}
              </li>
            ))}
          </ol>
          {speaker.supported && (
            <button type="button" onClick={play} data-testid="rhyme-play" className={`mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl text-base font-bold cursor-pointer ${at !== null ? 'bg-slate-900 text-white' : 'bg-amber-400 text-slate-950 hover:bg-amber-300'}`}>
              {at !== null ? <><Square className="h-5 w-5" aria-hidden />{ui.stop}</> : <><Volume2 className="h-5 w-5" aria-hidden />{ui.hearOnce}</>}
            </button>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ------------------------------------------------------------------------------------------- the page

const KIND_ICON: Record<Activity['kind'], React.ComponentType<{ className?: string }>> = {
  contrast: Eye, rhyme: Music, words: Sparkles, book: BookHeart, find: Sparkles, stories: BookHeart, sounds: Sparkles, talk: MessageCircleHeart,
};

/**
 * Little ones (owner request 2026-11-26): a reading program for babies and toddlers from birth to 3 years. The
 * stage follows the child's age (from the birth month) or the grown-up's choice; each stage has a short daily
 * plan, why it matters, tips and what you may notice. Free, no account needed; kept on this device per profile.
 */
export default function LittleOnesPage() {
  const { p, save, reader } = useLittle();
  // The language, shared with Young readers (owner request 2026-11-26).
  const [langId, setLangId] = useState<YoungLangId>(() => { let saved: string | null = null; try { saved = localStorage.getItem('bookatlas:young-lang'); } catch { /* this device */ } return startLang(saved, typeof navigator === 'undefined' ? undefined : navigator.language); });
  const [content, setContent] = useState<LittleContent>(LITTLE_EN);
  const [young, setYoung] = useState<YoungContent>(ENGLISH);
  useEffect(() => {
    let live = true;
    try { localStorage.setItem('bookatlas:young-lang', langId); } catch { /* this device */ }
    void Promise.all([loadLittle(langId), loadYoung(langId)]).then(([c, y]) => { if (live) { setContent(c); setYoung(y); } });
    return () => { live = false; };
  }, [langId]);
  const { ui, stages } = content;
  const now = new Date();
  const months = monthsOld(p.birth, now);
  const byAge = months !== null ? stages.find((s) => months >= s.from && months < s.to) ?? null : null;
  const stage = stages.find((s) => s.id === p.stage) ?? byAge ?? stages[0]!;
  const monthNames = useMemo(() => Array.from({ length: 12 }, (_, i) => new Date(2026, i, 15).toLocaleDateString(langId, { month: 'long' })), [langId]);
  const [open, setOpen] = useState<Activity | null>(null);
  const today = p.done[`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`] ?? [];
  const week = lastWeek(p, now);
  const years = useMemo(() => Array.from({ length: 5 }, (_, i) => now.getFullYear() - i), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [by, bm] = p.birth ? p.birth.split('-') : ['', ''];
  const setBirth = (y: string, m: string) => save({ ...p, birth: y && m ? `${y}-${m}` : null, stage: null });
  useEffect(() => { document.title = 'Little ones: reading from birth to 3 · BooksAtlas'; }, []);
  return (
    <LittleContext.Provider value={content}>
    <YoungContext.Provider value={young}>
    <main className="min-h-[100dvh] bg-[#fffaf0]" lang={langId}>
      <header className="bg-[radial-gradient(ellipse_70%_120%_at_90%_0%,rgba(251,113,133,0.35),transparent),linear-gradient(to_bottom,#9f1239,#831843)] px-4 pb-8 pt-6 text-white sm:px-6">
        <div className="mx-auto max-w-5xl">
          <Link href="/reading-intelligence" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-rose-100 hover:text-white"><ArrowLeft className="h-4 w-4" aria-hidden />Reading Intelligence</Link>
          <h1 className="mt-3 flex items-center gap-3 font-serif text-4xl font-bold sm:text-5xl"><Baby className="h-10 w-10" aria-hidden />Little ones</h1>
          <p className="mt-2 max-w-2xl text-rose-100">{ui.intro}</p>
          <div className="mt-5 flex flex-wrap items-end gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/20" data-testid="little-age">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-rose-100">{ui.language}</p>
              <SelectBox value={langId} onChange={(e) => setLangId(e.target.value as YoungLangId)} aria-label={ui.language} data-testid="little-lang" className="mt-1 rounded-xl bg-white px-3 py-2 text-sm text-slate-900">
                {YOUNG_LANGS.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </SelectBox>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-rose-100">{reader.name ? fill(ui.birthOf, { name: reader.name }) : ui.birthYours}</p>
              <div className="mt-1 flex gap-2">
                <SelectBox value={bm} onChange={(e) => setBirth(by || String(now.getFullYear()), e.target.value)} aria-label={ui.month} data-testid="birth-month" className="rounded-xl bg-white px-3 py-2 text-sm text-slate-900">
                  <option value="">{ui.month}</option>
                  {monthNames.map((m, i) => <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
                </SelectBox>
                <SelectBox value={by} onChange={(e) => setBirth(e.target.value, bm || '01')} aria-label={ui.year} data-testid="birth-year" className="rounded-xl bg-white px-3 py-2 text-sm text-slate-900">
                  <option value="">{ui.year}</option>
                  {years.map((y) => <option key={y} value={String(y)}>{y}</option>)}
                </SelectBox>
              </div>
            </div>
            <p className="pb-2 text-sm text-rose-50" aria-live="polite">
              {months === null ? ui.orPick : months > 36 ? ui.overThree : `${months === 1 ? ui.monthOld : fill(ui.monthsOld, { n: months })} · ${byAge?.ages ?? ''}`}
            </p>
            {months !== null && months > 36 && <a href={`${BASE}reading-intelligence/young-readers`} className="mb-1 inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-amber-400 px-4 text-sm font-bold text-slate-950">{ui.openYoung}</a>}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <ToggleGroup.Root type="single" value={stage.id} onValueChange={(v) => v && save({ ...p, stage: v as StageId })} aria-label={ui.stageLabel} className="flex flex-wrap gap-2" data-testid="little-stages">
          {stages.map((s) => (
            <ToggleGroup.Item key={s.id} value={s.id} className="min-h-11 rounded-full bg-white px-4 text-sm font-bold text-slate-700 ring-1 ring-slate-200 data-[state=on]:bg-rose-700 data-[state=on]:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 cursor-pointer">
              {s.ages}{byAge?.id === s.id ? ` · ${ui.now}` : ''}
            </ToggleGroup.Item>
          ))}
        </ToggleGroup.Root>

        <section className="rounded-3xl bg-white p-6 ring-1 ring-slate-200" aria-labelledby="stage-title">
          <p className="text-xs font-bold uppercase tracking-wider text-rose-700">{stage.ages}</p>
          <h2 id="stage-title" className="font-serif text-3xl font-bold text-slate-900">{stage.name}</h2>
          <p className="mt-1 text-lg font-semibold text-slate-800">{stage.headline}</p>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">{stage.why}</p>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="text-sm text-slate-700"><span className="font-bold">{ui.today}</span> {stage.minutes} ({fill(ui.inAll, { n: activityMinutes(stage) })}).</p>
            <div className="flex items-center gap-1.5" aria-label={ui.weekLabel} data-testid="little-week">
              {week.map((d) => <span key={d.day} title={d.day} className={`grid h-7 w-7 place-items-center rounded-full text-[10px] font-bold ${d.done ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{d.done ? <Check className="h-3.5 w-3.5" aria-label="read" /> : d.weekday}</span>)}
            </div>
          </div>
        </section>

        <section aria-label={stage.name} className="grid gap-3 sm:grid-cols-2" data-testid="little-plan">
          {stage.activities.map((a) => {
            const Icon = KIND_ICON[a.kind];
            const done = today.includes(a.id);
            const link = activityLink(a);
            return (
              <article key={a.id} className={`flex flex-col rounded-3xl bg-white p-5 ring-1 ${done ? 'ring-emerald-300' : 'ring-slate-200'}`} data-testid={`little-${a.id}`}>
                <div className="flex items-start gap-3">
                  {a.kind === 'contrast'
                    ? <ContrastCard pattern="bullseye" colour={a.colour} className="h-14 w-14 shrink-0 rounded-xl ring-1 ring-slate-200" />
                    : <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-700"><Icon className="h-6 w-6" aria-hidden /></span>}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold text-slate-900">{a.title}</h3>
                    <p className="text-xs text-slate-500">{a.minutes} {ui.min}{a.kind === 'talk' ? ` · ${ui.noScreen}` : ''}</p>
                  </div>
                </div>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-700">{a.how}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(a.kind === 'contrast' || a.kind === 'rhyme') && (
                    <button type="button" onClick={() => setOpen(a)} data-testid={`start-${a.id}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-rose-700 px-4 text-sm font-bold text-white hover:bg-rose-600 cursor-pointer">{a.kind === 'contrast' ? ui.showCards : ui.openRhyme}</button>
                  )}
                  {link && <a href={`${BASE}${link}`} data-testid={`open-${a.id}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-rose-700 px-4 text-sm font-bold text-white hover:bg-rose-600">{ui.open}<ExternalLink className="h-4 w-4" aria-hidden /></a>}
                  <button type="button" aria-pressed={done} onClick={() => save(toggleDone(p, a.id))} data-testid={`done-${a.id}`}
                    className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl px-4 text-sm font-bold ring-1 cursor-pointer ${done ? 'bg-emerald-50 text-emerald-800 ring-emerald-300' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'}`}>
                    <Check className="h-4 w-4" aria-hidden />{done ? ui.doneToday : ui.weDid}
                  </button>
                </div>
              </article>
            );
          })}
        </section>

        <div className="grid gap-3 lg:grid-cols-2">
          <section className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900"><Lightbulb className="h-5 w-5 text-amber-500" aria-hidden />{ui.tips}</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-700">{stage.tips.map((t) => <li key={t}>{t}</li>)}</ul>
          </section>
          <section className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900"><Eye className="h-5 w-5 text-rose-600" aria-hidden />{ui.notice}</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-700">{stage.notice.map((t) => <li key={t}>{t}</li>)}</ul>
            <p className="mt-3 flex gap-1.5 text-xs text-slate-500"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />{ui.noticeNote}</p>
          </section>
        </div>

        <section className="rounded-3xl bg-rose-50 p-5 text-sm text-rose-950 ring-1 ring-rose-100">
          <h2 className="font-bold">{ui.screens}</h2>
          <p className="mt-1 leading-relaxed">{ui.screensText}</p>
        </section>
      </div>

      {open?.kind === 'contrast' && <ContrastViewer colour={open.colour} onClose={() => setOpen(null)} />}
      {open?.kind === 'rhyme' && <RhymePlayer rhyme={content.rhymes.find((r) => r.id === open.rhyme)!} onClose={() => setOpen(null)} />}
    </main>
    </YoungContext.Provider>
    </LittleContext.Provider>
  );
}
