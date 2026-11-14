import React, { useEffect, useState } from 'react';
import { Headphones, Loader2, RefreshCw } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../ui/alert-dialog';
import { ProgressBar } from './ManuscriptPicker';
import type { useEbookApi } from './ebookApi';

type Row = Awaited<ReturnType<ReturnType<typeof useEbookApi>['narrations']>>[number];
const euro = (cents: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' }).format(cents / 100);
const usd = (micros: number) => `US$${(micros / 1_000_000).toFixed(2)}`;
const LABEL: Record<Row['status'], string> = {
  awaiting_payment: 'Waiting for payment', paid: 'Paid: approve or decline', approved: 'Approved', running: 'Narrating', done: 'Done',
  failed: 'Stopped after errors', declined: 'Declined', refunded: 'Declined and refunded',
};

/** Administrators approve paid narration orders (Gemini spending starts only then), decline with a refund, or resume. */
export function NarrationQueue({ api }: { api: ReturnType<typeof useEbookApi> }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState<{ row: Row; decision: 'approve' | 'decline' } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const load = () => api.narrations().then(setRows).catch(() => setError('Narration orders could not be loaded.'));
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!rows?.some((r) => r.status === 'approved' || r.status === 'running')) return;
    const t = setInterval(() => void load(), 15_000);
    return () => clearInterval(t);
  }, [rows]);

  const act = async (row: Row, decision: 'approve' | 'decline' | 'resume') => {
    setBusy(row.id); setError('');
    try { await api.decideNarration(row.id, decision); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'The decision could not be saved.'); }
    finally { setBusy(null); setConfirm(null); }
  };
  const open = rows?.filter((r) => !['declined', 'refunded', 'awaiting_payment'].includes(r.status)) ?? [];

  return (
    <section aria-labelledby="narration-queue" className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/40 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="narration-queue" className="flex items-center gap-2 font-serif text-lg font-bold text-slate-900"><Headphones className="h-5 w-5 text-amber-600" aria-hidden />Audiobook narration orders</h2>
        <button type="button" onClick={() => void load()} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"><RefreshCw className="h-3.5 w-3.5" aria-hidden />Refresh</button>
      </div>
      {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
      {!rows ? <p className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />Loading…</p>
        : !open.length ? <p className="text-xs text-slate-500">No narration orders to handle.</p>
          : <ul className="space-y-2">{open.map((r) => (
            <li key={r.id} className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 text-xs">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{r.title} · {r.voice}</p>
                  <p className="text-slate-500">{r.words.toLocaleString()} words · paid {euro(r.priceCents)} · Gemini estimate {usd(r.estimateMicros)}{r.spentMicros ? ` · spent ${usd(r.spentMicros)}` : ''}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">{LABEL[r.status]}</span>
              </div>
              {(r.status === 'approved' || r.status === 'running') && <ProgressBar value={r.total ? (r.done / r.total) * 100 : 0} label={`Part ${r.done} of ${r.total}`} />}
              {r.error && <p className="text-rose-700">{r.error}</p>}
              <div className="flex flex-wrap gap-2">
                {r.status === 'paid' && <>
                  <button type="button" disabled={busy === r.id} onClick={() => setConfirm({ row: r, decision: 'approve' })} className="rounded-lg bg-indigo-600 px-3 py-1.5 font-bold text-white hover:bg-indigo-500 disabled:opacity-60 cursor-pointer">Approve and narrate</button>
                  <button type="button" disabled={busy === r.id} onClick={() => setConfirm({ row: r, decision: 'decline' })} className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 cursor-pointer">Decline and refund</button>
                </>}
                {r.status === 'failed' && <>
                  <button type="button" disabled={busy === r.id} onClick={() => void act(r, 'resume')} className="rounded-lg bg-indigo-600 px-3 py-1.5 font-bold text-white hover:bg-indigo-500 disabled:opacity-60 cursor-pointer">Resume</button>
                  <button type="button" disabled={busy === r.id} onClick={() => setConfirm({ row: r, decision: 'decline' })} className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 cursor-pointer">Stop and refund</button>
                </>}
              </div>
            </li>
          ))}</ul>}

      <AlertDialog open={!!confirm} onOpenChange={(o) => { if (!o) setConfirm(null); }}>
        <AlertDialogContent className="max-w-md rounded-2xl">
          {confirm && <>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-serif">{confirm.decision === 'approve' ? 'Start the narration?' : 'Decline and refund?'}</AlertDialogTitle>
              <AlertDialogDescription>
                {confirm.decision === 'approve'
                  ? `${confirm.row.title} (${confirm.row.words.toLocaleString()} words) will be narrated with ${confirm.row.voice}. Gemini cost: about ${usd(confirm.row.estimateMicros)}, never more than ${usd(Math.ceil(confirm.row.estimateMicros * 1.5))}. It runs in the background, part by part.`
                  : `The author is refunded ${euro(confirm.row.priceCents)} in full through Stripe. Parts narrated so far are kept but not published.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className={confirm.decision === 'approve' ? '' : 'bg-rose-600 hover:bg-rose-500'} onClick={() => void act(confirm.row, confirm.decision)}>
                {confirm.decision === 'approve' ? 'Approve and narrate' : 'Decline and refund'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </>}
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
