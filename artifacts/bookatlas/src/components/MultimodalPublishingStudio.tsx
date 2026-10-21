import React, { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { UploadCloud, Sparkles, Layers, Plus, RefreshCw, Lock, AlertCircle, FlaskConical, History, FileText } from 'lucide-react';
import {
  useListPublishingJobs,
  getListPublishingJobsQueryKey,
  useCreatePublishingJob,
  getGetPublishingJobQueryKey,
} from '@workspace/api-client-react';
import type { PublishingJob, PublishingJobInputVoice } from '@workspace/api-client-react';
import { Book } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { useAccount } from '../auth/AuthContext';
import { PublishingReadinessPanel } from './PublishingReadinessPanel';
import { PublishingJobDetail, STATUS_STYLE } from './publishing/PublishingJobDetail';
import { describeError } from './publishing/AuthedAudioPlayer';

interface MultimodalPublishingStudioProps {
  onBookPublished: (book: Book) => void;
  language?: 'en' | 'nl';
  currencySymbol?: string;
  categories: string[];
  onAddCategory: (categoryName: string) => void;
}

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = '.txt,.md,.pdf,.png,.jpg,.jpeg';
const ALLOWED_EXT = ['txt', 'md', 'pdf', 'png', 'jpg', 'jpeg'];
const VOICES: { id: PublishingJobInputVoice; note: string }[] = [
  { id: 'Kore', note: 'firm' },
  { id: 'Puck', note: 'upbeat' },
  { id: 'Aoede', note: 'breezy' },
  { id: 'Charon', note: 'informative' },
];

type Source = { fileName: string; mimeType: string; base64: string; size: number };

const readAsBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result || '');
      const i = s.indexOf(',');
      resolve(i >= 0 ? s.slice(i + 1) : '');
    };
    r.onerror = () => reject(r.error || new Error('File could not be read.'));
    r.readAsDataURL(file);
  });

export const MultimodalPublishingStudio: React.FC<MultimodalPublishingStudioProps> = ({
  onBookPublished,
  language = 'en',
  categories,
  onAddCategory,
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const qc = useQueryClient();
  const { account } = useAccount();
  const accountId = account?.id ?? null;
  const storageKey = accountId ? `bookatlas.studio.selectedJob.${accountId}` : null;

  // Readiness: provider able to CREATE jobs
  const [readinessOk, setReadinessOk] = useState(false);

  // Form
  const [source, setSource] = useState<Source | null>(null);
  const [fileError, setFileError] = useState('');
  const [reading, setReading] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [bookLanguage, setBookLanguage] = useState<'en' | 'nl'>(language);
  const [category, setCategory] = useState(categories[0] || '');
  const [newCategory, setNewCategory] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [chapterCount, setChapterCount] = useState(2);
  const [wordsPerChapter, setWordsPerChapter] = useState(100);
  const [voice, setVoice] = useState<PublishingJobInputVoice>('Kore');
  const [includeAudio, setIncludeAudio] = useState(true);
  const [isTest, setIsTest] = useState(true);
  const [budget, setBudget] = useState('0.75');
  const [submitError, setSubmitError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Selected job, scoped to verified account
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [publishNotice, setPublishNotice] = useState('');
  useEffect(() => {
    qc.removeQueries({ queryKey: getListPublishingJobsQueryKey() });
    setPublishNotice('');
    setSubmitError('');
    setSelectedId(storageKey ? localStorage.getItem(storageKey) : null);
  }, [storageKey, qc]);
  const selectJob = (id: string | null) => {
    setSelectedId(id);
    if (!storageKey) return;
    if (id) localStorage.setItem(storageKey, id); else localStorage.removeItem(storageKey);
  };

  const jobs = useListPublishingJobs({
    query: { enabled: !!accountId, queryKey: getListPublishingJobsQueryKey(), refetchOnMount: 'always', refetchInterval: (q) => (q.state.data?.some((j) => j.status === 'queued' || j.status === 'running') ? 5000 : false) },
  });
  const create = useCreatePublishingJob();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError('');
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXT.includes(ext)) { setFileError('Use a TXT, MD, PDF, PNG or JPG file.'); e.target.value = ''; return; }
    if (file.size > MAX_BYTES) { setFileError(`This file is ${(file.size / 1048576).toFixed(1)} MB. The limit is 5 MB.`); e.target.value = ''; return; }
    if (file.size === 0) { setFileError('This file is empty.'); e.target.value = ''; return; }
    setReading(true);
    try {
      const base64 = await readAsBase64(file);
      setSource({ fileName: file.name.slice(0, 180), mimeType: file.type || '', base64, size: file.size });
      if (!title) setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').slice(0, 180));
    } catch (err) {
      setFileError(describeError(err, 'The file could not be read.'));
      setSource(null);
    } finally {
      setReading(false);
    }
  };

  const clearSource = () => { setSource(null); if (fileInputRef.current) fileInputRef.current.value = ''; };

  const budgetNum = Number(budget);
  const budgetValid = Number.isFinite(budgetNum) && budgetNum > 0 && budgetNum <= 1;
  const formValid = !!source && title.trim() && author.trim() && category.trim() && budgetValid;
  const canSubmit = readinessOk && !!formValid && !create.isPending && !reading;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !source) return;
    setSubmitError('');
    create.mutate(
      {
        data: {
          fileName: source.fileName,
          mimeType: source.mimeType || undefined,
          base64: source.base64,
          title: title.trim(),
          author: author.trim(),
          language: bookLanguage,
          category: category.trim(),
          chapterCount,
          wordsPerChapter,
          voice,
          includeAudio,
          isTest,
          budgetUsd: budgetNum,
        },
      },
      {
        onSuccess: (job) => {
          qc.setQueryData(getGetPublishingJobQueryKey(job.id), job);
          qc.invalidateQueries({ queryKey: getListPublishingJobsQueryKey() });
          selectJob(job.id);
        },
        onError: (err) => setSubmitError(describeError(err, 'The job could not be created.')),
      },
    );
  };

  const handlePublished = async (job: PublishingJob) => {
    qc.invalidateQueries({ queryKey: ['/api/books'] });
    if (job.isTest || job.status !== 'published') {
      setPublishNotice(job.isTest ? 'Test publication placed in the isolated test catalog. The public storefront is unchanged.' : '');
      return;
    }
    try {
      const res = await fetch('/api/books', { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list: (Book & { publicationId?: string })[] = Array.isArray(data) ? data : data.books || [];
      const match = list.find((b) => b.id === job.id || b.publicationId === job.id);
      if (match) {
        onBookPublished(match);
        setPublishNotice(`"${match.title}" is now in the public storefront.`);
      } else {
        setPublishNotice('Published, but the storefront has not listed this book yet. Reload the catalog shortly.');
      }
    } catch {
      setPublishNotice('Published, but the storefront catalog could not be refreshed. Reload the catalog shortly.');
    }
  };

  const input = 'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600';
  const lbl = 'block text-xs font-bold text-slate-700 mb-1';

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-2">
            <span className="bg-amber-400 text-slate-950 text-xs font-extrabold px-3 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" aria-hidden />Publishing Studio
            </span>
            <span className="text-xs text-slate-400">Administrator workspace</span>
          </div>
          <span className="text-xs text-amber-200 font-bold bg-white/10 px-3 py-1 rounded-xl">Output requires review before publishing</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-serif font-extrabold text-white">{t.uploadManuscript}</h2>
        <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-3xl leading-relaxed">
          Upload one real source file. The server writes a short book from it, builds a private EPUB and, if selected, narrates each chapter. Nothing reaches readers until you review and publish it.
        </p>
      </div>

      <PublishingReadinessPanel onReadinessChange={setReadinessOk} />

      {publishNotice && <p role="status" className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">{publishNotice}</p>}

      <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-12 gap-8" aria-label="New publishing job">
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl border-2 border-dashed border-indigo-200 hover:border-indigo-500 focus-within:border-indigo-600 p-6 sm:p-8 transition-colors text-center relative group">
            <input ref={fileInputRef} id="studio-source" type="file" accept={ACCEPT} onChange={handleFile} aria-describedby="studio-source-help" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" />
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              {reading ? <RefreshCw className="w-7 h-7 animate-spin" aria-hidden /> : <UploadCloud className="w-7 h-7" aria-hidden />}
            </div>
            <h3 className="text-base font-serif font-bold text-slate-900 mb-1">
              {reading ? 'Reading file…' : source ? source.fileName : 'Choose one source file'}
            </h3>
            <p id="studio-source-help" className="text-xs text-slate-500 max-w-md mx-auto mb-3">
              {source ? `${(source.size / 1024).toFixed(1)} KB, ${source.mimeType || 'unknown type'}. The exact file bytes are sent to the server.` : 'TXT, MD, PDF, PNG or JPG, up to 5 MB.'}
            </p>
            <span className="inline-block px-4 py-1.5 bg-slate-950 text-white text-xs font-bold rounded-xl shadow-sm">{source ? 'Replace file' : 'Browse files'}</span>
          </div>
          {source && (
            <button type="button" onClick={clearSource} className="text-xs font-bold text-slate-600 underline cursor-pointer -mt-3">Remove file</button>
          )}
          {fileError && <p role="alert" className="text-xs text-rose-700 font-semibold flex items-center gap-1.5"><AlertCircle className="w-4 h-4" aria-hidden />{fileError}</p>}

          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5"><FileText className="w-4 h-4 text-indigo-600" aria-hidden />Book details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label htmlFor="s-title" className={lbl}>Title</label><input id="s-title" maxLength={180} value={title} onChange={(e) => setTitle(e.target.value)} className={input} /></div>
              <div><label htmlFor="s-author" className={lbl}>Author</label><input id="s-author" maxLength={120} value={author} onChange={(e) => setAuthor(e.target.value)} className={input} /></div>
              <div><label htmlFor="s-lang" className={lbl}>Book language</label>
                <select id="s-lang" value={bookLanguage} onChange={(e) => setBookLanguage(e.target.value as 'en' | 'nl')} className={input}>
                  <option value="en">English</option><option value="nl">Nederlands</option>
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="s-cat" className="text-xs font-bold text-slate-700">Category</label>
                  <button type="button" onClick={() => setShowAddCategory((v) => !v)} aria-expanded={showAddCategory} className="text-[11px] text-indigo-600 font-bold flex items-center gap-1 cursor-pointer"><Plus className="w-3 h-3" aria-hidden />{t.addCategory}</button>
                </div>
                <select id="s-cat" value={category} onChange={(e) => setCategory(e.target.value)} className={input}>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            {showAddCategory && (
              <div className="flex gap-2">
                <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} maxLength={100} aria-label="New category name" className="flex-1 px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs" />
                <button type="button" onClick={() => { const c = newCategory.trim(); if (!c) return; onAddCategory(c); setCategory(c); setNewCategory(''); setShowAddCategory(false); }} className="px-3 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl cursor-pointer">
                  <Layers className="w-3.5 h-3.5 inline mr-1" aria-hidden />Save
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Output</h4>
            <div className="grid grid-cols-2 gap-3">
              <div><label htmlFor="s-ch" className={lbl}>Chapters (2–8)</label><input id="s-ch" type="number" min={2} max={8} value={chapterCount} onChange={(e) => setChapterCount(Math.min(8, Math.max(2, Number(e.target.value) || 2)))} className={input} /></div>
              <div><label htmlFor="s-w" className={lbl}>Words / chapter</label><input id="s-w" type="number" min={100} max={800} step={50} value={wordsPerChapter} onChange={(e) => setWordsPerChapter(Math.min(800, Math.max(100, Number(e.target.value) || 100)))} className={input} /></div>
            </div>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
              <input type="checkbox" checked={includeAudio} onChange={(e) => setIncludeAudio(e.target.checked)} className="w-4 h-4" />Narrate each chapter
            </label>
            {includeAudio && (
              <div><label htmlFor="s-voice" className={lbl}>Narration voice</label>
                <select id="s-voice" value={voice} onChange={(e) => setVoice(e.target.value as PublishingJobInputVoice)} className={input}>
                  {VOICES.map((v) => <option key={v.id} value={v.id}>{v.id} ({v.note})</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5"><FlaskConical className="w-4 h-4 text-violet-600" aria-hidden />Run type and cost cap</h4>
            <label className="flex items-start gap-2 text-xs text-slate-800 cursor-pointer">
              <input type="checkbox" checked={isTest} onChange={(e) => setIsTest(e.target.checked)} className="w-4 h-4 mt-0.5" />
              <span><strong>Test run.</strong> Output can only be published to the isolated test catalog, never the public storefront.</span>
            </label>
            <div>
              <label htmlFor="s-budget" className={lbl}>Cost cap for this job (US$)</label>
              <input id="s-budget" type="number" min={0.01} max={1} step={0.05} value={budget} onChange={(e) => setBudget(e.target.value)} aria-invalid={!budgetValid} aria-describedby="s-budget-help" className={input} />
              <p id="s-budget-help" className={`text-[11px] mt-1 ${budgetValid ? 'text-slate-500' : 'text-rose-700 font-semibold'}`}>
                {budgetValid ? 'The server stops the job before exceeding this amount.' : 'Enter an amount above 0 and at most 1.00.'}
              </p>
            </div>
            <p className="text-[11px] text-slate-600 bg-violet-50 border border-violet-100 rounded-xl p-3 leading-relaxed">
              Only one synthetic test totalling US$1 has been authorized so far. Every other run spends real provider credit, so set an explicit cap you accept.
            </p>
          </div>

          {submitError && <p role="alert" className="text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-3">{submitError}</p>}

          <button type="submit" disabled={!canSubmit} aria-describedby="s-submit-note" className="w-full py-4 bg-gradient-to-r from-slate-950 via-indigo-900 to-slate-950 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-sm rounded-2xl shadow-xl flex items-center justify-center gap-2.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
            {create.isPending ? <><RefreshCw className="w-5 h-5 animate-spin text-amber-400" aria-hidden />Sending request…</> : !readinessOk ? <><Lock className="w-5 h-5 text-amber-400" aria-hidden />Generation unavailable</> : <><Sparkles className="w-5 h-5 text-amber-400" aria-hidden />Create draft for review</>}
          </button>
          <p id="s-submit-note" role="status" className="text-[11px] text-slate-500 text-center">
            {!readinessOk ? 'Generation is disabled until every readiness check passes. Your entries are kept.' : !formValid ? 'Add a source file, title, author, category and a valid cost cap.' : 'Creates a draft. Nothing is published automatically.'}
          </p>
        </div>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section aria-labelledby="jobs-heading" className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 p-6 space-y-3 self-start">
          <div className="flex items-center justify-between">
            <h4 id="jobs-heading" className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5"><History className="w-4 h-4 text-slate-500" aria-hidden />Recent jobs</h4>
            <button type="button" onClick={() => jobs.refetch()} disabled={jobs.isFetching || !accountId} aria-label="Refresh job list" className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${jobs.isFetching ? 'animate-spin' : ''}`} aria-hidden />
            </button>
          </div>
          {!accountId ? (
            <p className="text-xs text-slate-500">Sign in with an administrator account to see jobs.</p>
          ) : jobs.isLoading ? (
            <div className="space-y-2" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" />)}</div>
          ) : jobs.isError ? (
            <div role="alert" className="text-xs text-rose-800 space-y-1"><p>{describeError(jobs.error, 'Jobs could not be loaded.')}</p><button type="button" onClick={() => jobs.refetch()} className="font-bold underline cursor-pointer">Retry</button></div>
          ) : !jobs.data || jobs.data.length === 0 ? (
            <p className="text-xs text-slate-500 p-4 rounded-xl border border-dashed border-slate-200 text-center">No jobs yet. Created drafts are kept here across reloads.</p>
          ) : (
            <ul className="space-y-1.5 max-h-[28rem] overflow-y-auto pr-1">
              {jobs.data.map((j) => (
                <li key={j.id}>
                  <button type="button" onClick={() => selectJob(j.id)} aria-current={selectedId === j.id} className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer ${selectedId === j.id ? 'border-indigo-400 bg-indigo-50/60' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 truncate">{j.title}</span>
                      <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded border ${STATUS_STYLE[j.status]}`}>{j.status}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{j.isTest ? 'Test · ' : ''}{new Date(j.createdAt).toLocaleString()}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="lg:col-span-8">
          {selectedId && accountId ? (
            <PublishingJobDetail key={selectedId} jobId={selectedId} onPublished={handlePublished} />
          ) : (
            <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-10 text-center text-xs text-slate-500">Select a job to review its chapters, narration and EPUB.</div>
          )}
        </div>
      </div>
    </div>
  );
};
