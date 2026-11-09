import React, { useRef } from 'react';
import {
  Accessibility, ArrowRight, ArrowUpRight, BadgeEuro, BookOpenCheck, Building2, Calculator, Crown, Globe2, GraduationCap,
  KeyRound, Library, Link2, Palette, PenTool, Ruler, ShieldCheck, Sparkles,
} from 'lucide-react';
import { Book } from '../../types';
import { OPERATOR } from '../LegalDocument';
import { AtlasStar } from './AtlasStar';
import { CoverMarquee } from './CoverMarquee';
import { EarningsEstimator } from './EarningsEstimator';
import { HowItWorks } from './HowItWorks';
import { Reveal } from './Reveal';

interface PublishingLandingProps {
  books: Book[];
  onOpenBook: (book: Book) => void;
  onBrowseStore: () => void;
  onNavigateSection: (id: string) => void;
}

// Publishing services are in early access: every call to action opens an email to the team.
const contact = (subject: string) => `mailto:${OPERATOR.email}?subject=${encodeURIComponent(subject)}`;
const base = import.meta.env.BASE_URL;

const AUDIENCES = [
  {
    icon: PenTool,
    title: 'Authors and storytellers',
    body: 'Novels, memoirs, poetry and picture books, formatted for print and published as an eBook readers can buy from anywhere.',
  },
  {
    icon: GraduationCap,
    title: 'Coaches, educators and experts',
    body: 'Turn a course, method or workshop into a workbook or guide you can hand to every client and sell to everyone else.',
  },
  {
    icon: Library,
    title: 'Independent publishers',
    body: 'Take a backlist to new markets with print-ready files for each title and one storefront for all your eBooks.',
  },
];

const SERVICES = [
  {
    icon: Ruler,
    name: 'Print-ready package',
    price: '€99',
    unit: 'per book',
    body: 'Interior PDF and a full wrap-around cover with spine, sized and checked for Amazon KDP and Lulu, plus an upload checklist.',
    cta: 'Order a package',
    href: contact('Print-ready package (€99)'),
  },
  {
    icon: Palette,
    name: 'Premium package',
    price: '€249',
    unit: 'per book',
    body: 'Everything in the print-ready package, with an original cover designed for your title, genre and readers.',
    cta: 'Get a designed cover',
    href: contact('Premium package with designed cover (€249)'),
    featured: true,
  },
  {
    icon: Globe2,
    name: 'eBook store',
    price: '80%',
    unit: 'of every sale is yours',
    body: 'Sell your eBook on BookAtlas to readers worldwide, including every country in Africa. No upfront cost.',
    cta: 'Sell your eBook',
    href: contact('Sell my eBook on BookAtlas'),
  },
  {
    icon: Crown,
    name: 'Author Pro',
    price: '€9.99',
    unit: 'a month',
    body: 'Keep 90% of every eBook sale instead of 80%. Worth it from a handful of sales a month.',
    cta: 'Estimate my earnings',
    target: 'earnings',
  },
];

const COMMITMENTS = [
  { icon: KeyRound, title: 'Your accounts stay yours', body: 'You publish from your own KDP or Lulu account. We never ask for your password or touch your print royalties.' },
  { icon: Ruler, title: 'Built to printer specs', body: 'Trim size, bleed, margins, spine width and fonts are checked before you upload, so files pass first time.' },
  { icon: BadgeEuro, title: 'Clear, fixed prices', body: 'One price per package and one commission rate per plan. You see the total before you commit.' },
  { icon: Globe2, title: 'Readers everywhere', body: 'eBooks sell worldwide from day one, from Europe to every country in Africa and beyond.' },
];

const HERO_STARS = [
  { pos: 'left-[8%] top-16 h-3 w-3', delay: '0s' },
  { pos: 'right-[12%] top-24 h-4 w-4', delay: '1.2s' },
  { pos: 'left-[22%] top-[46%] h-2 w-2', delay: '2.1s' },
  { pos: 'right-[26%] top-[40%] h-2.5 w-2.5', delay: '0.6s' },
  { pos: 'left-[48%] top-10 h-2 w-2', delay: '1.8s' },
];

const Eyebrow: React.FC<{ children: React.ReactNode; light?: boolean }> = ({ children, light }) => (
  <p className={`inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] ${light ? 'text-amber-300' : 'text-indigo-600'}`}>
    <AtlasStar className="h-3 w-3" /> {children}
  </p>
);

const SectionHeading: React.FC<{ eyebrow: string; title: string; intro?: string; id?: string }> = ({ eyebrow, title, intro, id }) => (
  <Reveal className="mx-auto max-w-2xl space-y-3 text-center">
    <Eyebrow>{eyebrow}</Eyebrow>
    <h2 id={id} className="font-serif text-3xl font-bold text-slate-900 sm:text-4xl">{title}</h2>
    {intro && <p className="text-sm leading-relaxed text-slate-600 sm:text-base">{intro}</p>}
  </Reveal>
);

const primaryButton = 'inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition-[background-color,box-shadow,translate] duration-200 hover:-translate-y-0.5 cursor-pointer';

export const PublishingLanding: React.FC<PublishingLandingProps> = ({ books, onOpenBook, onBrowseStore, onNavigateSection }) => {
  const hero = useRef<HTMLElement>(null);
  const frame = useRef(0);
  const sample = books.find((b) => b.coverImage);

  // Soft spotlight that follows the pointer, written straight to CSS variables to avoid re-renders.
  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse' || frame.current) return;
    const { clientX, clientY } = e;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const el = hero.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--spot-x', `${clientX - r.left}px`);
      el.style.setProperty('--spot-y', `${clientY - r.top}px`);
    });
  };

  return (
    <div className="text-slate-900">
      {/* Hero */}
      <section
        ref={hero}
        onPointerMove={onPointerMove}
        aria-labelledby="landing-title"
        className="relative isolate overflow-hidden bg-slate-950 text-white"
      >
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(79,70,229,0.55),transparent),radial-gradient(circle_at_12%_85%,rgba(245,158,11,0.16),transparent_40%),radial-gradient(circle_at_90%_70%,rgba(99,102,241,0.25),transparent_45%)]" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(520px_circle_at_var(--spot-x,50%)_var(--spot-y,30%),rgba(165,180,252,0.12),transparent_60%)] motion-reduce:hidden" />
        {HERO_STARS.map(({ pos, delay }) => (
          <span key={pos} aria-hidden className={`absolute ${pos} -z-10 text-amber-200/70 motion-safe:animate-pulse`} style={{ animationDelay: delay }}>
            <AtlasStar className="h-full w-full" />
          </span>
        ))}

        <div className="mx-auto max-w-5xl px-4 pb-10 pt-16 text-center sm:px-6 sm:pt-24">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-amber-200">
              <Sparkles className="h-3.5 w-3.5" /> Self-publishing studio · Early access
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h1 id="landing-title" className="mt-6 font-serif text-4xl font-bold leading-[1.1] sm:text-6xl">
              Your book, ready for{' '}
              <span className="bg-gradient-to-r from-amber-200 via-amber-300 to-amber-500 bg-clip-text text-transparent">every shelf</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
              BookAtlas turns your manuscript into print-ready files for Amazon KDP and Lulu, then sells your eBook to readers
              around the world, from Amsterdam to Accra to Auckland.
            </p>
          </Reveal>
          <Reveal delay={240} className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href={contact('Prepare my book (early access)')} className={`${primaryButton} bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-300`}>
              Prepare my book <ArrowRight className="h-4 w-4" />
            </a>
            <button type="button" onClick={onBrowseStore} className={`${primaryButton} border border-white/20 bg-white/5 text-white backdrop-blur hover:bg-white/10`}>
              Browse the bookstore
            </button>
          </Reveal>
          <Reveal delay={320}>
            <p className="mt-5 text-xs text-slate-400">Print-ready packages from €99 · Keep 80% of every eBook sale</p>
          </Reveal>
        </div>

        <CoverMarquee books={books} onOpenBook={onOpenBook} />
      </section>

      {/* Audiences */}
      <section id="solutions" aria-labelledby="landing-audiences" className="scroll-mt-36 lg:scroll-mt-44 bg-[#f8f9fa] px-4 py-20 sm:px-6">
        <SectionHeading id="landing-audiences" eyebrow="Who it's for" title="Made for people with something to say" />
        <div className="mx-auto mt-12 grid max-w-6xl gap-6 md:grid-cols-3">
          {AUDIENCES.map(({ icon: Icon, title, body }, i) => (
            <Reveal key={title} delay={i * 100}>
              <article className="group relative h-full overflow-hidden rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 transition-[box-shadow,translate] duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-900/5">
                <div aria-hidden className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-100 to-amber-100 opacity-60 transition-transform duration-500 group-hover:scale-125" />
                <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-amber-200 shadow-lg shadow-indigo-600/20">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="relative mt-6 font-serif text-xl font-bold">{title}</h3>
                <p className="relative mt-3 text-sm leading-relaxed text-slate-600">{body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Services and prices */}
      <section id="pricing" aria-labelledby="landing-services" className="scroll-mt-36 lg:scroll-mt-44 bg-white px-4 py-20 sm:px-6">
        <SectionHeading
          id="landing-services"
          eyebrow="Services"
          title="Everything between the last page and the first sale"
          intro="Fixed prices, no setup fees. Paperbacks print through Amazon KDP or Lulu; your eBook sells here."
        />
        <div className="mx-auto mt-12 grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map(({ icon: Icon, name, price, unit, body, cta, href, target, featured }, i) => {
            const cls = `${primaryButton} w-full ${featured ? 'bg-amber-400 text-slate-950 hover:bg-amber-300' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`;
            return (
              <Reveal key={name} delay={i * 80}>
                <article className={`relative flex h-full flex-col rounded-3xl p-6 ring-1 transition-shadow duration-300 hover:shadow-xl ${featured ? 'bg-slate-950 text-white ring-slate-900' : 'bg-slate-50 ring-slate-200'}`}>
                  {featured && <span className="absolute -top-3 left-6 rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-950">Most complete</span>}
                  <span className={`flex h-12 w-12 items-center justify-center rounded-full ${featured ? 'bg-white/10 text-amber-300' : 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200'}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-base font-bold">{name}</h3>
                  <p className="mt-2 flex items-baseline gap-1.5">
                    <span className="font-serif text-3xl font-bold">{price}</span>
                    <span className={`text-xs ${featured ? 'text-slate-400' : 'text-slate-500'}`}>{unit}</span>
                  </p>
                  <p className={`mt-3 flex-1 text-sm leading-relaxed ${featured ? 'text-slate-300' : 'text-slate-600'}`}>{body}</p>
                  <div className="mt-6">
                    {target
                      ? <button type="button" onClick={() => onNavigateSection(target)} className={cls}><Calculator className="h-4 w-4" /> {cta}</button>
                      : <a href={href} className={cls}>{cta}</a>}
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* One page for every edition */}
      <section id="book-pages" aria-labelledby="landing-book-page" className="scroll-mt-36 lg:scroll-mt-44 bg-white px-4 pb-20 sm:px-6">
        <Reveal className="mx-auto max-w-6xl">
          <div className="relative grid items-center gap-10 overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-950 p-8 text-white sm:p-12 lg:grid-cols-2">
            <AtlasStar className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 text-white/5" />
            <div className="relative space-y-4">
              <Eyebrow light>Book pages</Eyebrow>
              <h2 id="landing-book-page" className="font-serif text-3xl font-bold sm:text-4xl">One link for every edition</h2>
              <p className="max-w-md text-sm leading-relaxed text-indigo-100 sm:text-base">
                Every title gets its own BookAtlas page. Readers buy the eBook right there, or follow the link to your paperback
                on Amazon or Lulu. Share it in your newsletter, your bio or your email signature.
              </p>
              <p className="max-w-md text-xs text-indigo-200/80">Paperback links may earn us a referral fee. We always say so on the page.</p>
              <button type="button" onClick={onBrowseStore} className={`${primaryButton} mt-2 bg-white text-indigo-900 hover:bg-indigo-50`}>
                See book pages in the store <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {/* Decorative mock of a book page */}
            <div aria-hidden className="relative mx-auto w-full max-w-sm">
              <div className="absolute -inset-4 rounded-3xl bg-amber-300/20 blur-2xl" />
              <div className="relative rotate-1 rounded-2xl bg-white p-5 text-slate-900 shadow-2xl transition-transform duration-500 hover:rotate-0">
                <div className="mb-4 flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400" /><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  <span className="ml-2 flex flex-1 items-center gap-1.5 truncate rounded-full bg-slate-100 px-3 py-1 text-[10px] text-slate-500"><Link2 className="h-3 w-3" /> bookatlas / your-book</span>
                </div>
                <div className="flex gap-4">
                  {sample
                    ? <img src={sample.coverImage} alt="" loading="lazy" className="aspect-[2/3] w-24 shrink-0 rounded-md object-cover shadow-lg" />
                    : <div className="aspect-[2/3] w-24 shrink-0 rounded-md bg-gradient-to-br from-indigo-900 to-slate-950" />}
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="truncate font-serif text-base font-bold">{sample?.title ?? 'Your title'}</p>
                    <p className="truncate text-xs text-slate-500">{sample?.author ?? 'Your name'}</p>
                    <div className="rounded-lg bg-indigo-600 px-3 py-2 text-center text-xs font-bold text-white">Buy eBook</div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-700">
                      <span className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 py-1.5">Amazon <ArrowUpRight className="h-3 w-3" /></span>
                      <span className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 py-1.5">Lulu <ArrowUpRight className="h-3 w-3" /></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* How it works */}
      <section id="how-it-works" aria-labelledby="landing-how" className="scroll-mt-36 lg:scroll-mt-44 bg-[#f8f9fa] px-4 py-20 sm:px-6">
        <SectionHeading id="landing-how" eyebrow="How it works" title="From finished draft to finished book" intro="Four steps from your final manuscript to a book readers can hold or download." />
        <div className="mx-auto mt-14 max-w-6xl"><HowItWorks /></div>
      </section>

      {/* Earnings */}
      <section id="earnings" aria-labelledby="landing-earnings" className="scroll-mt-36 lg:scroll-mt-44 bg-white px-4 py-20 sm:px-6">
        <SectionHeading id="landing-earnings" eyebrow="Earnings" title="What could your eBook earn?" intro="Move the sliders to compare Standard and Author Pro for your price and sales." />
        <Reveal className="mx-auto mt-12 max-w-5xl"><EarningsEstimator /></Reveal>
      </section>

      {/* Commitments */}
      <section id="promise" aria-labelledby="landing-commitments" className="scroll-mt-36 lg:scroll-mt-44 bg-white px-4 pb-20 sm:px-6">
        <SectionHeading id="landing-commitments" eyebrow="Our promise" title="What you can count on" />
        <div className="mx-auto mt-12 grid max-w-6xl gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {COMMITMENTS.map(({ icon: Icon, title, body }, i) => (
            <Reveal key={title} delay={i * 80} className="text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 ring-8 ring-indigo-50/50">
                <Icon className="h-7 w-7" />
              </span>
              <h3 className="mt-5 font-serif text-lg font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section id="about" aria-labelledby="landing-trust" className="scroll-mt-36 lg:scroll-mt-44 bg-[#f8f9fa] px-4 py-20 sm:px-6">
        <SectionHeading id="landing-trust" eyebrow="Trust" title="Privacy and accessibility, built in" />
        <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-2">
          <Reveal>
            <article className="flex h-full flex-col gap-4 rounded-3xl bg-white p-8 ring-1 ring-slate-200 sm:flex-row">
              <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-amber-300"><ShieldCheck className="h-9 w-9" /></span>
              <div className="space-y-3">
                <h3 className="font-serif text-lg font-bold">Registered in the Netherlands</h3>
                <p className="text-sm leading-relaxed text-slate-600">
                  BookAtlas is run by {OPERATOR.name} in {OPERATOR.locality.replace(/^\d{4} [A-Z]{2} /, '')} (KvK {OPERATOR.kvk}). We follow the
                  EU General Data Protection Regulation: you can see, export or delete your account data at any time.
                </p>
                <a href={`${base}privacy`} className="inline-flex items-center gap-1 text-sm font-bold text-indigo-700 hover:text-indigo-900">Read our privacy notice <ArrowRight className="h-4 w-4" /></a>
              </div>
            </article>
          </Reveal>
          <Reveal delay={100}>
            <article className="flex h-full flex-col gap-4 rounded-3xl bg-white p-8 ring-1 ring-slate-200 sm:flex-row">
              <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white"><Accessibility className="h-9 w-9" /></span>
              <div className="space-y-3">
                <h3 className="font-serif text-lg font-bold">Books everyone can read</h3>
                <p className="text-sm leading-relaxed text-slate-600">
                  We prepare eBooks with the EPUB Accessibility standard in mind, as the European Accessibility Act expects, so
                  readers using screen readers or larger text are not left out.
                </p>
                <a href={`${base}legal`} className="inline-flex items-center gap-1 text-sm font-bold text-indigo-700 hover:text-indigo-900">Read our legal notice <ArrowRight className="h-4 w-4" /></a>
              </div>
            </article>
          </Reveal>
        </div>
      </section>

      {/* Closing call to action */}
      <section aria-labelledby="landing-start" className="relative isolate overflow-hidden bg-slate-950 px-4 py-20 text-center text-white sm:px-6">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_80%_at_50%_120%,rgba(79,70,229,0.6),transparent),radial-gradient(circle_at_50%_0%,rgba(245,158,11,0.12),transparent_50%)]" />
        <AtlasStar className="mx-auto h-8 w-8 text-amber-300" />
        <Reveal>
          <h2 id="landing-start" className="mt-4 font-serif text-3xl font-bold sm:text-5xl">Your readers are waiting</h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Tell us about your book. We'll reply by email with what it needs and what it costs, before any work starts.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href={contact('Start my book')} className={`${primaryButton} bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-300`}>
              <BookOpenCheck className="h-4 w-4" /> Start my book
            </a>
            <a href={contact('Publishing question')} className={`${primaryButton} border border-white/20 text-white hover:bg-white/10`}>
              <Building2 className="h-4 w-4" /> Ask a question
            </a>
          </div>
        </Reveal>
      </section>
    </div>
  );
};
