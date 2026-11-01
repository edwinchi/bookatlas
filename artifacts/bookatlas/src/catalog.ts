import type { Book, FilterOptions } from './types.ts';

export function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function filterCatalog(books: Book[], filters: FilterOptions, activeTab: string): Book[] {
  const terms = normalizeSearch(filters.searchQuery).split(/\s+/).filter(Boolean);
  return books.filter((book) => {
      // Tab specific constraints
      if (activeTab === 'audiobooks' && book.format !== 'audiobook' && book.format !== 'bundle') {
        return false;
      }
      if (activeTab === 'bookatlasplus' && !book.isBookatlasPlus) {
        return false;
      }
      if (activeTab === 'deals' && !book.isDeal && book.price > 4.99) {
        return false;
      }

      const searchable = normalizeSearch([book.title, book.subtitle, book.author, book.narrator, book.primaryGenre, ...(book.genres || []), ...(book.tags || [])].filter(Boolean).join(' '));
      if (!terms.every(term => searchable.includes(term))) return false;
      if (filters.language && filters.language !== 'all' && book.language !== filters.language) return false;

      // Genre filter
      if (filters.genre !== 'All Genres') {
        if (!book.genres?.includes(filters.genre) && book.primaryGenre !== filters.genre) {
          return false;
        }
      }

      // Format filter
      if (filters.format !== 'all') {
        if (filters.format === 'ebook' && book.format !== 'ebook' && book.format !== 'bundle') return false;
        if (filters.format === 'audiobook' && book.format !== 'audiobook' && book.format !== 'bundle') return false;
      }

      // Bookatlas Plus Only filter
      if (filters.bookatlasPlusOnly && !book.isBookatlasPlus) {
        return false;
      }

      // Price category filter
      if (filters.priceCategory === 'free' && book.price > 0) return false;
      if (filters.priceCategory === 'under5' && book.price > 4.99) return false;
      if (filters.priceCategory === 'under10' && book.price > 9.99) return false;
      if (filters.priceCategory === 'deals' && !book.isDeal && book.price > 4.99) return false;

      // Rating filter
      if (book.rating < filters.minRating) return false;

      return true;
    }).sort((a, b) => {
      if (filters.sortBy === 'rating') return b.rating - a.rating;
      if (filters.sortBy === 'priceAsc') return a.price - b.price;
      if (filters.sortBy === 'priceDesc') return b.price - a.price;
      if (filters.sortBy === 'bestseller') return (b.isBestseller ? 1 : 0) - (a.isBestseller ? 1 : 0);
      if (filters.sortBy === 'newest') return (b.isNewRelease ? 1 : 0) - (a.isNewRelease ? 1 : 0);
      return (b.isEditorPick ? 1 : 0) - (a.isEditorPick ? 1 : 0);
    });
}
