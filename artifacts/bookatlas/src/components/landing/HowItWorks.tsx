import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, CheckCircle2, FileText, FileUp, Ruler, Store, UploadCloud } from 'lucide-react';
import { AtlasStar } from './AtlasStar';

interface Step {
  title: string;
  body: string;
  icon: React.ElementType;
  Visual: React.FC<{ active: boolean }>;
}

const UploadVisual: React.FC<{ active: boolean }> = ({ active }) => (
  <div className="w-full max-w-xs space-y-3 rounded-2xl bg-white p-4 shadow-xl ring-1 ring-indigo-100">
    {[{ name: 'manuscript.pdf', meta: '248 pages', fill: 'w-full' }, { name: 'cover-brief.txt', meta: 'Style notes', fill: 'w-3/5' }].map((f, i) => (
      <div key={f.name} className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><FileText className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex justify-between text-xs"><span className="truncate font-semibold text-slate-800">{f.name}</span><span className="text-slate-500">{f.meta}</span></div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div style={{ transitionDelay: `${i * 250}ms` }} className={`h-full rounded-full bg-gradient-to-r from-indigo-500 to-amber-400 transition-[width] duration-1000 ease-out ${active ? f.fill : 'w-0 motion-reduce:w-full'}`} />
          </div>
        </div>
      </div>
    ))}
    <div className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-indigo-200 py-3 text-xs font-semibold text-indigo-600"><UploadCloud className="h-4 w-4" /> Drop files here</div>
  </div>
);

const PrepareVisual: React.FC<{ active: boolean }> = ({ active }) => (
  <div className="relative w-full max-w-xs">
    <div className="relative mx-auto flex aspect-[3/2] w-full overflow-hidden rounded-lg bg-white shadow-xl ring-1 ring-indigo-100">
      <div className="flex-1 border-r border-slate-200 p-4"><div className="space-y-1.5">{Array.from({ length: 7 }, (_, i) => <div key={i} className={`h-1 rounded bg-slate-200 ${i === 6 ? 'w-2/3' : ''}`} />)}</div></div>
      <div className="flex-1 p-4"><div className="space-y-1.5">{Array.from({ length: 7 }, (_, i) => <div key={i} className={`h-1 rounded bg-slate-200 ${i === 3 ? 'w-1/2' : ''}`} />)}</div></div>
      {/* Bleed and margin guides */}
      <div className={`pointer-events-none absolute inset-2 rounded border border-dashed border-rose-400/70 transition-opacity duration-700 ${active ? 'opacity-100' : 'opacity-0 motion-reduce:opacity-100'}`} />
      <div className={`pointer-events-none absolute inset-5 rounded border border-dashed border-indigo-400/70 transition-opacity delay-300 duration-700 ${active ? 'opacity-100' : 'opacity-0 motion-reduce:opacity-100'}`} />
    </div>
    <div className="mt-3 flex flex-wrap justify-center gap-1.5">
      {['6 × 9 in', 'Bleed 3.2 mm', 'Spine 14.2 mm', 'Fonts embedded'].map((chip, i) => (
        <span key={chip} style={{ transitionDelay: `${300 + i * 120}ms` }} className={`rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition-[opacity,translate] duration-500 ${active ? 'opacity-100 translate-y-0' : 'motion-safe:opacity-0 motion-safe:translate-y-2'}`}>{chip}</span>
      ))}
    </div>
  </div>
);

const PublishVisual: React.FC<{ active: boolean }> = ({ active }) => (
  <ul className="w-full max-w-xs space-y-2.5 rounded-2xl bg-white p-4 shadow-xl ring-1 ring-indigo-100">
    {['Interior PDF checked', 'Cover PDF with spine', 'ISBN and trim confirmed', 'Upload in your own account'].map((item, i) => (
      <li key={item} className="flex items-center gap-2.5 text-sm text-slate-700">
        <CheckCircle2 style={{ transitionDelay: `${i * 200}ms` }} className={`h-5 w-5 shrink-0 transition-[color,scale] duration-500 ${active ? 'scale-100 text-emerald-500' : 'scale-75 text-slate-300 motion-reduce:scale-100'}`} />
        {item}
      </li>
    ))}
  </ul>
);

const SellVisual: React.FC<{ active: boolean }> = ({ active }) => (
  <div className={`flex w-full max-w-xs gap-4 rounded-2xl bg-white p-4 shadow-xl ring-1 ring-indigo-100 transition-transform duration-700 ${active ? 'motion-safe:-rotate-1' : ''}`}>
    <div className="flex aspect-[2/3] w-20 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-indigo-900 to-slate-950 shadow-lg">
      <AtlasStar className="h-7 w-7 text-amber-300" />
    </div>
    <div className="min-w-0 flex-1 space-y-2">
      <div className="h-2.5 w-4/5 rounded bg-slate-800" />
      <div className="h-2 w-1/2 rounded bg-slate-300" />
      <div className="rounded-lg bg-indigo-600 px-3 py-1.5 text-center text-xs font-bold text-white">Buy eBook</div>
      <div className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">Paperback <ArrowUpRight className="h-3 w-3" /></div>
    </div>
  </div>
);

const STEPS: Step[] = [
  {
    title: 'Send us your manuscript',
    body: 'Share your finished manuscript as a PDF, or an EPUB for the eBook, and tell us the trim size, paper and feel you have in mind.',
    icon: FileUp,
    Visual: UploadVisual,
  },
  {
    title: 'We prepare print-ready files',
    body: 'We set the interior to your trim size, calculate the spine from your page count, and check bleed, margins and embedded fonts against Amazon KDP and Lulu requirements.',
    icon: Ruler,
    Visual: PrepareVisual,
  },
  {
    title: 'You publish from your own account',
    body: 'Upload the files to KDP or Lulu with our step-by-step checklist. Your account, ISBN choices and print royalties stay with you. We never ask for your password.',
    icon: CheckCircle2,
    Visual: PublishVisual,
  },
  {
    title: 'Readers find you everywhere',
    body: 'Your eBook goes on sale in the BookAtlas store worldwide, and your book page sends paperback readers straight to your print listing.',
    icon: Store,
    Visual: SellVisual,
  },
];

/** Four steps with a sticky, scroll-linked progress rail on large screens. */
export const HowItWorks: React.FC = () => {
  const [active, setActive] = useState(0);
  // Illustrations stay complete once their step has been reached.
  const [reached, setReached] = useState(0);
  const steps = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    // A step becomes active as it crosses the middle band of the viewport.
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const step = Number((entry.target as HTMLElement).dataset.step);
        setActive(step);
        setReached((r) => Math.max(r, step));
      }
    }, { rootMargin: '-40% 0px -45% 0px' });
    steps.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const goTo = (i: number) => steps.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16">
      <div className="hidden lg:block">
        <nav aria-label="How it works steps" className="sticky top-32">
          <ol className="relative space-y-1 border-l-2 border-slate-200">
            <span aria-hidden className="absolute -left-0.5 top-0 w-0.5 bg-indigo-600 transition-[height] duration-500" style={{ height: `${((active + 1) / STEPS.length) * 100}%` }} />
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  aria-current={active === i ? 'step' : undefined}
                  className={`w-full cursor-pointer py-3 pl-6 text-left transition-colors ${active === i ? 'text-indigo-700' : 'text-slate-500 hover:text-slate-800'}`}
                >
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
          const isActive = active === i;
          return (
            <li
              key={step.title}
              ref={(el) => { steps.current[i] = el; }}
              data-step={i}
              className={`grid scroll-mt-32 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 transition-[box-shadow,ring-color] duration-500 md:grid-cols-2 ${isActive ? 'shadow-xl shadow-indigo-900/5 ring-indigo-200' : 'ring-slate-200'}`}
            >
              <div className={`flex items-center justify-center bg-gradient-to-br from-indigo-50 to-amber-50/60 p-8 ${i % 2 ? 'md:order-2' : ''}`} aria-hidden>
                <step.Visual active={i <= reached} />
              </div>
              <div className="flex flex-col justify-center gap-3 p-6 sm:p-8">
                <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-indigo-600">
                  <Icon className="h-4 w-4" /> Step {i + 1}
                </span>
                <h3 className="font-serif text-xl font-bold text-slate-900 sm:text-2xl">{step.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{step.body}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
