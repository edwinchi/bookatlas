import { filterCatalog } from './catalog';
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
import { MobileBottomNav } from './components/MobileBottomNav';
import { useAccount, useAccountList } from './auth/AuthContext';
import { UnsubscribePageModal } from './components/UnsubscribePageModal';
import { AIAccessGateModal } from './components/AIAccessGateModal';
import { safeReaderReturnPath } from './auth/navigation';
import { TRANSLATIONS } from './data/translations';
import { INITIAL_BOOKS } from './data/booksData';

import { Book, CartItem, UserLibraryItem, FilterOptions, SubscriberTier } from './types';
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
  Unlock,
  Globe,
  Compass
} from 'lucide-react';

const GUEST_CART_KEY = 'bookatlas:guest-cart:v1';
const STORE_PREFERENCES_KEY = 'bookatlas:store-preferences:v1';
const STORE_CURRENCIES = new Set(['EUR', 'USD', 'GBP', 'CAD', 'JPY']);
type StoreLanguage = 'en' | 'nl';
type StorePreferences = { currency: string; language: StoreLanguage };

function readStorePreferences(): StorePreferences {
  const defaults: StorePreferences = { currency: 'EUR', language: 'en' };
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORE_PREFERENCES_KEY) || 'null');
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return defaults;
    const values = stored as Record<string, unknown>;
    return {
      currency: typeof values.currency === 'string' && STORE_CURRENCIES.has(values.currency)
        ? values.currency
        : defaults.currency,
      language: values.language === 'nl' ? 'nl' : defaults.language,
    };
  } catch {
    return defaults;
  }
}

type ReaderTab = 'store' | 'library' | 'deals' | 'audiobooks' | 'bookatlasplus' | 'manager';
function readGuestCart(): CartItem[] {
  try {
    const stored: unknown = JSON.parse(sessionStorage.getItem(GUEST_CART_KEY) || '[]');
    return Array.isArray(stored) ? stored.filter((item): item is CartItem =>
      !!item && typeof item === 'object' && typeof item.book?.id === 'string' &&
      ['ebook', 'audiobook'].includes(item.format) && Number.isFinite(item.addedAt),
    ) : [];
  } catch { return []; }
}
function cartFingerprint(cart: CartItem[]) {
  return cart.map(item => `${item.book.id}:${item.format}`).sort().join('|');
}
const normalizeCartReturn = (returnTo: string) =>
  safeReaderReturnPath(returnTo, window.location.origin, import.meta.env.BASE_URL);

export default function App({ initialTab = 'store', initialLibraryTab = 'reading', resumeCheckout = false, pendingReaderService }: {
  initialTab?: ReaderTab;
  initialLibraryTab?: 'reading' | 'wishlist';
  resumeCheckout?: boolean;
  pendingReaderService?: string;
}) {
  const { account, tier: accountTier, requireSignIn, requireAdmin, signOut } = useAccount();
  const [books, setBooks] = useState<Book[]>(INITIAL_BOOKS);
  const [activeTab, setActiveTabState] = useState<ReaderTab>(initialTab);
  const setActiveTab = (tab: typeof activeTab) => {
    if (tab === 'library' && !requireSignIn('library', '/user-portal')) return;
    if (tab === 'manager' && !requireAdmin()) return;
    setActiveTabState(tab);
  };
  const [currency, setCurrency] = useState<string>(() => readStorePreferences().currency);
  const currencySymbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  const [language, setLanguage] = useState<StoreLanguage>(() => readStorePreferences().language);

  useEffect(() => {
    try {
      localStorage.setItem(STORE_PREFERENCES_KEY, JSON.stringify({ currency, language }));
    } catch {
      // The storefront remains usable when browser storage is unavailable.
    }
  }, [currency, language]);

  const registeredUser = account;

  // AI feature access — Member/VIP Patron subscribers only
  const [currentUserTier, setCurrentUserTier] = useState<SubscriberTier>(accountTier);
  const [aiAccessGate, setAiAccessGate] = useState<{ featureTitle: string; featureDescription: string } | null>(null);
  const hasAiAccess = currentUserTier === 'member_subscriber' || currentUserTier === 'vip_patron';

  useEffect(() => {
    setCurrentUserTier(accountTier);
  }, [accountTier]);

  const requireAiAccess = (featureTitle: string, featureDescription: string, action: () => void) => {
    if (!account) {
      const service = featureTitle.toLowerCase().includes('voice') ? 'voice'
        : featureTitle.toLowerCase().includes('matchmaker') ? 'matchmaker'
          : featureTitle.toLowerCase().includes('literary assistant') ? 'chat'
            : featureTitle.toLowerCase().includes('search') ? 'search' : 'studio';
      requireSignIn('ai', `/user-portal?view=ai&service=${service}`);
      return;
    }
    if (hasAiAccess) {
      action();
    } else {
      setAiAccessGate({ featureTitle, featureDescription });
    }
  };

  // 1-Click Unsubscribe Modal state
  const [isUnsubscribeModalOpen, setIsUnsubscribeModalOpen] = useState(false);
  const [unsubTargetEmail, setUnsubTargetEmail] = useState('');
  const [unsubTargetToken, setUnsubTargetToken] = useState('');

  // Check URL parameters for 1-click unsubscribe links
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const action = params.get('action');
      const emailParam = params.get('email');
      const tokenParam = params.get('token');
      if (emailParam) setUnsubTargetEmail(emailParam);
      if (tokenParam) setUnsubTargetToken(tokenParam);

      if (action === 'unsubscribe' || params.get('unsub') === 'true' || (emailParam && tokenParam)) {
        setIsUnsubscribeModalOpen(true);
      }
    } catch (e) {}
  }, []);

  // Load books from backend API if available
  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => {
      fetch('/api/books', { signal: controller.signal })
        .then((res) => {
          if (!res.ok) throw new Error('Catalog is temporarily unavailable.');
          return res.json();
        })
        .then((data) => {
          if (!controller.signal.aborted && data.success && Array.isArray(data.books)) setBooks(data.books);
        })
        .catch((err) => {
          if (!controller.signal.aborted) console.warn('Catalog refresh failed:', err);
        });
    };
    refresh();
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener('focus', refresh);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  // Manager Book CRUD handlers
  const handleAddBook = (newBook: Book) => {
    setBooks((prev) => [newBook, ...prev.filter(book => book.id !== newBook.id)]);
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
    bookatlasPlusOnly: false,
  });

  // User State: Cart, Wishlist, Library
  const [accountCart, setAccountCart] = useAccountList<CartItem>('cart');
  const [guestCart, setGuestCart] = useState<CartItem[]>(readGuestCart);
  const [libraryDefaultTab, setLibraryDefaultTab] = useState<'reading' | 'wishlist'>(initialLibraryTab);
  const cart = account ? accountCart : guestCart;
  const setCart: React.Dispatch<React.SetStateAction<CartItem[]>> = update => {
    if (account) setAccountCart(update);
    else setGuestCart(update);
  };
  const guestCartFingerprint = cartFingerprint(guestCart);
  const [showGuestCartMerge, setShowGuestCartMerge] = useState(false);
  useEffect(() => {
    try {
      if (guestCart.length) sessionStorage.setItem(GUEST_CART_KEY, JSON.stringify(guestCart));
      else sessionStorage.removeItem(GUEST_CART_KEY);
    } catch { console.warn('The guest cart could not be saved in this browser session.'); }
  }, [guestCart]);
  useEffect(() => {
    if (!account || !guestCart.length) { setShowGuestCartMerge(false); return; }
    try {
      setShowGuestCartMerge(!sessionStorage.getItem(`bookatlas:guest-cart-merge-dismissed:${account.id}:${guestCartFingerprint}`));
    } catch { setShowGuestCartMerge(true); }
  }, [account?.id, guestCartFingerprint, guestCart.length]);
  const dismissGuestCartMerge = () => {
    if (account && guestCartFingerprint) {
      try { sessionStorage.setItem(`bookatlas:guest-cart-merge-dismissed:${account.id}:${guestCartFingerprint}`, 'true'); } catch { /* keep browsing regardless */ }
    }
    setShowGuestCartMerge(false);
  };
  const mergeGuestCart = () => {
    if (!account || !guestCart.length) return;
    setAccountCart(previous => {
      const existing = new Set(previous.map(item => `${item.book.id}:${item.format}`));
      return [...previous, ...guestCart.filter(item => !existing.has(`${item.book.id}:${item.format}`))];
    });
    setGuestCart([]);
    setShowGuestCartMerge(false);
  };
  const [wishlist, setWishlist] = useAccountList<Book>('wishlist');
  const [library, setLibrary] = useAccountList<UserLibraryItem>('library');

  // Active Modals & Views
  const [selectedBookForDetail, setSelectedBookForDetail] = useState<Book | null>(null);
  const [activeReadingBook, setActiveReadingBook] = useState<{ book: Book; chapterIndex: number; paragraphIndex: number } | null>(null);
  const [activeAudiobook, setActiveAudiobook] = useState<Book | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAIMatchmakerOpen, setIsAIMatchmakerOpen] = useState(false);
  const [isArchitectureGuideOpen, setIsArchitectureGuideOpen] = useState(false);
  useEffect(() => {
    if (resumeCheckout) setIsCartOpen(true);
  }, [resumeCheckout]);

  // New Gemini AI & Export Modals State
  const [isAIHubOpen, setIsAIHubOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  useEffect(() => {
    if (!account || !pendingReaderService) return;
    if (!hasAiAccess) {
      setAiAccessGate({
        featureTitle: 'Bookatlas Plus membership required',
        featureDescription: 'Personalized AI features require an active membership. Signing in alone does not grant membership.',
      });
      return;
    }
    if (pendingReaderService === 'chat') setIsChatOpen(true);
    else if (pendingReaderService === 'voice') setIsVoiceOpen(true);
    else if (pendingReaderService === 'matchmaker') setIsAIMatchmakerOpen(true);
    else if (pendingReaderService === 'search') setIsSearchOpen(true);
    else setIsAIHubOpen(true);
  }, [account?.id, pendingReaderService, hasAiAccess]);
  const [isDocsOpen, setIsDocsOpen] = useState(false);

  // Administrative tools live only on the independently guarded /admin route.
  const isAdminAuthenticated = false;
  const adminEmail = 'Administrator';

  const openAdminAuthForFeature = (featureName: string, callback?: () => void) => {
    if (requireAdmin(featureName)) callback?.();
  };

  const handleAdminLogout = () => {
    signOut();
  };


  const filteredBooks = useMemo(() => filterCatalog(books, filters, activeTab), [books, filters, activeTab]);

  // Derived Book Subsets for Netflix-Style Horizontal Carousels
  const africanLitPicks = useMemo(() => {
    return books.filter(b => 
      b.primaryGenre === 'African Literature & Classics' || 
      b.primaryGenre === 'Afrofuturism & Speculative Fiction' ||
      b.primaryGenre === 'Pan-African History & Civilizations' ||
      b.primaryGenre === 'African Diaspora & Black Studies' ||
      b.primaryGenre === 'African Philosophy & Indigenous Traditions' ||
      b.primaryGenre === 'Contemporary African Voices & Fiction' ||
      b.genres?.some(g => g.includes('African') || g.includes('Afrofuturism') || g.includes('Diaspora'))
    );
  }, [books]);

  const consciousnessPicks = useMemo(() => {
    return books.filter(b => 
      b.primaryGenre === 'Consciousness & Ancient Wisdom' || 
      b.primaryGenre === 'Kemetic Science & Sacred Geometry' ||
      b.primaryGenre === 'Metaphysics & Higher Dimensions' ||
      b.primaryGenre === 'Indigenous Spiritual Technologies' ||
      b.primaryGenre === 'Mind Mastery & Quantum Awakening' ||
      b.primaryGenre === 'Holistic Energy, Chakras & Kundalini' ||
      b.genres?.some(g => g.includes('Consciousness') || g.includes('Kemetic') || g.includes('Metaphysics') || g.includes('Spiritual') || g.includes('Mind Mastery'))
    );
  }, [books]);

  const amsterdamPicks = useMemo(() => {
    return books.filter(b => b.primaryGenre === 'Dutch & European Classics' || b.primaryGenre === 'Historical Fiction' || b.id.includes('amsterdam') || b.tags?.includes('Amsterdam') || b.isEditorPick);
  }, [books]);

  const plusPicks = useMemo(() => {
    return books.filter(b => b.isBookatlasPlus);
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

  const handleRemoveFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const handleToggleWishlist = (book: Book) => {
    if (!requireSignIn('wishlist', '/user-portal?view=wishlist')) return;
    setWishlist((prev) => {
      const exists = prev.some((b) => b.id === book.id);
      if (exists) {
        return prev.filter((b) => b.id !== book.id);
      } else {
        return [...prev, book];
      }
    });
  };
  const openWishlist = () => {
    if (!requireSignIn('wishlist', '/user-portal?view=wishlist')) return;
    setLibraryDefaultTab('wishlist');
    setActiveTab('library');
  };

  const handleReadSample = (book: Book) => {
    const existingLib = library.find((i) => i.book.id === book.id);
    setActiveReadingBook({
      book,
      chapterIndex: existingLib ? existingLib.currentChapterIndex : 0,
      paragraphIndex: existingLib ? existingLib.currentParagraphIndex : 0,
    });
  };

  const requestCheckout = () => {
    if (!account) {
      const returnTo = normalizeCartReturn('/user-portal?resume=checkout');
      requireSignIn('checkout', returnTo);
      return false;
    }
    return true;
  };
  // Keep a ref to activeReadingBook so handleSaveProgress does not need it in dependencies
  const activeReadingBookRef = useRef(activeReadingBook);
  useEffect(() => {
    activeReadingBookRef.current = activeReadingBook;
  }, [activeReadingBook]);

  const handleSaveProgress = useCallback((chapterIndex: number, paragraphIndex: number, progressPct: number) => {
    // Public samples remain readable for guests, but reader progress belongs
    // only to an authenticated account.
    if (!account) return;
    const currentActive = activeReadingBookRef.current;
    if (!currentActive) return;
    const targetBook = currentActive.book;
    
    setLibrary((prev) => {
      const exists = prev.some((i) => i.book.id === targetBook.id);
      if (exists) {
        return prev.map((item) =>
          item.book.id === targetBook.id
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
            book: targetBook,
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
  }, []);

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
        onOpenWishlist={openWishlist}
        onOpenArchitectureGuide={() => setIsArchitectureGuideOpen(true)}
        onOpenAIMatchmaker={() => requireAiAccess('AI Book Matchmaker', 'Get personalized reading recommendations, matched by mood and theme, powered by AI.', () => setIsAIMatchmakerOpen(true))}
        onOpenAIHub={() => requireAiAccess('AI Studio', 'Open personalized AI tools for your reading.', () => setIsAIHubOpen(true))}
        onOpenChat={() => requireAiAccess('Interactive Literary Assistant', 'Chat with our persona-driven AI literary companion.', () => setIsChatOpen(true))}
        onOpenVoice={() => requireAiAccess('Live Voice Companion', 'Have a real-time spoken conversation with our AI voice companion.', () => setIsVoiceOpen(true))}
        onOpenVideo={() => setIsVideoOpen(true)}
        onOpenSearch={() => requireAiAccess('Search Grounding Literary Radar', 'Get real-time bestseller trends and literary news grounded in live Google Search.', () => setIsSearchOpen(true))}
        onOpenDocs={() => setIsDocsOpen(true)}
        currency={currency}
        setCurrency={setCurrency}
        language={language}
        setLanguage={setLanguage}
        isAdminAuthenticated={isAdminAuthenticated}
        adminEmail={adminEmail}
        onOpenAdminAuth={openAdminAuthForFeature}
        onAdminLogout={handleAdminLogout}
        registeredUser={registeredUser}
      />


      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-8 pb-24 lg:pb-8">
        
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
              onOpenAIHub={() => requireAiAccess('AI Studio', 'Open personalized AI tools for your reading.', () => setIsAIHubOpen(true))}
              onOpenChat={() => requireAiAccess('Interactive Literary Assistant', 'Chat with our persona-driven AI literary companion.', () => setIsChatOpen(true))}
              onOpenVoice={() => requireAiAccess('Live Voice Companion', 'Have a real-time spoken conversation with our AI voice companion.', () => setIsVoiceOpen(true))}
              onOpenVideo={() => setIsVideoOpen(true)}
              onOpenSearch={() => requireAiAccess('Search Grounding Literary Radar', 'Get real-time bestseller trends and literary news grounded in live Google Search.', () => setIsSearchOpen(true))}
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
                  This operational studio is restricted to verified administrator accounts. Sign in with an authorized account to proceed.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => openAdminAuthForFeature('Bookatlas Master Operations Studio', () => setActiveTab('manager'))}
                  className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Sign in as administrator</span>
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
            language={language}
            userEmail={registeredUser?.email || ''}
            userName={registeredUser?.name || 'Reader'}
            initialTab={libraryDefaultTab}
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
                onExploreBookatlasPlus={() => setActiveTab('bookatlasplus')}
              />
            )}

            {/* Special Section Banners for Sub-Tabs */}
            {activeTab === 'bookatlasplus' && (
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
                    { name: '✨ All Categories', genre: 'All Genres' },
                    { name: '🌍 African Literature & Classics', genre: 'African Literature & Classics' },
                    { name: '🚀 Afrofuturism & Speculative', genre: 'Afrofuturism & Speculative Fiction' },
                    { name: '👁️ Consciousness & Wisdom', genre: 'Consciousness & Ancient Wisdom' },
                    { name: '☥ Kemetic Science & Geometry', genre: 'Kemetic Science & Sacred Geometry' },
                    { name: '🔮 Metaphysics & Quantum', genre: 'Metaphysics & Higher Dimensions' },
                    { name: '🌌 Sci-Fi & Fantasy', genre: 'Sci-Fi & Fantasy' },
                    { name: '🕵️ Mystery & Thriller', genre: 'Mystery & Suspense' },
                    { name: '🏛️ Dutch & European Classics', genre: 'Dutch & European Classics' },
                    { name: '💡 Self-Improvement', genre: 'Self-Improvement & Psychology' },
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

                {/* Carousel 1: African Literature, Afrofuturism & Pan-African Classics */}
                <HorizontalProductCarousel
                  title="African Literature & Pan-African Renaissance"
                  subtitle="From ancient Timbuktu manuscripts to cosmic Dogon astronomy & contemporary diaspora classics"
                  badge="🌍 African Spotlight"
                  icon={<Globe className="w-5 h-5 text-amber-600" />}
                  books={africanLitPicks}
                  onViewAll={() => handleViewAllCategory('African Literature & Classics')}
                  onOpenDetail={(b) => setSelectedBookForDetail(b)}
                  onReadSample={handleReadSample}
                  onAddToCart={handleAddToCart}
                  onToggleWishlist={handleToggleWishlist}
                  onPlayAudioSample={(b) => setActiveAudiobook(b)}
                  wishlistIds={wishlist.map((w) => w.id)}
                  currencySymbol={currencySymbol}
                />

                {/* Carousel 2: Consciousness Community, Kemetic Science & Quantum Wisdom */}
                <HorizontalProductCarousel
                  title="Consciousness Community & Sacred Wisdom"
                  subtitle="Kemetic sciences, the 42 Laws of Ma'at, bio-resonance, and quantum mind mastery"
                  badge="👁️ Consciousness"
                  icon={<Compass className="w-5 h-5 text-emerald-600" />}
                  books={consciousnessPicks}
                  onViewAll={() => handleViewAllCategory('Consciousness & Ancient Wisdom')}
                  onOpenDetail={(b) => setSelectedBookForDetail(b)}
                  onReadSample={handleReadSample}
                  onAddToCart={handleAddToCart}
                  onToggleWishlist={handleToggleWishlist}
                  onPlayAudioSample={(b) => setActiveAudiobook(b)}
                  wishlistIds={wishlist.map((w) => w.id)}
                  currencySymbol={currencySymbol}
                />

                {/* Carousel 3: Atlantean Curated Picks & Trending in the Netherlands */}
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
                  onViewAll={() => setActiveTab('bookatlasplus')}
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
                  onOpenMatchmaker={() => requireAiAccess('AI Book Matchmaker', 'Get personalized reading recommendations, matched by mood and theme, powered by AI.', () => setIsAIMatchmakerOpen(true))}
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
                  languages={[...new Set(books.map(book => book.language).filter(Boolean))].sort()}
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
                    <p role="status" aria-live="polite" className="text-xs text-slate-500">
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
                          bookatlasPlusOnly: false,
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
              <li><button onClick={() => setActiveTab('bookatlasplus')} className="hover:text-white cursor-pointer">Bookatlas Plus Unlimited</button></li>
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
              <li><button onClick={() => requireAiAccess('AI Book Matchmaker', 'Get personalized reading recommendations, matched by mood and theme, powered by AI.', () => setIsAIMatchmakerOpen(true))} className="hover:text-white cursor-pointer flex items-center gap-1"><Sparkles className="w-3 h-3 text-purple-400" /> AI Book Matchmaker</button></li>
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
            <button 
              onClick={() => {
                setUnsubTargetEmail(registeredUser?.email || '');
                setIsUnsubscribeModalOpen(true);
              }} 
              className="text-slate-400 hover:text-slate-200 underline cursor-pointer"
            >
              Email Preferences & 1-Click Opt-Out
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
        hasAiAccess={hasAiAccess}
        onRequireAiAccess={requireAiAccess}
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
          hasAiAccess={hasAiAccess}
          onRequireAiAccess={requireAiAccess}
        />
      )}

      {/* Slide-out Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onRemoveItem={handleRemoveFromCart}
        onCheckout={requestCheckout}
        isAuthenticated={!!account}
        currencySymbol={currencySymbol}
      />
      {showGuestCartMerge && account && guestCart.length > 0 && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/60 p-4" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="guest-cart-title" className="w-full max-w-md space-y-4 rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <h2 id="guest-cart-title" className="text-xl font-bold text-slate-950">Your guest cart</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              You added {guestCart.length} book{guestCart.length === 1 ? '' : 's'} while browsing. Choose whether to merge these specific books into your reader account. Your bookshelf and saved data stay separate.
            </p>
            <ul className="max-h-44 space-y-2 overflow-y-auto" aria-label="Books in the guest cart">
              {guestCart.map((item, index) => <li className="flex justify-between gap-3 border-b border-slate-100 py-2 text-sm" key={`${item.book.id}-${index}`}>
                <span className="font-medium text-slate-800">{item.book.title}</span>
                <span className="shrink-0 text-slate-500">{item.format === 'audiobook' ? 'Audiobook' : 'eBook'}</span>
              </li>)}
            </ul>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={mergeGuestCart} className="min-h-12 flex-1 rounded-xl bg-indigo-700 px-4 font-bold text-white">Merge these books</button>
              <button type="button" onClick={dismissGuestCartMerge} className="min-h-12 rounded-xl border border-slate-300 px-4 font-semibold text-slate-800">Keep as guest cart</button>
            </div>
            <p className="text-xs text-slate-500">Only these new guest-cart items are offered. Older browser data is never imported.</p>
          </section>
        </div>
      )}

      {/* AI Book Matchmaker Modal */}
      <AIMatchmakerModal
        isOpen={isAIMatchmakerOpen}
        onClose={() => setIsAIMatchmakerOpen(false)}
        books={books}
        onOpenBookDetail={(b) => setSelectedBookForDetail(b)}
        onReadSample={handleReadSample}
        onAddToCart={handleAddToCart}
      />

      {/* AI Feature Subscription Gate — Member/VIP Patron only */}
      <AIAccessGateModal
        isOpen={!!aiAccessGate}
        onClose={() => setAiAccessGate(null)}
        featureTitle={aiAccessGate?.featureTitle || ''}
        featureDescription={aiAccessGate?.featureDescription || ''}
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
        onOpenChat={() => requireAiAccess('Interactive Literary Assistant', 'Chat with our persona-driven AI literary companion.', () => setIsChatOpen(true))}
        onOpenVoice={() => requireAiAccess('Live Voice Companion', 'Have a real-time spoken conversation with our AI voice companion.', () => setIsVoiceOpen(true))}
        onOpenVideo={() => setIsVideoOpen(true)}
        onOpenSearch={() => requireAiAccess('Search Grounding Literary Radar', 'Get real-time bestseller trends and literary news grounded in live Google Search.', () => setIsSearchOpen(true))}
        onOpenDocs={() => setIsDocsOpen(true)}
        booksCount={books.length}
        isAdminAuthenticated={false}
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

      {/* 1-Click Unsubscribe & Preference Center Modal */}
      <UnsubscribePageModal
        isOpen={isUnsubscribeModalOpen}
        onClose={() => setIsUnsubscribeModalOpen(false)}
        initialEmail={unsubTargetEmail || registeredUser?.email}
        token={unsubTargetToken}
        language={language}
      />

      {/* Mobile-First Sticky Bottom Navigation Bar (Thumb Reachable) */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        cartCount={cart.length}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAIHub={() => setIsAIHubOpen(true)}
      />
    </div>
  );
}

