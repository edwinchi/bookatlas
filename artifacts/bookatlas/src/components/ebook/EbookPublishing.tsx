import React, { useCallback, useEffect, useState } from 'react';
import { BookUp, CheckCircle2, ClipboardList, Loader2, Plus, Sparkles } from 'lucide-react';
import { EBOOK_REQUIREMENTS, PRINT_REQUIREMENTS, type PaperId, type Requirement, type TrimSizeId } from '@workspace/bookatlas-catalog/publishing';
import { useAccount } from '../../auth/AuthContext';
import { EbookApiError, saveBlob, useEbookApi, type FeedbackOverview, type Submission } from './ebookApi';
import { SubmissionForm } from './SubmissionForm';
import { SubmissionCard } from './SubmissionCard';
import { PrintCalculator } from './PrintCalculator';

const Checklist: React.FC<{ items: Requirement[] }> = ({ items }) => (
  <ul className="space-y-2.5">
    {items.map((r) => (
      <li key={r.id} className="text-sm">
        <span className="flex items-center gap-2 font-semibold text-slate-900">
          {r.label}
          {r.automatic && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Checked for you</span>}
        </span>
        <span className="block text-xs leading-relaxed text-slate-600">{r.detail}</span>
      </li>
    ))}
  </ul>
);

/** Store feedback: each rejection message teaches the checks (admins only). */
const StoreFeedback: React.FC<{ api: ReturnType<typeof useEbookApi> }> = ({ api }) => {
  const [overview, setOverview] = useState<FeedbackOverview | null>(null);
  const [store, setStore] = useState('Lulu');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const load = useCallback(() => { api.feedback().then(setOverview).catch(() => setOverview(null)); }, []);
  useEffect(load, [load]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const saved = await api.addFeedback(store, message);
    setResult(saved.matched_rules.length ? `Matched: ${saved.matched_rules.join(', ')}. Future books are now blocked on this.` : 'No rule answers this yet; it is queued as a new rule to build.');
    setMessage('');
    load();
  };
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 font-serif text-lg font-bold text-slate-900"><Sparkles className="h-5 w-5 text-amber-500" aria-hidden />Learn from store feedback</h2>
      <p className="mt-1 text-xs text-slate-600">Paste a rejection message from Lulu, KDP or another store. Known issues become blocking checks; new ones are queued for a new rule.</p>
      <form onSubmit={submit} className="mt-3 space-y-2">
        <input aria-label="Store" value={store} onChange={(e) => setStore(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <textarea aria-label="Store message" value={message} onChange={(e) => setMessage(e.target.value)} className="min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Copyright year mismatch ~ …" />
        <button type="submit" disabled={!message.trim()} className="rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Record feedback</button>
        {result && <p className="text-xs text-slate-700" aria-live="polite">{result}</p>}
      </form>
      {overview && (
        <div className="mt-4 space-y-3">
          <ul className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
            {overview.rules.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5">
                <span className="text-slate-700">{r.title}{r.automaticFix && <span className="text-emerald-700"> · auto-fix</span>}</span>
                <span className={r.blocking ? 'font-bold text-rose-700' : 'text-slate-400'}>{r.storeRejections ? `${r.storeRejections}× rejected` : '—'}</span>
              </li>
            ))}
          </ul>
          {overview.needsNewRule.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Needs a new rule</h3>
              <ul className="mt-1 space-y-1 text-xs text-slate-700">
                {overview.needsNewRule.map((f) => <li key={f.id}><b>{f.store}:</b> {f.message}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export const EbookPublishing: React.FC = () => {
  const { account } = useAccount();
  const api = useEbookApi();
  const isAdmin = account?.role === 'admin';
  const [submissions, setSubmissions] = useState<Submission[] | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [mode, setMode] = useState<{ kind: 'new' } | { kind: 'edit'; submission: Submission } | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [problem, setProblem] = useState<{ message: string; fields?: Record<string, string> } | null>(null);
  const [scope, setScope] = useState<'ebook' | 'print'>('ebook');
  const [calc, setCalc] = useState<{ trimSize: TrimSizeId; paper: PaperId; pageCount: number }>({ trimSize: '6x9', paper: 'cream', pageCount: 300 });

  const load = useCallback(() => {
    api.list().then(setSubmissions).catch((e) => setProblem({ message: e.message }));
  }, []);
  useEffect(() => {
    load();
    fetch('/api/categories').then((r) => r.json()).then((d) => setCategories(d.allCategories ?? [])).catch(() => undefined);
  }, [load]);
  // Validation runs in the background worker; refresh while anything is in flight.
  useEffect(() => {
    if (!submissions?.some((s) => s.status === 'checking' || s.status === 'preparing')) return;
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [submissions, load]);

  const replace = (next: Submission) => setSubmissions((list) => [next, ...(list ?? []).filter((s) => s.id !== next.id)]);
  const handle = async (task: () => Promise<Submission>) => {
    setBusy(true); setProblem(null);
    try { replace(await task()); setMode(null); }
    catch (e) { setProblem(e instanceof EbookApiError ? { message: e.message, fields: e.fields } : { message: 'Something went wrong. Please retry.' }); }
    finally { setBusy(false); setProgress(null); }
  };

  return (
    <div className="space-y-8">
      <header className="rounded-3xl bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 p-6 text-white sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Publish your eBook</p>
        <h1 className="mt-3 font-serif text-3xl font-bold sm:text-4xl">Upload your EPUB. We make it store-ready.</h1>
        <p className="mt-3 max-w-2xl text-sm text-indigo-100">
          Tell us about your book and upload the EPUB. BookAtlas fixes what stores reject (covers with a back panel, copyright mismatches,
          old EPUB versions, restricted fonts), validates it with the official EPUBCheck, and puts it on sale once reviewed.
        </p>
        {!mode && (
          <button type="button" onClick={() => setMode({ kind: 'new' })} className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-300">
            <Plus className="h-4 w-4" aria-hidden />New eBook
          </button>
        )}
      </header>

      {problem && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{problem.message}</p>}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          {mode && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="mb-4 flex items-center gap-2 font-serif text-xl font-bold text-slate-900"><BookUp className="h-5 w-5 text-indigo-600" aria-hidden />{mode.kind === 'new' ? 'New eBook' : `Edit ${mode.submission.intake.title}`}</h2>
              <SubmissionForm
                key={mode.kind === 'edit' ? mode.submission.id : 'new'}
                categories={categories}
                initial={mode.kind === 'edit' ? mode.submission.intake : undefined}
                serverErrors={problem?.fields}
                progress={progress}
                busy={busy}
                fileRequired={mode.kind === 'new' || mode.submission.status === 'uploading'}
                onCancel={() => setMode(null)}
                onSubmit={(intake, file) => {
                  const onProgress = (done: number, total: number) => setProgress({ done, total });
                  return handle(() => mode.kind === 'new' ? api.submit(intake, file!, onProgress)
                    : file ? api.reupload(mode.submission.id, intake, file, onProgress)
                      : api.updateIntake(mode.submission.id, intake));
                }}
              />
            </section>
          )}

          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-slate-900">{isAdmin ? 'All submissions' : 'Your eBooks'}</h2>
            {!submissions ? <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />Loading…</p>
              : !submissions.length ? <p className="text-sm text-slate-500">No eBooks yet. Start with “New eBook”.</p>
                : submissions.map((s) => (
                  <SubmissionCard key={s.id} submission={s} isAdmin={isAdmin}
                    onDownload={async (file) => saveBlob(await api.download(s.id, file), file === 'epub' ? (s.upload?.fileName ?? 'book.epub').replace(/\.epub$/i, '-prepared.epub') : `${s.intake.title}-cover.jpg`)}
                    onEdit={() => setMode({ kind: 'edit', submission: s })}
                    onCover={async (fix) => handle(() => fix === 'enlarge' ? api.enlargeCover(s.id)
                      : fix === 'original' ? api.originalCover(s.id) : api.replaceCover(s.id, fix.upload))}
                    onPublish={async () => handle(() => api.publish(s.id))}
                    onReject={async (reason) => handle(() => api.reject(s.id, reason))}
                  />
                ))}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-serif text-lg font-bold text-slate-900"><ClipboardList className="h-5 w-5 text-indigo-600" aria-hidden />What a complete book needs</h2>
            <div role="tablist" className="mt-3 inline-flex rounded-full bg-slate-100 p-1 text-xs font-semibold">
              {(['ebook', 'print'] as const).map((s) => (
                <button key={s} role="tab" aria-selected={scope === s} type="button" onClick={() => setScope(s)}
                  className={`rounded-full px-3 py-1 ${scope === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}>{s === 'ebook' ? 'eBook' : 'Print'}</button>
              ))}
            </div>
            <div className="mt-4"><Checklist items={scope === 'ebook' ? EBOOK_REQUIREMENTS : PRINT_REQUIREMENTS} /></div>
            <p className="mt-4 flex items-start gap-2 text-xs text-slate-500"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />“Checked for you” items are verified, and fixed where possible, after upload.</p>
          </section>
          {scope === 'print' && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-serif text-lg font-bold text-slate-900">Print cover calculator</h2>
              <div className="mt-3"><PrintCalculator {...calc} onChange={setCalc} /></div>
            </section>
          )}
          {isAdmin && <StoreFeedback api={api} />}
        </aside>
      </div>
    </div>
  );
};
