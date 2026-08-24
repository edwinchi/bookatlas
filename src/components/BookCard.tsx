import React from 'react';
import { Star, BookOpen, ShoppingBag, Heart, Headphones, Sparkles } from 'lucide-react';
import { Book } from '../types';

interface BookCardProps {
  book: Book;
  onOpenDetail: (book: Book) => void;
  onReadSample: (book: Book) => void;
  onAddToCart: (book: Book) => void;
  onToggleWishlist: (book: Book) => void;
  onPlayAudioSample?: (book: Book) => void;
  isWishlisted: boolean;
  currencySymbol?: string;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  onOpenDetail,
  onReadSample,
  onAddToCart,
  onToggleWishlist,
  onPlayAudioSample,
  isWishlisted,
  currencySymbol = '$',
}) => {
  const discountPercent =
    book.originalPrice > book.price
      ? Math.round(((book.originalPrice - book.price) / book.originalPrice) * 100)
      : 0;

  return (
    <div className="group relative bg-white rounded-xl border border-gray-200/90 hover:border-gray-300 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden">
      
      {/* Cover Image Container */}
      <div className="relative aspect-[3/4] bg-stone-100 overflow-hidden cursor-pointer">
        <img
          src={book.coverImage}
          alt={book.title}
          onClick={() => onOpenDetail(book)}
          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
          referrerPolicy="no-referrer"
        />

        {/* 3D Book spine shadow gradient */}
        <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/40 to-transparent pointer-events-none"></div>

        {/* Top Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
          {discountPercent > 0 && (
            <span className="bg-indigo-600 text-white text-[11px] font-black px-2 py-0.5 rounded-sm shadow-xs uppercase tracking-wide">
              {book.price === 0 ? 'FREE' : `-${discountPercent}%`}
            </span>
          )}
          {book.isBestseller && !discountPercent && (
            <span className="bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-sm shadow-xs uppercase tracking-wide">
              Bestseller
            </span>
          )}
        </div>

        {/* Wishlist toggle button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist(book);
          }}
          className={`absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-md transition-all cursor-pointer z-10 ${
            isWishlisted
              ? 'bg-rose-600 text-white shadow-md'
              : 'bg-black/40 hover:bg-black/70 text-white'
          }`}
          title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-white' : ''}`} />
        </button>

        {/* Quick actions overlay on hover */}
        <div className="absolute inset-x-2 bottom-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReadSample(book);
            }}
            className="flex-1 py-1.5 px-2 bg-slate-900/90 hover:bg-slate-950 text-white text-xs font-semibold rounded-md flex items-center justify-center gap-1 backdrop-blur-xs transition-colors cursor-pointer"
            title="Read Free Preview in Browser"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>Preview</span>
          </button>

          {book.audioDurationMinutes && onPlayAudioSample && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPlayAudioSample(book);
              }}
              className="py-1.5 px-2 bg-indigo-900/90 hover:bg-indigo-950 text-white text-xs font-semibold rounded-md flex items-center justify-center gap-1 backdrop-blur-xs transition-colors cursor-pointer"
              title="Listen to Audio Sample"
            >
              <Headphones className="w-3.5 h-3.5 text-indigo-300" />
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(book);
            }}
            className="py-1.5 px-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-md flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer"
            title="Add to Cart"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-amber-300" />
          </button>
        </div>
      </div>

      {/* Book Metadata & Info */}
      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
        <div>
          {/* Format & Bookatlas Plus Pill */}
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 mb-1">
            <span className="flex items-center gap-1 text-slate-600">
              {book.format === 'audiobook' ? (
                <span className="flex items-center gap-0.5 text-indigo-700 font-semibold">
                  <Headphones className="w-3 h-3" /> Audio
                </span>
              ) : book.format === 'bundle' ? (
                <span className="text-purple-700 font-semibold">eBook + Audio</span>
              ) : (
                <span className="flex items-center gap-0.5">
                  <BookOpen className="w-3 h-3 text-slate-400" /> eBook
                </span>
              )}
            </span>

            {(book.isBookatlasPlus || book.isKoboPlus) && (
              <span className="flex items-center gap-0.5 text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.5 rounded-md text-[10px]">
                <Sparkles className="w-2.5 h-2.5 text-amber-500" /> Plus
              </span>
            )}
          </div>

          {/* Title */}
          <h3
            onClick={() => onOpenDetail(book)}
            className="font-serif font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-indigo-600 transition-colors cursor-pointer leading-tight"
            title={book.title}
          >
            {book.title}
          </h3>

          {/* Author */}
          <p className="text-xs text-slate-600 font-medium truncate mt-0.5">
            {book.author}
          </p>

          {/* Rating */}
          <div className="flex items-center gap-1 text-xs mt-1.5">
            <div className="flex items-center text-amber-500">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="font-bold ml-1 text-slate-900 text-[11px]">{book.rating}</span>
            </div>
            <span className="text-slate-400 text-[10px]">({book.reviewCount})</span>
          </div>
        </div>

        {/* Price & Action */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-extrabold text-slate-950">
                {book.price === 0 ? 'Free' : `${currencySymbol}${book.price.toFixed(2)}`}
              </span>
              {book.originalPrice > book.price && (
                <span className="text-xs text-slate-400 line-through">
                  {currencySymbol}{book.originalPrice.toFixed(2)}
                </span>
              )}
            </div>
            {book.superPointsEarned > 0 && (
              <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" /> +{book.superPointsEarned} pts
              </span>
            )}
          </div>

          <button
            onClick={() => onAddToCart(book)}
            className="p-1.5 text-slate-700 hover:text-white hover:bg-indigo-600 rounded-lg transition-colors border border-slate-200 hover:border-indigo-600 cursor-pointer"
            title="Add to Cart"
          >
            <ShoppingBag className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
