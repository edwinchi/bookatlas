import React, { useEffect, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { ArrowLeft, ArrowRight, BookMarked, BookOpen, Check, Headphones, Upload, Loader2, Sparkles, Undo2 } from 'lucide-react';
import { AUTHOR_SHARE, PLANS } from '../landing/earnings';
import { LANGUAGES, validateIntake, type SubmissionIntake } from '@workspace/bookatlas-catalog/publishing';
import { PrintCalculator } from './PrintCalculator';
import { ManuscriptPicker, ProgressBar } from './ManuscriptPicker';
import type { ConvertedManuscript } from './convert/convert';
import type { ManuscriptExcerpt } from './convert/excerpt';
import { LaunchPanel } from './LaunchPanel';

import { CheckBox, SelectBox } from '../ui/select-box';
/** The fields "fill from your book" may set; the form never overwrites what the author typed. */
const FILLABLE = ['title', 'subtitle', 'author', 'language', 'description', 'categories', 'keywords', 'copyrightHolder', 'copyrightYear', 'authorBio', 'backCoverBlurb'] as const;
type Fillable = typeof FILLABLE[number];
const FIELD_NAMES: Record<Fillable, string> = {
  title: 'title', subtitle: 'subtitle', author: 'author', language: 'language', description: 'description', categories: 'categories',
  keywords: 'keywords', copyrightHolder: 'copyright holder', copyrightYear: 'copyright year', authorBio: 'author bio', backCoverBlurb: 'back-cover text',
};
export type SuggestMetadata = (body: ManuscriptExcerpt) => Promise<{ source: 'ai' | 'book'; suggestion: Partial<SubmissionIntake> }>;

const EMPTY: SubmissionIntake = {
  title: '', subtitle: '', author: '', language: 'English', description: '', categories: [], keywords: [],
  copyrightHolder: '', copyrightYear: new Date().getFullYear(), ebookIsbn: '', price: 0, rightsConfirmed: false,
  aiContent: 'none', wantsPrint: false, binding: 'paperback', trimSize: '6x9', paper: 'cream', pageCount: undefined,
  printIsbn: '', backCoverBlurb: '', authorBio: '',
};

/** The publishing steps and the form fields each one checks. */
const STEPS = [
  { id: 'format', title: 'Format', hint: 'eBook, print, audio', fields: ['wantsPrint', 'binding', 'trimSize', 'paper', 'pageCount', 'printIsbn'] },
  { id: 'manuscript', title: 'Manuscript', hint: 'EPUB, Word or PDF', fields: ['file'] },
  { id: 'details', title: 'Details', hint: 'Title, description, categories', fields: ['title', 'subtitle', 'author', 'language', 'description', 'categories', 'keywords', 'authorBio', 'backCoverBlurb'] },
  { id: 'price', title: 'Rights & price', hint: 'What you earn', fields: ['price', 'copyrightHolder', 'copyrightYear', 'ebookIsbn', 'aiContent', 'rightsConfirmed'] },
  { id: 'review', title: 'Publish', hint: 'Check and upload', fields: [] as string[] },
] as const satisfies readonly { id: string; title: string; hint: string; fields: readonly string[] }[];
type StepId = typeof STEPS[number]['id'];
const EBOOK_VAT = 0.09;
const euro = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(n);

const StepHeading: React.FC<{ n: number; title: string; text: string }> = ({ n, title, text }) => (
  <div>
    <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-700">Step {n} of 5</p>
    <h3 className="mt-0.5 font-serif text-xl font-bold text-slate-900">{title}</h3>
    <p className="mt-1 text-sm text-slate-600">{text}</p>
  </div>
);

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
  /** Suggests the form's details from the manuscript (free AI model, then the book's own pages). */
  suggest?: SuggestMetadata;
  /** For a prepared book being edited: its cover size and preparation findings (Launch Score). */
  prepared?: { cover: { width: number; height: number } | null; findings: { errors: number; warnings: number } };
}> = ({ categories, initial, serverErrors, progress, busy, fileRequired = !initial, onSubmit, onCancel, suggest, prepared }) => {
  const [intake, setIntake] = useState<SubmissionIntake>(initial ?? EMPTY);
  const [file, setFile] = useState<File | null>(null);
  // A Word or PDF manuscript is converted here; the EPUB is packaged at submit with the form's latest details.
  const [manuscript, setManuscript] = useState<ConvertedManuscript | null>(null);
  const [converting, setConverting] = useState<{ fraction: number; label: string } | null>(null);
  const [convertError, setConvertError] = useState('');
  const convertRun = React.useRef(0);
  // The cover found in a converted manuscript, measured for the Launch Score.
  const [coverSize, setCoverSize] = useState<{ width: number; height: number } | null>(null);
  useEffect(() => {
    const c = manuscript?.cover;
    if (!c || typeof createImageBitmap !== 'function') { setCoverSize(null); return; }
    let cancelled = false;
    createImageBitmap(new Blob([c.data as Uint8Array<ArrayBuffer>], { type: c.mediaType }))
      .then((bmp) => { if (!cancelled) setCoverSize({ width: bmp.width, height: bmp.height }); bmp.close(); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [manuscript]);
  const focusField = (id: string) => {
    const labels: Record<string, string> = { title: 'Title', description: 'Description', categories: 'Categories', keywords: 'Keywords', bio: 'Author bio', price: 'eBook price', cover: 'Your manuscript' };
    const el = [...document.querySelectorAll('form label, form legend, form span')].find((n) => n.textContent?.trim().startsWith(labels[id] ?? '§'));
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    (el?.querySelector('input, textarea, select') as HTMLElement | null)?.focus({ preventScroll: true });
  };
  const [newCategory, setNewCategory] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => { if (serverErrors) setErrors(serverErrors); }, [serverErrors]);

  // Fields the author has typed in are theirs: automatic filling never changes them.
  const touched = React.useRef(new Set<string>(initial ? Object.keys(initial).filter((k) => {
    const v = (initial as unknown as Record<string, unknown>)[k];
    return Array.isArray(v) ? v.length > 0 : v !== '' && v !== undefined && v !== null;
  }) : []));
  const [filled, setFilled] = useState<{ fields: Fillable[]; source: 'ai' | 'book'; before: SubmissionIntake } | null>(null);
  const [filling, setFilling] = useState(false);
  const [fillNote, setFillNote] = useState('');
  const set = <K extends keyof SubmissionIntake>(key: K, value: SubmissionIntake[K]) => {
    touched.current.add(key);
    setIntake((i) => ({ ...i, [key]: value }));
  };
  const badge = (key: Fillable) => filled?.fields.includes(key) && !touched.current.has(key)
    ? <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-violet-100 px-1.5 py-0.5 align-middle text-[10px] font-semibold text-violet-800"><Sparkles className="h-2.5 w-2.5" aria-hidden />from your book</span>
    : null;

  const intakeRef = React.useRef(intake);
  intakeRef.current = intake;
  // Fields filled automatically (from the book or by AI) that the author has not changed since.
  const autoFilled = React.useRef(new Set<Fillable>());
  const fillRun = React.useRef(0);

  /**
   * Put values in the form: empty or still-default fields, and, when `improve` is set, fields filled
   * automatically earlier. Fields the author typed in are never changed.
   */
  const apply = (values: Partial<SubmissionIntake>, source: 'ai' | 'book', improve: boolean) => {
    const current = intakeRef.current;
    const next = { ...current } as Record<string, unknown>;
    const fields: Fillable[] = [];
    for (const key of FILLABLE) {
      const value = (values as Record<string, unknown>)[key];
      if (value === undefined || touched.current.has(key)) continue;
      const now = next[key];
      const isDefault = (key === 'language' && now === EMPTY.language) || (key === 'copyrightYear' && now === EMPTY.copyrightYear);
      const empty = Array.isArray(now) ? now.length === 0 : now === '' || now === undefined || now === null;
      if (!empty && !isDefault && !(improve && autoFilled.current.has(key))) continue;
      if (JSON.stringify(now) === JSON.stringify(value)) { autoFilled.current.add(key); continue; }
      next[key] = value;
      fields.push(key);
      autoFilled.current.add(key);
    }
    if (!fields.length) return 0;
    intakeRef.current = next as unknown as SubmissionIntake;
    setIntake(intakeRef.current);
    setFilled((f) => ({ fields: [...new Set([...(f?.fields ?? []), ...fields])], source: f?.source === 'ai' || source === 'ai' ? 'ai' : 'book', before: f?.before ?? current }));
    setErrors((e) => { const rest = { ...e }; for (const f of fields) delete rest[f]; return rest; });
    return fields.length;
  };

  /**
   * Fill the form from the manuscript: at once from the book itself (no AI needed), then improved by AI
   * suggestions when they arrive. When AI is unavailable, slow or busy, the book's own details stay.
   */
  const autofill = async (excerpt: ManuscriptExcerpt) => {
    const run = ++fillRun.current;
    setFillNote('');
    const { localDetails } = await import('./convert/localMetadata');
    const found = apply(localDetails(excerpt, categories), 'book', false);
    if (!suggest || excerpt.excerpt.replace(/\s+/g, ' ').trim().length < 200) {
      if (!found) setFillNote('No details could be read from this file; please type them in.');
      return;
    }
    setFilling(true);
    try {
      const result = await Promise.race([
        suggest(excerpt),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 25_000)),
      ]);
      if (run !== fillRun.current) return;
      if (result?.source === 'ai') apply(result.suggestion, 'ai', true);
      else if (result) apply(result.suggestion, 'book', false);
      if (!result || result.source !== 'ai') setFillNote('AI suggestions are not available right now, so the details were taken from your book. Please check them.');
    } catch {
      if (run === fillRun.current) setFillNote('AI suggestions are not available right now, so the details were taken from your book. Please check them.');
    } finally {
      if (run === fillRun.current) setFilling(false);
    }
  };
  const undoFill = () => { if (filled) { setIntake(filled.before); intakeRef.current = filled.before; autoFilled.current.clear(); setFilled(null); } };
  const toggleCategory = (name: string) => set('categories', intake.categories.includes(name)
    ? intake.categories.filter((c) => c !== name) : [...intake.categories, name].slice(0, 3));
  const error = (key: string) => errors[key] && <p className="mt-1 text-xs text-rose-700" role="alert">{errors[key]}</p>;

  const epubMeta = () => ({
    title: intake.title.trim(), subtitle: intake.subtitle?.trim() || undefined, author: intake.author.trim(), language: intake.language,
    description: intake.description.trim(), categories: intake.categories, copyrightHolder: intake.copyrightHolder.trim() || intake.author.trim(),
    copyrightYear: intake.copyrightYear, isbn: intake.ebookIsbn?.trim() || undefined,
  });

  const pickFile = async (picked: File) => {
    setConvertError(''); setManuscript(null);
    setErrors((e) => { const { file: _f, ...rest } = e; return rest; });
    setFile(picked);
    const { convertibleKind, readManuscript } = await import('./convert/convert');
    if (!convertibleKind(picked)) {
      if (!/\.epub$/i.test(picked.name) && picked.type !== 'application/epub+zip') { setFile(null); setConvertError('Choose an EPUB, Word (.docx) or PDF file.'); return; }
      const { excerptFromEpub } = await import('./convert/excerpt');
      excerptFromEpub(picked).then(autofill).catch(() => undefined);
      return;
    }
    const run = ++convertRun.current;
    setConverting({ fraction: 0, label: 'Starting the conversion…' });
    try {
      const result = await readManuscript(picked, intake.copyrightYear, (fraction, label) => { if (run === convertRun.current) setConverting({ fraction, label }); });
      if (run === convertRun.current) {
        setManuscript(result);
        const { excerptFromManuscript } = await import('./convert/excerpt');
        void autofill(excerptFromManuscript(result));
      }
    } catch (err) {
      if (run === convertRun.current) { setFile(null); setConvertError(err instanceof Error ? err.message : 'The file could not be converted.'); }
    } finally {
      if (run === convertRun.current) setConverting(null);
    }
  };
  const clearFile = () => { convertRun.current += 1; setFile(null); setManuscript(null); setConverting(null); setConvertError(''); };
  const downloadEpub = async () => {
    if (!manuscript) return;
    const { packageEpub } = await import('./convert/convert');
    const epub = packageEpub(manuscript, epubMeta());
    const url = URL.createObjectURL(epub);
    Object.assign(document.createElement('a'), { href: url, download: epub.name }).click();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };

  // The publishing steps (owner request 2026-11-23, after Lulu's flow): format, manuscript, details, rights and
  // price, review. Every step can be revisited; "Next" checks only the step's own fields.
  const firstStep: StepId = initial ? 'details' : 'format';
  const [step, setStep] = useState<StepId>(firstStep);
  const [visited, setVisited] = useState<Set<StepId>>(() => new Set([firstStep]));
  const go = (to: StepId) => {
    setStep(to);
    setVisited((v) => new Set(v).add(to));
    requestAnimationFrame(() => document.getElementById('publish-steps')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const problems = (): Record<string, string> => {
    const found = validateIntake(intake);
    if (fileRequired && !file) found.file = initial ? 'The last upload did not finish. Choose your file again.' : 'Choose your manuscript: an EPUB, Word or PDF file.';
    return found;
  };
  const stepOf = (key: string): StepId => STEPS.find((s) => (s.fields as readonly string[]).includes(key))?.id ?? 'review';
  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const next = () => {
    const found = problems();
    const here = Object.fromEntries(Object.entries(found).filter(([k]) => stepOf(k) === step));
    setErrors((e) => {
      const rest = Object.fromEntries(Object.entries(e).filter(([k]) => stepOf(k) !== step));
      return { ...rest, ...here };
    });
    if (Object.keys(here).length) return;
    go(STEPS[Math.min(STEPS.length - 1, stepIndex + 1)]!.id);
  };
  const stepHasErrors = (id: StepId) => Object.keys(errors).some((k) => stepOf(k) === id);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (converting) return;
    if (step !== 'review') { next(); return; }
    const found = problems();
    setErrors(found);
    const keys = Object.keys(found);
    if (keys.length) { go(STEPS.find((s) => keys.some((k) => (s.fields as readonly string[]).includes(k)))?.id ?? 'details'); return; }
    // Package the converted manuscript with the details as they are now (title, author, copyright, ISBN).
    const upload = manuscript ? (await import('./convert/convert')).packageEpub(manuscript, epubMeta()) : file;
    onSubmit(intake, upload);
  };

  const perSale = (price: number, share: number) => euro((Math.max(0, price) / (1 + EBOOK_VAT)) * share);
  const manuscriptStep = (
    <fieldset className="space-y-2">
      <legend className="sr-only">{initial && !fileRequired ? 'Replace the manuscript (optional)' : 'Your manuscript'}</legend>
      <p className="text-sm text-slate-600">
        {initial && !fileRequired
          ? 'Your book is already uploaded. Choose a corrected file only if you want to replace it.'
          : 'Choose your EPUB, Word or PDF file. We fill in the next steps from your book: title, author, description, categories and keywords.'}
      </p>
      <p className="text-xs text-slate-500">
        A Word or PDF file is converted to EPUB on your device. To suggest the description, categories and keywords, the opening pages are sent to a free AI model (OpenRouter or Google Gemini). Your cover is the first image in the file{!initial && '; a full print-wrap cover is cropped to its front automatically'}.
      </p>
      <ManuscriptPicker file={file} manuscript={manuscript} converting={converting} error={convertError} required={fileRequired}
        replacing={!!initial && !fileRequired} onPick={(f) => void pickFile(f)} onClear={clearFile} onDownload={() => void downloadEpub()} />
      {error('file')}
    </fieldset>
  );

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <Tabs.Root id="publish-steps" value={step} onValueChange={(v) => go(v as StepId)} className="scroll-mt-40">
        <Tabs.List aria-label="Publishing steps" className="grid grid-cols-5 gap-1 rounded-2xl bg-slate-100 p-1">
          {STEPS.map((s, i) => {
            const done = visited.has(s.id) && i < stepIndex && !stepHasErrors(s.id);
            return (
              <Tabs.Trigger key={s.id} value={s.id}
                className="group flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-center outline-none transition-colors hover:bg-white/70 focus-visible:ring-2 focus-visible:ring-indigo-500 data-[state=active]:bg-white data-[state=active]:shadow-sm cursor-pointer sm:flex-row sm:gap-2 sm:px-3 sm:text-left">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${stepHasErrors(s.id) ? 'bg-rose-600 text-white' : done ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700 group-data-[state=active]:bg-indigo-600 group-data-[state=active]:text-white'}`}>
                  {stepHasErrors(s.id) ? '!' : done ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[11px] font-bold text-slate-900 sm:text-xs">{s.title}</span>
                  <span className="hidden truncate text-[10px] text-slate-500 lg:block">{s.hint}</span>
                </span>
              </Tabs.Trigger>
            );
          })}
        </Tabs.List>

        {filling && (
          <p role="status" className="mt-4 flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-900">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />Improving the details with AI… You can already continue.
          </p>
        )}
        {filled && (
          <div role="status" className="mt-4 flex flex-wrap items-start gap-3 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-xs text-violet-950">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" aria-hidden />
            <p className="min-w-0 flex-1">
              Filled in from your book{filled.source === 'ai' ? ' and improved with AI' : ''}: {filled.fields.map((f) => FIELD_NAMES[f]).join(', ')}. Please check them; you can change anything.
            </p>
            <button type="button" onClick={undoFill} className="inline-flex items-center gap-1 font-semibold text-violet-800 hover:underline cursor-pointer"><Undo2 className="h-3.5 w-3.5" aria-hidden />Undo</button>
          </div>
        )}
        {fillNote && !filling && <p role="status" className="mt-4 text-xs text-slate-600">{fillNote}</p>}

        {/* 1. Format: the eBook, and a print edition if wanted */}
        <Tabs.Content value="format" className="mt-5 space-y-4 outline-none">
          <StepHeading n={1} title="Choose your formats" text="Every book is published as an eBook. Add a paperback or hardcover and we size the print files for Amazon KDP and Lulu." />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border-2 border-indigo-600 bg-indigo-50/60 p-4">
              <BookOpen className="h-5 w-5 text-indigo-700" aria-hidden />
              <p className="mt-2 text-sm font-bold text-slate-900">eBook</p>
              <p className="mt-0.5 text-xs text-slate-600">Sold on BooksAtlas worldwide. You keep 81% of every sale.</p>
              <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-800"><Check className="h-3.5 w-3.5" aria-hidden />Always included</p>
            </div>
            <label className={`block cursor-pointer rounded-2xl border-2 p-4 transition-colors ${intake.wantsPrint ? 'border-indigo-600 bg-indigo-50/60' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
              <BookMarked className="h-5 w-5 text-indigo-700" aria-hidden />
              <span className="mt-2 block text-sm font-bold text-slate-900">Print edition</span>
              <span className="mt-0.5 block text-xs text-slate-600">Paperback or hardcover files for KDP and Lulu, sized to your book.</span>
              <span className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-slate-700">
                <CheckBox checked={!!intake.wantsPrint} onChange={(e) => set('wantsPrint', e.target.checked)} />I want a print edition
              </span>
            </label>
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-4">
              <Headphones className="h-5 w-5 text-indigo-700" aria-hidden />
              <p className="mt-2 text-sm font-bold text-slate-900">Audiobook</p>
              <p className="mt-0.5 text-xs text-slate-600">Add a natural-voice narration once your eBook is live, from €24.99.</p>
              <p className="mt-2 text-[11px] font-semibold text-slate-500">After publishing</p>
            </div>
          </div>
          {intake.wantsPrint && (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className={label}>Binding
                  <SelectBox className={field} value={intake.binding} onChange={(e) => set('binding', e.target.value as 'paperback' | 'hardcover')}>
                    <option value="paperback">Paperback</option><option value="hardcover">Hardcover</option>
                  </SelectBox>{error('binding')}
                </label>
                <label className={label}>Print ISBN (one per format)<input className={field} value={intake.printIsbn ?? ''} onChange={(e) => set('printIsbn', e.target.value)} />{error('printIsbn')}</label>
              </div>
              <PrintCalculator trimSize={intake.trimSize ?? '6x9'} paper={intake.paper ?? 'cream'} pageCount={intake.pageCount ?? 0} binding={intake.binding}
                onChange={(n) => setIntake((i) => ({ ...i, ...n }))} />
              {error('pageCount')}{error('trimSize')}{error('paper')}
            </div>
          )}
        </Tabs.Content>

        {/* 2. Manuscript */}
        <Tabs.Content value="manuscript" className="mt-5 space-y-4 outline-none">
          <StepHeading n={2} title={initial && !fileRequired ? 'Replace the manuscript (optional)' : 'Upload your manuscript'} text="EPUB, Word (.docx) or PDF." />
          {manuscriptStep}
        </Tabs.Content>

        {/* 3. Details and cover */}
        <Tabs.Content value="details" className="mt-5 space-y-4 outline-none">
          <StepHeading n={3} title="Details and cover" text="What readers see in the store. We filled in what we could from your book." />
          <fieldset className="space-y-4">
            <legend className="sr-only">The book</legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className={label}>Title{badge('title')}<input className={field} value={intake.title} onChange={(e) => set('title', e.target.value)} />{error('title')}</label>
              <label className={label}>Subtitle (optional){badge('subtitle')}<input className={field} value={intake.subtitle ?? ''} onChange={(e) => set('subtitle', e.target.value)} />{error('subtitle')}</label>
              <label className={label}>Author name{badge('author')}<input className={field} value={intake.author} onChange={(e) => set('author', e.target.value)} />{error('author')}</label>
              <label className={label}>Language{badge('language')}
                <SelectBox className={field} value={intake.language} onChange={(e) => set('language', e.target.value)}>
                  {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
                </SelectBox>{error('language')}
              </label>
            </div>
            <label className={label}>Description{badge('description')} <span className="font-normal text-slate-500">({intake.description.trim().length} of 150–4,000 characters)</span>
              <textarea className={`${field} min-h-28`} value={intake.description} onChange={(e) => set('description', e.target.value)} />{error('description')}
            </label>
            <div>
              <span className={label}>Categories{badge('categories')} <span className="font-normal text-slate-500">(one to three; the first is the main one)</span></span>
              <div className="mt-2 flex max-h-56 flex-wrap gap-1.5 overflow-y-auto">
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
            <label className={label}>Keywords{badge('keywords')} <span className="font-normal text-slate-500">(up to seven, separated by commas)</span>
              <input className={field} value={intake.keywords.join(', ')} onChange={(e) => set('keywords', e.target.value.split(',').map((k) => k.trimStart()).slice(0, 7))} />{error('keywords')}
            </label>
            <label className={label}>Author bio (optional){badge('authorBio')}<textarea className={`${field} min-h-20`} value={intake.authorBio ?? ''} onChange={(e) => set('authorBio', e.target.value)} />{error('authorBio')}</label>
            {intake.wantsPrint && (
              <label className={label}>Back-cover text{badge('backCoverBlurb')}<textarea className={`${field} min-h-24`} value={intake.backCoverBlurb ?? ''} onChange={(e) => set('backCoverBlurb', e.target.value)} />{error('backCoverBlurb')}</label>
            )}
          </fieldset>
        </Tabs.Content>

        {/* 4. Rights and price, with what the author earns */}
        <Tabs.Content value="price" className="mt-5 space-y-4 outline-none">
          <StepHeading n={4} title="Rights and price" text="Set your price and see what you earn on every sale." />
          <fieldset className="space-y-4">
            <legend className="sr-only">Rights and price</legend>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_16rem]">
              <div className="space-y-4">
                <label className={label}>eBook price in euros, VAT included (0 = free)<input className={field} type="number" min={0} step="0.01" value={intake.price} onChange={(e) => set('price', Number(e.target.value))} />{error('price')}</label>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className={label}>Copyright holder{badge('copyrightHolder')}<input className={field} value={intake.copyrightHolder} onChange={(e) => set('copyrightHolder', e.target.value)} />{error('copyrightHolder')}</label>
                  <label className={label}>Copyright year{badge('copyrightYear')}<input className={field} type="number" value={intake.copyrightYear || ''} onChange={(e) => set('copyrightYear', Number(e.target.value))} />{error('copyrightYear')}</label>
                </div>
                <p className="-mt-2 text-xs text-slate-500">The copyright year must match the copyright page inside the book; stores reject a mismatch.</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className={label}>eBook ISBN (optional)<input className={field} value={intake.ebookIsbn ?? ''} onChange={(e) => set('ebookIsbn', e.target.value)} />{error('ebookIsbn')}</label>
                  <label className={label}>AI-generated content
                    <SelectBox className={field} value={intake.aiContent} onChange={(e) => set('aiContent', e.target.value as SubmissionIntake['aiContent'])}>
                      <option value="none">None</option><option value="assisted">AI-assisted (I wrote it, AI helped)</option><option value="generated">AI-generated text or images</option>
                    </SelectBox>{error('aiContent')}
                  </label>
                </div>
                <label className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckBox className="mt-1" checked={intake.rightsConfirmed} onChange={(e) => set('rightsConfirmed', e.target.checked)} />
                  I own the rights to the text, images and fonts in this book, or have permission to publish them.
                </label>
                {error('rightsConfirmed')}
              </div>
              <aside aria-label="What you earn" className="h-fit rounded-2xl bg-[linear-gradient(135deg,#232272,#4338ca)] p-4 text-white shadow-lg shadow-indigo-900/20">
                <p className="text-[11px] font-bold uppercase tracking-widest text-amber-200">You earn per sale</p>
                <p className="mt-1 font-serif text-3xl font-bold">{intake.price > 0 ? perSale(intake.price, AUTHOR_SHARE) : '€0.00'}</p>
                <p className="mt-1 text-xs text-indigo-100">81% of the price excluding VAT (9% in the Netherlands). No setup fee, no delivery fee.</p>
                {intake.price > 0 && (
                  <p className="mt-3 border-t border-white/15 pt-3 text-xs text-indigo-100">With Author Pro (€9.99 a month) you keep 91%: <b className="text-white">{perSale(intake.price, 1 - PLANS.pro.commission)}</b> per sale.</p>
                )}
              </aside>
            </div>
          </fieldset>
        </Tabs.Content>

        {/* 5. Review and publish */}
        <Tabs.Content value="review" className="mt-5 space-y-4 outline-none">
          <StepHeading n={5} title="Review and publish" text="Check your Launch Score, then upload. We prepare your eBook and tell you if anything needs fixing." />
          <LaunchPanel intake={intake} words={manuscript?.report.words}
            cover={prepared ? prepared.cover : manuscript ? (manuscript.cover ? coverSize ?? undefined : null) : undefined}
            findings={prepared?.findings}
            onUsePrice={(price) => set('price', price)} onFocusField={(id) => { go(id === 'cover' ? 'manuscript' : id === 'price' ? 'price' : 'details'); setTimeout(() => focusField(id), 250); }} />
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm sm:grid-cols-2">
            <div><dt className="text-xs text-slate-500">Title</dt><dd className="font-semibold text-slate-900">{intake.title || '—'}</dd></div>
            <div><dt className="text-xs text-slate-500">Author</dt><dd className="font-semibold text-slate-900">{intake.author || '—'}</dd></div>
            <div><dt className="text-xs text-slate-500">Formats</dt><dd className="font-semibold text-slate-900">eBook{intake.wantsPrint ? ` + ${intake.binding === 'hardcover' ? 'hardcover' : 'paperback'} (${intake.trimSize})` : ''}</dd></div>
            <div><dt className="text-xs text-slate-500">Manuscript</dt><dd className="font-semibold text-slate-900">{file?.name ?? (initial ? 'Already uploaded' : '—')}</dd></div>
            <div><dt className="text-xs text-slate-500">Categories</dt><dd className="font-semibold text-slate-900">{intake.categories.join(', ') || '—'}</dd></div>
            <div><dt className="text-xs text-slate-500">Price</dt><dd className="font-semibold text-slate-900">{intake.price > 0 ? `${euro(intake.price)} · you earn ${perSale(intake.price, AUTHOR_SHARE)}` : 'Free'}</dd></div>
          </dl>
          {Object.keys(errors).length > 0 && (
            <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">Some steps need attention: they are marked with “!” above.</p>
          )}
        </Tabs.Content>
      </Tabs.Root>

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
        {stepIndex > 0 && (
          <button type="button" onClick={() => go(STEPS[stepIndex - 1]!.id)} className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
            <ArrowLeft className="h-4 w-4" aria-hidden />Back
          </button>
        )}
        {step !== 'review' ? (
          <button type="button" onClick={next} disabled={!!converting} className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60 cursor-pointer">
            Next: {STEPS[stepIndex + 1]!.title}<ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        ) : (
          <button type="submit" disabled={busy || !!converting} className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60 cursor-pointer">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Upload className="h-4 w-4" aria-hidden />}
            {!initial || file ? 'Upload and prepare' : 'Save and prepare again'}
          </button>
        )}
        {onCancel && <button type="button" onClick={onCancel} className="text-sm font-semibold text-slate-600 hover:text-slate-900">Cancel</button>}
        <span className="ml-auto text-xs text-slate-500">Step {stepIndex + 1} of {STEPS.length}</span>
        {progress && (
          <div className="w-full sm:w-80">
            <ProgressBar value={progress.total ? (progress.done / progress.total) * 100 : 0}
              label={progress.done < progress.total ? `Uploading part ${progress.done + 1} of ${progress.total}…` : 'Uploaded. Preparing your eBook…'} />
          </div>
        )}
      </div>
    </form>
  );
};
