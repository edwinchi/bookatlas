import React, { useState } from 'react';
import { ClipboardCheck, Copy, Download, Loader2 } from 'lucide-react';
import { saveBlob, type ReadinessPackage } from './ebookApi';

type Check = ReadinessPackage['chapters'][number]['editing'];
const CHECK: Record<Check, { label: string; tone: string }> = {
  ok: { label: 'OK', tone: 'bg-emerald-50 text-emerald-800' },
  review: { label: 'Review', tone: 'bg-amber-50 text-amber-900' },
  fix: { label: 'Fix', tone: 'bg-rose-50 text-rose-800' },
  manual: { label: 'Verify', tone: 'bg-indigo-50 text-indigo-800' },
  'n/a': { label: '—', tone: 'text-slate-400' },
};
const Pill: React.FC<{ value: Check }> = ({ value }) => (
  <span className={`inline-block rounded-full px-1.5 py-px text-[10px] font-bold ${CHECK[value].tone}`}>{CHECK[value].label}</span>
);

const TABS = [
  { id: 'chapters', label: 'Chapters' },
  { id: 'kdpEbook', label: 'KDP eBook' },
  { id: 'kdpPrint', label: 'KDP print' },
  { id: 'lulu', label: 'Lulu' },
  { id: 'metadata', label: 'Metadata' },
] as const;

/** The Amazon KDP and Lulu readiness package for one submission: score, issues, chapter audit, checklists, metadata. */
export const ReadinessPanel: React.FC<{ title: string; load: () => Promise<ReadinessPackage> }> = ({ title, load }) => {
  const [pkg, setPkg] = useState<ReadinessPackage | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('chapters');
  const [copied, setCopied] = useState('');

  const open = async () => {
    setState('loading');
    try { setPkg(await load()); setState('idle'); } catch { setState('error'); }
  };
  const copy = async (key: string, text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); window.setTimeout(() => setCopied(''), 1500); } catch { /* clipboard blocked */ }
  };

  if (!pkg) {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
        <ClipboardCheck className="h-5 w-5 text-indigo-600" aria-hidden />
        <p className="flex-1 text-xs text-slate-700"><span className="font-semibold text-slate-900">Publication readiness for Amazon KDP and Lulu.</span> Score, issues, a chapter-by-chapter audit, upload checklists, the metadata package, book description and copyright page.</p>
        <button type="button" onClick={open} disabled={state === 'loading'} className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-60">
          {state === 'loading' && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}{state === 'loading' ? 'Auditing the book…' : 'Open readiness report'}
        </button>
        {state === 'error' && <p role="alert" className="basis-full text-xs text-rose-700">The report could not be made. Please retry.</p>}
      </div>
    );
  }

  const tone = pkg.score >= 90 ? 'text-emerald-600' : pkg.score >= 70 ? 'text-amber-500' : 'text-rose-500';
  const checklist = tab === 'kdpEbook' ? pkg.kdpEbook : tab === 'kdpPrint' ? pkg.kdpPrint : tab === 'lulu' ? pkg.lulu : null;
  const meta = pkg.metadata;

  return (
    <section className="mt-4 rounded-xl border border-slate-200 bg-white">
      <header className="flex flex-wrap items-center gap-4 border-b border-slate-100 p-4">
        <div className="relative grid h-16 w-16 shrink-0 place-items-center" aria-label={`Readiness score ${pkg.score} of 100`}>
          <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90" aria-hidden>
            <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-slate-100" strokeWidth="3.5" />
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"
              strokeDasharray={`${(pkg.score / 100) * 97.4} 97.4`} className={`${tone} transition-[stroke-dasharray] duration-700`} />
          </svg>
          <span className="text-lg font-black tabular-nums text-slate-900">{pkg.score}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-bold ${tone}`}>{pkg.verdict}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{pkg.summary}</p>
        </div>
        <button type="button" onClick={() => saveBlob(new Blob([pkg.markdown], { type: 'text/markdown' }), `${title.replace(/[^\w-]+/g, '_')}_KDP_Lulu_Readiness_Package.md`)}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
          <Download className="h-3.5 w-3.5" aria-hidden />Download package (.md)
        </button>
      </header>

      {pkg.issues.length > 0 && (
        <ul className="space-y-1 border-b border-slate-100 px-4 py-3">
          {pkg.issues.map((issue, i) => (
            <li key={i} className={`text-xs ${issue.severity === 'error' ? 'text-rose-700' : 'text-amber-800'}`}>{issue.severity === 'error' ? 'Fix: ' : 'Review: '}{issue.text}</li>
          ))}
        </ul>
      )}

      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3 pt-2 text-xs font-semibold">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} type="button" onClick={() => setTab(t.id)}
            className={`whitespace-nowrap rounded-t-lg px-3 py-2 ${tab === t.id ? 'border-b-2 border-indigo-600 text-indigo-700' : 'text-slate-500 hover:text-slate-800'}`}>{t.label}</button>
        ))}
      </div>

      <div className="max-h-[28rem] overflow-auto p-3">
        {tab === 'chapters' && (
          <table className="w-full min-w-[40rem] text-left text-xs">
            <thead className="sticky top-0 bg-white text-[10px] uppercase tracking-wider text-slate-500">
              <tr>{['Chapter', 'Words', 'Editing', 'Formatting', 'Duplication', 'Fact check', 'Images', 'Ready'].map((h) => <th key={h} className="px-2 py-1.5 font-bold">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pkg.chapters.map((c, i) => (
                <tr key={i} className="align-top">
                  <td className="px-2 py-1.5">
                    <p className="font-semibold text-slate-900">{c.title}</p>
                    {c.notes.length > 0 && <p className="mt-0.5 text-[11px] text-slate-500">{c.notes.join('; ')}.</p>}
                  </td>
                  <td className="px-2 py-1.5 tabular-nums text-slate-600">{c.words.toLocaleString()}</td>
                  <td className="px-2 py-1.5"><Pill value={c.editing} /></td>
                  <td className="px-2 py-1.5"><Pill value={c.formatting} /></td>
                  <td className="px-2 py-1.5"><Pill value={c.duplication} /></td>
                  <td className="px-2 py-1.5"><Pill value={c.factCheck} /></td>
                  <td className="px-2 py-1.5"><Pill value={c.imagesCheck} /></td>
                  <td className="px-2 py-1.5 font-bold">{c.ready ? <span className="text-emerald-700">Yes</span> : <span className="text-slate-500">No</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {checklist && (
          <ul className="space-y-2">
            {checklist.map((item, i) => (
              <li key={i} className="flex gap-2 text-xs">
                <Pill value={item.status} />
                <span><span className="font-semibold text-slate-900">{item.label}.</span> <span className="text-slate-600">{item.detail}</span></span>
              </li>
            ))}
          </ul>
        )}

        {tab === 'metadata' && (
          <dl className="space-y-3 text-xs">
            {([
              ['Title', meta.title], ['Subtitle', meta.subtitle], ['Author', meta.author], ['Language', meta.language],
              ['Categories', meta.categories.join('\n')], ['Keywords', meta.keywords.join(', ')],
              ['ISBN', [meta.isbn.ebook && `eBook ${meta.isbn.ebook}`, meta.isbn.print && `Print ${meta.isbn.print}`].filter(Boolean).join(' · ')],
              ['Amazon book description', pkg.description], ['Copyright page', pkg.copyright],
            ] as [string, string | undefined][]).filter(([, v]) => v).map(([label, value]) => (
              <div key={label} className="rounded-lg border border-slate-100 p-2.5">
                <dt className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {label}
                  <button type="button" onClick={() => copy(label, value!)} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-indigo-700 hover:bg-indigo-50">
                    <Copy className="h-3 w-3" aria-hidden />{copied === label ? 'Copied' : 'Copy'}
                  </button>
                </dt>
                <dd className="mt-1 whitespace-pre-line text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
};
