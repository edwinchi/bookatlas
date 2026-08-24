import React, { useRef } from 'react';
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
  currencySymbol = '$',
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -380 : 380;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (!books || books.length === 0) return null;

  return (
    <section className="space-y-4 py-2">
      {/* Header with Title and View All */}
      <div className="flex items-end justify-between border-b border-slate-200/80 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {badge && (
              <span className="text-[11px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-indigo-200/60">
                <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
                {badge}
              </span>
            )}
            {icon && <span className="text-slate-600">{icon}</span>}
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="text-xs sm:text-sm font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 hover:underline cursor-pointer transition-colors px-2 py-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Carousel Arrows */}
          <div className="hidden sm:flex items-center gap-1.5 ml-2">
            <button
              onClick={() => handleScroll('left')}
              className="p-2 rounded-full border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 transition-all shadow-2xs cursor-pointer"
              aria-label="Scroll carousel left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleScroll('right')}
              className="p-2 rounded-full border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 transition-all shadow-2xs cursor-pointer"
              aria-label="Scroll carousel right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Scroll Track */}
      <div className="relative group">
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent -mx-2 px-2"
          style={{ scrollSnapType: 'x mandatory' }}
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
