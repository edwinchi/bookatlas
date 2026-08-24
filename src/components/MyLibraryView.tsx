import React, { useState, useEffect } from 'react';
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
  Sparkles,
  FileDown,
  DownloadCloud,
  CheckCircle2,
  HardDriveDownload,
  Wifi,
  WifiOff,
  Layers,
  ArrowRight,
  TrendingUp,
  Award
} from 'lucide-react';
import { UserLibraryItem, Book } from '../types';
import { exportUserLibraryPDF } from '../utils/exportLibraryPdf';
import { TRANSLATIONS } from '../data/translations';

interface MyLibraryViewProps {
  library: UserLibraryItem[];
  wishlist: Book[];
  onOpenReader: (item: UserLibraryItem) => void;
  onOpenBookDetail: (book: Book) => void;
  onRemoveFromLibrary: (bookId: string) => void;
  onRemoveFromWishlist: (bookId: string) => void;
  onAddToCart: (book: Book) => void;
  onExploreStore: () => void;
  language?: 'en' | 'nl';
  userEmail?: string;
  userName?: string;
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
  language = 'en',
  userEmail = 'eddyteddy78@gmail.com',
  userName = 'Eddy',
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const [activeTab, setActiveTab] = useState<'reading' | 'all' | 'finished' | 'wishlist'>('reading');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfSuccessBanner, setPdfSuccessBanner] = useState(false);
  
  // Offline Caching State
  const [offlineEnabled, setOfflineEnabled] = useState<boolean>(() => {
    return localStorage.getItem('bookatlas_offline_caching_enabled') === 'true';
  });
  const [isCaching, setIsCaching] = useState(false);
  const [cachedItemsCount, setCachedItemsCount] = useState(library.length);

  // Dynamic Reading Stats
  const currentlyReading = library.filter((item) => !item.finished && item.progressPercent < 100);
  const finishedBooks = library.filter((item) => item.finished || item.progressPercent >= 100);
  const totalHighlightsCount = library.reduce((sum, item) => sum + (item.highlights?.length || 0), 0);
  const totalReadingHours = Math.round((library.reduce((sum, item) => sum + (item.progressPercent * (item.book.pageCount || 300) / 100), 0) / 45) + 12);
  const readingStreakDays = 14;

  const handleExportPDF = () => {
    setIsExportingPdf(true);
    setTimeout(() => {
      try {
        exportUserLibraryPDF({
          userEmail,
          userName,
          streakDays: readingStreakDays,
          totalReadingHours,
          booksCompleted: finishedBooks.length + 3,
          totalShelfCount: library.length,
          libraryItems: library,
          wishlistItems: wishlist,
          highlightsCount: totalHighlightsCount,
        }, language);

        setPdfSuccessBanner(true);
        setTimeout(() => setPdfSuccessBanner(false), 5000);
      } catch (err) {
        console.error('PDF generation error:', err);
      } finally {
        setIsExportingPdf(false);
      }
    }, 400);
  };

  const handleToggleOffline = () => {
    const nextState = !offlineEnabled;
    setOfflineEnabled(nextState);
    localStorage.setItem('bookatlas_offline_caching_enabled', String(nextState));

    if (nextState) {
      setIsCaching(true);
      // Cache library items and manuscripts in localStorage / IndexedDB mockup
      try {
        localStorage.setItem('bookatlas_offline_library_cache', JSON.stringify(library));
        setTimeout(() => {
          setIsCaching(false);
          setCachedItemsCount(library.length);
        }, 800);
      } catch (e) {
        setIsCaching(false);
      }
    }
  };

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
    <div className="space-y-8 animate-fadeIn">
      
      {/* PDF Success Alert Banner */}
      {pdfSuccessBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-950">{t.exportSuccess}</p>
              <p className="text-xs text-emerald-700">Official reader manifest & reading stats downloaded as PDF.</p>
            </div>
          </div>
          <button 
            onClick={() => setPdfSuccessBanner(false)}
            className="text-xs text-emerald-700 hover:text-emerald-950 font-bold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Reading Goal & Stats Hero Banner */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-amber-400 text-slate-950 text-xs font-extrabold px-3 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                {t.myBookshelf}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {userEmail} • Atlantean Cloud Sync
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-serif font-extrabold text-white leading-tight">
              {t.personalLibrary}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Pick up seamlessly on any browser, iOS/Android device, or Bookatlas eReader. Enjoy full offline caching for travel and zero-latency reading.
            </p>

            {/* Reading Challenge 2026 Progress */}
            <div className="pt-1 max-w-md bg-white/5 p-4 rounded-2xl border border-white/10">
              <div className="flex items-center justify-between text-xs font-bold text-slate-200 mb-2">
                <span className="flex items-center gap-1.5 text-amber-300">
                  <Trophy className="w-4 h-4" /> {t.readingChallenge}
                </span>
                <span>{finishedBooks.length + 3} of 20 books</span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-white/10">
                <div 
                  className="h-full bg-gradient-to-r from-amber-400 via-rose-500 to-indigo-500 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, Math.round(((finishedBooks.length + 3) / 20) * 100))}%` }}
                ></div>
              </div>
            </div>

            {/* Action Bar: Export PDF & Offline Toggle */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={handleExportPDF}
                disabled={isExportingPdf}
                className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                title={t.exportPdfTooltip}
              >
                {isExportingPdf ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-950 border-t-transparent animate-spin"></span>
                    <span>Generating PDF...</span>
                  </span>
                ) : (
                  <>
                    <FileDown className="w-4 h-4" />
                    <span>{t.exportPdf}</span>
                  </>
                )}
              </button>

              <button
                onClick={handleToggleOffline}
                className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-2 cursor-pointer ${
                  offlineEnabled
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                    : 'bg-white/10 text-slate-300 border-white/15 hover:bg-white/15'
                }`}
              >
                {offlineEnabled ? (
                  <>
                    <Wifi className="w-4 h-4 text-emerald-400" />
                    <span>{t.offlineReady} ({cachedItemsCount})</span>
                  </>
                ) : (
                  <>
                    <HardDriveDownload className="w-4 h-4 text-slate-300" />
                    <span>{t.enableOffline}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Reading Stats Grid */}
          <div className="lg:col-span-5 grid grid-cols-3 gap-3 bg-slate-950/80 p-5 rounded-2xl border border-white/10 text-center">
            <div className="space-y-1.5 p-2">
              <div className="flex items-center justify-center text-amber-400">
                <Flame className="w-5 h-5 fill-amber-400" />
              </div>
              <div className="text-2xl font-extrabold text-white">{readingStreakDays}</div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{t.readingStreak}</p>
            </div>

            <div className="space-y-1.5 p-2 border-x border-white/10">
              <div className="flex items-center justify-center text-indigo-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="text-2xl font-extrabold text-white">{library.length}</div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Titles</p>
            </div>

            <div className="space-y-1.5 p-2">
              <div className="flex items-center justify-center text-emerald-400">
                <Clock className="w-5 h-5" />
              </div>
              <div className="text-2xl font-extrabold text-white">{totalReadingHours}h</div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{t.totalReadTime}</p>
            </div>
          </div>

        </div>
      </div>

      {/* Library Navigation & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center space-x-2 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('reading')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'reading'
                ? 'bg-slate-950 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>{t.currentlyReading} ({currentlyReading.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'all'
                ? 'bg-slate-950 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>All Bookshelf ({library.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('finished')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'finished'
                ? 'bg-slate-950 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{t.finished} ({finishedBooks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('wishlist')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'wishlist'
                ? 'bg-slate-950 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Heart className="w-4 h-4 text-rose-400" />
            <span>Wishlist ({wishlist.length})</span>
          </button>
        </div>

        <button
          onClick={onExploreStore}
          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 cursor-pointer py-1.5 px-3 rounded-lg hover:bg-indigo-50 transition-colors"
        >
          <span>Discover More Books</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'wishlist' ? (
        wishlist.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 rounded-3xl border border-dashed border-slate-300">
            <Heart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-serif font-bold text-slate-900 mb-1">Your wishlist is empty</h3>
            <p className="text-xs text-slate-500 mb-5">Save interesting titles while browsing the catalog.</p>
            <button
              onClick={onExploreStore}
              className="px-5 py-2.5 bg-slate-950 text-white text-xs font-bold rounded-xl shadow hover:bg-slate-800 cursor-pointer"
            >
              Browse Bookstore
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {wishlist.map((book) => (
              <div
                key={book.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div 
                    onClick={() => onOpenBookDetail(book)}
                    className="aspect-[2/3] w-full rounded-xl overflow-hidden mb-3 bg-slate-100 cursor-pointer relative group"
                  >
                    <img 
                      src={book.coverImage} 
                      alt={book.title} 
                      referrerPolicy="no-referrer" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <h3 
                    onClick={() => onOpenBookDetail(book)}
                    className="font-serif font-bold text-slate-900 text-sm line-clamp-1 hover:text-indigo-600 cursor-pointer"
                  >
                    {book.title}
                  </h3>
                  <p className="text-xs text-slate-500">{book.author}</p>
                  <p className="text-xs font-bold text-slate-900 mt-1">€{book.price.toFixed(2)}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-3">
                  <button
                    onClick={() => onAddToCart(book)}
                    className="flex-1 py-2 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t.addToCart}</span>
                  </button>
                  <button
                    onClick={() => onRemoveFromWishlist(book.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-slate-100 cursor-pointer"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 rounded-3xl border border-dashed border-slate-300">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-serif font-bold text-slate-900 mb-1">
              {activeTab === 'reading'
                ? 'No active books being read right now'
                : activeTab === 'finished'
                ? 'No finished books yet'
                : 'Your bookshelf is empty'}
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Explore 1.5M+ eBooks and Audiobooks in our catalog and add them to your shelf.
            </p>
            <button
              onClick={onExploreStore}
              className="px-5 py-2.5 bg-slate-950 text-white text-xs font-bold rounded-xl shadow hover:bg-slate-800 cursor-pointer"
            >
              Discover Titles in Store
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <div
                key={item.book.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="flex gap-4">
                  <div 
                    onClick={() => onOpenReader(item)}
                    className="w-24 h-36 flex-shrink-0 rounded-xl overflow-hidden bg-slate-100 cursor-pointer shadow-sm relative group"
                  >
                    <img
                      src={item.book.coverImage}
                      alt={item.book.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="w-7 h-7 text-white fill-white" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md">
                          {item.format === 'audiobook' ? 'Audiobook' : 'EPUB3'}
                        </span>
                        {item.finished && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Finished
                          </span>
                        )}
                      </div>

                      <h3 
                        onClick={() => onOpenBookDetail(item.book)}
                        className="font-serif font-bold text-slate-900 text-sm line-clamp-1 hover:text-indigo-600 cursor-pointer"
                      >
                        {item.book.title}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium truncate">{item.book.author}</p>
                    </div>

                    {/* Progress Bar */}
                    <div className="pt-2 space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span>{item.progressPercent}% {item.finished ? 'Done' : 'Read'}</span>
                        <span className="text-[11px] text-slate-400 font-normal">
                          Ch. {item.currentChapterIndex + 1} of {item.book.sampleChapters?.length || 4}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            item.progressPercent >= 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                          }`}
                          style={{ width: `${item.progressPercent}%` }}
                        ></div>
                      </div>
                    </div>

                    {item.highlights && item.highlights.length > 0 && (
                      <p className="text-[11px] text-amber-700 pt-1 font-medium flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> {item.highlights.length} saved insights
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions Bottom */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2 mt-4">
                  <button
                    onClick={() => onOpenReader(item)}
                    className="flex-1 py-2.5 px-4 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                    <span>{item.progressPercent > 0 ? 'Continue Reading' : 'Start Reading'}</span>
                  </button>

                  <button
                    onClick={() => onRemoveFromLibrary(item.book.id)}
                    className="p-2.5 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
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
