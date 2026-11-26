import React, { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Eye, Layers, Loader2, Trash2 } from 'lucide-react';
import type { Flashcard, FlashcardDeck, useEbookApi } from '../ebook/ebookApi';

type Api = ReturnType<typeof useEbookApi>;

/** The four grades and when the card comes back (specification AI-004: 1, 3, 7 and 14 days). */
export const GRADES: { score: 1 | 2 | 3 | 4; label: string; days: number; className: string }[] = [
  { score: 1, label: 'Again', days: 1, className: 'bg-rose-600 hover:bg-rose-500' },
  { score: 2, label: 'Hard', days: 3, className: 'bg-amber-600 hover:bg-amber-500' },
  { score: 3, label: 'Good', days: 7, className: 'bg-indigo-600 hover:bg-indigo-500' },
  { score: 4, label: 'Easy', days: 14, className: 'bg-emerald-600 hover:bg-emerald-500' },
];
const inDays = (d: number) => (d === 1 ? '1 day' : `${d} days`);

/**
 * Flashcard review with spaced repetition (master build plan M8): the due cards one at a time; reveal the answer
 * (Space), then grade it Again, Hard, Good or Easy (keys 1 to 4) and it comes back after 1, 3, 7 or 14 days.
 * For one book (in the reader) or all books (on My progress).
 */
export function FlashcardReview({ api, bookId, titleOf, compact = false }: { api: Api; bookId?: string; titleOf?: (bookId: string) => string | undefined; compact?: boolean }) {
  const [deck, setDeck] = useState<FlashcardDeck | null>(null);
  const [error, setError] = useState('');
  const [queue, setQueue] = useState<Flashcard[]>([]);
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const load = useCallback(() => {
    api.flashcardDeck(bookId).then((d) => { setDeck(d); setQueue(d.due); setDone(0); setShown(false); }).catch((e) => setError(e instanceof Error ? e.message : 'Your flashcards could not be loaded.'));
  }, [api, bookId]);
  useEffect(() => { load(); }, [bookId]); // eslint-disable-line react-hooks/exhaustive-deps
  const card = queue[0];
  const grade = async (score: 1 | 2 | 3 | 4) => {
    if (!card || busy) return;
    setBusy(true);
    try {
      await api.reviewFlashcard(card.id, score);
      // Again: the card comes back at the end of this session too, until it is known.
      setQueue((q) => (score === 1 ? [...q.slice(1), card] : q.slice(1)));
      if (score !== 1) setDone((n) => n + 1);
      setShown(false);
    } catch (e) { setError(e instanceof Error ? e.message : 'The review could not be saved.'); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!card || busy) return;
    setBusy(true);
    try { await api.removeFlashcard(card.id); setQueue((q) => q.slice(1)); setDeck((d) => (d ? { ...d, total: Math.max(0, d.total - 1) } : d)); setConfirming(false); setShown(false); } catch (e) { setError(e instanceof Error ? e.message : 'The card could not be removed.'); } finally { setBusy(false); }
  };
  const onKey = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).closest('button') && e.key === ' ') return;
    if (e.key === ' ' && !shown) { e.preventDefault(); setShown(true); }
    else if (shown && ['1', '2', '3', '4'].includes(e.key)) { e.preventDefault(); void grade(Number(e.key) as 1 | 2 | 3 | 4); }
  };

  if (error) return <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900">{error}</p>;
  if (!deck) return <p className="flex items-center gap-2 text-sm text-slate-500" role="status"><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />Loading your flashcards…</p>;
  const stats = (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500" data-testid="flashcard-stats">
      <span className="inline-flex items-center gap-1"><Layers className="h-3.5 w-3.5" aria-hidden />{deck.total} card{deck.total === 1 ? '' : 's'}</span>
      <span>{queue.length} due now</span>
      {deck.retention !== null && <span>{deck.retention}% remembered</span>}
      {done > 0 && <span>{done} reviewed</span>}
    </p>
  );
  if (!deck.total) return (
    <div className="space-y-1 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600" data-testid="flashcards-empty">
      <p className="font-semibold text-slate-900">No flashcards yet.</p>
      <p>In the reader, make flashcards from a chapter (Study → Flashcards → Save to my review deck) or select a passage and tap Flashcard. They come back here when it is time to review them.</p>
    </div>
  );
  if (!card) return (
    <div className="space-y-2 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-950" data-testid="flashcards-done">
      <p className="flex items-center gap-2 font-bold"><CalendarClock className="h-4 w-4" aria-hidden />{done ? `All done: ${done} card${done === 1 ? '' : 's'} reviewed.` : 'Nothing to review right now.'}</p>
      {deck.nextDue && <p>Next review: {new Date(deck.nextDue).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}.</p>}
      {stats}
    </div>
  );
  return (
    <div className="space-y-3" onKeyDown={onKey} data-testid="flashcard-review">
      {stats}
      <div className={`rounded-2xl border border-indigo-200 bg-white p-4 ${compact ? '' : 'sm:p-6'}`} tabIndex={0} aria-label="Flashcard. Press Space to show the answer, then 1 to 4 to grade it.">
        {!bookId && titleOf?.(card.bookId) && <p className="mb-1 text-[11px] font-semibold text-slate-500">{titleOf(card.bookId)}</p>}
        <p className={`font-semibold text-slate-900 ${compact ? 'text-sm' : 'text-lg'}`} data-testid="flashcard-question">{card.question}</p>
        {shown
          ? <p className={`mt-3 border-t border-slate-100 pt-3 text-slate-700 ${compact ? 'text-sm' : 'text-base'}`} data-testid="flashcard-answer" aria-live="polite">{card.answer}</p>
          : <button type="button" onClick={() => setShown(true)} data-testid="flashcard-reveal"
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"><Eye className="h-4 w-4" aria-hidden />Reveal answer</button>}
      </div>
      {shown && (
        <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="How well did you know it?">
          {GRADES.map((g) => (
            <button key={g.score} type="button" disabled={busy} onClick={() => void grade(g.score)} data-testid={`flashcard-grade-${g.score}`}
              className={`flex min-h-12 flex-col items-center justify-center rounded-xl px-1 text-white disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 cursor-pointer ${g.className}`}>
              <span className="text-xs font-bold">{g.label}</span><span className="text-[10px] opacity-90">{inDays(g.days)}</span>
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span>Space shows the answer; 1 to 4 grade it.</span>
        {confirming
          ? <span className="flex items-center gap-1">Remove this card?
              <button type="button" onClick={() => void remove()} disabled={busy} data-testid="flashcard-remove-yes" className="min-h-9 rounded-lg bg-rose-600 px-2 font-bold text-white hover:bg-rose-500 cursor-pointer">Remove</button>
              <button type="button" onClick={() => setConfirming(false)} className="min-h-9 rounded-lg px-2 font-semibold hover:bg-slate-100 cursor-pointer">Keep</button>
            </span>
          : <button type="button" onClick={() => setConfirming(true)} disabled={busy} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 font-semibold hover:bg-slate-100 cursor-pointer"><Trash2 className="h-3.5 w-3.5" aria-hidden />Remove card</button>}
      </div>
    </div>
  );
}
