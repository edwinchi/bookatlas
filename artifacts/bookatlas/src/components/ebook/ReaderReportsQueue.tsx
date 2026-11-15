import React, { useEffect, useState } from 'react';
import { EyeOff, Flag, Loader2, RotateCcw } from 'lucide-react';
import type { useEbookApi } from './ebookApi';

type Item = Awaited<ReturnType<ReturnType<typeof useEbookApi>['readerReports']>>[number];

/**
 * Administrators (Reader Phase 3, cycle 10): reported shared notes and reading-group posts. Three reports hide an
 * item automatically; here it is restored or kept hidden.
 */
export function ReaderReportsQueue({ api }: { api: ReturnType<typeof useEbookApi> }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const load = () => api.readerReports().then(setItems).catch((e) => setError(e instanceof Error ? e.message : 'Reports could not be loaded.'));
  useEffect(() => { void load(); }, []);
  const moderate = async (item: Item, action: 'hide' | 'restore') => {
    setBusy(item.id); setError('');
    try { await api.moderateReaderItem(item.kind, item.id, action); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Please retry.'); } finally { setBusy(null); }
  };
  if (items && !items.length && !error) return null;
  return (
    <section aria-labelledby="reader-reports" className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50/40 p-5">
      <h2 id="reader-reports" className="flex items-center gap-2 text-sm font-bold text-slate-900"><Flag className="h-4 w-4 text-rose-600" aria-hidden />Reported reader notes and group posts</h2>
      <p className="text-xs text-slate-600">Three reports hide an item automatically until you decide. Readers are shown by first name and initial.</p>
      {error && <p role="alert" className="rounded-lg bg-rose-100 p-2 text-xs text-rose-800">{error}</p>}
      {!items ? <p className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />Loading…</p> : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={`${item.kind}:${item.id}`} className="rounded-xl border border-slate-200 bg-white p-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] text-slate-500">
                  <b className="text-slate-800">{item.kind === 'annotation' ? 'Shared note' : 'Group post'}</b> by {item.name ?? 'unknown'} · {item.reports} report{item.reports === 1 ? '' : 's'}
                  {item.hidden && <span className="ml-1.5 rounded bg-rose-100 px-1.5 py-0.5 font-bold text-rose-700">hidden</span>}
                </p>
                {!item.gone && (
                  <button type="button" disabled={busy === item.id} onClick={() => void moderate(item, item.hidden ? 'restore' : 'hide')}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold text-white disabled:opacity-60 cursor-pointer ${item.hidden ? 'bg-slate-700' : 'bg-rose-600'}`}>
                    {busy === item.id ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : item.hidden ? <RotateCcw className="h-3 w-3" aria-hidden /> : <EyeOff className="h-3 w-3" aria-hidden />}
                    {item.hidden ? 'Restore' : 'Hide'}
                  </button>
                )}
              </div>
              <p className="mt-1.5 whitespace-pre-line text-slate-800">{item.gone ? <i className="text-slate-400">Deleted by its writer.</i> : item.text}</p>
              {item.reasons.length > 0 && <p className="mt-1 text-[10px] text-slate-500">Reasons: {[...new Set(item.reasons)].join(' · ')}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
