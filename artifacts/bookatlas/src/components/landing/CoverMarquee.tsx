import React, { useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { Book } from '../../types';

interface CoverMarqueeProps {
  books: Book[];
  onOpenBook: (book: Book) => void;
}

const OFFSETS = ['translate-y-0', 'translate-y-6', 'translate-y-2', 'translate-y-8', 'translate-y-3'];

/** An endless shelf of catalogue covers. The list is rendered twice so the -50% loop is seamless. */
export const CoverMarquee: React.FC<CoverMarqueeProps> = ({ books, onOpenBook }) => {
  const [paused, setPaused] = useState(false);
  const covers = books.filter((b) => b.coverImage).slice(0, 14);
  if (covers.length < 4) return null;

  const shelf = (copy: boolean) => covers.map((book, i) => (
    <li key={`${copy ? 'copy-' : ''}${book.id}`} aria-hidden={copy || undefined} className={`shrink-0 ${OFFSETS[i % OFFSETS.length]}`}>
      <button
        type="button"
        tabIndex={copy ? -1 : undefined}
        onClick={() => onOpenBook(book)}
        aria-label={`View ${book.title} by ${book.author}`}
        className="group/cover block cursor-pointer rounded-md focus-visible:outline-2 focus-visible:outline-amber-300"
      >
        <img
          src={book.coverImage}
          alt=""
          loading="lazy"
          decoding="async"
          width={160}
          height={240}
          className="aspect-[2/3] w-28 rounded-md object-cover shadow-2xl shadow-black/50 ring-1 ring-white/10 transition-transform duration-300 group-hover/cover:-translate-y-2 group-hover/cover:rotate-[-1.5deg] sm:w-36 lg:w-40"
        />
      </button>
    </li>
  ));

  return (
    <div className="relative">
      <div className="group overflow-hidden pb-10 [mask-image:linear-gradient(to_right,transparent,black_7%,black_93%,transparent)] motion-reduce:overflow-x-auto">
        <ul
          className={`flex w-max gap-4 sm:gap-6 animate-marquee group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused] motion-reduce:animate-none ${paused ? '[animation-play-state:paused]' : ''}`}
        >
          {shelf(false)}
          {shelf(true)}
        </ul>
      </div>
      {/* The shelf the covers stand on */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-6 h-px bg-gradient-to-r from-transparent via-amber-300/50 to-transparent" />
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-pressed={paused}
        className="absolute bottom-0 right-4 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold text-slate-300 backdrop-blur transition-colors hover:bg-white/10 hover:text-white motion-reduce:hidden cursor-pointer sm:right-6"
      >
        {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
        {paused ? 'Play covers' : 'Pause covers'}
      </button>
    </div>
  );
};
