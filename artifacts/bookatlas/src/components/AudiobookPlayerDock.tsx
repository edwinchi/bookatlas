import { coverProps } from '../utils/coverImage';
import React, { useEffect, useRef, useState } from 'react';
import * as Slider from '@radix-ui/react-slider';
import * as Popover from '@radix-ui/react-popover';
import * as Tooltip from '@radix-ui/react-tooltip';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import {
  BookOpen, ChevronDown, Headphones, Info, Loader2, Maximize2, Pause, Play, RotateCcw, RotateCw, ShoppingCart, Volume1, Volume2, VolumeX, X,
} from 'lucide-react';
import { Book } from '../types';
import { formatAudioTime, AUDIO_PLAYBACK_SPEEDS } from '../utils/audioPlayer';

interface AudiobookPlayerDockProps {
  book: Book;
  onClose: () => void;
  onOpenDetail: (book: Book) => void;
  /** Opens the book's free sample in the reader. */
  onReadSample?: (book: Book) => void;
  /** Shown when the book is for sale and not owned yet. */
  onAddToCart?: (book: Book) => void;
  owned?: boolean;
  currencySymbol?: string;
}

/** Where every book's audio sample is served (narration/samples.ts): the opening of the book, read aloud. */
export const audioSampleUrl = (bookId: string) => `/api/audio-samples/${encodeURIComponent(bookId)}`;

const iconBtn = 'grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-700 transition-colors hover:bg-slate-100 active:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-35 disabled:pointer-events-none cursor-pointer';
const chip = 'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer';

function Tip({ label, children }: { label: string; children: React.ReactElement }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content sideOffset={6} className="z-[80] rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white shadow-lg data-[state=delayed-open]:animate-fade-in">
          {label}<Tooltip.Arrow className="fill-slate-900" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/**
 * The audio sample player (owner requests 2026-11-16 and 2026-11-22): it pops up on screen with every control in it —
 * play/pause, position, 15-second skips, speed, volume — plus the book's details, its reading sample and the cart.
 * It shrinks to a small round button and keeps playing, and the lock screen / headphone buttons control it too.
 */
export const AudiobookPlayerDock: React.FC<AudiobookPlayerDockProps> = ({
  book, onClose, onOpenDetail, onReadSample, onAddToCart, owned = false, currencySymbol = '€',
}) => {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setState('loading'); setPlaying(false); setTime(0); setDuration(0); setMinimized(false);
    // Streamed from its address: iPhones refuse the audio as a blob and the player closed there (found 2026-11-23).
    // play() runs straight away, still inside the tap that opened the player, which phones require for sound.
    const a = audio.current!;
    const failed = () => {
      if (cancelled) return;
      fetch(audioSampleUrl(book.id), { headers: { range: 'bytes=0-0' } })
        .then(async (res) => (res.ok ? 'The sample could not be played on this device.' : (await res.json().catch(() => ({}))).error ?? 'The sample could not be loaded.'))
        .catch(() => 'The sample could not be loaded. Check your connection.')
        .then((message) => { if (!cancelled) { setError(message); setState('error'); } });
    };
    a.onerror = failed;
    a.onloadedmetadata = () => { if (!cancelled) setState('ready'); };
    a.src = audioSampleUrl(book.id);
    a.playbackRate = speed;
    void a.play().then(() => { if (!cancelled) setState('ready'); }).catch((e: unknown) => {
      // The browser wants a tap first: the player is ready and waits for Play.
      if (!cancelled && (e as { name?: string })?.name === 'NotAllowedError') setState('ready');
    });
    return () => { cancelled = true; a.onerror = null; a.onloadedmetadata = null; a.pause(); a.removeAttribute('src'); a.load(); };
  }, [book.id]);

  useEffect(() => { if (audio.current) audio.current.playbackRate = speed; }, [speed, state]);
  useEffect(() => { if (audio.current) { audio.current.muted = muted; audio.current.volume = volume; } }, [muted, volume]);

  const toggle = () => { const a = audio.current; if (!a || state !== 'ready') return; if (a.paused) void a.play().catch(() => undefined); else a.pause(); };
  const seek = (to: number) => { const a = audio.current; if (!a || !duration) return; a.currentTime = Math.max(0, Math.min(duration, to)); setTime(a.currentTime); };
  const seekRef = useRef(seek); seekRef.current = seek;
  const toggleRef = useRef(toggle); toggleRef.current = toggle;

  // Lock screen, headphones and car controls.
  useEffect(() => {
    const ms = typeof navigator !== 'undefined' ? navigator.mediaSession : undefined;
    if (!ms || state !== 'ready') return;
    try {
      ms.metadata = new MediaMetadata({ title: book.title, artist: book.author, album: 'BooksAtlas audio sample', artwork: book.coverImage ? [{ src: book.coverImage }] : [] });
      ms.setActionHandler('play', () => toggleRef.current());
      ms.setActionHandler('pause', () => toggleRef.current());
      ms.setActionHandler('seekbackward', () => seekRef.current((audio.current?.currentTime ?? 0) - 15));
      ms.setActionHandler('seekforward', () => seekRef.current((audio.current?.currentTime ?? 0) + 15));
    } catch { /* older browsers */ }
    return () => {
      try { for (const a of ['play', 'pause', 'seekbackward', 'seekforward'] as const) ms.setActionHandler(a, null); ms.metadata = null; } catch { /* ignore */ }
    };
  }, [state, book.id]);

  /** Space plays/pauses, the arrows skip 15 seconds, while the player has focus. */
  const onKeyDown = (e: React.KeyboardEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest('[role="slider"]')) return;
    if (e.key === ' ' && t.tagName !== 'BUTTON') { e.preventDefault(); toggle(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); seek(time - 15); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); seek(time + 15); }
    else if (e.key === 'Escape') setMinimized(true);
  };

  const speeds: readonly number[] = AUDIO_PLAYBACK_SPEEDS;
  const voice = book.narrator?.includes('BooksAtlas natural voice') ? book.narrator.replace(/ \(BooksAtlas natural voice\)$/, '') : null;
  const statusLine = state === 'loading' ? 'Preparing the audio sample…' : state === 'error' ? error : `Audio sample · ${voice ? `${voice}, ` : ''}BooksAtlas natural voice`;
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const forSale = !owned && book.price > 0 && !!onAddToCart;

  const audioEl = (
    <audio ref={audio} preload="auto" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
      onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)} onLoadedMetadata={(e) => { const d = e.currentTarget.duration; setDuration(Number.isFinite(d) && d > 0 ? d : 0); }} />
  );
  const playIcon = state === 'loading' ? <Loader2 className="h-6 w-6 animate-spin" /> : playing ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 translate-x-0.5 fill-current" />;

  // One <audio> for both views, kept first in the same fragment so React never remounts it: shrinking or opening the
  // player must not stop the sound or rewind it (found testing the live site, 2026-11-22).
  if (minimized) {
    return (
      <>{audioEl}
      <div role="region" data-floating-player aria-label={`Audio sample: ${book.title}`}
        className="pointer-events-auto fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-3 z-[60] flex items-center gap-1 rounded-full bg-slate-900 p-1.5 text-white shadow-2xl ring-1 ring-white/10 animate-fade-in sm:right-6">
        <img {...coverProps(book.coverImage, 64)} alt="" className="h-9 w-9 rounded-full object-cover ring-2 ring-white/20" referrerPolicy="no-referrer" />
        <button type="button" onClick={toggle} disabled={state !== 'ready'} aria-label={playing ? 'Pause the sample' : 'Play the sample'}
          className="grid h-11 w-11 place-items-center rounded-full bg-indigo-500 hover:bg-indigo-400 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer">
          {state === 'loading' ? <Loader2 className="h-5 w-5 animate-spin" /> : playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 translate-x-px fill-current" />}
        </button>
        <span className="hidden px-1 text-[11px] font-bold tabular-nums sm:inline">{formatAudioTime(time)}</span>
        <button type="button" onClick={() => setMinimized(false)} aria-label="Open the player"
          className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer">
          <Maximize2 className="h-4 w-4" />
        </button>
        <button type="button" onClick={onClose} aria-label="Close the audio sample"
          className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer">
          <X className="h-4 w-4" />
        </button>
      </div>
      </>
    );
  }

  return (
    <>{audioEl}
    <Tooltip.Provider delayDuration={400}>
      <section role="region" data-floating-player aria-label={`Audio sample: ${book.title}`} onKeyDown={onKeyDown}
        className="pointer-events-auto fixed inset-x-2 bottom-[calc(0.5rem+env(safe-area-inset-bottom))] z-[60] rounded-3xl bg-white/95 text-slate-900 shadow-[0_24px_60px_-12px_rgba(15,23,42,0.5)] ring-1 ring-slate-900/10 backdrop-blur-md animate-sheet-up motion-reduce:animate-none sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[420px]">
        {/* Book */}
        <div className="flex items-start gap-3 px-4 pt-4">
          <button type="button" onClick={() => onOpenDetail(book)} aria-label={`Details of ${book.title}`}
            className="group relative h-20 w-14 shrink-0 overflow-hidden rounded-lg shadow-md ring-1 ring-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer">
            <img {...coverProps(book.coverImage, 112)} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" referrerPolicy="no-referrer" />
            <span className="absolute bottom-1 right-1 grid h-5 w-5 place-items-center rounded-full bg-black/55"><Headphones className="h-3 w-3 text-white" aria-hidden /></span>
          </button>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Now playing</p>
            <p className="line-clamp-2 font-serif text-base font-bold leading-tight">{book.title}</p>
            <p className="truncate text-xs text-slate-500">{book.author}</p>
          </div>
          <Tip label="Shrink the player">
            <button type="button" onClick={() => setMinimized(true)} aria-label="Shrink the player" className={iconBtn}><ChevronDown className="h-5 w-5" /></button>
          </Tip>
          <Tip label="Stop and close">
            <button type="button" onClick={onClose} aria-label="Close the audio sample" className={iconBtn}><X className="h-5 w-5" /></button>
          </Tip>
        </div>

        {/* Position */}
        <div className="px-4 pt-3">
          <Slider.Root value={[time]} max={Math.max(1, duration)} step={0.5} disabled={state !== 'ready'} onValueChange={([v]) => seek(v ?? 0)}
            className="group relative flex h-5 w-full touch-none select-none items-center data-[disabled]:opacity-50 cursor-pointer">
            <Slider.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-slate-200">
              <Slider.Range className="absolute h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
            </Slider.Track>
            <Slider.Thumb aria-label="Position in the sample" className="block h-3.5 w-3.5 rounded-full bg-white shadow ring-2 ring-indigo-600 transition-transform group-hover:scale-110 focus-visible:scale-125 focus-visible:outline-none" />
          </Slider.Root>
          <div className="flex justify-between text-[10px] font-medium tabular-nums text-slate-500">
            <span>{formatAudioTime(time)}</span><span>-{formatAudioTime(Math.max(0, duration - time))}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-1 px-3 py-2">
          <Popover.Root>
            <Tip label="Listening speed">
              <Popover.Trigger asChild>
                <button type="button" aria-label={`Listening speed ${speed}x`}
                  className="inline-flex h-10 min-w-12 shrink-0 items-center justify-center rounded-full px-2 text-xs font-extrabold tabular-nums text-indigo-700 ring-1 ring-inset ring-indigo-200 transition-colors hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer">
                  {speed}x
                </button>
              </Popover.Trigger>
            </Tip>
            <Popover.Portal>
              <Popover.Content data-floating-player side="top" align="start" sideOffset={10} collisionPadding={12}
                className="z-[80] rounded-2xl bg-white p-3 text-slate-900 shadow-2xl ring-1 ring-slate-900/10 data-[state=open]:animate-fade-in focus-visible:outline-none">
                <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">Listening speed</p>
                <ToggleGroup.Root type="single" value={String(speed)} onValueChange={(v) => v && setSpeed(Number(v))} aria-label="Listening speed" className="flex gap-1">
                  {speeds.map((s) => (
                    <ToggleGroup.Item key={s} value={String(s)}
                      className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold tabular-nums text-slate-700 transition-colors hover:bg-slate-200 data-[state=on]:bg-indigo-600 data-[state=on]:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer">
                      {s}x
                    </ToggleGroup.Item>
                  ))}
                </ToggleGroup.Root>
                <Popover.Arrow className="fill-white" />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>

          <Tip label="Back 15 seconds">
            <button type="button" onClick={() => seek(time - 15)} disabled={state !== 'ready'} aria-label="Back 15 seconds" className={iconBtn}><RotateCcw className="h-5 w-5" /></button>
          </Tip>
          <button type="button" onClick={toggle} disabled={state !== 'ready'} aria-label={playing ? 'Pause the sample' : 'Play the sample'}
            className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-500 active:scale-95 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300 cursor-pointer">
            {playIcon}
          </button>
          <Tip label="Forward 15 seconds">
            <button type="button" onClick={() => seek(time + 15)} disabled={state !== 'ready'} aria-label="Forward 15 seconds" className={iconBtn}><RotateCw className="h-5 w-5" /></button>
          </Tip>

          <Popover.Root>
            <Tip label="Volume">
              <Popover.Trigger asChild>
                <button type="button" aria-label="Volume" className={iconBtn}><VolumeIcon className="h-5 w-5" /></button>
              </Popover.Trigger>
            </Tip>
            <Popover.Portal>
              <Popover.Content data-floating-player side="top" align="end" sideOffset={10} collisionPadding={12}
                className="z-[80] flex w-56 items-center gap-2 rounded-2xl bg-white p-3 text-slate-900 shadow-2xl ring-1 ring-slate-900/10 data-[state=open]:animate-fade-in focus-visible:outline-none">
                <button type="button" onClick={() => setMuted((m) => !m)} aria-pressed={muted} aria-label={muted ? 'Unmute' : 'Mute'}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer">
                  <VolumeIcon className="h-4 w-4" />
                </button>
                <Slider.Root value={[muted ? 0 : Math.round(volume * 100)]} max={100} step={5}
                  onValueChange={([v]) => { setVolume((v ?? 100) / 100); setMuted(false); }}
                  className="relative flex h-5 flex-1 touch-none select-none items-center cursor-pointer">
                  <Slider.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-slate-200"><Slider.Range className="absolute h-full rounded-full bg-indigo-600" /></Slider.Track>
                  <Slider.Thumb aria-label="Volume" className="block h-3.5 w-3.5 rounded-full bg-white shadow ring-2 ring-indigo-600 focus-visible:outline-none focus-visible:ring-4" />
                </Slider.Root>
                <Popover.Arrow className="fill-white" />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>

        <p className={`px-4 text-center text-[11px] ${state === 'error' ? 'font-medium text-rose-700' : 'text-slate-500'}`} role={state === 'error' ? 'alert' : undefined}>{statusLine}</p>

        {/* The book: details, its reading sample, the cart */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2 border-t border-slate-100 px-3 py-3">
          <button type="button" onClick={() => onOpenDetail(book)} className={`${chip} bg-slate-100 text-slate-700 hover:bg-slate-200`}>
            <Info className="h-3.5 w-3.5" />Details
          </button>
          {onReadSample && (
            <button type="button" onClick={() => onReadSample(book)} className={`${chip} bg-slate-100 text-slate-700 hover:bg-slate-200`}>
              <BookOpen className="h-3.5 w-3.5" />{owned ? 'Open the book' : 'Read the sample'}
            </button>
          )}
          {forSale && (
            <button type="button" onClick={() => onAddToCart!(book)} className={`${chip} bg-indigo-600 text-white hover:bg-indigo-500`}>
              <ShoppingCart className="h-3.5 w-3.5" />Add to cart · {currencySymbol}{book.price.toFixed(2)}
            </button>
          )}
        </div>
      </section>
    </Tooltip.Provider>
    </>
  );
};
