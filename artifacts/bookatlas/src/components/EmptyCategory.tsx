import React from 'react';
import { ArrowRight, BookOpen, Feather, ListOrdered } from 'lucide-react';
import { openEnquiry } from './StartBookDialog';

/**
 * A category with no books yet (owner request 2026-11-23): instead of a dead end, it invites authors to publish the
 * first one, and lets readers go back to every book.
 */
export const EmptyCategory: React.FC<{ category: string; onBrowseAll: () => void; onHowItWorks: () => void }> = ({ category, onBrowseAll, onHowItWorks }) => (
  <section aria-labelledby="empty-category-title" className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white">
    <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgba(99,102,241,0.10),transparent)]" />
    <div className="relative mx-auto max-w-xl px-6 py-12 text-center sm:py-14">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#232272,#4338ca)] text-amber-200 shadow-lg shadow-indigo-900/20">
        <Feather className="h-6 w-6" aria-hidden />
      </span>
      <p className="mt-5 text-[11px] font-bold uppercase tracking-widest text-indigo-700">{category}</p>
      <h3 id="empty-category-title" className="mt-1 font-serif text-2xl font-bold text-slate-900 sm:text-3xl">This shelf is waiting for its first book</h3>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600">
        Nobody has published in {category} on BooksAtlas yet. Write the book this shelf is missing: publish it here, sell it to
        readers everywhere and keep 81% of every sale.
      </p>
      <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => openEnquiry('start', { message: `I would like to publish a book in ${category}.` })}
          className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-amber-400 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-sm shadow-amber-500/30 transition-colors hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 cursor-pointer"
        >
          Publish the first book <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onHowItWorks}
          className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 cursor-pointer"
        >
          <ListOrdered className="h-4 w-4 text-indigo-600" aria-hidden /> How publishing works
        </button>
      </div>
      <button
        type="button"
        onClick={onBrowseAll}
        className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 cursor-pointer"
      >
        <BookOpen className="h-3.5 w-3.5" aria-hidden /> Reading, not writing? Browse every book
      </button>
    </div>
  </section>
);
