import React, { useEffect, useRef, useState } from 'react';
import * as Checkbox from '@radix-ui/react-checkbox';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { ArrowUpRight, Check, CheckCircle2, FileText, FileUp, Loader2, Ruler, Store, UploadCloud, X } from 'lucide-react';
import { PAPERS, TRIM_SIZES, inchesToMm, printCoverSpec, type PaperId, type TrimSizeId } from '@workspace/bookatlas-catalog/publishing';
import { AtlasStar } from './AtlasStar';
import { enquiryHref, openEnquiry } from '../StartBookDialog';

/**
 * "How it works" (owner request 2026-11-18, "code and set this up"): each step's picture is a working tool.
 * 1 reads the dropped manuscript in the browser (nothing is uploaded), 2 calculates the spine and cover from it,
 * 3 is the KDP / Lulu checklist, kept on this device, and 4 leads to the store and the enquiry form.
 */
interface Manuscript { name: string; size: number; kind: 'pdf' | 'epub' | 'docx' | 'other'; pages: number | null; reading: boolean }
interface Print { trimSize: TrimSizeId; paper: PaperId; pages: number }

const kindOf = (name: string): Manuscript['kind'] => (/\.pdf$/i.test(name) ? 'pdf' : /\.epub$/i.test(name) ? 'epub' : /\.docx?$/i.test(name) ? 'docx' : 'other');
const sizeLabel = (b: number) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const titleFrom = (name: string) => name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

async function pdfPages(file: File): Promise<number | null> {
  try {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const n = doc.numPages;
    await doc.destroy();
    return n;
  } catch { return null; }
}

const button = 'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer';
const chip = 'rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 data-[state=on]:border-indigo-600 data-[state=on]:bg-indigo-600 data-[state=on]:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer';

function ManuscriptTool({ file, onFile, onClear, onEbook }: { file: Manuscript | null; onFile: (f: File) => void; onClear: () => void; onEbook: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div className="w-full max-w-xs space-y-3 rounded-2xl bg-white p-4 shadow-xl ring-1 ring-indigo-100">
      {file ? (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><FileText className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <div className="flex justify-between gap-2 text-xs">
              <span className="truncate font-semibold text-slate-800">{file.name}</span>
              <span className="shrink-0 text-slate-500">{file.reading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-label="Reading" /> : file.pages ? `${file.pages} pages` : sizeLabel(file.size)}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full bg-gradient-to-r from-indigo-500 to-amber-400 transition-[width] duration-700 ${file.reading ? 'w-1/2' : 'w-full'}`} /></div>
          </div>
          <button type="button" onClick={onClear} aria-label="Remove the manuscript" className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
      ) : (
        <p className="text-xs text-slate-600">Drop your manuscript to see its page count and spine. It stays on your device.</p>
      )}
      <button type="button" onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
        className={`flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${over ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-indigo-200 text-indigo-600 hover:border-indigo-400'}`}>
        <UploadCloud className="h-4 w-4" aria-hidden />{file ? 'Choose another file' : 'Drop files here or choose one'}
      </button>
      <input ref={input} type="file" accept=".pdf,.epub,.doc,.docx,application/pdf,application/epub+zip" className="sr-only" tabIndex={-1} aria-label="Manuscript file"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
      {file && !file.reading && (
        <div className="flex flex-wrap gap-2">
          {(file.kind === 'epub' || file.kind === 'pdf') && <button type="button" onClick={onEbook} className={`${button} bg-slate-900 text-white hover:bg-slate-700`}>Publish the eBook</button>}
          <button type="button" onClick={() => openEnquiry('print', { title: titleFrom(file.name), pages: file.pages ?? undefined, formats: ['paperback'] })}
            className={`${button} border border-indigo-200 text-indigo-700 hover:bg-indigo-50`}>Get print-ready files</button>
        </div>
      )}
    </div>
  );
}

function PrintTool({ print, onChange }: { print: Print; onChange: (p: Print) => void }) {
  const spec = printCoverSpec(print.trimSize, print.paper, print.pages || 24, 'paperback');
  const trim = TRIM_SIZES.find((t) => t.id === print.trimSize)!;
  return (
    <div className="w-full max-w-xs space-y-3 rounded-2xl bg-white p-4 shadow-xl ring-1 ring-indigo-100">
      <ToggleGroup.Root type="single" value={print.trimSize} onValueChange={(v) => v && onChange({ ...print, trimSize: v as TrimSizeId })} aria-label="Trim size" className="flex flex-wrap gap-1.5">
        {TRIM_SIZES.map((t) => <ToggleGroup.Item key={t.id} value={t.id} className={chip}>{t.width} × {t.height}</ToggleGroup.Item>)}
      </ToggleGroup.Root>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[11px] font-semibold text-slate-600">Paper
          <select value={print.paper} onChange={(e) => onChange({ ...print, paper: e.target.value as PaperId })} className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
            {PAPERS.map((p) => <option key={p.id} value={p.id}>{p.id === 'color' ? 'Colour' : p.id === 'white' ? 'White' : 'Cream'}</option>)}
          </select>
        </label>
        <label className="text-[11px] font-semibold text-slate-600">Pages
          <input type="number" inputMode="numeric" min={24} max={828} value={print.pages || ''} onChange={(e) => onChange({ ...print, pages: Number(e.target.value) })}
            className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2 text-xs tabular-nums text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" />
        </label>
      </div>
      <dl className="flex flex-wrap gap-1.5" aria-live="polite">
        {[['Trim', `${trim.width} × ${trim.height} in`], ['Bleed', `${inchesToMm(0.125)} mm`], ['Spine', `${inchesToMm(spec.spineIn)} mm`], ['Cover', `${spec.widthIn.toFixed(2)} × ${spec.heightIn.toFixed(2)} in`]].map(([k, v]) => (
          <div key={k} className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] ring-1 ring-slate-200"><dt className="sr-only">{k}</dt><dd className="font-semibold text-slate-700">{k === 'Trim' ? v : `${k} ${v}`}</dd></div>
        ))}
      </dl>
      {spec.problems.length > 0 && <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-900 ring-1 ring-inset ring-amber-200">{spec.problems[0]}</p>}
    </div>
  );
}

const CHECKLIST = [
  { id: 'interior', label: 'Interior PDF checked' },
  { id: 'cover', label: 'Cover PDF with spine' },
  { id: 'isbn', label: 'ISBN and trim confirmed' },
  { id: 'upload', label: 'Upload in your own account' },
];
const CHECK_KEY = 'bookatlas:print-checklist:v1';

function ChecklistTool() {
  const [done, setDone] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem(CHECK_KEY) ?? '[]'); } catch { return []; } });
  const toggle = (id: string, on: boolean) => setDone((d) => {
    const next = on ? [...new Set([...d, id])] : d.filter((x) => x !== id);
    try { localStorage.setItem(CHECK_KEY, JSON.stringify(next)); } catch { /* private mode */ }
    return next;
  });
  return (
    <div className="w-full max-w-xs space-y-3 rounded-2xl bg-white p-4 shadow-xl ring-1 ring-indigo-100">
      <ul className="space-y-2">
        {CHECKLIST.map((item) => {
          const on = done.includes(item.id);
          return (
            <li key={item.id}>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
                <Checkbox.Root checked={on} onCheckedChange={(c) => toggle(item.id, c === true)}
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${on ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white'}`}>
                  <Checkbox.Indicator><Check className="h-3 w-3" strokeWidth={3} /></Checkbox.Indicator>
                </Checkbox.Root>
                <span className={on ? 'text-slate-500 line-through decoration-slate-300' : ''}>{item.label}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] text-slate-500">{done.length} of {CHECKLIST.length} done · saved on this device</p>
      <div className="flex flex-wrap gap-2">
        <a href="https://kdp.amazon.com/" target="_blank" rel="noopener noreferrer" className={`${button} border border-slate-200 text-slate-700 hover:bg-slate-50`}>Amazon KDP <ArrowUpRight className="h-3 w-3" /></a>
        <a href="https://www.lulu.com/" target="_blank" rel="noopener noreferrer" className={`${button} border border-slate-200 text-slate-700 hover:bg-slate-50`}>Lulu <ArrowUpRight className="h-3 w-3" /></a>
      </div>
    </div>
  );
}

function SellTool({ onBrowse }: { onBrowse: () => void }) {
  return (
    <div className="flex w-full max-w-xs gap-4 rounded-2xl bg-white p-4 shadow-xl ring-1 ring-indigo-100">
      <div className="flex aspect-[2/3] w-20 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-indigo-900 to-slate-950 shadow-lg" aria-hidden>
        <AtlasStar className="h-7 w-7 text-amber-300" />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-xs text-slate-600">Every book page has Buy eBook and a link to your paperback listing.</p>
        <button type="button" onClick={onBrowse} className={`${button} w-full bg-indigo-600 text-white hover:bg-indigo-500`}>See the bookstore</button>
        <a href={enquiryHref('start')} className={`${button} w-full border border-slate-200 text-slate-700 hover:bg-slate-50`}>Start my book</a>
      </div>
    </div>
  );
}

const STEPS = [
  { title: 'Send us your manuscript', icon: FileUp,
    body: 'Share your finished manuscript as a PDF, or an EPUB for the eBook, and tell us the trim size, paper and feel you have in mind.' },
  { title: 'We prepare print-ready files', icon: Ruler,
    body: 'We set the interior to your trim size, calculate the spine from your page count, and check bleed, margins and embedded fonts against Amazon KDP and Lulu requirements.' },
  { title: 'You publish from your own account', icon: CheckCircle2,
    body: 'Upload the files to KDP or Lulu with our step-by-step checklist. Your account, ISBN choices and print royalties stay with you. We never ask for your password.' },
  { title: 'Readers find you everywhere', icon: Store,
    body: 'Your eBook goes on sale in the BooksAtlas store worldwide, and your book page sends paperback readers straight to your print listing.' },
];

/** Four steps with a sticky, scroll-linked progress rail on large screens. */
export const HowItWorks: React.FC<{ onNavigateSection?: (id: string) => void }> = ({ onNavigateSection }) => {
  const [active, setActive] = useState(0);
  const steps = useRef<(HTMLLIElement | null)[]>([]);
  const [file, setFile] = useState<Manuscript | null>(null);
  const [print, setPrint] = useState<Print>({ trimSize: '6x9', paper: 'cream', pages: 248 });

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    // A step becomes active as it crosses the middle band of the viewport.
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.step));
    }, { rootMargin: '-40% 0px -45% 0px' });
    steps.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const read = async (f: File) => {
    const kind = kindOf(f.name);
    setFile({ name: f.name, size: f.size, kind, pages: null, reading: kind === 'pdf' });
    if (kind !== 'pdf') return;
    const pages = await pdfPages(f);
    setFile((cur) => (cur && cur.name === f.name ? { ...cur, pages, reading: false } : cur));
    // The spine follows the manuscript (rounded up to an even page count, as printers do).
    if (pages) setPrint((p) => ({ ...p, pages: Math.max(24, pages + (pages % 2)) }));
  };

  const goTo = (i: number) => steps.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const tools = [
    <ManuscriptTool key="m" file={file} onFile={read} onClear={() => setFile(null)} onEbook={() => onNavigateSection?.('publish')} />,
    <PrintTool key="p" print={print} onChange={setPrint} />,
    <ChecklistTool key="c" />,
    <SellTool key="s" onBrowse={() => onNavigateSection?.('bookstore')} />,
  ];

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16">
      <div className="hidden lg:block">
        <nav aria-label="How it works steps" className="sticky top-32">
          <ol className="relative space-y-1 border-l-2 border-slate-200">
            <span aria-hidden className="absolute -left-0.5 top-0 w-0.5 bg-indigo-600 transition-[height] duration-500" style={{ height: `${((active + 1) / STEPS.length) * 100}%` }} />
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <button type="button" onClick={() => goTo(i)} aria-current={active === i ? 'step' : undefined}
                  className={`w-full cursor-pointer py-3 pl-6 text-left transition-colors ${active === i ? 'text-indigo-700' : 'text-slate-500 hover:text-slate-800'}`}>
                  <span className="block text-[11px] font-bold uppercase tracking-widest">Step {i + 1}</span>
                  <span className="mt-0.5 block font-serif text-lg font-bold">{step.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </div>

      <ol className="space-y-6 lg:space-y-10">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <li key={step.title} ref={(el) => { steps.current[i] = el; }} data-step={i} aria-labelledby={`how-step-${i}`}
              className={`grid scroll-mt-32 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 transition-[box-shadow,ring-color] duration-500 md:grid-cols-2 ${active === i ? 'shadow-xl shadow-indigo-900/5 ring-indigo-200' : 'ring-slate-200'}`}>
              <div className={`flex items-center justify-center bg-gradient-to-br from-indigo-50 to-amber-50/60 p-5 sm:p-8 ${i % 2 ? 'md:order-2' : ''}`}>
                {tools[i]}
              </div>
              <div className="flex flex-col justify-center gap-3 p-6 sm:p-8">
                <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-indigo-600"><Icon className="h-4 w-4" aria-hidden /> Step {i + 1}</span>
                <h3 id={`how-step-${i}`} className="font-serif text-xl font-bold text-slate-900 sm:text-2xl">{step.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{step.body}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
