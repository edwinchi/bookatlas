import React, { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { FileDown, FileSpreadsheet, FileText, Loader2, X } from 'lucide-react';
import { useEbookApi, type ClassReport } from '../ebook/ebookApi';
import { download, reportCsv, reportFileName, reportPdf, weekLabel } from './classReport';

const btn = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-60 cursor-pointer';
const item = 'flex-1 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 data-[state=on]:bg-white data-[state=on]:text-slate-900 data-[state=on]:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer';

/** A small bar of minutes per week; the tallest week fills the cell. */
function Weeks({ weekly, max }: { weekly: number[]; max: number }) {
  return (
    <div className="flex h-8 items-end gap-0.5" aria-hidden>
      {weekly.map((m, i) => <span key={i} className={`w-2 rounded-t-sm ${m ? 'bg-indigo-500' : 'bg-slate-200'}`} style={{ height: `${m ? Math.max(12, (m / Math.max(1, max)) * 100) : 8}%` }} />)}
    </div>
  );
}

/** Teacher reports (Reading Intelligence phase 5): minutes per week, progress and quiz scores, as CSV or PDF. */
export function ClassReportButton({ classId }: { classId: string }) {
  const api = useEbookApi();
  const [open, setOpen] = useState(false);
  const [weeks, setWeeks] = useState('8');
  const [r, setR] = useState<ClassReport | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    let live = true;
    setR(null); setError('');
    api.classReport(classId, Number(weeks)).then((x) => { if (live) setR(x); }).catch((e) => { if (live) setError(e instanceof Error ? e.message : 'The report could not be made.'); });
    return () => { live = false; };
  }, [open, weeks, classId]); // eslint-disable-line react-hooks/exhaustive-deps
  const max = r ? Math.max(1, ...r.rows.flatMap((m) => m.weekly)) : 1;
  const pdf = async () => { if (!r) return; setBusy(true); try { download(await reportPdf(r), reportFileName(r, 'pdf')); } catch { setError('The PDF could not be made. Try the CSV file.'); } finally { setBusy(false); } };
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild><button type="button" className={`${btn} text-indigo-700 hover:bg-indigo-50`} data-testid="class-report"><FileText className="h-4 w-4" aria-hidden />Report</button></Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-slate-950/40" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-[60] max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl outline-none sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[88dvh] sm:w-[min(52rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
          <div className="flex items-center justify-between gap-3"><Dialog.Title className="text-lg font-bold text-slate-900">Report</Dialog.Title><Dialog.Close aria-label="Close" className="grid h-10 w-10 place-items-center rounded-full text-slate-500 hover:bg-slate-100 cursor-pointer"><X className="h-5 w-5" /></Dialog.Close></div>
          <Dialog.Description className="mt-1 text-sm text-slate-500">Reading minutes per week, progress on each book and quiz scores for every member. Download it for your records or a parents’ evening.</Dialog.Description>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <ToggleGroup.Root type="single" value={weeks} onValueChange={(v) => v && setWeeks(v)} aria-label="Weeks in the report" className="flex gap-1 rounded-xl bg-slate-100 p-1">
              {['4', '8', '12', '26'].map((w) => <ToggleGroup.Item key={w} value={w} className={item}>{w} weeks</ToggleGroup.Item>)}
            </ToggleGroup.Root>
            <div className="ml-auto flex gap-2">
              <button type="button" disabled={!r} onClick={() => r && download(new Blob([reportCsv(r)], { type: 'text/csv;charset=utf-8' }), reportFileName(r, 'csv'))} className={`${btn} bg-slate-100 text-slate-900 hover:bg-slate-200`} data-testid="report-csv"><FileSpreadsheet className="h-4 w-4" aria-hidden />CSV</button>
              <button type="button" disabled={!r || busy} onClick={() => void pdf()} className={`${btn} bg-indigo-600 text-white hover:bg-indigo-500`} data-testid="report-pdf">{busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <FileDown className="h-4 w-4" aria-hidden />}PDF</button>
            </div>
          </div>
          {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
          {!r ? !error && <p className="mt-6 flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />Making the report…</p> : !r.rows.length ? (
            <p className="mt-6 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">No members yet.</p>
          ) : (
            <div className="mt-5 overflow-x-auto rounded-2xl ring-1 ring-slate-200">
              <table className="w-full min-w-[34rem] text-left text-sm" data-testid="report-table">
                <caption className="sr-only">Reading minutes per week, from {weekLabel(r.weeks[0]!)} to now</caption>
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                  <tr><th scope="col" className="px-3 py-2">Member</th><th scope="col" className="px-3 py-2">Minutes per week</th><th scope="col" className="px-3 py-2 text-right">Total</th><th scope="col" className="px-3 py-2 text-right">Progress</th><th scope="col" className="px-3 py-2 text-right">Quizzes</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {r.rows.map((m) => {
                    const scores = Object.values(m.quizzes).filter((v): v is number => typeof v === 'number');
                    return (
                      <tr key={m.userId}>
                        <th scope="row" className="px-3 py-2 font-semibold text-slate-900">{m.name}</th>
                        <td className="px-3 py-2"><Weeks weekly={m.weekly} max={max} /></td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-700">{m.weekly.reduce((a, b) => a + b, 0)} min</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-700">{m.average}%</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-700">{scores.length ? `${Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)}%` : '–'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
