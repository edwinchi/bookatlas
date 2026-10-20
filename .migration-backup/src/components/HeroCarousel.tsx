import React, { useState, useEffect } from 'react';
import { BookOpen, ShoppingBag, Sparkles, ChevronRight, ChevronLeft, ShieldCheck, Flame, Star, Award } from 'lucide-react';
import { Book } from '../types';

interface HeroCarouselProps {
  books: Book[];
  onOpenBookDetail: (book: Book) => void;
  onReadSample: (book: Book) => void;
  onAddToCart: (book: Book) => void;
  onExploreBookatlasPlus: () => void;
  currency?: string;
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({
  books,
  onOpenBookDetail,
  onReadSample,
  onAddToCart,
  onExploreBookatlasPlus,
  currency = 'EUR',
}) => {
  const featuredBooks = books.slice(0, 4);
  const [currentIndex, setCurrentIndex] = useState(0);

  const getCurrencySymbol = (c: string) => {
    switch (c) {
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'CAD': return 'CA$';
      case 'JPY': return '¥';
      default: return '$';
    }
  };

  const symbol = getCurrencySymbol(currency);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredBooks.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [featuredBooks.length]);

  const currentBook = featuredBooks[currentIndex] || books[0];

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-[#0f172a] to-slate-900 text-white rounded-3xl shadow-2xl my-6 border border-slate-800/80">
      {/* Ambient lighting effects */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/3 -mb-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative max-w-7xl mx-auto px-6 sm:px-10 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Book Info & CTAs */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500 text-slate-950 shadow-xs">
                <Flame className="w-3.5 h-3.5 fill-slate-950" /> Spotlight of the Week
              </span>
              {(currentBook.isBookatlasPlus) && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-950/80 text-indigo-200 border border-indigo-700/50">
                  <Sparkles className="w-3 h-3 text-amber-300" /> Bookatlas Plus Unlimited
                </span>
              )}
              {currentBook.awards && currentBook.awards.length > 0 && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-800/40">
                  <Award className="w-3 h-3" /> {currentBook.awards[0]}
                </span>
              )}
              <span className="text-xs text-slate-400 font-medium ml-1">
                {currentBook.primaryGenre}
              </span>
            </div>

            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-serif font-extrabold tracking-tight text-white leading-[1.15]">
                {currentBook.title}
              </h1>
              {currentBook.subtitle && (
                <p className="text-sm sm:text-base text-slate-300 font-serif italic">
                  {currentBook.subtitle}
                </p>
              )}
            </div>

            <p className="text-sm text-slate-300 font-medium">
              By <span className="text-white font-semibold underline decoration-dotted decoration-slate-500">{currentBook.author}</span>
              <span className="text-slate-500 mx-2">·</span>
              <span className="text-slate-400 text-xs">{currentBook.publisher}</span>
            </p>

            {/* Ratings & metadata */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-slate-300">
              <div className="flex items-center gap-1 text-amber-400">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="font-bold text-white text-sm ml-1">{currentBook.rating}</span>
                <span className="text-slate-400">({currentBook.reviewCount.toLocaleString()} verified reviews)</span>
              </div>
              <span>•</span>
              <span>{currentBook.pageCount} Pages</span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> DRM-Free & In-Browser eReader
              </span>
            </div>

            {/* Synopsis Preview */}
            <p className="text-sm sm:text-base text-slate-300 line-clamp-3 leading-relaxed max-w-2xl">
              {currentBook.synopsis}
            </p>

            {/* Actions */}
            <div className="pt-3 flex flex-wrap items-center gap-3">
              <button
                onClick={() => onReadSample(currentBook)}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-semibold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer group"
              >
                <BookOpen className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
                <span>Read Instant Sample</span>
              </button>

              <button
                onClick={() => onAddToCart(currentBook)}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 text-amber-300" />
                <span>Buy eBook for {symbol}{currentBook.price.toFixed(2)}</span>
                {currentBook.originalPrice > currentBook.price && (
                  <span className="text-xs text-indigo-200 line-through opacity-80">
                    {symbol}{currentBook.originalPrice.toFixed(2)}
                  </span>
                )}
              </button>

              <button
                onClick={() => onOpenBookDetail(currentBook)}
                className="px-4 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white font-medium text-sm border border-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>AI Briefing & Reviews</span>
              </button>
            </div>
          </div>

          {/* Right Column: 3D Book Cover Presentation */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <div 
              onClick={() => onOpenBookDetail(currentBook)}
              className="relative cursor-pointer group transition-transform duration-500 hover:scale-105"
            >
              {/* Spine shadow and 3D depth effect */}
              <div className="relative w-52 sm:w-64 aspect-[2/3] rounded-r-xl rounded-l-xs overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.85)] border-r-2 border-t border-b border-slate-700/60">
                <img
                  src={currentBook.coverImage}
                  alt={currentBook.title}
                  className="w-full h-full object-cover group-hover:brightness-105 transition-all"
                  referrerPolicy="no-referrer"
                />
                
                {/* Book spine highlight gradient */}
                <div className="absolute inset-y-0 left-0 w-5 bg-gradient-to-r from-black/70 via-white/10 to-transparent pointer-events-none"></div>

                {/* Instant sample badge overlay */}
                <div className="absolute bottom-3 inset-x-3 bg-slate-950/85 backdrop-blur-md py-2 px-2.5 rounded-lg text-center text-xs font-semibold text-white flex items-center justify-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity border border-white/10">
                  <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span>Click for In-Browser Reader Preview</span>
                </div>
              </div>

              {/* Discount Tag */}
              {currentBook.originalPrice > currentBook.price && (
                <div className="absolute -top-3 -right-3 bg-amber-400 text-slate-950 font-black text-xs px-3 py-1 rounded-full shadow-lg border border-amber-300 transform rotate-6">
                  {Math.round(((currentBook.originalPrice - currentBook.price) / currentBook.originalPrice) * 100)}% OFF
                </div>
              )}
            </div>

            {/* Carousel navigation dots */}
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setCurrentIndex((prev) => (prev === 0 ? featuredBooks.length - 1 : prev - 1))}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
                aria-label="Previous Featured Book"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex gap-2">
                {featuredBooks.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      currentIndex === idx ? 'w-7 bg-amber-400' : 'w-2 bg-white/30 hover:bg-white/50'
                    }`}
                    aria-label={`Slide ${idx + 1}`}
                  />
                ))}
              </div>

              <button
                onClick={() => setCurrentIndex((prev) => (prev + 1) % featuredBooks.length)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
                aria-label="Next Featured Book"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Promo bar */}
      <div className="bg-slate-950 border-t border-slate-800/80 px-6 sm:px-10 py-3.5 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-serif italic font-bold text-amber-400 text-sm">bookatlas Plus</span>
          <span className="text-slate-300">
            Unlimited access to over 1.5 million eBooks & Audiobooks across Europe and globally. 30 days free.
          </span>
        </div>
        <button
          onClick={onExploreBookatlasPlus}
          className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
        >
          <span>Explore Bookatlas Plus Plans</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

