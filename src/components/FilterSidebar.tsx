import React from 'react';
import { Filter, Star, Sparkles, Tag, Check, Headphones, BookOpen, Globe, Compass, Layers } from 'lucide-react';
import { FilterOptions } from '../types';
import { GENRES, AFRICAN_LITERATURE_GENRES, CONSCIOUSNESS_COMMUNITY_GENRES, GENERAL_GENRES } from '../data/booksData';

interface FilterSidebarProps {
  filters: FilterOptions;
  setFilters: React.Dispatch<React.SetStateAction<FilterOptions>>;
  totalResults: number;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  setFilters,
  totalResults,
}) => {
  const handleGenreChange = (g: string) => {
    setFilters((prev) => ({ ...prev, genre: g }));
  };

  const handleFormatChange = (fmt: 'all' | 'ebook' | 'audiobook') => {
    setFilters((prev) => ({ ...prev, format: fmt }));
  };

  const handlePriceChange = (priceCat: 'all' | 'free' | 'under5' | 'under10' | 'deals') => {
    setFilters((prev) => ({ ...prev, priceCategory: priceCat }));
  };

  const handleRatingChange = (rating: number) => {
    setFilters((prev) => ({ ...prev, minRating: prev.minRating === rating ? 0 : rating }));
  };

  const resetFilters = () => {
    setFilters({
      searchQuery: '',
      genre: 'All Genres',
      format: 'all',
      priceCategory: 'all',
      minRating: 0,
      sortBy: 'featured',
      koboPlusOnly: false,
    });
  };

  const hasActiveFilters =
    filters.genre !== 'All Genres' ||
    filters.format !== 'all' ||
    filters.priceCategory !== 'all' ||
    filters.minRating > 0 ||
    filters.koboPlusOnly;

  return (
    <aside className="w-full bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-6">
      {/* Header with clear button */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-700" />
          <h2 className="text-base font-bold text-gray-900">Filters</h2>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
            {totalResults} titles
          </span>
        </div>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="text-xs text-[#bf0000] hover:underline font-semibold cursor-pointer"
          >
            Reset All
          </button>
        )}
      </div>

      {/* Bookatlas Plus Toggle */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200/80 rounded-xl p-3.5">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.koboPlusOnly}
            onChange={(e) => setFilters((prev) => ({ ...prev, koboPlusOnly: e.target.checked }))}
            className="mt-1 w-4 h-4 text-indigo-600 rounded-sm focus:ring-indigo-600 border-slate-300"
          />
          <div>
            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
              <span className="text-indigo-700 font-extrabold">Bookatlas</span>
              <span>Plus Only</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Show unlimited reading titles included with subscription
            </p>
          </div>
        </label>
      </div>

      {/* Format Filter */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Format</h3>
        <div className="grid grid-cols-3 gap-1.5 bg-gray-100 p-1 rounded-lg text-xs font-semibold">
          <button
            onClick={() => handleFormatChange('all')}
            className={`py-1.5 px-2 rounded-md transition-all cursor-pointer ${
              filters.format === 'all'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All Formats
          </button>
          <button
            onClick={() => handleFormatChange('ebook')}
            className={`py-1.5 px-2 rounded-md flex items-center justify-center gap-1 transition-all cursor-pointer ${
              filters.format === 'ebook'
                ? 'bg-white text-[#bf0000] shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BookOpen className="w-3 h-3" />
            <span>eBook</span>
          </button>
          <button
            onClick={() => handleFormatChange('audiobook')}
            className={`py-1.5 px-2 rounded-md flex items-center justify-center gap-1 transition-all cursor-pointer ${
              filters.format === 'audiobook'
                ? 'bg-white text-[#bf0000] shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Headphones className="w-3 h-3" />
            <span>Audio</span>
          </button>
        </div>
      </div>

      {/* Price Categories */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Price</h3>
        <div className="space-y-1 text-sm">
          {[
            { id: 'all', label: 'Any Price' },
            { id: 'free', label: 'Free ($0.00)' },
            { id: 'under5', label: 'Under $5.00' },
            { id: 'under10', label: 'Under $10.00' },
            { id: 'deals', label: 'Deals & Discounts' },
          ].map((item) => (
            <label
              key={item.id}
              onClick={() => handlePriceChange(item.id as any)}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer transition-colors ${
                filters.priceCategory === item.id
                  ? 'bg-gray-100 font-semibold text-gray-950'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="flex items-center gap-2">
                {item.id === 'deals' && <Tag className="w-3.5 h-3.5 text-amber-600" />}
                {item.label}
              </span>
              {filters.priceCategory === item.id && (
                <Check className="w-3.5 h-3.5 text-[#bf0000]" />
              )}
            </label>
          ))}
        </div>
      </div>

      {/* Genres List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Categories & Genres</h3>
          {filters.genre !== 'All Genres' && (
            <button
              onClick={() => handleGenreChange('All Genres')}
              className="text-[11px] text-[#bf0000] hover:underline font-semibold cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
        
        <div className="space-y-1 max-h-72 overflow-y-auto pr-1 text-sm">
          {/* All Genres */}
          <button
            onClick={() => handleGenreChange('All Genres')}
            className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs sm:text-sm transition-colors cursor-pointer flex items-center justify-between ${
              filters.genre === 'All Genres'
                ? 'bg-[#bf0000]/10 text-[#bf0000] font-bold'
                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-950 font-medium'
            }`}
          >
            <span>✨ All Categories</span>
            {filters.genre === 'All Genres' && <span className="w-1.5 h-1.5 rounded-full bg-[#bf0000]"></span>}
          </button>

          {/* African Literature Group */}
          <div className="pt-2">
            <div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 rounded flex items-center gap-1 mb-1">
              <span>🌍</span> African Literature & Diaspora
            </div>
            {AFRICAN_LITERATURE_GENRES.map((g) => (
              <button
                key={g}
                onClick={() => handleGenreChange(g)}
                className={`w-full text-left px-2 py-1 rounded-md text-xs transition-colors cursor-pointer flex items-center justify-between ${
                  filters.genre === g
                    ? 'bg-amber-100 text-amber-950 font-bold'
                    : 'text-gray-700 hover:bg-amber-50/60 hover:text-gray-950'
                }`}
              >
                <span className="truncate">{g}</span>
                {filters.genre === g && <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>}
              </button>
            ))}
          </div>

          {/* Consciousness Group */}
          <div className="pt-2">
            <div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 rounded flex items-center gap-1 mb-1">
              <span>👁️</span> Consciousness & Sacred Sciences
            </div>
            {CONSCIOUSNESS_COMMUNITY_GENRES.map((g) => (
              <button
                key={g}
                onClick={() => handleGenreChange(g)}
                className={`w-full text-left px-2 py-1 rounded-md text-xs transition-colors cursor-pointer flex items-center justify-between ${
                  filters.genre === g
                    ? 'bg-emerald-100 text-emerald-950 font-bold'
                    : 'text-gray-700 hover:bg-emerald-50/60 hover:text-gray-950'
                }`}
              >
                <span className="truncate">{g}</span>
                {filters.genre === g && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>}
              </button>
            ))}
          </div>

          {/* General Genres Group */}
          <div className="pt-2">
            <div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 rounded flex items-center gap-1 mb-1">
              <span>📚</span> General & Classics
            </div>
            {GENERAL_GENRES.map((g) => (
              <button
                key={g}
                onClick={() => handleGenreChange(g)}
                className={`w-full text-left px-2 py-1 rounded-md text-xs transition-colors cursor-pointer flex items-center justify-between ${
                  filters.genre === g
                    ? 'bg-[#bf0000]/10 text-[#bf0000] font-bold'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-950'
                }`}
              >
                <span className="truncate">{g}</span>
                {filters.genre === g && <span className="w-1.5 h-1.5 rounded-full bg-[#bf0000]"></span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Star Rating Filter */}
      <div className="space-y-2 pt-2 border-t border-gray-100">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Customer Rating</h3>
        <div className="space-y-1">
          {[4.8, 4.5, 4.0].map((rating) => (
            <button
              key={rating}
              onClick={() => handleRatingChange(rating)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-sm cursor-pointer transition-colors ${
                filters.minRating === rating
                  ? 'bg-amber-50 text-amber-900 font-semibold'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < Math.floor(rating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs font-medium text-gray-700">& up ({rating}★)</span>
              </div>
              {filters.minRating === rating && <Check className="w-3.5 h-3.5 text-amber-600" />}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
};
