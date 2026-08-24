import React, { useState, useMemo, useEffect } from 'react';
import { Header } from './components/Header';
import { HeroCarousel } from './components/HeroCarousel';
import { FilterSidebar } from './components/FilterSidebar';
import { BookCard } from './components/BookCard';
import { HorizontalProductCarousel } from './components/HorizontalProductCarousel';
import { PromotionalFeatureBanner, EditorialCuratorBlock } from './components/EditorialBlock';
import { BookDetailModal } from './components/BookDetailModal';
import { EReaderModal } from './components/EReaderModal';
import { AudiobookPlayerDock } from './components/AudiobookPlayerDock';
import { MyLibraryView } from './components/MyLibraryView';
import { CartDrawer } from './components/CartDrawer';
import { AIMatchmakerModal } from './components/AIMatchmakerModal';
import { ArchitectureGuideModal } from './components/ArchitectureGuideModal';
import { ManagerPortal } from './components/ManagerPortal';
import { GeminiChatbotModal } from './components/GeminiChatbotModal';
import { LiveVoiceCompanionModal } from './components/LiveVoiceCompanionModal';
import { VeoVideoAnimatorModal } from './components/VeoVideoAnimatorModal';
import { GoogleSearchGroundingModal } from './components/GoogleSearchGroundingModal';
import { ExportDocsModal } from './components/ExportDocsModal';
import { AIStudioHub } from './components/AIStudioHub';
import { AdminAuthModal } from './components/AdminAuthModal';
import { INITIAL_BOOKS } from './data/booksData';

import { Book, CartItem, UserLibraryItem, FilterOptions, AdminSession } from './types';
import { 
  Sparkles, 
  ArrowUpDown, 
  BookOpen, 
  Headphones, 
  Tag, 
  ShieldCheck, 
  Layers, 
  Heart, 
  HelpCircle,
  TrendingUp,
  Award,
  Bot,
  Lock,
  Unlock
} from 'lucide-react';

export default function App() {
  const [books, setBooks] = useState<Book[]>(INITIAL_BOOKS);
  const [activeTab, setActiveTab] = useState<'store' | 'library' | 'deals' | 'audiobooks' | 'koboplus' | 'manager'>('store');
  const [currency, setCurrency] = useState('EUR');
  const currencySymbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';

  // Load books from backend API if available
  useEffect(() => {
    fetch('/api/books')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.books && data.books.length > 0) {
          setBooks(data.books);
        }
      })
      .catch((err) => {
        console.log('Using seeded catalog initialization:', err);
      });
  }, []);

  // Manager Book CRUD handlers
  const handleAddBook = (newBook: Book) => {
    setBooks((prev) => [newBook, ...prev]);
  };

  const handleUpdateBook = (updatedBook: Book) => {
    setBooks((prev) => prev.map((b) => (b.id === updatedBook.id ? updatedBook : b)));
  };

  const handleDeleteBook = (bookId: string) => {
    setBooks((prev) => prev.filter((b) => b.id !== bookId));
    fetch(`/api/books/${bookId}`, { method: 'DELETE' }).catch(() => {});
  };

  // Filters State
  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: '',
    genre: 'All Genres',
    format: 'all',
    priceCategory: 'all',
    minRating: 0,
    sortBy: 'featured',
    koboPlusOnly: false,
  });

  // User State: Cart, Wishlist, Library
  const [cart, setCart] = useState<CartItem[]>([
    { book: INITIAL_BOOKS[0], format: 'ebook', addedAt: Date.now() }
  ]);

  const [wishlist, setWishlist] = useState<Book[]>([
    INITIAL_BOOKS[1],
    INITIAL_BOOKS[5]
  ]);

  const [library, setLibrary] = useState<UserLibraryItem[]>([
    {
      book: INITIAL_BOOKS[0],
      format: 'ebook',
      progressPercent: 35,
      currentChapterIndex: 0,
      currentParagraphIndex: 3,
      lastReadTimestamp: Date.now() - 3600000,
      highlights: [
        {
          id: 'hl-1',
          text: 'The astrolabe in Kaelen’s palm hummed with a resonance that felt colder than winter sea water.',
          color: 'yellow',
          chapterIndex: 0,
          paragraphIndex: 0,
          date: 'Yesterday'
        }
      ],
      bookmarks: [0],
    },
    {
      book: INITIAL_BOOKS[2],
      format: 'ebook',
      progressPercent: 78,
      currentChapterIndex: 0,
      currentParagraphIndex: 4,
      lastReadTimestamp: Date.now() - 86400000,
      highlights: [],
      bookmarks: [],
    },
    {
      book: INITIAL_BOOKS[11],
      format: 'ebook',
      progressPercent: 100,
      currentChapterIndex: 0,
      currentParagraphIndex: 0,
      lastReadTimestamp: Date.now() - 172800000,
      highlights: [],
      bookmarks: [],
      finished: true,
    }
  ]);

  // Active Modals & Views
  const [selectedBookForDetail, setSelectedBookForDetail] = useState<Book | null>(null);
  const [activeReadingBook, setActiveReadingBook] = useState<{ book: Book; chapterIndex: number; paragraphIndex: number } | null>(null);
  const [activeAudiobook, setActiveAudiobook] = useState<Book | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAIMatchmakerOpen, setIsAIMatchmakerOpen] = useState(false);
  const [isArchitectureGuideOpen, setIsArchitectureGuideOpen] = useState(false);

  // New Gemini AI & Export Modals State
  const [isAIHubOpen, setIsAIHubOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);

  // Administrator Security & Authentication State
  const [adminSession, setAdminSession] = useState<AdminSession | null>(() => {
    const local = localStorage.getItem('bookatlas_admin_session');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (parsed?.isAuthenticated) return parsed;
      } catch (e) {}
    }
    const session = sessionStorage.getItem('bookatlas_admin_session');
    if (session) {
      try {
        const parsed = JSON.parse(session);
        if (parsed?.isAuthenticated) return parsed;
      } catch (e) {}
    }
    return null;
  });

  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState(false);
  const [adminAuthRequestedFeature, setAdminAuthRequestedFeature] = useState('Bookatlas Administrator Console');
  const [adminAuthSuccessCallback, setAdminAuthSuccessCallback] = useState<(() => void) | null>(null);

  const isAdminAuthenticated = Boolean(adminSession?.isAuthenticated);
  const adminEmail = adminSession?.adminEmail || 'eddyteddy78@gmail.com';

  const openAdminAuthForFeature = (featureName: string, callback?: () => void) => {
    setAdminAuthRequestedFeature(featureName);
    if (callback) {
      setAdminAuthSuccessCallback(() => callback);
    } else {
      setAdminAuthSuccessCallback(null);
    }
    setIsAdminAuthModalOpen(true);
  };

  const handleAdminAuthSuccess = () => {
    const raw = localStorage.getItem('bookatlas_admin_session') || sessionStorage.getItem('bookatlas_admin_session');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setAdminSession(parsed);
      } catch (e) {}
    } else {
      setAdminSession({
        isAuthenticated: true,
        adminEmail: 'eddyteddy78@gmail.com',
        adminName: 'Eddy (Platform Owner)',
        loginTimestamp: Date.now(),
        role: 'super_admin'
      });
    }
    if (adminAuthSuccessCallback) {
      const cb = adminAuthSuccessCallback;
      setAdminAuthSuccessCallback(null);
      cb();
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('bookatlas_admin_session');
    sessionStorage.removeItem('bookatlas_admin_session');
    setAdminSession(null);
    if (activeTab === 'manager') {
      setActiveTab('store');
    }
  };


  // Filter & Search Logic
  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      // Tab specific constraints
      if (activeTab === 'audiobooks' && book.format !== 'audiobook' && book.format !== 'bundle') {
        return false;
      }
      if (activeTab === 'koboplus' && !book.isKoboPlus && !book.isBookatlasPlus) {
        return false;
      }
      if (activeTab === 'deals' && !book.isDeal && book.price > 4.99) {
        return false;
      }

      // Search Query
      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase();
        const matchTitle = book.title.toLowerCase().includes(q);
        const matchAuthor = book.author.toLowerCase().includes(q);
        const matchGenre = book.genres?.some((g) => g.toLowerCase().includes(q));
        const matchTags = book.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchAuthor && !matchGenre && !matchTags) return false;
      }

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

      // Kobo / Bookatlas Plus Only filter
      if (filters.koboPlusOnly && !book.isKoboPlus && !book.isBookatlasPlus) {
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
  }, [books, filters, activeTab]);

  // Derived Book Subsets for Netflix-Style Horizontal Carousels
  const amsterdamPicks = useMemo(() => {
    return books.filter(b => b.primaryGenre === 'Dutch & European Classics' || b.primaryGenre === 'Historical Fiction' || b.id.includes('amsterdam') || b.tags?.includes('Amsterdam') || b.isEditorPick);
  }, [books]);

  const plusPicks = useMemo(() => {
    return books.filter(b => b.isBookatlasPlus || b.isKoboPlus);
  }, [books]);

  const sciFiPicks = useMemo(() => {
    return books.filter(b => b.primaryGenre === 'Sci-Fi & Fantasy' || b.genres?.includes('Sci-Fi & Fantasy') || b.genres?.includes('Science Fiction'));
  }, [books]);

  const audioPicks = useMemo(() => {
    return books.filter(b => b.format === 'audiobook' || b.format === 'bundle' || b.audioDurationMinutes);
  }, [books]);

  const thrillerPicks = useMemo(() => {
    return books.filter(b => b.primaryGenre === 'Mystery & Suspense' || b.primaryGenre === 'Thriller & Crime' || b.genres?.includes('Mystery & Suspense') || b.genres?.includes('Thriller & Suspense'));
  }, [books]);

  const featuredSpotlight = useMemo(() => {
    return books.find(b => b.isBestseller && b.isEditorPick) || books[0];
  }, [books]);

  // Cart & Wishlist Actions
  const handleAddToCart = (book: Book, format: 'ebook' | 'audiobook' = 'ebook') => {
    setCart((prev) => {
      const existing = prev.find((item) => item.book.id === book.id && item.format === format);
      if (existing) return prev;
      return [...prev, { book, format, addedAt: Date.now() }];
    });
    setIsCartOpen(true);
  };

  const handleRemoveFromCart = (bookId: string, format: 'ebook' | 'audiobook') => {
    setCart((prev) => prev.filter((item) => !(item.book.id === bookId && item.format === format)));
  };

  const handleToggleWishlist = (book: Book) => {
    setWishlist((prev) => {
      const exists = prev.some((b) => b.id === book.id);
      if (exists) {
        return prev.filter((b) => b.id !== book.id);
      } else {
        return [...prev, book];
      }
    });
  };

  const handleReadSample = (book: Book) => {
    const existingLib = library.find((i) => i.book.id === book.id);
    setActiveReadingBook({
      book,
      chapterIndex: existingLib ? existingLib.currentChapterIndex : 0,
      paragraphIndex: existingLib ? existingLib.currentParagraphIndex : 0,
    });
  };

  const handleCheckoutComplete = () => {
    // Transfer cart items to user bookshelf
    const newLibraryItems: UserLibraryItem[] = cart.map((item) => ({
      book: item.book,
      format: item.format,
      progressPercent: 0,
      currentChapterIndex: 0,
      currentParagraphIndex: 0,
      lastReadTimestamp: Date.now(),
      highlights: [],
      bookmarks: [],
    }));

    setLibrary((prev) => {
      const existingIds = new Set(prev.map((i) => i.book.id));
      const filtered = newLibraryItems.filter((i) => !existingIds.has(i.book.id));
      return [...filtered, ...prev];
    });

    setCart([]);
    setIsCartOpen(false);
    setActiveTab('library');
  };

  const handleSaveProgress = (chapterIndex: number, paragraphIndex: number, progressPct: number) => {
    if (!activeReadingBook) return;
    setLibrary((prev) => {
      const exists = prev.some((i) => i.book.id === activeReadingBook.book.id);
      if (exists) {
        return prev.map((item) =>
          item.book.id === activeReadingBook.book.id
            ? {
                ...item,
                currentChapterIndex: chapterIndex,
                currentParagraphIndex: paragraphIndex,
                progressPercent: Math.max(item.progressPercent, progressPct),
                lastReadTimestamp: Date.now(),
                finished: progressPct >= 100,
              }
            : item
        );
      } else {
        return [
          {
            book: activeReadingBook.book,
            format: 'ebook',
            progressPercent: progressPct,
            currentChapterIndex: chapterIndex,
            currentParagraphIndex: paragraphIndex,
            lastReadTimestamp: Date.now(),
            highlights: [],
            bookmarks: [],
            finished: progressPct >= 100,
          },
          ...prev,
        ];
      }
    });
  };

  const handleViewAllCategory = (genreName: string, formatName: 'all' | 'ebook' | 'audiobook' = 'all') => {
    setFilters((f) => ({
      ...f,
      genre: genreName,
      format: formatName,
      searchQuery: '',
    }));
    setActiveTab('store');
    // Scroll to catalog grid smoothly
    const catalogElement = document.getElementById('catalog-grid-section');
    if (catalogElement) {
      catalogElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1c1d1f] flex flex-col antialiased">
      
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={filters.searchQuery}
        setSearchQuery={(q) => setFilters((f) => ({ ...f, searchQuery: q }))}
        selectedGenre={filters.genre}
        setSelectedGenre={(g) => setFilters((f) => ({ ...f, genre: g }))}
        cartCount={cart.length}
        wishlistCount={wishlist.length}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenWishlist={() => setActiveTab('library')}
        onOpenArchitectureGuide={() => setIsArchitectureGuideOpen(true)}
        onOpenAIMatchmaker={() => setIsAIMatchmakerOpen(true)}
        onOpenAIHub={() => setIsAIHubOpen(true)}
        onOpenChat={() => setIsChatOpen(true)}
        onOpenVoice={() => setIsVoiceOpen(true)}
        onOpenVideo={() => setIsVideoOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenDocs={() => setIsDocsOpen(true)}
        currency={currency}
        setCurrency={setCurrency}
        isAdminAuthenticated={isAdminAuthenticated}
        adminEmail={adminEmail}
        onOpenAdminAuth={openAdminAuthForFeature}
        onAdminLogout={handleAdminLogout}
      />


      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-8">
        
        {/* VIEW 1: SINGLE MANAGER OPERATIONS STUDIO (SECURED ADMIN ZONE) */}
        {activeTab === 'manager' ? (
          isAdminAuthenticated ? (
            <ManagerPortal
              books={books}
              onAddBook={handleAddBook}
              onUpdateBook={handleUpdateBook}
              onDeleteBook={handleDeleteBook}
              onPreviewBook={handleReadSample}
              onReturnToStore={() => setActiveTab('store')}
              onOpenAIHub={() => setIsAIHubOpen(true)}
              onOpenChat={() => setIsChatOpen(true)}
              onOpenVoice={() => setIsVoiceOpen(true)}
              onOpenVideo={() => setIsVideoOpen(true)}
              onOpenSearch={() => setIsSearchOpen(true)}
              onOpenDocs={() => setIsDocsOpen(true)}
              currencySymbol={currencySymbol}
              adminEmail={adminEmail}
              onAdminLogout={handleAdminLogout}
            />
          ) : (
            <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-xl max-w-2xl mx-auto text-center space-y-6 my-12 animate-scaleUp">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                <Lock className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 bg-amber-100/70 px-3 py-1 rounded-full border border-amber-200">
                  Secured Administrator Zone
                </span>
                <h2 className="text-2xl font-serif font-bold text-slate-900">
                  Manager Studio is Locked
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                  This operational studio is restricted to the platform owner (<strong className="text-slate-800">{adminEmail}</strong>) of Atlantean Globals Services B.V. Please enter your Administrator Master PIN to proceed.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => openAdminAuthForFeature('Bookatlas Master Operations Studio', () => setActiveTab('manager'))}
                  className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Enter Administrator Master PIN</span>
                </button>
                <button
                  onClick={() => setActiveTab('store')}
                  className="w-full sm:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Return to Storefront
                </button>
              </div>
            </div>
          )
        ) : activeTab === 'library' ? (

          /* User's Bookshelf View */
          <MyLibraryView
            library={library}
            wishlist={wishlist}
            onOpenReader={(item) => {
              setActiveReadingBook({
                book: item.book,
                chapterIndex: item.currentChapterIndex,
                paragraphIndex: item.currentParagraphIndex,
              });
            }}
            onOpenBookDetail={(book) => setSelectedBookForDetail(book)}
            onRemoveFromLibrary={(id) => setLibrary((prev) => prev.filter((i) => i.book.id !== id))}
            onRemoveFromWishlist={(id) => setWishlist((prev) => prev.filter((b) => b.id !== id))}
            onAddToCart={handleAddToCart}
            onExploreStore={() => setActiveTab('store')}
          />
        ) : (
          /* Store View (eBooks, Audiobooks, Bookatlas Plus, Deals) */
          <>
            {/* Editorial Hero Carousel (shown on general store view) */}
            {activeTab === 'store' && !filters.searchQuery && filters.genre === 'All Genres' && (
              <HeroCarousel
                books={books}
                onOpenBookDetail={(b) => setSelectedBookForDetail(b)}
                onReadSample={handleReadSample}
                onAddToCart={handleAddToCart}
                onExploreKoboPlus={() => setActiveTab('koboplus')}
              />
            )}

            {/* Special Section Banners for Sub-Tabs */}
            {activeTab === 'koboplus' && (
              <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white rounded-2xl p-6 sm:p-8 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6 border border-indigo-400/20">
                <div className="space-y-2 max-w-xl">
                  <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full flex items-center gap-1 w-fit text-amber-300">
                    <Sparkles className="w-3.5 h-3.5" /> Bookatlas Plus Unlimited
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-serif font-extrabold text-white">
                    Read & Listen All You Want for €9.99/Month
                  </h1>
                  <p className="text-xs sm:text-sm text-indigo-100">
                    Over 1.5 million eBooks and 150,000 Audiobooks included. No due dates, no limits. Cancel anytime.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button className="px-6 py-3 bg-white text-indigo-900 hover:bg-slate-100 font-bold text-sm rounded-xl shadow-md cursor-pointer transition-colors">
                    Start 30-Day Free Trial
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'deals' && (
              <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-2xl p-6 shadow-md flex items-center justify-between">
                <div>
                  <h1 className="text-xl sm:text-2xl font-serif font-extrabold">
                    Today’s Daily Deals & Free eBooks
                  </h1>
                  <p className="text-xs text-amber-100 mt-0.5">
                    Bestsellers discounted up to 80% off for a limited time.
                  </p>
                </div>
                <span className="bg-white/20 text-xs font-bold px-3 py-1.5 rounded-lg">
                  Updated Daily at Midnight
                </span>
              </div>
            )}

            {/* Netflix-Style Horizontal Product Carousels & Editorial Blocks */}
            {activeTab === 'store' && !filters.searchQuery && filters.genre === 'All Genres' && (
              <div className="space-y-8 my-6">
                
                {/* Category Quick Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {[
                    { name: 'All Categories', genre: 'All Genres' },
                    { name: 'Sci-Fi & Fantasy', genre: 'Sci-Fi & Fantasy' },
                    { name: 'Mystery & Suspense', genre: 'Mystery & Suspense' },
                    { name: 'Historical Fiction', genre: 'Historical Fiction' },
                    { name: 'Dutch & European Classics', genre: 'Dutch & European Classics' },
                    { name: 'Business & Leadership', genre: 'Business & Leadership' },
                    { name: 'Philosophy & Deep Thought', genre: 'Philosophy & Deep Thought' },
                    { name: 'Self-Improvement & Psychology', genre: 'Self-Improvement & Psychology' },
                  ].map((cat) => (
                    <button
                      key={cat.name}
                      onClick={() => handleViewAllCategory(cat.genre)}
                      className="px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 transition-colors cursor-pointer shadow-2xs"
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                {/* Carousel 1: Atlantean Curated Picks & Trending in the Netherlands */}
                <HorizontalProductCarousel
                  title="Trending in the Netherlands & Europe"
                  subtitle="Curated by Atlantean Globals Services editorial team in Amsterdam"
                  badge="Curator Choice"
                  icon={<Award className="w-5 h-5 text-amber-500" />}
                  books={amsterdamPicks}
                  onViewAll={() => handleViewAllCategory('Dutch & European Classics')}
                  onOpenDetail={(b) => setSelectedBookForDetail(b)}
                  onReadSample={handleReadSample}
                  onAddToCart={handleAddToCart}
                  onToggleWishlist={handleToggleWishlist}
                  onPlayAudioSample={(b) => setActiveAudiobook(b)}
                  wishlistIds={wishlist.map((w) => w.id)}
                  currencySymbol={currencySymbol}
                />

                {/* Carousel 2: Bookatlas Plus Unlimited */}
                <HorizontalProductCarousel
                  title="Bookatlas Plus: Unlimited Reading & Listening"
                  subtitle="Explore 1.5M+ eBooks and Audiobooks included in your subscription"
                  badge="Included in Plus"
                  icon={<Sparkles className="w-5 h-5 text-indigo-600" />}
                  books={plusPicks}
                  onViewAll={() => setActiveTab('koboplus')}
                  onOpenDetail={(b) => setSelectedBookForDetail(b)}
                  onReadSample={handleReadSample}
                  onAddToCart={handleAddToCart}
                  onToggleWishlist={handleToggleWishlist}
                  onPlayAudioSample={(b) => setActiveAudiobook(b)}
                  wishlistIds={wishlist.map((w) => w.id)}
                  currencySymbol={currencySymbol}
                />

                {/* Promotional Featured-Book Spotlight Banner */}
                {featuredSpotlight && (
                  <PromotionalFeatureBanner
                    featuredBook={featuredSpotlight}
                    onOpenDetail={(b) => setSelectedBookForDetail(b)}
                    onReadSample={handleReadSample}
                    onAddToCart={handleAddToCart}
                    currencySymbol={currencySymbol}
                  />
                )}

                {/* Carousel 3: Bestselling Sci-Fi & Speculative Masterpieces */}
                <HorizontalProductCarousel
                  title="Science Fiction & Cosmic Sagas"
                  subtitle="Imaginative future worlds, deep space exploration, and AI dystopias"
                  badge="Top Rated"
                  icon={<BookOpen className="w-5 h-5 text-indigo-500" />}
                  books={sciFiPicks}
                  onViewAll={() => handleViewAllCategory('Sci-Fi & Fantasy')}
                  onOpenDetail={(b) => setSelectedBookForDetail(b)}
                  onReadSample={handleReadSample}
                  onAddToCart={handleAddToCart}
                  onToggleWishlist={handleToggleWishlist}
                  onPlayAudioSample={(b) => setActiveAudiobook(b)}
                  wishlistIds={wishlist.map((w) => w.id)}
                  currencySymbol={currencySymbol}
                />

                {/* Editorial Content Blocks */}
                <EditorialCuratorBlock
                  onExploreGenre={(genre) => handleViewAllCategory(genre)}
                  onOpenMatchmaker={() => setIsAIMatchmakerOpen(true)}
                />

                {/* Carousel 4: Immersive Audiobooks with Narrator Previews */}
                <HorizontalProductCarousel
                  title="Audiobooks with Studio Narration"
                  subtitle="Listen to professionally mastered voice previews on any device"
                  badge="Audio Exclusive"
                  icon={<Headphones className="w-5 h-5 text-purple-600" />}
                  books={audioPicks}
                  onViewAll={() => handleViewAllCategory('All Genres', 'audiobook')}
                  onOpenDetail={(b) => setSelectedBookForDetail(b)}
                  onReadSample={handleReadSample}
                  onAddToCart={handleAddToCart}
                  onToggleWishlist={handleToggleWishlist}
                  onPlayAudioSample={(b) => setActiveAudiobook(b)}
                  wishlistIds={wishlist.map((w) => w.id)}
                  currencySymbol={currencySymbol}
                />

                {/* Carousel 5: Thrillers & Crime */}
                <HorizontalProductCarousel
                  title="Atmospheric Thrillers & Crime Fiction"
                  subtitle="Page-turners, psychological suspense, and gripping whodunits"
                  badge="Bestsellers"
                  books={thrillerPicks}
                  onViewAll={() => handleViewAllCategory('Mystery & Suspense')}
                  onOpenDetail={(b) => setSelectedBookForDetail(b)}
                  onReadSample={handleReadSample}
                  onAddToCart={handleAddToCart}
                  onToggleWishlist={handleToggleWishlist}
                  onPlayAudioSample={(b) => setActiveAudiobook(b)}
                  wishlistIds={wishlist.map((w) => w.id)}
                  currencySymbol={currencySymbol}
                />
              </div>
            )}

            {/* Main Catalog Grid with Filter Sidebar */}
            <div id="catalog-grid-section" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-4">
              
              {/* Left Filters Sidebar */}
              <div className="lg:col-span-3">
                <FilterSidebar
                  filters={filters}
                  setFilters={setFilters}
                  totalResults={filteredBooks.length}
                />
              </div>

              {/* Right Book Catalog Grid */}
              <div className="lg:col-span-9 space-y-6">
                
                {/* Catalog Controls Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      {filters.genre !== 'All Genres' ? filters.genre : activeTab === 'audiobooks' ? 'Audiobook Collection' : activeTab === 'deals' ? 'Special Offers' : 'Complete Bookstore Catalog'}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Showing {filteredBooks.length} titles
                    </p>
                  </div>

                  {/* Sorting dropdown */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <ArrowUpDown className="w-3.5 h-3.5" /> Sort By:
                    </span>
                    <select
                      value={filters.sortBy}
                      onChange={(e) => setFilters((f) => ({ ...f, sortBy: e.target.value as any }))}
                      className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-900 font-semibold py-1.5 px-3 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-600 cursor-pointer"
                    >
                      <option value="featured">Featured & Editorial Picks</option>
                      <option value="bestseller">Bestselling Rank</option>
                      <option value="rating">Highest Rated (★)</option>
                      <option value="priceAsc">Price: Low to High</option>
                      <option value="priceDesc">Price: High to Low</option>
                      <option value="newest">New Releases</option>
                    </select>
                  </div>
                </div>

                {/* Books Grid */}
                {filteredBooks.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
                    <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
                    <h3 className="text-base font-bold text-slate-900">No books found matching your filters</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Try clearing some filters or searching for different titles or authors.
                    </p>
                    <button
                      onClick={() => {
                        setFilters({
                          searchQuery: '',
                          genre: 'All Genres',
                          format: 'all',
                          priceCategory: 'all',
                          minRating: 0,
                          sortBy: 'featured',
                          koboPlusOnly: false,
                        });
                      }}
                      className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-500 cursor-pointer shadow-sm"
                    >
                      Reset Filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
                    {filteredBooks.map((book) => (
                      <BookCard
                        key={book.id}
                        book={book}
                        onOpenDetail={(b) => setSelectedBookForDetail(b)}
                        onReadSample={handleReadSample}
                        onAddToCart={handleAddToCart}
                        onToggleWishlist={handleToggleWishlist}
                        onPlayAudioSample={(b) => setActiveAudiobook(b)}
                        isWishlisted={wishlist.some((w) => w.id === book.id)}
                        currencySymbol={currencySymbol}
                      />
                    ))}
                  </div>
                )}

              </div>
            </div>
          </>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 text-xs py-12 mt-20 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-indigo-600 text-white flex items-center justify-center font-serif font-black text-sm shadow-xs">
                B
              </div>
              <span className="text-base font-bold text-white tracking-tight">bookatlas</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              The premier eBook Store and in-browser eReader by Atlantean Globals Services, registered in the Netherlands. Discover millions of curated eBooks, Audiobooks, and AI reading companions.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Store & Formats</h4>
            <ul className="space-y-1.5">
              <li><button onClick={() => setActiveTab('store')} className="hover:text-white cursor-pointer">All eBooks</button></li>
              <li><button onClick={() => setActiveTab('audiobooks')} className="hover:text-white cursor-pointer">Audiobooks</button></li>
              <li><button onClick={() => setActiveTab('koboplus')} className="hover:text-white cursor-pointer">Bookatlas Plus Unlimited</button></li>
              <li><button onClick={() => setActiveTab('deals')} className="hover:text-white cursor-pointer">Daily Deals Under €4.99</button></li>
              <li>
                <button 
                  onClick={() => {
                    if (isAdminAuthenticated) {
                      setActiveTab('manager');
                    } else {
                      openAdminAuthForFeature('Bookatlas Master Operations Studio', () => setActiveTab('manager'));
                    }
                  }} 
                  className="text-amber-400 hover:text-amber-300 font-bold cursor-pointer flex items-center gap-1"
                >
                  {isAdminAuthenticated ? <Unlock className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-amber-400" />}
                  <span>Single Manager Studio</span>
                  {!isAdminAuthenticated && (
                    <span className="text-[9px] bg-amber-950 text-amber-300 px-1.5 py-0.2 rounded-full border border-amber-800">
                      PIN
                    </span>
                  )}
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Reading Experience</h4>
            <ul className="space-y-1.5">
              <li><button onClick={() => setIsAIMatchmakerOpen(true)} className="hover:text-white cursor-pointer flex items-center gap-1"><Sparkles className="w-3 h-3 text-purple-400" /> AI Book Matchmaker</button></li>
              <li><button onClick={() => setActiveTab('library')} className="hover:text-white cursor-pointer">My Bookshelf & Reading Progress</button></li>
              <li><button onClick={() => setIsArchitectureGuideOpen(true)} className="hover:text-amber-400 cursor-pointer font-semibold">Bookatlas Architecture Blueprint</button></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Dutch & Global Assurance</h4>
            <p className="text-[11px] text-slate-400">
              Instant digital delivery with DRM-compliant EPUB3 formatting, 30-day money-back guarantee, and 24/7 customer assistance.
            </p>
            <div className="pt-2 flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
              <ShieldCheck className="w-4 h-4" />
              <span>Certified Atlantean Globals Secure Store</span>
            </div>
          </div>

        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 mt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
          <p>© 2026 Atlantean Globals Services B.V. (Netherlands). All rights reserved. Bookatlas™ eBook Store & Reader.</p>
          <div className="flex space-x-4">
            <button onClick={() => setIsArchitectureGuideOpen(true)} className="hover:text-white underline cursor-pointer">
              Technical Architecture & EPUB Specs
            </button>
          </div>
        </div>
      </footer>

      {/* Floating Audiobook Player Dock */}
      {activeAudiobook && (
        <AudiobookPlayerDock
          book={activeAudiobook}
          onClose={() => setActiveAudiobook(null)}
          onOpenDetail={(b) => setSelectedBookForDetail(b)}
        />
      )}

      {/* Book Detail Modal */}
      <BookDetailModal
        book={selectedBookForDetail}
        onClose={() => setSelectedBookForDetail(null)}
        onReadSample={handleReadSample}
        onAddToCart={handleAddToCart}
        onToggleWishlist={handleToggleWishlist}
        onPlayAudioSample={(b) => setActiveAudiobook(b)}
        isWishlisted={selectedBookForDetail ? wishlist.some((w) => w.id === selectedBookForDetail.id) : false}
        currencySymbol={currencySymbol}
      />

      {/* In-Browser eReader Modal */}
      {activeReadingBook && (
        <EReaderModal
          book={activeReadingBook.book}
          onClose={() => setActiveReadingBook(null)}
          onAddToCart={handleAddToCart}
          initialChapterIndex={activeReadingBook.chapterIndex}
          initialParagraphIndex={activeReadingBook.paragraphIndex}
          onSaveProgress={handleSaveProgress}
        />
      )}

      {/* Slide-out Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onRemoveItem={handleRemoveFromCart}
        onCheckout={handleCheckoutComplete}
        currencySymbol={currencySymbol}
      />

      {/* AI Book Matchmaker Modal */}
      <AIMatchmakerModal
        isOpen={isAIMatchmakerOpen}
        onClose={() => setIsAIMatchmakerOpen(false)}
        books={books}
        onOpenBookDetail={(b) => setSelectedBookForDetail(b)}
        onReadSample={handleReadSample}
        onAddToCart={handleAddToCart}
      />

      {/* Architecture Guide Blueprint Modal */}
      <ArchitectureGuideModal
        isOpen={isArchitectureGuideOpen}
        onClose={() => setIsArchitectureGuideOpen(false)}
      />

      {/* AI Studio Unified Hub */}
      <AIStudioHub
        isOpen={isAIHubOpen}
        onClose={() => setIsAIHubOpen(false)}
        onOpenChat={() => setIsChatOpen(true)}
        onOpenVoice={() => setIsVoiceOpen(true)}
        onOpenVideo={() => setIsVideoOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenDocs={() => setIsDocsOpen(true)}
        booksCount={books.length}
        isAdminAuthenticated={isAdminAuthenticated}
        onOpenAdminAuth={openAdminAuthForFeature}
      />

      {/* Multi-Turn Gemini Literary Chatbot Modal */}
      <GeminiChatbotModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        books={books}
        onOpenBookDetail={(b) => setSelectedBookForDetail(b)}
        onReadSample={handleReadSample}
      />

      {/* Real-Time Live Voice Companion Modal */}
      <LiveVoiceCompanionModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
      />

      {/* Veo Image-to-Video Animator Modal */}
      <VeoVideoAnimatorModal
        isOpen={isVideoOpen}
        onClose={() => setIsVideoOpen(false)}
        books={books}
      />

      {/* Google Search Grounding Modal */}
      <GoogleSearchGroundingModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* Platform Specification & Docs Export Modal (Word .docx + PDF .pdf) */}
      <ExportDocsModal
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
        books={books}
      />

      {/* Admin Security Authentication & PIN Modal */}
      <AdminAuthModal
        isOpen={isAdminAuthModalOpen}
        onClose={() => setIsAdminAuthModalOpen(false)}
        onSuccess={handleAdminAuthSuccess}
        restrictedFeatureName={adminAuthRequestedFeature}
        adminEmail={adminEmail}
      />


      {/* Floating Gemini AI Quick Launch Pill in Bottom Corner */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
        <button
          onClick={() => setIsAIHubOpen(true)}
          className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-700 hover:from-indigo-600 hover:to-pink-600 text-white rounded-full shadow-2xl hover:shadow-indigo-500/50 border border-white/20 transition-all hover:scale-105 cursor-pointer font-bold text-xs sm:text-sm"
          title="Open Bookatlas AI Studio"
        >
          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
          <span>Gemini AI Studio</span>
          <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-full">Hub</span>
        </button>
      </div>

    </div>
  );
}

