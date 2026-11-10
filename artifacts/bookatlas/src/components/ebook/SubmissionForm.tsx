import React, { useEffect, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { LANGUAGES, validateIntake, type SubmissionIntake } from '@workspace/bookatlas-catalog/publishing';
import { PrintCalculator } from './PrintCalculator';

const EMPTY: SubmissionIntake = {
  title: '', subtitle: '', author: '', language: 'English', description: '', categories: [], keywords: [],
  copyrightHolder: '', copyrightYear: new Date().getFullYear(), ebookIsbn: '', price: 0, rightsConfirmed: false,
  aiContent: 'none', wantsPrint: false, binding: 'paperback', trimSize: '6x9', paper: 'cream', pageCount: undefined,
  printIsbn: '', backCoverBlurb: '', authorBio: '',
};

const field = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-indigo-500';
const label = 'block text-xs font-semibold text-slate-700';

/**
 * Asks for everything a complete eBook (and, optionally, a print edition) needs, then uploads the
 * EPUB. With `initial`, edits an existing submission; a corrected EPUB is optional unless `fileRequired`.
 */
export const SubmissionForm: React.FC<{
  categories: string[];
  initial?: SubmissionIntake;
  serverErrors?: Record<string, string>;
  progress?: { done: number; total: number } | null;
  busy: boolean;
  fileRequired?: boolean;
  onSubmit: (intake: SubmissionIntake, file: File | null) => void;
  onCancel?: () => void;
}> = ({ categories, initial, serverErrors, progress, busy, fileRequired = !initial, onSubmit, onCancel }) => {
  const [intake, setIntake] = useState<SubmissionIntake>(initial ?? EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => { if (serverErrors) setErrors(serverErrors); }, [serverErrors]);

  const set = <K extends keyof SubmissionIntake>(key: K, value: SubmissionIntake[K]) => setIntake((i) => ({ ...i, [key]: value }));
  const toggleCategory = (name: string) => set('categories', intake.categories.includes(name)
    ? intake.categories.filter((c) => c !== name) : [...intake.categories, name].slice(0, 3));
  const error = (key: string) => errors[key] && <p className="mt-1 text-xs text-rose-700" role="alert">{errors[key]}</p>;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateIntake(intake);
    if (fileRequired && !file) found.file = initial ? 'The last upload did not finish. Choose your EPUB file again.' : 'Choose your EPUB file.';
    setErrors(found);
    if (Object.keys(found).length) return;
    onSubmit(intake, file);
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <fieldset className="space-y-4">
        <legend className="font-serif text-lg font-bold text-slate-900">The book</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={label}>Title<input className={field} value={intake.title} onChange={(e) => set('title', e.target.value)} />{error('title')}</label>
          <label className={label}>Subtitle (optional)<input className={field} value={intake.subtitle ?? ''} onChange={(e) => set('subtitle', e.target.value)} /></label>
          <label className={label}>Author name<input className={field} value={intake.author} onChange={(e) => set('author', e.target.value)} />{error('author')}</label>
          <label className={label}>Language
            <select className={field} value={intake.language} onChange={(e) => set('language', e.target.value)}>
              {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
            </select>
          </label>
        </div>
        <label className={label}>Description <span className="font-normal text-slate-500">({intake.description.trim().length} of 150–4,000 characters)</span>
          <textarea className={`${field} min-h-28`} value={intake.description} onChange={(e) => set('description', e.target.value)} />{error('description')}
        </label>
        <div>
          <span className={label}>Categories <span className="font-normal text-slate-500">(one to three; the first is the main one)</span></span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[...new Set([...categories, ...intake.categories])].map((c) => {
              const on = intake.categories.includes(c);
              return (
                <button type="button" key={c} onClick={() => toggleCategory(c)} aria-pressed={on}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${on ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-400'}`}>
                  {on && `${intake.categories.indexOf(c) + 1}. `}{c}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex gap-2">
            <input className={`${field} mt-0`} placeholder="Suggest a new category" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
            <button type="button" className="shrink-0 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() => { if (newCategory.trim()) { toggleCategory(newCategory.trim()); setNewCategory(''); } }}>Add</button>
          </div>
          {error('categories')}
        </div>
        <label className={label}>Keywords <span className="font-normal text-slate-500">(up to seven, separated by commas)</span>
          <input className={field} value={intake.keywords.join(', ')} onChange={(e) => set('keywords', e.target.value.split(',').map((k) => k.trimStart()).slice(0, 7))} />{error('keywords')}
        </label>
        <label className={label}>Author bio (optional)<textarea className={`${field} min-h-20`} value={intake.authorBio ?? ''} onChange={(e) => set('authorBio', e.target.value)} />{error('authorBio')}</label>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-serif text-lg font-bold text-slate-900">Rights and price</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className={label}>Copyright holder<input className={field} value={intake.copyrightHolder} onChange={(e) => set('copyrightHolder', e.target.value)} />{error('copyrightHolder')}</label>
          <label className={label}>Copyright year<input className={field} type="number" value={intake.copyrightYear || ''} onChange={(e) => set('copyrightYear', Number(e.target.value))} />{error('copyrightYear')}</label>
          <label className={label}>eBook price (0 = free)<input className={field} type="number" min={0} step="0.01" value={intake.price} onChange={(e) => set('price', Number(e.target.value))} />{error('price')}</label>
        </div>
        <p className="-mt-2 text-xs text-slate-500">The copyright year must match the copyright page inside the book; stores reject a mismatch.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={label}>eBook ISBN (optional)<input className={field} value={intake.ebookIsbn ?? ''} onChange={(e) => set('ebookIsbn', e.target.value)} />{error('ebookIsbn')}</label>
          <label className={label}>AI-generated content
            <select className={field} value={intake.aiContent} onChange={(e) => set('aiContent', e.target.value as SubmissionIntake['aiContent'])}>
              <option value="none">None</option><option value="assisted">AI-assisted (I wrote it, AI helped)</option><option value="generated">AI-generated text or images</option>
            </select>
          </label>
        </div>
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" className="mt-1" checked={intake.rightsConfirmed} onChange={(e) => set('rightsConfirmed', e.target.checked)} />
          I own the rights to the text, images and fonts in this book, or have permission to publish them.
        </label>
        {error('rightsConfirmed')}
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-serif text-lg font-bold text-slate-900">Print edition</legend>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={!!intake.wantsPrint} onChange={(e) => set('wantsPrint', e.target.checked)} />
          I also want a paperback or hardcover
        </label>
        {intake.wantsPrint && (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className={label}>Binding
                <select className={field} value={intake.binding} onChange={(e) => set('binding', e.target.value as 'paperback' | 'hardcover')}>
                  <option value="paperback">Paperback</option><option value="hardcover">Hardcover</option>
                </select>{error('binding')}
              </label>
              <label className={label}>Print ISBN (one per format)<input className={field} value={intake.printIsbn ?? ''} onChange={(e) => set('printIsbn', e.target.value)} />{error('printIsbn')}</label>
            </div>
            <PrintCalculator trimSize={intake.trimSize ?? '6x9'} paper={intake.paper ?? 'cream'} pageCount={intake.pageCount ?? 0} binding={intake.binding}
              onChange={(n) => setIntake((i) => ({ ...i, ...n }))} />
            {error('pageCount')}
            <label className={label}>Back-cover text<textarea className={`${field} min-h-24`} value={intake.backCoverBlurb ?? ''} onChange={(e) => set('backCoverBlurb', e.target.value)} />{error('backCoverBlurb')}</label>
          </div>
        )}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="font-serif text-lg font-bold text-slate-900">{initial && !fileRequired ? 'Replace the EPUB (optional)' : 'Your EPUB'}</legend>
        <input type="file" accept=".epub,application/epub+zip" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-indigo-700" />
        <p className="text-xs text-slate-500">
          {initial
            ? 'Made corrections? Upload the new file. Your details and cover choice are kept, and the book is prepared and checked again. Leave this empty to keep the current file.'
            : 'Up to 150 MB. A full print-wrap cover is cropped to its front automatically.'}
        </p>
        {error('file')}
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Upload className="h-4 w-4" aria-hidden />}
          {!initial || file ? 'Upload and prepare' : 'Save and prepare again'}
        </button>
        {onCancel && <button type="button" onClick={onCancel} className="text-sm font-semibold text-slate-600 hover:text-slate-900">Cancel</button>}
        {progress && (
          <span className="text-xs text-slate-600" aria-live="polite">
            {progress.done < progress.total ? `Uploading part ${progress.done + 1} of ${progress.total}…` : 'Uploaded. Preparing your eBook…'}
          </span>
        )}
      </div>
    </form>
  );
};
