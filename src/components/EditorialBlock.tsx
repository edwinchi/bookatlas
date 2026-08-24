import React from 'react';
import { Sparkles, BookOpen, ShoppingBag, Award, Star, Compass, ArrowRight } from 'lucide-react';
import { Book } from '../types';

interface FeaturedPromotionProps {
  featuredBook: Book;
  onOpenDetail: (book: Book) => void;
  onReadSample: (book: Book) => void;
  onAddToCart: (book: Book) => void;
  currencySymbol?: string;
}

export const PromotionalFeatureBanner: React.FC<FeaturedPromotionProps> = ({
  featuredBook,
  onOpenDetail,
  onReadSample,
  onAddToCart,
  currencySymbol = '$',
}) => {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-indigo-500/20 my-6">
      {/* Background glowing ambient elements */}
      <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none"></div>
      <div className="absolute left-1/3 -bottom-20 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none"></div>

      <div className="relative p-6 sm:p-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        {/* Left Book Cover 3D display */}
        <div className="md:col-span-4 flex justify-center">
          <div
            onClick={() => onOpenDetail(featuredBook)}
            className="relative cursor-pointer group w-44 sm:w-52 aspect-[3/4] rounded-xl overflow-hidden shadow-2xl transition-transform duration-300 group-hover:scale-105"
          >
            <img
              src={featuredBook.coverImage}
              alt={featuredBook.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            {/* 3D Spine & Gloss Overlay */}
            <div className="absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-black/50 to-transparent pointer-events-none"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="absolute bottom-3 left-3 bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-sm">
              Spotlight of the Week
            </span>
          </div>
        </div>

        {/* Right Info & Actions */}
        <div className="md:col-span-8 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-indigo-500/30 text-indigo-300 text-xs font-bold px-3 py-1 rounded-full border border-indigo-400/30 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              Atlantean Globals Curated Selection • Amsterdam
            </span>
            <div className="flex items-center text-amber-400 text-xs">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <span className="ml-1 font-bold">{featuredBook.rating}</span>
              <span className="text-slate-400 ml-1">({featuredBook.reviewCount} reviews)</span>
            </div>
          </div>

          <h2
            onClick={() => onOpenDetail(featuredBook)}
            className="text-2xl sm:text-4xl font-serif font-black text-white hover:text-amber-300 transition-colors cursor-pointer leading-tight"
          >
            {featuredBook.title}
          </h2>

          <p className="text-sm text-indigo-200 font-semibold">
            By {featuredBook.author} • {featuredBook.genre} • {featuredBook.pageCount} Pages
          </p>

          <p className="text-xs sm:text-sm text-slate-300 line-clamp-3 leading-relaxed max-w-2xl">
            {featuredBook.description}
          </p>

          {/* Price & Action Row */}
          <div className="pt-3 flex flex-wrap items-center gap-3">
            <div className="mr-4">
              <div className="text-xs text-slate-400">Special Digital Price</div>
              <div className="text-2xl font-black text-white">
                {featuredBook.price === 0 ? 'FREE' : `${currencySymbol}${featuredBook.price.toFixed(2)}`}
                {featuredBook.originalPrice > featuredBook.price && (
                  <span className="text-xs text-slate-400 line-through ml-2 font-normal">
                    {currencySymbol}{featuredBook.originalPrice.toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => onAddToCart(featuredBook)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg flex items-center gap-2 transition-all cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-amber-300" />
              <span>Add to Cart</span>
            </button>

            <button
              onClick={() => onReadSample(featuredBook)}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold rounded-xl border border-white/20 flex items-center gap-2 transition-all cursor-pointer backdrop-blur-sm"
            >
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>Read Free Sample</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const EditorialCuratorBlock: React.FC<{
  onExploreGenre: (genre: string) => void;
  onOpenMatchmaker: () => void;
}> = ({ onExploreGenre, onOpenMatchmaker }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
      {/* Editorial 1: Atlantean Reading Lounge */}
      <div className="bg-gradient-to-br from-amber-500/10 via-amber-100/40 to-white p-6 rounded-2xl border border-amber-200/80 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-200/60 px-2.5 py-0.5 rounded-full">
            Curator Dispatch
          </span>
          <h3 className="text-lg font-serif font-extrabold text-slate-900">
            Dutch Golden Age & Modern European Fiction
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            From atmospheric canal mysteries to Amsterdam historical sagas, dive into hand-picked literature curated by Atlantean Globals in the Netherlands.
          </p>
        </div>
        <button
          onClick={() => onExploreGenre('Historical Fiction')}
          className="text-xs font-bold text-amber-900 hover:text-amber-700 flex items-center gap-1 cursor-pointer pt-2"
        >
          <span>Explore Historical Sagas</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Editorial 2: Gemini AI Matchmaker */}
      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-2xl border border-indigo-500/30 flex flex-col justify-between space-y-4 shadow-md">
        <div className="space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300 bg-indigo-800/80 px-2.5 py-0.5 rounded-full flex items-center gap-1 w-fit">
            <Sparkles className="w-3 h-3 text-amber-400" />
            AI Reader Intelligence
          </span>
          <h3 className="text-lg font-serif font-extrabold text-white">
            Meet Your Personal Book Matchmaker
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Powered by Google Gemini 3.7 Flash. Tell us your current reading mood, favorite tropes, or pacing, and receive instant personalized picks.
          </p>
        </div>
        <button
          onClick={onOpenMatchmaker}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center justify-between cursor-pointer transition-colors shadow-sm"
        >
          <span>Launch AI Matchmaker</span>
          <ArrowRight className="w-3.5 h-3.5 text-amber-300" />
        </button>
      </div>

      {/* Editorial 3: Bookatlas Plus Unlimited */}
      <div className="bg-gradient-to-br from-purple-500/10 via-purple-100/40 to-white p-6 rounded-2xl border border-purple-200/80 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-800 bg-purple-200/60 px-2.5 py-0.5 rounded-full">
            Subscription Freedom
          </span>
          <h3 className="text-lg font-serif font-extrabold text-slate-900">
            Bookatlas Plus: 1.5M Titles
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Unlimited reading & listening across all your screens, tablets, and e-Ink devices. Free 30-day trial with instant activation.
          </p>
        </div>
        <button
          onClick={() => onExploreGenre('Science Fiction')}
          className="text-xs font-bold text-purple-900 hover:text-purple-700 flex items-center gap-1 cursor-pointer pt-2"
        >
          <span>Browse Plus Catalog</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
