import React, { useState } from 'react';
import { 
  BookOpen, 
  Flame, 
  Trophy, 
  CheckCircle, 
  Clock, 
  Star, 
  Play, 
  Trash2, 
  ShoppingBag, 
  Heart,
  Headphones,
  Sparkles
} from 'lucide-react';
import { UserLibraryItem, Book } from '../types';

interface MyLibraryViewProps {
  library: UserLibraryItem[];
  wishlist: Book[];
  onOpenReader: (item: UserLibraryItem) => void;
  onOpenBookDetail: (book: Book) => void;
  onRemoveFromLibrary: (bookId: string) => void;
  onRemoveFromWishlist: (bookId: string) => void;
  onAddToCart: (book: Book) => void;
  onExploreStore: () => void;
}

export const MyLibraryView: React.FC<MyLibraryViewProps> = ({
  library,
  wishlist,
  onOpenReader,
  onOpenBookDetail,
  onRemoveFromLibrary,
  onRemoveFromWishlist,
  onAddToCart,
  onExploreStore,
}) => {
  const [activeTab, setActiveTab] = useState<'reading' | 'all' | 'finished' | 'wishlist'>('reading');

  const currentlyReading = library.filter((item) => !item.finished && item.progressPercent < 100);
  const finishedBooks = library.filter((item) => item.finished || item.progressPercent >= 100);

  const getFilteredItems = () => {
    switch (activeTab) {
      case 'reading':
        return currentlyReading;
      case 'finished':
        return finishedBooks;
      case 'all':
        return library;
      default:
        return library;
    }
  };

  const filteredItems = getFilteredItems();

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Reading Goal & Stats Hero Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 text-white rounded-2xl p-6 sm:p-8 shadow-lg border border-stone-800">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          
          <div className="md:col-span-7 space-y-3">
            <div className="flex items-center gap-2">
              <span className="bg-[#bf0000] text-white text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                My Bookshelf
              </span>
              <span className="text-xs text-gray-400 font-medium">Synced across all devices</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-serif font-extrabold text-white">
              Your Personal Digital Library
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Pick up right where you left off on any browser, iOS/Android device, or Bookatlas eReader.
            </p>

            {/* Reading Challenge 2026 */}
            <div className="pt-2 max-w-md">
              <div className="flex items-center justify-between text-xs font-bold text-gray-300 mb-1.5">
                <span className="flex items-center gap-1.5 text-amber-300">
                  <Trophy className="w-4 h-4" /> 2026 Reading Challenge
                </span>
                <span>{finishedBooks.length + 3} of 20 books read</span>
              </div>
              <div className="w-full h-2.5 bg-stone-800 rounded-full overflow-hidden border border-white/10">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-[#bf0000] rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, Math.round(((finishedBooks.length + 3) / 20) * 100))}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Right Stats Quick Grid */}
          <div className="md:col-span-5 grid grid-cols-3 gap-3 bg-stone-950/60 p-4 rounded-xl border border-white/10 text-center">
            <div className="space-y-1">
              <div className="flex items-center justify-center text-amber-400">
                <Flame className="w-5 h-5 fill-amber-400" />
              </div>
              <div className="text-xl font-extrabold text-white">14</div>
              <p className="text-[10px] text-gray-400 uppercase font-semibold">Day Streak</p>
            </div>

            <div className="space-y-1 border-x border-white/10">
              <div className="flex items-center justify-center text-rose-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="text-xl font-extrabold text-white">{library.length}</div>
              <p className="text-[10px] text-gray-400 uppercase font-semibold">My Titles</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-center text-emerald-400">
                <Clock className="w-5 h-5" />
              </div>
              <div className="text-xl font-extrabold text-white">48h</div>
              <p className="text-[10px] text-gray-400 uppercase font-semibold">Read Time</p>
            </div>
          </div>

        </div>
      </div>

      {/* Library Tabs */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-2">
        <div className="flex items-center space-x-2 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('reading')}
            className={`px-3.5 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'reading'
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>Currently Reading ({currentlyReading.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-2 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'all'
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            All Books ({library.length})
          </button>

          <button
            onClick={() => setActiveTab('finished')}
            className={`px-3.5 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'finished'
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span>Finished ({finishedBooks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('wishlist')}
            className={`px-3.5 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'wishlist'
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <Heart className="w-4 h-4 text-[#bf0000]" />
            <span>Wishlist ({wishlist.length})</span>
          </button>
        </div>
      </div>

      {/* Tab Content: Wishlist Tab */}
      {activeTab === 'wishlist' ? (
        wishlist.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-4">
            <div className="w-14 h-14 bg-rose-50 text-[#bf0000] rounded-full flex items-center justify-center mx-auto">
              <Heart className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Your wishlist is empty</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Save eBooks and Audiobooks you want to read later by clicking the heart icon on any title.
            </p>
            <button
              onClick={onExploreStore}
              className="px-5 py-2.5 bg-[#bf0000] hover:bg-[#a60000] text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Browse Bestsellers
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {wishlist.map((book) => (
              <div key={book.id} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col justify-between shadow-2xs">
                <div className="flex gap-4">
                  <img
                    src={book.coverImage}
                    alt={book.title}
                    onClick={() => onOpenBookDetail(book)}
                    className="w-20 aspect-[2/3] object-cover rounded-md shadow-xs cursor-pointer"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 
                      onClick={() => onOpenBookDetail(book)}
                      className="font-bold text-sm text-gray-900 line-clamp-2 hover:text-[#bf0000] cursor-pointer"
                    >
                      {book.title}
                    </h4>
                    <p className="text-xs text-gray-600 truncate mt-0.5">{book.author}</p>
                    <div className="text-sm font-extrabold text-gray-950 mt-2">
                      ${book.price.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2 mt-4">
                  <button
                    onClick={() => onAddToCart(book)}
                    className="flex-1 py-1.5 px-3 bg-[#bf0000] hover:bg-[#a60000] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Add to Cart</span>
                  </button>
                  <button
                    onClick={() => onRemoveFromWishlist(book.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100 cursor-pointer"
                    title="Remove from wishlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Bookshelf Books Grid */
        filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-4">
            <div className="w-14 h-14 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto">
              <BookOpen className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No books found in this shelf</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Explore the Bookatlas Store to add eBooks, Audiobooks, or start reading free instant samples.
            </p>
            <button
              onClick={onExploreStore}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer shadow-sm"
            >
              Browse Bookatlas Store
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <div
                key={item.book.id}
                className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="flex gap-4">
                  {/* Cover */}
                  <div 
                    onClick={() => onOpenReader(item)}
                    className="relative w-24 aspect-[2/3] shrink-0 rounded-md overflow-hidden shadow-md border border-gray-200 cursor-pointer group"
                  >
                    <img
                      src={item.book.coverImage}
                      alt={item.book.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Play className="w-6 h-6 text-white fill-white" />
                    </div>
                  </div>

                  {/* Details */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-gray-500">
                      {item.format === 'audiobook' ? (
                        <span className="flex items-center gap-1 text-indigo-700">
                          <Headphones className="w-3 h-3" /> Audiobook
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-gray-400" /> eBook
                        </span>
                      )}
                    </div>

                    <h3 
                      onClick={() => onOpenBookDetail(item.book)}
                      className="font-serif font-bold text-gray-950 text-base line-clamp-1 hover:text-[#bf0000] cursor-pointer"
                    >
                      {item.book.title}
                    </h3>
                    <p className="text-xs text-gray-600 font-medium truncate">{item.book.author}</p>

                    {/* Progress Percentage */}
                    <div className="pt-3 space-y-1">
                      <div className="flex justify-between text-xs font-bold text-gray-700">
                        <span>{item.progressPercent}% Completed</span>
                        <span className="text-[11px] text-gray-400 font-normal">
                          Ch. {item.currentChapterIndex + 1} of {item.book.sampleChapters?.length || 5}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            item.progressPercent >= 100 ? 'bg-emerald-500' : 'bg-[#bf0000]'
                          }`}
                          style={{ width: `${item.progressPercent}%` }}
                        ></div>
                      </div>
                    </div>

                    {item.highlights && item.highlights.length > 0 && (
                      <p className="text-[11px] text-amber-700 pt-1 font-medium flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> {item.highlights.length} saved highlights
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions bottom */}
                <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-3 mt-4">
                  <button
                    onClick={() => onOpenReader(item)}
                    className="flex-1 py-2 px-4 bg-gray-900 hover:bg-black text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                    <span>{item.progressPercent > 0 ? 'Continue Reading' : 'Start Reading'}</span>
                  </button>

                  <button
                    onClick={() => onRemoveFromLibrary(item.book.id)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                    title="Remove from Shelf"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

    </div>
  );
};
