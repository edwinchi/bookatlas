import React from 'react';
import { Filter, Star, Sparkles, Tag, Check, Headphones, BookOpen, X } from 'lucide-react';
import { FilterOptions } from '../types';
import { CategoryBrowser } from './CategoryBrowser';

interface FilterSidebarProps {
  filters: FilterOptions;
  setFilters: React.Dispatch<React.SetStateAction<FilterOptions>>;
  totalResults: number;
  languages: string[];
  /** Titles per category from the catalogue (TASK-0005); null while loading. */
  categoryCounts?: Record<string, number> | null;
  catalogTotal?: number | null;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  setFilters,
  totalResults,
  languages,
  categoryCounts,
  catalogTotal,
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
      bookatlasPlusOnly: false,
    });
  };

  const hasActiveFilters =
    filters.genre !== 'All Genres' ||
    filters.format !== 'all' ||
    filters.priceCategory !== 'all' ||
    filters.minRating > 0 ||
    filters.bookatlasPlusOnly || Boolean(filters.searchQuery.trim()) || Boolean(filters.language && filters.language !== 'all');

  return (
    <aside className="w-full bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-6 lg:sticky lg:top-28 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:overscroll-contain [scrollbar-width:thin]">
      {/* Header with clear button */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-700" />
          <h2 className="text-base font-bold text-gray-900">Filters</h2>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium tabular-nums">
            {totalResults.toLocaleString()} titles
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

      {hasActiveFilters && (
        <div className="-mt-2 flex flex-wrap gap-1.5" aria-label="Active filters">
          {[
            filters.searchQuery.trim() && { key: 'q', label: `“${filters.searchQuery.trim()}”`, clear: () => setFilters((p) => ({ ...p, searchQuery: '' })) },
            filters.genre !== 'All Genres' && { key: 'genre', label: filters.genre, clear: () => handleGenreChange('All Genres') },
            filters.format !== 'all' && { key: 'format', label: filters.format === 'ebook' ? 'eBook' : 'Audio', clear: () => handleFormatChange('all') },
            filters.priceCategory !== 'all' && { key: 'price', label: { free: 'Free', under5: 'Under 5', under10: 'Under 10', deals: 'Deals' }[filters.priceCategory as 'free'], clear: () => handlePriceChange('all') },
            filters.minRating > 0 && { key: 'rating', label: `${filters.minRating}★ & up`, clear: () => handleRatingChange(filters.minRating) },
            filters.bookatlasPlusOnly && { key: 'plus', label: 'Plus only', clear: () => setFilters((p) => ({ ...p, bookatlasPlusOnly: false })) },
            filters.language && filters.language !== 'all' && { key: 'lang', label: filters.language, clear: () => setFilters((p) => ({ ...p, language: 'all' })) },
          ].filter((chip): chip is { key: string; label: string; clear: () => void } => Boolean(chip)).map((chip) => (
            <button key={chip.key} type="button" onClick={chip.clear} aria-label={`Remove filter ${chip.label}`}
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-slate-200 bg-slate-50 py-0.5 pl-2.5 pr-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-[#bf0000]/30 hover:bg-[#bf0000]/5 hover:text-[#8f0000] cursor-pointer">
              <span className="truncate">{chip.label}</span><X className="h-3 w-3 shrink-0" aria-hidden />
            </button>
          ))}
        </div>
      )}

      <label className="block text-sm font-semibold text-slate-900">
        Language
        <select aria-label="Book language" value={filters.language || 'all'}
          onChange={event => setFilters(previous => ({ ...previous, language: event.target.value }))}
          className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 focus:ring-2 focus:ring-indigo-600">
          <option value="all">All languages</option>
          {languages.map(language => <option key={language} value={language}>{language}</option>)}
        </select>
      </label>
      {/* Bookatlas Plus Toggle */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200/80 rounded-xl p-3.5">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.bookatlasPlusOnly}
            onChange={(e) => setFilters((prev) => ({ ...prev, bookatlasPlusOnly: e.target.checked }))}
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

      {/* Categories: grouped, searchable, with live counts */}
      <CategoryBrowser value={filters.genre} onChange={handleGenreChange} counts={categoryCounts ?? null} total={catalogTotal ?? null} />

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
