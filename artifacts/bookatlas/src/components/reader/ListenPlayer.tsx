import React, { useMemo, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import * as Dialog from '@radix-ui/react-dialog';
import * as Slider from '@radix-ui/react-slider';
import * as Tooltip from '@radix-ui/react-tooltip';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import {
  ChevronDown, Gauge, Languages, Loader2, Maximize2, Minus, Pause, Play, Plus, Rewind, FastForward, SkipBack, SkipForward, Square, Volume2, X, Check,
} from 'lucide-react';
import {
  LISTEN_LANGUAGES, MAX_RATE, MIN_RATE, WORDS_PER_MINUTE, clampRate, groupVoices, pickVoice, voiceName, type ListenPrefs,
} from './listening';

export type PlayerStatus = 'loading' | 'playing' | 'paused';

export interface ListenPlayerProps {
  /** Portals render here, so the pop-ups also show in full-screen reading. */
  container: HTMLElement | null;
  mode: 'natural' | 'device';
  status: PlayerStatus;
  bookTitle: string;
  cover?: string;
  chapterTitle: string;
  voiceLabel: string;
  /** 0..1 through the current part (natural) or chapter (device). */
  progress: number;
  elapsed: string;
  remaining: string;
  onSeek: (fraction: number) => void;
  caption?: { text: string; note: string } | null;
  error?: string;
  prefs: ListenPrefs;
  onPrefs: (p: ListenPrefs) => void;
  onToggle: () => void;
  onStop: () => void;
  onBack: () => void;
  onForward: () => void;
  backLabel: string;
  forwardLabel: string;
  onPrevChapter?: () => void;
  onNextChapter?: () => void;
  /** Device voices, for the voice & language window. */
  voices: SpeechSynthesisVoice[];
  bookLang: string;
  /** Says a sample with this voice (the reader pauses its own listening first). */
  onPreview: (voice: SpeechSynthesisVoice) => void;
  /** The natural narration's voice, when the book has one (it reads in the book's language). */
  naturalVoice?: string | null;
  /** Shown under the controls (the audiobook add-on offer). */
  footer?: React.ReactNode;
}

const iconBtn = 'grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-700 transition-colors hover:bg-slate-100 active:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-35 disabled:pointer-events-none cursor-pointer';

function Tip({ label, children, container }: { label: string; children: React.ReactElement; container: HTMLElement | null }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal container={container ?? undefined}>
        <Tooltip.Content sideOffset={6} className="z-[80] rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white shadow-lg data-[state=delayed-open]:animate-fade-in">
          {label}<Tooltip.Arrow className="fill-slate-900" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/**
 * The listening window (owner request 2026-11-17, after Speechify's floating player): it pops up over the page while
 * the book is read aloud, with play/pause, stop, back and forward, previous and next chapter, speed, and the voice
 * and language. It shrinks to a small round button and keeps playing.
 */
export function ListenPlayer(p: ListenPlayerProps) {
  const [minimized, setMinimized] = useState(false);
  const playing = p.status === 'playing';
  const toggleLabel = p.status === 'paused' ? 'Resume listening' : 'Pause listening';

  if (minimized) {
    return (
      <div className="pointer-events-auto absolute bottom-[calc(4rem+env(safe-area-inset-bottom))] right-3 z-[55] flex items-center gap-1 rounded-full bg-slate-900 p-1.5 text-white shadow-2xl ring-1 ring-white/10 animate-fade-in sm:right-6">
        <button type="button" onClick={p.onToggle} aria-label={toggleLabel}
          className="grid h-11 w-11 place-items-center rounded-full bg-indigo-500 hover:bg-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer">
          {p.status === 'loading' ? <Loader2 className="h-5 w-5 animate-spin" /> : playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 translate-x-px" />}
        </button>
        <span className="hidden px-1 text-[11px] font-bold tabular-nums sm:inline">{p.prefs.rate.toFixed(1)}x</span>
        <button type="button" onClick={() => setMinimized(false)} aria-label="Open the listening window"
          className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer">
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <Tooltip.Provider delayDuration={400}>
      <section role="region" aria-label="Listening controls"
        className="pointer-events-auto absolute inset-x-2 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-[55] rounded-2xl bg-white/95 text-slate-900 shadow-[0_18px_50px_-12px_rgba(15,23,42,0.45)] ring-1 ring-slate-900/10 backdrop-blur-md animate-sheet-up motion-reduce:animate-none sm:inset-x-auto sm:right-6 sm:w-[400px]">
        {/* Title row */}
        <div className="flex items-center gap-3 px-3 pt-3">
          {p.cover
            ? <img src={p.cover} alt="" className="h-12 w-9 shrink-0 rounded-md object-cover shadow-sm ring-1 ring-black/10" />
            : <span className="grid h-12 w-9 shrink-0 place-items-center rounded-md bg-indigo-100 text-indigo-700"><Volume2 className="h-4 w-4" /></span>}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold leading-tight">{p.chapterTitle}</p>
            <p className="truncate text-[11px] text-slate-500">
              {p.bookTitle} · <span className={p.mode === 'natural' ? 'font-semibold text-indigo-700' : ''}>{p.voiceLabel}</span>
            </p>
          </div>
          <Tip label="Shrink the player" container={p.container}>
            <button type="button" onClick={() => setMinimized(true)} aria-label="Shrink the listening window" className={iconBtn}><ChevronDown className="h-5 w-5" /></button>
          </Tip>
          <Tip label="Stop and close" container={p.container}>
            <button type="button" onClick={p.onStop} aria-label="Stop listening" className={iconBtn}><X className="h-5 w-5" /></button>
          </Tip>
        </div>

        {/* Position */}
        <div className="px-4 pt-2">
          <Slider.Root value={[Math.round(p.progress * 1000)]} max={1000} step={1}
            onValueCommit={([v]) => p.onSeek((v ?? 0) / 1000)}
            className="group relative flex h-5 w-full touch-none select-none items-center cursor-pointer">
            <Slider.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-slate-200">
              <Slider.Range className="absolute h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
            </Slider.Track>
            <Slider.Thumb aria-label="Position" className="block h-3.5 w-3.5 rounded-full bg-white shadow ring-2 ring-indigo-600 transition-transform group-hover:scale-110 focus-visible:scale-125 focus-visible:outline-none" />
          </Slider.Root>
          <div className="flex justify-between text-[10px] font-medium tabular-nums text-slate-500">
            <span>{p.elapsed}</span><span>{p.remaining}</span>
          </div>
        </div>

        {p.caption && (
          <div className="mx-3 mt-1 rounded-xl bg-indigo-50 px-3 py-2 ring-1 ring-inset ring-indigo-100" aria-live="polite">
            <p className="line-clamp-3 text-[13px] leading-snug text-slate-800">{p.caption.text}</p>
            <p className="mt-0.5 text-[10px] font-medium text-indigo-700">{p.caption.note}</p>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-between gap-0.5 px-2 py-2 sm:px-3">
          <SpeedControl prefs={p.prefs} onPrefs={p.onPrefs} container={p.container} />
          <Tip label="Previous chapter" container={p.container}>
            <button type="button" onClick={p.onPrevChapter} disabled={!p.onPrevChapter} aria-label="Previous chapter" className={iconBtn}><SkipBack className="h-[18px] w-[18px]" /></button>
          </Tip>
          <Tip label={p.backLabel} container={p.container}>
            <button type="button" onClick={p.onBack} aria-label={p.backLabel} className={iconBtn}><Rewind className="h-5 w-5" /></button>
          </Tip>
          <button type="button" onClick={p.onToggle} aria-label={toggleLabel}
            className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-500 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300 cursor-pointer">
            {p.status === 'loading' ? <Loader2 className="h-6 w-6 animate-spin" /> : playing ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 translate-x-0.5" />}
          </button>
          <Tip label={p.forwardLabel} container={p.container}>
            <button type="button" onClick={p.onForward} aria-label={p.forwardLabel} className={iconBtn}><FastForward className="h-5 w-5" /></button>
          </Tip>
          <Tip label="Next chapter" container={p.container}>
            <button type="button" onClick={p.onNextChapter} disabled={!p.onNextChapter} aria-label="Next chapter" className={iconBtn}><SkipForward className="h-[18px] w-[18px]" /></button>
          </Tip>
          <VoiceLanguageDialog {...p} />
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-1.5">
          <button type="button" onClick={p.onStop} className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer">
            <Square className="h-3 w-3 fill-current" />Stop
          </button>
          {p.error
            ? <p role="alert" className="min-w-0 truncate text-[11px] font-medium text-rose-700">{p.error}</p>
            : <p className="min-w-0 truncate text-[11px] text-slate-500">{p.mode === 'natural' ? 'Keeps playing with your screen off' : 'Free device voice · follows the text'}</p>}
        </div>
        {p.footer && <div className="border-t border-slate-100 px-3 py-2">{p.footer}</div>}
      </section>
    </Tooltip.Provider>
  );
}

/** Listening speed, as on the best listening apps: a big 1.5x with − and +, a slider and words per minute. */
function SpeedControl({ prefs, onPrefs, container }: { prefs: ListenPrefs; onPrefs: (p: ListenPrefs) => void; container: HTMLElement | null }) {
  const set = (r: number) => onPrefs({ ...prefs, rate: clampRate(r) });
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button type="button" aria-label={`Listening speed ${prefs.rate.toFixed(1)}x`}
          className="inline-flex h-10 min-w-12 shrink-0 items-center justify-center rounded-full px-2 text-xs font-extrabold tabular-nums text-indigo-700 ring-1 ring-inset ring-indigo-200 transition-colors hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer">
          {prefs.rate.toFixed(1)}x
        </button>
      </Popover.Trigger>
      <Popover.Portal container={container ?? undefined}>
        <Popover.Content side="top" align="start" sideOffset={10} collisionPadding={12}
          className="z-[80] w-[17rem] rounded-2xl bg-white p-4 text-slate-900 shadow-2xl ring-1 ring-slate-900/10 data-[state=open]:animate-fade-in focus-visible:outline-none">
          <div className="flex gap-4">
            <div className="flex-1 text-center">
              <p className="flex items-center justify-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-500"><Gauge className="h-3.5 w-3.5" />Listening speed</p>
              <div className="mt-3 flex items-center justify-center gap-2">
                <button type="button" onClick={() => set(prefs.rate - 0.1)} disabled={prefs.rate <= MIN_RATE} aria-label="Slower"
                  className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"><Minus className="h-4 w-4" /></button>
                <span className="w-16 text-3xl font-extrabold tabular-nums" aria-live="polite">{prefs.rate.toFixed(1)}x</span>
                <button type="button" onClick={() => set(prefs.rate + 0.1)} disabled={prefs.rate >= MAX_RATE} aria-label="Faster"
                  className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"><Plus className="h-4 w-4" /></button>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">About {Math.round(WORDS_PER_MINUTE * prefs.rate)} words a minute</p>
              <div className="mt-3 grid grid-cols-3 gap-1.5">
                {[0.8, 1, 1.2, 1.5, 2, 2.5].map((r) => (
                  <button key={r} type="button" onClick={() => set(r)} aria-pressed={prefs.rate === r}
                    className={`rounded-lg py-1.5 text-xs font-bold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer ${prefs.rate === r ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                    {r}x
                  </button>
                ))}
              </div>
            </div>
            <Slider.Root orientation="vertical" min={MIN_RATE * 10} max={MAX_RATE * 10} step={1} value={[Math.round(prefs.rate * 10)]}
              onValueChange={([v]) => set((v ?? 10) / 10)}
              className="relative flex h-44 w-10 touch-none select-none flex-col items-center cursor-pointer">
              <Slider.Track className="relative w-full grow overflow-hidden rounded-xl bg-slate-100 ring-1 ring-inset ring-slate-200">
                <Slider.Range className="absolute w-full rounded-b-xl bg-indigo-600" />
              </Slider.Track>
              <Slider.Thumb aria-label="Listening speed" className="block h-2 w-8 rounded-full bg-white shadow ring-1 ring-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" />
            </Slider.Root>
          </div>
          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

const HUES = ['from-sky-500 to-indigo-600', 'from-rose-500 to-orange-500', 'from-emerald-500 to-teal-600', 'from-amber-500 to-red-500', 'from-violet-500 to-fuchsia-600', 'from-cyan-500 to-blue-600'];
const hue = (s: string) => HUES[[...s].reduce((a, ch) => a + ch.charCodeAt(0), 0) % HUES.length]!;
/** Decorative sound wave for the language cards. */
const Wave = () => (
  <span aria-hidden className="flex h-5 items-center gap-[2px]">
    {[3, 6, 9, 5, 11, 7, 13, 8, 5, 10, 6, 12, 7, 4, 9, 5, 3].map((h, i) => <span key={i} className="w-[2px] rounded-full bg-slate-300" style={{ height: h + 2 }} />)}
  </span>
);

/** Voice & language window: choose a language (each card plays a sample), then a voice. */
function VoiceLanguageDialog(p: ListenPlayerProps) {
  const groups = useMemo(() => groupVoices(p.voices, p.bookLang), [p.voices, p.bookLang]);
  const lang = p.prefs.lang || p.bookLang;
  const current = pickVoice(p.voices, lang, p.prefs.voiceURI);
  const voicesHere = groups.filter((g) => g.lang === lang).flatMap((g) => g.voices);
  const [filter, setFilter] = useState('');
  const shown = groups.filter((g) => !filter || g.label.toLowerCase().includes(filter.toLowerCase()));
  const choose = (g: { lang: string; voices: SpeechSynthesisVoice[] }) => {
    p.onPrefs({ ...p.prefs, lang: g.lang === p.bookLang ? '' : g.lang, voiceURI: g.voices[0]?.voiceURI ?? '' });
  };
  return (
    <Dialog.Root>
      <Tip label="Voice & language" container={p.container}>
        <Dialog.Trigger asChild>
          <button type="button" aria-label="Voice and language" className={iconBtn}><Languages className="h-5 w-5" /></button>
        </Dialog.Trigger>
      </Tip>
      <Dialog.Portal container={p.container ?? undefined}>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-slate-950/50 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
        <Dialog.Content
          className="fixed inset-x-0 bottom-0 z-[71] flex max-h-[90dvh] flex-col rounded-t-3xl bg-slate-50 text-slate-900 shadow-2xl outline-none data-[state=open]:animate-sheet-up motion-reduce:animate-none sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[85vh] sm:w-[min(56rem,calc(100vw-3rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
          <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-3 pt-5">
            <div>
              <Dialog.Title className="font-serif text-xl font-bold">Voice &amp; language</Dialog.Title>
              <Dialog.Description className="mt-0.5 text-xs text-slate-600">
                Press ▶ to hear a voice. Choose a language other than the book’s and each paragraph is translated before it is read.
              </Dialog.Description>
            </div>
            <Dialog.Close aria-label="Close" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"><X className="h-5 w-5" /></Dialog.Close>
          </div>

          {p.naturalVoice && (
            <p className="mx-5 mb-3 rounded-xl bg-indigo-50 px-3 py-2 text-xs text-indigo-900 ring-1 ring-inset ring-indigo-100">
              This book has a natural narration by <strong>{p.naturalVoice}</strong> in {LISTEN_LANGUAGES[p.bookLang] ?? 'its language'}. It plays when the book’s own language is chosen. Other languages use your device’s voices.
            </p>
          )}

          <div className="px-5 pb-2">
            <input type="search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Find a language" aria-label="Find a language"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" />
          </div>

          <ScrollArea.Root type="auto" className="min-h-0 flex-1 overflow-hidden">
            <ScrollArea.Viewport className="h-full max-h-[52dvh] w-full sm:max-h-[50vh]">
              {groups.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-600">This browser has no voices to read aloud. Try Chrome, Edge or Safari.</p>
              ) : (
                <ul className="grid grid-cols-1 gap-2.5 px-5 pb-4 sm:grid-cols-2 lg:grid-cols-3">
                  {shown.map((g) => {
                    const active = g.lang === lang && g.voices.some((v) => v.voiceURI === current?.voiceURI);
                    return (
                      <li key={g.locale}>
                        <div className={`group flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 transition-all hover:shadow-md ${active ? 'ring-2 ring-indigo-500' : 'ring-slate-200'}`}>
                          <button type="button" onClick={() => choose(g)} aria-pressed={active} className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none cursor-pointer">
                            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-[11px] font-extrabold uppercase tracking-wide text-white shadow-inner ${hue(g.locale)}`}>
                              {g.region || g.lang}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold">{g.label}</span>
                              <span className="flex items-center gap-2 text-[10px] text-slate-500">
                                <Wave />{g.voices.length} voice{g.voices.length === 1 ? '' : 's'}{g.lang === p.bookLang ? ' · book' : ''}
                              </span>
                            </span>
                          </button>
                          <button type="button" onClick={() => p.onPreview(g.voices[0]!)} aria-label={`Hear ${g.label}`}
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sky-500 text-white shadow-md shadow-sky-500/30 ring-4 ring-sky-100 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-sky-300 cursor-pointer">
                            <Play className="h-4 w-4 translate-x-px fill-current" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar orientation="vertical" className="flex w-2 touch-none select-none p-0.5"><ScrollArea.Thumb className="relative flex-1 rounded-full bg-slate-300" /></ScrollArea.Scrollbar>
          </ScrollArea.Root>

          {voicesHere.length > 1 && (
            <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Voices for {LISTEN_LANGUAGES[lang]}</p>
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
                {voicesHere.map((v) => {
                  const on = v.voiceURI === current?.voiceURI;
                  return (
                    <div key={v.voiceURI} className={`flex shrink-0 items-center gap-1 rounded-full py-1 pl-3 pr-1 text-xs font-semibold ring-1 ${on ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-white text-slate-700 ring-slate-200'}`}>
                      <button type="button" onClick={() => p.onPrefs({ ...p.prefs, voiceURI: v.voiceURI })} aria-pressed={on} className="inline-flex items-center gap-1 focus-visible:outline-none cursor-pointer">
                        {on && <Check className="h-3.5 w-3.5" />}{voiceName(v)}
                      </button>
                      <button type="button" onClick={() => p.onPreview(v)} aria-label={`Hear ${voiceName(v)}`} className={`grid h-7 w-7 place-items-center rounded-full ${on ? 'hover:bg-white/15' : 'hover:bg-slate-100'} cursor-pointer`}>
                        <Play className="h-3 w-3 fill-current" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <p className="shrink-0 border-t border-slate-200 bg-white px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-[11px] leading-relaxed text-slate-500">
            Translation runs free on your device in Chrome on a computer. Elsewhere it uses BooksAtlas’s AI translator (sign in; it counts towards your daily AI allowance). Voices come from your device, so phones and computers offer different ones.
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
