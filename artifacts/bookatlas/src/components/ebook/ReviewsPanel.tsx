import React, { useEffect, useId, useState } from 'react';
import * as RadioGroup from '@radix-ui/react-radio-group';
import { BadgeCheck, Loader2, Pencil, Star, Trash2 } from 'lucide-react';
import { useAccount } from '../../auth/AuthContext';
import { useEbookApi, type BookReviews, type MyReview } from './ebookApi';

/** Stars filled to the real average, e.g. 4.3 → four full and a third (no invented ratings). */
export function Stars({ value, size = 'h-4 w-4' }: { value: number; size?: string }) {
  return (
    <span className="inline-flex items-center" aria-label={`${value} out of 5 stars`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <span key={i} className={`relative inline-block ${size}`}>
            <Star className={`absolute inset-0 ${size} text-slate-300`} aria-hidden />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}><Star className={`${size} fill-amber-400 text-amber-400`} aria-hidden /></span>
          </span>
        );
      })}
    </span>
  );
}

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Real reader reviews (TASK-0009): the average, the 5-to-1 breakdown, the reviews, and a form for readers who
 * may review (buyers of paid books, signed-in readers of free books, never the author).
 */
export function ReviewsPanel({ bookId, onChanged }: { bookId: string; onChanged?: (average: number, count: number) => void }) {
  const api = useEbookApi();
  const { account } = useAccount();
  const formId = useId();
  const [data, setData] = useState<BookReviews | null>(null);
  const [mine, setMine] = useState<MyReview | null>(null);
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    const reviews = await api.bookReviews(bookId).catch(() => null);
    setData(reviews ?? { average: 0, count: 0, breakdown: [5, 4, 3, 2, 1].map((stars) => ({ stars, count: 0 })), reviews: [] });
    if (reviews) onChanged?.(reviews.average, reviews.count);
    if (account) setMine(await api.myReview(bookId).catch(() => null));
  };
  useEffect(() => { void load(); }, [bookId, account?.id]);

  const startEdit = () => {
    setRating(mine?.review?.rating ?? 0); setTitle(mine?.review?.title ?? ''); setBody(mine?.review?.body ?? '');
    setMessage(''); setEditing(true);
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) { setMessage('Choose 1 to 5 stars.'); return; }
    if (body.trim().length < 20) { setMessage('Write at least 20 characters about the book.'); return; }
    setBusy(true); setMessage('');
    try { await api.saveReview(bookId, { rating, title, body }); setEditing(false); await load(); setMessage('Thank you, your review is published.'); }
    catch (err) { setMessage(err instanceof Error ? err.message : 'Your review could not be saved.'); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true); setMessage('');
    try { await api.deleteReview(bookId); await load(); setMessage('Your review was deleted.'); }
    catch (err) { setMessage(err instanceof Error ? err.message : 'Your review could not be deleted.'); }
    finally { setBusy(false); }
  };

  if (!data) return <p className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />Loading reviews…</p>;

  return (
    <div className="space-y-4">
      {data.count > 0 ? (
        <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row">
          <div className="text-center sm:text-left">
            <div className="text-3xl font-black text-slate-900">{data.average.toFixed(1)}</div>
            <Stars value={data.average} />
            <p className="mt-1 text-xs text-slate-500">{data.count} reader review{data.count === 1 ? '' : 's'}</p>
          </div>
          <div className="w-full max-w-xs flex-1 space-y-1 text-xs">
            {data.breakdown.map((row) => {
              const pct = data.count ? Math.round((row.count / data.count) * 100) : 0;
              return (
                <div key={row.stars} className="flex items-center gap-2">
                  <span className="w-6 text-[11px] font-medium text-slate-500">{row.stars}★</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} /></div>
                  <span className="w-8 text-right text-[11px] text-slate-600">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">No reader reviews yet. Reviews come only from real readers of this book.</p>
      )}

      {/* The reader's own review, or why they cannot review. */}
      {!account ? <p className="text-xs text-slate-500">Sign in to review books you have read.</p>
        : mine && !editing && (mine.review ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-100 bg-indigo-50/50 px-3 py-2 text-xs">
            <span>{mine.review.hidden ? 'Your review is hidden by a moderator.' : `You rated this book ${mine.review.rating} of 5.`}</span>
            <span className="flex gap-2">
              <button type="button" onClick={startEdit} className="inline-flex items-center gap-1 font-semibold text-indigo-700 hover:underline cursor-pointer"><Pencil className="h-3.5 w-3.5" aria-hidden />Edit</button>
              <button type="button" disabled={busy} onClick={() => void remove()} className="inline-flex items-center gap-1 font-semibold text-rose-700 hover:underline cursor-pointer"><Trash2 className="h-3.5 w-3.5" aria-hidden />Delete</button>
            </span>
          </div>
        ) : mine.canReview ? (
          <button type="button" onClick={startEdit} className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 cursor-pointer">Write a review</button>
        ) : <p className="text-xs text-slate-500">{mine.reason}</p>)}

      {editing && (
        <form onSubmit={submit} aria-labelledby={`${formId}-t`} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <p id={`${formId}-t`} className="text-sm font-bold text-slate-900">Your review</p>
          <RadioGroup.Root value={String(rating || '')} onValueChange={(v) => setRating(Number(v))} aria-label="Your rating" className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <RadioGroup.Item key={n} value={String(n)} aria-label={`${n} star${n === 1 ? '' : 's'}`} className="rounded p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer">
                <Star className={`h-6 w-6 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} aria-hidden />
              </RadioGroup.Item>
            ))}
          </RadioGroup.Root>
          <label className="block text-xs font-semibold text-slate-700">Title (optional)
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label className="block text-xs font-semibold text-slate-700">What did you think? <span className="font-normal text-slate-500">({body.trim().length} of 20–2,000 characters)</span>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} rows={4} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <p className="text-[11px] text-slate-500">Your first name and initial are shown with your review{mine?.verifiedPurchase ? ', marked as a verified purchase' : ''}.</p>
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-60 cursor-pointer">{busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}Publish review</button>
            <button type="button" onClick={() => setEditing(false)} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 cursor-pointer">Cancel</button>
          </div>
        </form>
      )}
      {message && <p role="status" className="text-xs text-slate-700">{message}</p>}

      <ul className="space-y-3">
        {data.reviews.map((r) => (
          <li key={r.id} className="space-y-1.5 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-800 text-xs font-bold text-white" aria-hidden>{r.name[0]}</span>
                <span className="text-xs font-bold text-slate-900">{r.name}</span>
                {r.verifiedPurchase && <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700"><BadgeCheck className="h-3 w-3" aria-hidden />Verified purchase</span>}
              </span>
              <span className="text-xs text-slate-400">{day(r.date)}{r.edited ? ' · edited' : ''}</span>
            </div>
            <Stars value={r.rating} size="h-3.5 w-3.5" />
            {r.title && <h5 className="text-sm font-bold text-slate-900">{r.title}</h5>}
            <p className="whitespace-pre-line text-xs leading-relaxed text-slate-700">{r.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
