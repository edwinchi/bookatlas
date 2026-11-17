import React, { useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Popover from '@radix-ui/react-popover';
import * as Slider from '@radix-ui/react-slider';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import { Check, Highlighter, List, Search, X, Navigation } from 'lucide-react';
import type { Chapter } from '../../types';

const words = (c: Chapter) => c.content.reduce((n, p) => n + String(p).trim().split(/\s+/).filter(Boolean).length, 0);

/**
 * Table of contents as a side sheet (owner request 2026-11-17): every chapter with its reading time, the one
 * being read marked, a filter, and the saved highlights.
 */
export function ReaderContents({ open, onOpenChange, container, chapters, current, onChapter, highlights, onHighlight, preview }: {
  open: boolean; onOpenChange: (o: boolean) => void; container: HTMLElement | null;
  chapters: Chapter[]; current: number; onChapter: (i: number) => void;
  highlights: { id: string; excerpt: string; chapter_index: number; paragraph_index: number; created_at: string }[];
  onHighlight: (c: number, p: number) => void;
  preview: boolean;
}) {
  const [q, setQ] = useState('');
  const minutes = useMemo(() => chapters.map((c) => Math.max(1, Math.round(words(c) / 230))), [chapters]);
  const list = chapters.map((c, i) => ({ c, i })).filter(({ c }) => !q || `${c.title} ${c.subtitle ?? ''}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal container={container ?? undefined}>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-slate-950/40 backdrop-blur-[1px] data-[state=open]:animate-fade-in" />
        <Dialog.Content className="fixed inset-y-0 left-0 z-[71] flex w-[min(24rem,92vw)] flex-col bg-slate-950 text-white shadow-2xl outline-none data-[state=open]:animate-fade-in">
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <Dialog.Title className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-300"><List className="h-4 w-4" />Contents</Dialog.Title>
            <Dialog.Description className="sr-only">Chapters of this book. Choose one to open it.</Dialog.Description>
            <Dialog.Close aria-label="Close table of contents" className="grid h-11 w-11 place-items-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 cursor-pointer"><X className="h-5 w-5" /></Dialog.Close>
          </div>
          {chapters.length > 8 && (
            <div className="shrink-0 px-4 pt-3">
              <label className="flex items-center gap-2 rounded-xl bg-white/5 px-3 ring-1 ring-white/10 focus-within:ring-indigo-400">
                <Search className="h-4 w-4 text-slate-400" aria-hidden />
                <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a chapter" aria-label="Find a chapter"
                  className="h-10 w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none" />
              </label>
            </div>
          )}
          <ScrollArea.Root type="auto" className="min-h-0 flex-1 overflow-hidden">
            <ScrollArea.Viewport className="h-full w-full">
              <ol className="space-y-1 p-3">
                {list.map(({ c, i }) => (
                  <li key={i}>
                    <button type="button" onClick={() => { onChapter(i); onOpenChange(false); }} aria-current={i === current ? 'true' : undefined}
                      className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 cursor-pointer ${i === current ? 'bg-indigo-600 font-bold text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
                      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[11px] font-bold tabular-nums ${i === current ? 'bg-white/20' : i < current ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/5 text-slate-400'}`}>
                        {i < current ? <Check className="h-3.5 w-3.5" /> : i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2">{c.title}</span>
                        {c.subtitle && <span className="block truncate text-[11px] font-normal opacity-70">{c.subtitle}</span>}
                      </span>
                      <span className="shrink-0 text-[10px] font-medium tabular-nums opacity-60">{minutes[i]} min</span>
                    </button>
                  </li>
                ))}
              </ol>
              {preview && <p className="px-6 pb-4 text-[11px] text-slate-500">The free preview shows these chapters. Buy the book for all of them.</p>}
              {highlights.length > 0 && (
                <div className="border-t border-white/10 px-4 py-4">
                  <h4 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400"><Highlighter className="h-3.5 w-3.5" />Saved highlights ({highlights.length})</h4>
                  <div className="space-y-2">
                    {highlights.map((h) => (
                      <button type="button" key={h.id} onClick={() => { onHighlight(h.chapter_index, h.paragraph_index); onOpenChange(false); }}
                        className="block w-full rounded-lg border border-white/10 bg-white/5 p-2.5 text-left text-xs hover:border-white/25 cursor-pointer">
                        <p className="line-clamp-2 italic text-slate-300">“{h.excerpt}”</p>
                        <span className="text-[10px] text-slate-500">Ch. {h.chapter_index + 1} · {new Date(h.created_at).toLocaleDateString('en-GB')}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar orientation="vertical" className="flex w-2 touch-none select-none p-0.5"><ScrollArea.Thumb className="relative flex-1 rounded-full bg-white/20" /></ScrollArea.Scrollbar>
          </ScrollArea.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * "Go to" (owner request 2026-11-17, "navigate to a page"): a page of this chapter, or any place in the book by
 * percentage.
 */
export function GoToPopover({ container, page, pages, onPage, percent, onPercent, children }: {
  container: HTMLElement | null; page: number; pages: number | null; onPage: (n: number) => void;
  percent: number; onPercent: (pct: number) => void; children: React.ReactNode;
}) {
  const [pct, setPct] = useState(percent);
  const [pg, setPg] = useState(String(page + 1));
  return (
    <Popover.Root onOpenChange={(o) => { if (o) { setPct(percent); setPg(String(page + 1)); } }}>
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Popover.Portal container={container ?? undefined}>
        <Popover.Content side="top" sideOffset={10} collisionPadding={12}
          className="z-[80] w-72 space-y-4 rounded-2xl bg-white p-4 text-slate-900 shadow-2xl ring-1 ring-slate-900/10 data-[state=open]:animate-fade-in focus-visible:outline-none">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500"><Navigation className="h-3.5 w-3.5" />Go to</p>
          {pages !== null && pages > 1 && (
            <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); const n = Number(pg); if (n >= 1 && n <= pages) onPage(n - 1); }}>
              <label className="flex-1 text-xs font-semibold text-slate-700">Page in this chapter (1–{pages})
                <input type="number" inputMode="numeric" min={1} max={pages} value={pg} onChange={(e) => setPg(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" />
              </label>
              <button type="submit" className="h-10 rounded-lg bg-slate-900 px-3 text-xs font-bold text-white hover:bg-slate-700 cursor-pointer">Go</button>
            </form>
          )}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-700"><span>Place in the book</span><span className="tabular-nums">{pct}%</span></div>
            <Slider.Root value={[pct]} min={0} max={100} step={1} onValueChange={([v]) => setPct(v ?? 0)}
              className="relative flex h-6 w-full touch-none select-none items-center cursor-pointer">
              <Slider.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-slate-200"><Slider.Range className="absolute h-full rounded-full bg-indigo-600" /></Slider.Track>
              <Slider.Thumb aria-label="Place in the book" className="block h-5 w-5 rounded-full bg-white shadow ring-2 ring-indigo-600 focus-visible:outline-none focus-visible:ring-4" />
            </Slider.Root>
            <Popover.Close asChild>
              <button type="button" onClick={() => onPercent(pct)} className="h-10 w-full rounded-lg bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-500 cursor-pointer">Go to {pct}%</button>
            </Popover.Close>
          </div>
          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
