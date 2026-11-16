import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight, Sparkles } from 'lucide-react';
import { Book } from '../types';
import { BookCard } from './BookCard';

interface HorizontalProductCarouselProps {
  title: string;
  subtitle?: string;
  badge?: string;
  icon?: React.ReactNode;
  books: Book[];
  onViewAll?: () => void;
  onOpenDetail: (book: Book) => void;
  onReadSample: (book: Book) => void;
  onAddToCart: (book: Book) => void;
  onToggleWishlist: (book: Book) => void;
  onPlayAudioSample?: (book: Book) => void;
  wishlistIds: string[];
  currencySymbol?: string;
}

export const HorizontalProductCarousel: React.FC<HorizontalProductCarouselProps> = ({
  title,
  subtitle,
  badge,
  icon,
  books,
  onViewAll,
  onOpenDetail,
  onReadSample,
  onAddToCart,
  onToggleWishlist,
  onPlayAudioSample,
  wishlistIds,
  currencySymbol = '€',
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  /** Which ends are reached: the arrows switch off there and the edge fade goes away (no scrollbar). */
  const [edges, setEdges] = useState({ start: true, end: false });
  const measure = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);
  useEffect(() => {
    measure();
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, books.length]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    // About one screen of cards at a time.
    const step = Math.max(240, Math.round(el.clientWidth * 0.85));
    el.scrollBy({ left: direction === 'left' ? -step : step, behavior: 'smooth' });
  };

  if (!books || books.length === 0) return null;

  return (
    <section className="space-y-4 py-2">
      {/* Header with Title and View All */}
      <div className="flex items-end justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            {badge && (
              <span className="text-[11px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-indigo-200/60">
                <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
                {badge}
              </span>
            )}
            {icon && <span className="text-slate-600">{icon}</span>}
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-extrabold text-slate-900 tracking-tight text-balance flex items-center gap-2">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-600 font-medium text-pretty line-clamp-2 sm:line-clamp-none">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="whitespace-nowrap rounded-full text-xs sm:text-sm font-bold text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 flex items-center gap-1 cursor-pointer transition-colors px-2.5 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Carousel Arrows */}
          <div className="hidden sm:flex items-center gap-1.5 ml-2">
            <button
              onClick={() => handleScroll('left')}
              disabled={edges.start}
              className="p-2 rounded-full border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 transition-all shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-white"
              aria-label="Scroll carousel left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleScroll('right')}
              disabled={edges.end}
              className="p-2 rounded-full border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 transition-all shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-white"
              aria-label="Scroll carousel right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Scroll Track */}
      <div className="relative group">
        {/* No scrollbar (owner request 2026-11-17): the arrows, swipe, trackpad and keyboard scroll; the edges fade
            where more cards follow. */}
        <div
          ref={scrollRef}
          onScroll={measure}

          className={`flex gap-4 overflow-x-auto overscroll-x-contain pb-4 pt-1 snap-x snap-mandatory scroll-px-2 scroll-smooth -mx-2 px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden motion-reduce:scroll-auto ${
            edges.start && edges.end ? '' : edges.start ? '[mask-image:linear-gradient(to_right,black_calc(100%-48px),transparent)]'
              : edges.end ? '[mask-image:linear-gradient(to_right,transparent,black_48px)]'
                : '[mask-image:linear-gradient(to_right,transparent,black_48px,black_calc(100%-48px),transparent)]'
          }`}
        >
          {books.map((book) => (
            <div
              key={book.id}
              className="w-[185px] sm:w-[210px] md:w-[230px] shrink-0 snap-start"
            >
              <BookCard
                book={book}
                onOpenDetail={onOpenDetail}
                onReadSample={onReadSample}
                onAddToCart={onAddToCart}
                onToggleWishlist={onToggleWishlist}
                onPlayAudioSample={onPlayAudioSample}
                isWishlisted={wishlistIds.includes(book.id)}
                currencySymbol={currencySymbol}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
