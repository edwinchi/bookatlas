import { coverProps } from '../utils/coverImage';
import React, { useEffect, useRef, useState } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { Headphones, Loader2, Pause, Play, RotateCcw, RotateCw, Volume2, VolumeX, X } from 'lucide-react';
import { Book } from '../types';
import { formatAudioTime, AUDIO_PLAYBACK_SPEEDS } from '../utils/audioPlayer';

interface AudiobookPlayerDockProps {
  book: Book;
  onClose: () => void;
  onOpenDetail: (book: Book) => void;
}

/** Where every book's audio sample is served (narration/samples.ts): the opening of the book, read aloud. */
export const audioSampleUrl = (bookId: string) => `/api/audio-samples/${encodeURIComponent(bookId)}`;

/**
 * The audio sample player (owner request 2026-11-16). It used to run a pretend timer with no sound; it now plays
 * the book's real sample, for everyone, signed in or not. The first listen of a new book may take a few seconds
 * while the sample is recorded.
 */
export const AudiobookPlayerDock: React.FC<AudiobookPlayerDockProps> = ({ book, onClose, onOpenDetail }) => {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    setState('loading'); setPlaying(false); setTime(0); setDuration(0);
    fetch(audioSampleUrl(book.id))
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'The sample could not be loaded.');
        url = URL.createObjectURL(await res.blob());
        if (cancelled) return;
        const a = audio.current!;
        a.src = url;
        setState('ready');
        await a.play().catch(() => undefined);
      })
      .catch((e) => { if (!cancelled) { setError(e instanceof Error ? e.message : 'The sample could not be loaded.'); setState('error'); } });
    return () => { cancelled = true; audio.current?.pause(); if (url) URL.revokeObjectURL(url); };
  }, [book.id]);

  useEffect(() => { if (audio.current) audio.current.playbackRate = speed; }, [speed, state]);
  useEffect(() => { if (audio.current) audio.current.muted = muted; }, [muted]);

  const toggle = () => { const a = audio.current; if (!a || state !== 'ready') return; if (a.paused) void a.play(); else a.pause(); };
  const seek = (to: number) => { const a = audio.current; if (!a || !duration) return; a.currentTime = Math.max(0, Math.min(duration, to)); setTime(a.currentTime); };
  const speeds: readonly number[] = AUDIO_PLAYBACK_SPEEDS;
  const voice = book.narrator?.includes('BooksAtlas natural voice') ? book.narrator.replace(/ \(BooksAtlas natural voice\)$/, '') : null;

  return (
    <div role="region" aria-label={`Audio sample: ${book.title}`}
      className="fixed bottom-0 inset-x-0 z-40 border-t border-white/10 bg-stone-950/95 text-white shadow-2xl backdrop-blur-md supports-[backdrop-filter]:bg-stone-950/85 pb-[env(safe-area-inset-bottom)]">
      <audio ref={audio} preload="auto" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)} onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)} />
      <div className="mx-auto max-w-7xl px-4 py-2.5 sm:px-6 sm:py-3">
        <div className="mb-2 flex w-full items-center gap-3">
          <span className="w-12 text-right font-mono text-[11px] tabular-nums text-stone-400">{formatAudioTime(time)}</span>
          <Slider.Root value={[time]} max={Math.max(1, duration)} step={0.5} disabled={state !== 'ready'} onValueChange={([v]) => seek(v ?? 0)}
            aria-label="Position in the sample" className="group relative flex h-4 flex-1 touch-none select-none items-center data-[disabled]:opacity-50">
            <Slider.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-white/15 transition-[height] group-hover:h-2">
              <Slider.Range className="absolute h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-500" />
            </Slider.Track>
            <Slider.Thumb className="block h-3.5 w-3.5 rounded-full bg-white shadow ring-2 ring-rose-500/60 transition-transform focus-visible:scale-125 focus-visible:outline-none group-hover:scale-110" />
          </Slider.Root>
          <span className="w-14 font-mono text-[11px] tabular-nums text-stone-400">-{formatAudioTime(Math.max(0, duration - time))}</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <button type="button" onClick={() => onOpenDetail(book)} className="group flex min-w-0 max-w-xs items-center gap-3 text-left cursor-pointer sm:max-w-sm">
            <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md border border-white/20 shadow-md sm:h-12 sm:w-12">
              <img {...coverProps(book.coverImage, 64)} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" referrerPolicy="no-referrer" />
              <span className="absolute inset-0 grid place-items-center bg-black/25"><Headphones className="h-4 w-4 text-white/90" aria-hidden /></span>
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-bold text-white transition-colors group-hover:text-amber-300 sm:text-sm">{book.title}</span>
              <span className="block truncate text-[11px] text-stone-400">
                {state === 'loading' ? 'Preparing the audio sample…' : state === 'error' ? error : `Audio sample · ${voice ? `${voice}, ` : ''}BooksAtlas natural voice`}
              </span>
            </span>
          </button>

          <div className="flex items-center gap-2 sm:gap-4">
            <button type="button" onClick={() => seek(time - 15)} disabled={state !== 'ready'} className="p-1.5 text-stone-400 transition-colors hover:text-white disabled:opacity-40 cursor-pointer" title="Rewind 15 seconds" aria-label="Rewind 15 seconds">
              <RotateCcw className="h-4 w-4" />
            </button>
            <button type="button" onClick={toggle} disabled={state !== 'ready'} title={playing ? 'Pause' : 'Play'} aria-label={playing ? 'Pause the sample' : 'Play the sample'}
              className="grid h-10 w-10 place-items-center rounded-full bg-rose-600 text-white shadow-lg transition hover:scale-105 hover:bg-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:opacity-60 motion-reduce:transition-none cursor-pointer">
              {state === 'loading' ? <Loader2 className="h-5 w-5 animate-spin" /> : playing ? <Pause className="h-5 w-5 fill-white" /> : <Play className="ml-0.5 h-5 w-5 fill-white" />}
            </button>
            <button type="button" onClick={() => seek(time + 15)} disabled={state !== 'ready'} className="p-1.5 text-stone-400 transition-colors hover:text-white disabled:opacity-40 cursor-pointer" title="Fast Forward 15 seconds" aria-label="Forward 15 seconds">
              <RotateCw className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setSpeed(speeds[(speeds.indexOf(speed) + 1) % speeds.length]!)}
              className="hidden rounded-md bg-white/10 px-2 py-1 font-mono text-xs font-bold text-amber-300 transition-colors hover:bg-white/20 sm:block cursor-pointer" title="Change Playback Speed">
              {speed}x
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Unmute' : 'Mute'} className="hidden p-1.5 text-stone-400 transition-colors hover:text-white md:block cursor-pointer">
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button type="button" onClick={onClose} className="rounded-full p-1.5 text-stone-400 transition-colors hover:bg-white/10 hover:text-white cursor-pointer" title="Close Audiobook Player" aria-label="Close the audio sample">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
