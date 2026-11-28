import { useState } from 'react';
import { Check, Copy, Loader2, SpellCheck } from 'lucide-react';
import { SelectBox } from '../ui/select-box';
import { useEbookApi } from './ebookApi';

type Result = Awaited<ReturnType<ReturnType<typeof useEbookApi>['proofread']>>;
const KIND: Record<string, string> = { spelling: 'Spelling', grammar: 'Grammar', punctuation: 'Punctuation', typo: 'Typo', consistency: 'Consistency' };

/**
 * The AI proofreader in the readiness panel (2026-11-28): one chapter of the author's prepared book at a time. It lists
 * suggestions only; the author makes the changes in their own manuscript and uploads it again.
 */
export function ProofreadTab({ submissionId, chapters }: { submissionId: string; chapters: string[] }) {
  const api = useEbookApi();
  const [chapter, setChapter] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(-1);
  const run = async () => {
    setBusy(true); setError(''); setResult(null);
    try { setResult(await api.proofread({ submissionId, chapterIndex: chapter })); }
    catch (e) { setError(e instanceof Error && e.message ? e.message : 'The proofreader did not answer. Please try again.'); }
    finally { setBusy(false); }
  };
  const copy = (text: string, i: number) => { void navigator.clipboard?.writeText(text).then(() => { setCopied(i); window.setTimeout(() => setCopied(-1), 1500); }).catch(() => undefined); };
  return (
    <div className="space-y-3 text-xs" data-testid="proofread-tab">
      <p className="flex items-start gap-2 text-slate-600"><SpellCheck className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" aria-hidden />
        AI checks one chapter for spelling, grammar, punctuation and typing errors. It leaves your style and voice alone, and your book is not changed: make the fixes you agree with in your manuscript and upload it again. Each chapter counts once against your 40 AI requests a day.</p>
      <div className="flex flex-wrap items-center gap-2">
        <SelectBox value={String(chapter)} onChange={(e) => { setChapter(Number(e.target.value)); setResult(null); }} aria-label="Chapter to proofread" className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs">
          {chapters.map((t, i) => <option key={i} value={String(i)}>{`${i + 1}. ${t || 'Untitled chapter'}`}</option>)}
        </SelectBox>
        <button type="button" onClick={run} disabled={busy} data-testid="proofread-run"
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <SpellCheck className="h-3.5 w-3.5" aria-hidden />}{busy ? 'Proofreading…' : 'Proofread this chapter'}
        </button>
      </div>
      {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-rose-900">{error}</p>}
      {result && (
        <div aria-live="polite" className="space-y-2">
          <p className="font-semibold text-slate-900">
            {result.issues.length ? `${result.issues.length} suggestion${result.issues.length === 1 ? '' : 's'} for “${result.title}”` : `No errors found in “${result.title}”.`}
            {result.checkedChars < result.totalChars && <span className="font-normal text-slate-600"> The first {result.checkedChars.toLocaleString()} of {result.totalChars.toLocaleString()} characters were checked.</span>}
            <span className="font-normal text-slate-600"> {result.remaining} AI requests left today.</span>
          </p>
          <ul className="space-y-2">
            {result.issues.map((x, i) => (
              <li key={i} data-testid="proofread-issue" className="rounded-lg border border-slate-100 p-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">{KIND[x.kind] ?? 'Grammar'}</p>
                <p className="mt-1"><del className="text-rose-800">{x.original}</del> <span aria-hidden>→</span><span className="sr-only">should be</span> <ins className="font-semibold text-emerald-800 no-underline">{x.suggestion}</ins></p>
                {x.reason && <p className="mt-0.5 text-slate-600">{x.reason}</p>}
                <button type="button" onClick={() => copy(x.suggestion, i)} className="mt-1 inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:underline">
                  {copied === i ? <Check className="h-3 w-3" aria-hidden /> : <Copy className="h-3 w-3" aria-hidden />}{copied === i ? 'Copied' : 'Copy the correction'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
