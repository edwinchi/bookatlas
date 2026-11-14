import React, { useState, useEffect, useRef } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { 
  Search, 
  ShoppingBag, 
  Heart, 
  BookOpen, 
  Sparkles, 
  HelpCircle, 
  Menu, 
  X, 
  Headphones, 
  Tag, 
  Layers, 
  Globe,
  Compass,
  Award,
  ShieldCheck,
  Zap,
  Bot,
  FileText,
  Lock,
  Unlock,
  KeyRound,
  ShieldAlert,
  UserCheck,
  PenTool,
  GraduationCap,
  Library,
  Ruler,
  Globe2,
  Crown,
  ListOrdered,
  Calculator,
  Link2,
  Scale,
  Building2,
  BadgeCheck,
  Mail,
  Upload
} from 'lucide-react';
import { HeaderNavMenu } from './HeaderNavMenu';
import { AtlasStar } from './landing/AtlasStar';
import { OPERATOR } from './LegalDocument';

import { GENRES, AFRICAN_LITERATURE_GENRES, CONSCIOUSNESS_COMMUNITY_GENRES, GENERAL_GENRES } from '../data/booksData';

const contactHref = (subject: string) => `mailto:${OPERATOR.email}?subject=${encodeURIComponent(subject)}`;

interface HeaderProps {
  activeTab: 'store' | 'library' | 'deals' | 'audiobooks' | 'bookatlasplus' | 'manager' | 'publish';
  setActiveTab: (tab: 'store' | 'library' | 'deals' | 'audiobooks' | 'bookatlasplus' | 'manager' | 'publish') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedGenre: string;
  setSelectedGenre: (genre: string) => void;
  cartCount: number;
  wishlistCount: number;
  onOpenCart: () => void;
  onOpenWishlist: () => void;
  onOpenArchitectureGuide: () => void;
  onOpenAIMatchmaker: () => void;
  onOpenAIHub: () => void;
  onOpenChat: () => void;
  onOpenVoice: () => void;
  onOpenVideo: () => void;
  onOpenSearch: () => void;
  onOpenDocs: () => void;
  currency: string;
  setCurrency: (c: string) => void;
  language?: 'en' | 'nl';
  setLanguage?: (lang: 'en' | 'nl') => void;
  isAdminAuthenticated: boolean;
  adminEmail: string;
  onOpenAdminAuth: (featureName: string, callback?: () => void) => void;
  onAdminLogout: () => void;
  registeredUser?: { email: string; name?: string } | null;
  /** Shows the front page and scrolls to one of its sections (landing section ids or 'bookstore'). */
  onNavigateSection: (id: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  selectedGenre,
  setSelectedGenre,
  cartCount,
  wishlistCount,
  onOpenCart,
  onOpenWishlist,
  onOpenArchitectureGuide,
  onOpenAIMatchmaker,
  onOpenAIHub,
  onOpenChat,
  onOpenVoice,
  onOpenVideo,
  onOpenSearch,
  onOpenDocs,
  currency,
  setCurrency,
  language = 'en',
  setLanguage,
  isAdminAuthenticated,
  adminEmail,
  onOpenAdminAuth,
  onAdminLogout,
  registeredUser,
  onNavigateSection
}) => {

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  useEffect(() => {
    const closeMenus = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMobileMenuOpen(false); setCategoryDropdownOpen(false); }
    };
    window.addEventListener('keydown', closeMenus);
    return () => window.removeEventListener('keydown', closeMenus);
  }, []);

  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onPointer = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setMobileMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [mobileMenuOpen]);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (activeTab !== 'store') setActiveTab('store');
  };

  // Helper for Manager Access
  const handleManagerTabClick = () => {
    if (activeTab === 'manager') {
      setActiveTab('store');
    } else {
      if (isAdminAuthenticated) {
        setActiveTab('manager');
      } else {
        onOpenAdminAuth('Manager Operations Portal & Control Center', () => {
          setActiveTab('manager');
        });
      }
    }
  };

  // Helper for Docs Export Access (Secured for Admin)
  const handleDocsClick = () => {
    if (isAdminAuthenticated) {
      onOpenDocs();
    } else {
      onOpenAdminAuth('Platform Specifications & Official Architecture Export', () => {
        onOpenDocs();
      });
    }
  };

  // Helper for Video Studio Access (Secured for Admin)
  const handleVideoClick = () => {
    if (isAdminAuthenticated) {
      onOpenVideo();
    } else {
      onOpenAdminAuth('Veo AI Cover Image-to-Video Commercial Studio', () => {
        onOpenVideo();
      });
    }
  };

  // Logo: back to the front page of the store
  const goToStoreHome = () => { setActiveTab('store'); setSelectedGenre('All Genres'); setSearchQuery(''); };

  return (
    <header ref={headerRef} className="sticky top-0 z-40 bg-white border-b border-stone-200 shadow-xs">
      {/* Site menu row, following the Platform Blueprint sitemap: reading first, publishing one click away */}
      <div className="hidden lg:block border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 flex items-center gap-4 xl:gap-6">
          <button
            onClick={goToStoreHome}
            className="shrink-0 py-2 group focus-visible:outline-2 focus-visible:outline-indigo-600 cursor-pointer"
          >
            <img src={`${import.meta.env.BASE_URL}logo-96.webp`} srcSet={`${import.meta.env.BASE_URL}logo-96.webp 1x, ${import.meta.env.BASE_URL}logo-192.webp 2x`} alt="Bookatlas" width={319} height={96} className="h-10 w-auto transition-opacity group-hover:opacity-85 xl:h-11" />
          </button>
          <nav aria-label="Site" className="flex items-center gap-0.5">
            <HeaderNavMenu label="Store" groups={[
              { items: [
                { label: 'All eBooks', description: 'Browse the whole catalogue', icon: BookOpen, onSelect: () => onNavigateSection('bookstore') },
                { label: 'Audiobooks', description: 'Listen in your browser', icon: Headphones, onSelect: () => setActiveTab('audiobooks') },
                { label: 'Deals under €4.99', description: 'Discounted and free eBooks', icon: Tag, onSelect: () => setActiveTab('deals') },
                { label: 'Bookatlas Plus', description: 'Unlimited reading and listening', icon: Compass, onSelect: () => setActiveTab('bookatlasplus') },
              ] },
              { heading: 'Reading tools', items: [
                { label: 'AI Book Matchmaker', description: 'Find your next book by mood', icon: Sparkles, onSelect: onOpenAIMatchmaker },
                { label: 'AI Studio', description: 'AI tools for your reading', icon: Bot, onSelect: onOpenAIHub },
                { label: 'Live Voice companion', description: 'Talk about books out loud', icon: Headphones, onSelect: onOpenVoice },
              ] },
            ]} />
            <HeaderNavMenu label="Publish" groups={[
              { items: [
                { label: 'Create and self-publish', description: 'From manuscript to bookshelf in four steps', icon: PenTool, onSelect: () => onNavigateSection('how-it-works') },
                { label: 'eBook publishing', description: 'Sell worldwide and keep 80%', icon: Globe2, onSelect: () => onNavigateSection('pricing') },
                { label: 'Print-ready files', description: 'For Amazon KDP and Lulu, from €99', icon: Ruler, onSelect: () => onNavigateSection('pricing') },
                { label: 'Pricing and royalties', description: 'Compare Standard and Author Pro', icon: Calculator, onSelect: () => onNavigateSection('earnings') },
                { label: 'Upload your eBook', description: 'EPUB checked and made store-ready', icon: Upload, onSelect: () => onNavigateSection('publish') },
                { label: 'Start a book', description: 'Tell us about your book', icon: Mail, href: contactHref('Start my book') },
              ] },
              { items: [
                { label: 'Audiobook publishing', icon: Headphones, badge: 'Soon' },
              ] },
            ]} />
            <HeaderNavMenu label="Author hub" groups={[
              { heading: 'Opening to early-access authors', items: [
                { label: 'Books and drafts', icon: Library, badge: 'Soon' },
                { label: 'Sales and CSV export', icon: FileText, badge: 'Soon' },
                { label: 'Royalty statements', icon: Crown, badge: 'Soon' },
                { label: 'Public author page', icon: Link2, badge: 'Soon' },
                { label: 'Payout setup', icon: ShieldCheck, badge: 'Soon' },
              ] },
              { items: [
                { label: 'Join early access', description: OPERATOR.email, icon: Mail, href: contactHref('Author hub early access') },
              ] },
            ]} />
            <HeaderNavMenu label="Resources" groups={[{ items: [
              { label: 'Publishing guide', description: 'How BookAtlas works, step by step', icon: ListOrdered, onSelect: () => onNavigateSection('how-it-works') },
              { label: 'Who it is for', description: 'Authors, educators and publishers', icon: GraduationCap, onSelect: () => onNavigateSection('solutions') },
              { label: 'Book pages', description: 'One link for every edition', icon: Link2, onSelect: () => onNavigateSection('book-pages') },
              { label: 'EPUB and technical specs', description: 'Formats, reader and platform details', icon: FileText, onSelect: onOpenArchitectureGuide },
              { label: 'Help', description: 'Email the BookAtlas team', icon: HelpCircle, href: contactHref('Help with BookAtlas') },
            ] }]} />
            <HeaderNavMenu label="About" groups={[
              { items: [
                { label: 'About BookAtlas', description: `${OPERATOR.name}, Zwolle, the Netherlands`, icon: Building2, onSelect: () => onNavigateSection('about') },
                { label: 'Our promise', description: 'What authors can count on', icon: BadgeCheck, onSelect: () => onNavigateSection('promise') },
                { label: 'Contact us', description: OPERATOR.email, icon: Mail, href: contactHref('Question for BookAtlas') },
              ] },
              { items: [
                { label: 'Privacy notice', icon: ShieldCheck, href: `${import.meta.env.BASE_URL}privacy` },
                { label: 'Legal notice', icon: Scale, href: `${import.meta.env.BASE_URL}legal` },
              ] },
            ]} />
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2 py-1.5 text-xs">
            {isAdminAuthenticated && (
              <HeaderNavMenu label="Admin" align="right" width="w-72" groups={[{ heading: adminEmail, items: [
                { label: activeTab === 'manager' ? 'Exit Manager Studio' : 'Manager Studio', icon: Bot, onSelect: handleManagerTabClick },
                { label: 'Specs export', description: 'Word and PDF platform specifications', icon: FileText, onSelect: handleDocsClick },
                { label: 'Platform blueprint', icon: HelpCircle, onSelect: onOpenArchitectureGuide },
                { label: 'Lock administrator session', icon: Lock, onSelect: onAdminLogout },
              ] }]} />
            )}
            {setLanguage && (
              <label className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-700 hover:border-slate-300">
                <Globe className="h-3.5 w-3.5 text-indigo-600" aria-hidden />
                <span className="sr-only">Language</span>
                <select value={language} onChange={(e) => setLanguage(e.target.value as 'en' | 'nl')} className="bg-transparent text-xs font-semibold focus:outline-hidden cursor-pointer">
                  <option value="en">English</option>
                  <option value="nl">Nederlands</option>
                </select>
              </label>
            )}
            <label className="flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-700 hover:border-slate-300">
              <span className="sr-only">Currency</span>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="bg-transparent text-xs font-semibold focus:outline-hidden cursor-pointer">
                <option value="EUR">EUR (€) Netherlands</option>
                <option value="USD">USD ($) Global</option>
                <option value="GBP">GBP (£) UK</option>
                <option value="CAD">CAD ($) Canada</option>
                <option value="JPY">JPY (¥) Japan</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      {/* Main navigation row: a navy band on large screens; white on phones, where it also carries the logo */}
      <div className="relative lg:bg-[radial-gradient(ellipse_60%_120%_at_85%_0%,rgba(99,102,241,0.12),transparent),linear-gradient(to_bottom,#232272,#1c1b5a)] lg:shadow-[inset_0_-1px_0_rgba(255,255,255,0.06)]">
        <AtlasStar className="pointer-events-none absolute left-[58%] top-1.5 hidden h-1.5 w-1.5 text-amber-100/60 lg:block" />
        <AtlasStar className="pointer-events-none absolute bottom-2 left-[77%] hidden h-2 w-2 text-amber-100/70 lg:block" />
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3.5">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Logo & Brand (on large screens the logo sits in the site menu row) */}
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <button
              onClick={goToStoreHome}
              className="flex min-w-0 items-center gap-1.5 sm:gap-2.5 text-left group focus-visible:outline-2 focus-visible:outline-indigo-600 cursor-pointer lg:hidden"
            >
              <img src={`${import.meta.env.BASE_URL}logo-96.webp`} srcSet={`${import.meta.env.BASE_URL}logo-96.webp 1x, ${import.meta.env.BASE_URL}logo-192.webp 2x`} alt="Bookatlas" width={319} height={96} className="h-9 w-auto shrink-0 sm:h-10 transition-opacity group-hover:opacity-85" />
            </button>

            {/* Categories selector button */}
            <div className="relative hidden xl:block">
              <PopoverPrimitive.Root open={categoryDropdownOpen} onOpenChange={setCategoryDropdownOpen}>
                <PopoverPrimitive.Trigger asChild>
                  <button
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-100 hover:text-white rounded-md hover:bg-white/10 transition-colors border border-transparent hover:border-white/15 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
              >
                <Layers className="w-4 h-4 text-indigo-300" />
                <span className="max-w-36 truncate">{selectedGenre === 'All Genres' ? 'Categories' : selectedGenre}</span>
                <span className="text-xs text-slate-400">▾</span>
              </button>
                </PopoverPrimitive.Trigger>
                <PopoverPrimitive.Portal>
                  <PopoverPrimitive.Content
                    id="bookstore-categories"
                    align="start"
                    sideOffset={6}
                    collisionPadding={12}
                    className="w-80 bg-white rounded-xl shadow-2xl border border-stone-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 max-h-[480px] overflow-y-auto"
                  >
                  <div className="px-3.5 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 pb-2 mb-1">
                    <span>Browse Bookstore Taxonomy</span>
                    <span className="text-[10px] text-indigo-600 font-bold">{GENRES.length - 1} Active Genres</span>
                  </div>

                  {/* All Genres Option */}
                  <button
                    onClick={() => {
                      setSelectedGenre('All Genres');
                      setActiveTab('store');
                      setCategoryDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                      selectedGenre === 'All Genres'
                        ? 'bg-indigo-50 text-indigo-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950 font-medium'
                    }`}
                  >
                    <span>✨ All Categories & Catalog</span>
                    {selectedGenre === 'All Genres' && <span className="w-2 h-2 rounded-full bg-indigo-600"></span>}
                  </button>

                  {/* Section 1: African Literature & Pan-African Studies */}
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <div className="px-3.5 py-1 text-[11px] font-bold text-amber-900 bg-amber-50/80 rounded mx-2 mb-1 flex items-center gap-1.5">
                      <span>🌍</span>
                      <span>African Literature & Pan-African Studies</span>
                    </div>
                    {AFRICAN_LITERATURE_GENRES.map((genre) => (
                      <button
                        key={genre}
                        onClick={() => {
                          setSelectedGenre(genre);
                          setActiveTab('store');
                          setCategoryDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-1.5 text-xs sm:text-sm transition-colors cursor-pointer flex items-center justify-between ${
                          selectedGenre === genre
                            ? 'bg-amber-100/60 text-amber-950 font-bold'
                            : 'text-slate-700 hover:bg-amber-50/50 hover:text-slate-950'
                        }`}
                      >
                        <span className="truncate">{genre}</span>
                        {selectedGenre === genre && <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>}
                      </button>
                    ))}
                  </div>

                  {/* Section 2: Consciousness Community & Sacred Sciences */}
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <div className="px-3.5 py-1 text-[11px] font-bold text-emerald-900 bg-emerald-50/80 rounded mx-2 mb-1 flex items-center gap-1.5">
                      <span>👁️</span>
                      <span>Consciousness & Sacred Sciences</span>
                    </div>
                    {CONSCIOUSNESS_COMMUNITY_GENRES.map((genre) => (
                      <button
                        key={genre}
                        onClick={() => {
                          setSelectedGenre(genre);
                          setActiveTab('store');
                          setCategoryDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-1.5 text-xs sm:text-sm transition-colors cursor-pointer flex items-center justify-between ${
                          selectedGenre === genre
                            ? 'bg-emerald-100/60 text-emerald-950 font-bold'
                            : 'text-slate-700 hover:bg-emerald-50/50 hover:text-slate-950'
                        }`}
                      >
                        <span className="truncate">{genre}</span>
                        {selectedGenre === genre && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>}
                      </button>
                    ))}
                  </div>

                  {/* Section 3: General Literature & Classics */}
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <div className="px-3.5 py-1 text-[11px] font-bold text-indigo-900 bg-indigo-50/80 rounded mx-2 mb-1 flex items-center gap-1.5">
                      <span>📚</span>
                      <span>General & European Literature</span>
                    </div>
                    {GENERAL_GENRES.map((genre) => (
                      <button
                        key={genre}
                        onClick={() => {
                          setSelectedGenre(genre);
                          setActiveTab('store');
                          setCategoryDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-1.5 text-xs sm:text-sm transition-colors cursor-pointer flex items-center justify-between ${
                          selectedGenre === genre
                            ? 'bg-indigo-50 text-indigo-900 font-bold'
                            : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'
                        }`}
                      >
                        <span className="truncate">{genre}</span>
                        {selectedGenre === genre && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>}
                      </button>
                    ))}
                  </div>
                </PopoverPrimitive.Content>
                </PopoverPrimitive.Portal>
              </PopoverPrimitive.Root>
            </div>

            <a href={contactHref('Start my book')} className="hidden lg:inline-flex shrink-0 whitespace-nowrap rounded-full bg-amber-400 px-3.5 py-1.5 text-xs font-bold text-slate-950 shadow-sm shadow-amber-500/20 transition-colors hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300">Start a book</a>
          </div>

          {/* Search bar */}
          <div className="min-w-0 flex-1 max-w-xl hidden sm:block">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                aria-label="Search the book catalog"
                placeholder="Search title, author, ISBN, genre, or tags…"
                className="w-full pl-10 pr-10 py-2 bg-slate-100 focus:bg-white border border-slate-200 rounded-full text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all lg:bg-white lg:border-white/10 lg:focus:ring-amber-300/50 lg:focus:border-amber-300"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear catalog search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Right actions: AI Matchmaker, Manager, Wishlist, My Bookshelf, Cart */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            {/* Manager Operations CTA */}
            {isAdminAuthenticated && <button
              onClick={() => setActiveTab(activeTab === 'manager' ? 'store' : 'manager')}
              className={`hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'manager'
                  ? 'bg-slate-900 text-amber-300 ring-2 ring-indigo-500 shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
              }`}
              title="Single Manager Operations & AI Auto-Publishing Studio"
            >
              <Bot className="w-4 h-4 text-indigo-600" />
              <span>Manager Studio</span>
            </button>}

            {/* AI Book Matchmaker button */}
            <button
              onClick={onOpenAIMatchmaker}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-xs sm:text-sm font-semibold hover:bg-white/15 hover:border-white/40 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
              title="AI Book Recommender & Gemini Mood Matcher"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span className="hidden md:inline">Gemini AI Matchmaker</span>
              <span className="md:hidden">AI Match</span>
            </button>

            {/* My Bookshelf tab */}
            <button
              onClick={() => setActiveTab('library')}
              className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 ${
                activeTab === 'library'
                  ? 'bg-white/15 text-white ring-1 ring-white/25'
                  : 'text-slate-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden lg:inline">My Bookshelf</span>
            </button>

            {/* Wishlist */}
            <button
              onClick={onOpenWishlist}
              className="relative hidden lg:flex min-h-12 min-w-12 items-center justify-center p-2 text-slate-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
              title="Saved Wishlist"
              aria-label={`Open wishlist${wishlistCount ? `, ${wishlistCount} saved` : ''}`}
            >
              <Heart className="w-5 h-5" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Cart Button */}
            <button
              onClick={onOpenCart}
              className="relative flex min-h-12 min-w-12 items-center justify-center gap-2 px-3 py-1.5 bg-[#0f172a] hover:bg-slate-800 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors cursor-pointer lg:bg-white lg:text-slate-950 lg:hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
              aria-label={`Open shopping cart${cartCount ? `, ${cartCount} items` : ''}`}
            >
              <ShoppingBag className="w-4 h-4 text-amber-400 lg:text-indigo-700" />
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span className="bg-amber-400 text-slate-950 text-xs font-bold px-1.5 py-0.2 rounded-full">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="grid min-h-12 min-w-12 place-items-center lg:hidden text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              aria-label={mobileMenuOpen ? 'Close bookstore menu' : 'Open bookstore menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="bookstore-mobile-menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Search input */}
        <div className="mt-2.5 sm:hidden">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              aria-label="Search the book catalog"
              placeholder="Search books, authors, genres..."
              className="min-h-12 w-full pl-9 pr-8 py-1.5 bg-slate-100 text-sm rounded-lg border border-slate-200 focus:outline-hidden focus:bg-white"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>
      </div>

      {/* Sub Navigation Bar (eBooks, Audiobooks, Bookatlas Plus, Deals, Manager) */}
      <nav className="bg-white border-t border-slate-100 hidden lg:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between text-sm">
          <div className="flex min-w-0 items-center space-x-1 overflow-x-auto scrollbar-none py-0.5">
            <button
              onClick={() => { setActiveTab('store'); setSelectedGenre('All Genres'); }}
              className={`px-3 py-2.5 font-medium border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'store' && selectedGenre === 'All Genres'
                  ? 'border-indigo-600 text-indigo-900 font-semibold'
                  : 'border-transparent text-slate-700 hover:text-slate-950 hover:border-slate-300'
              }`}
            >
              All eBooks
            </button>
            <button
              onClick={() => { setActiveTab('audiobooks'); }}
              className={`flex items-center gap-1.5 px-3 py-2.5 font-medium border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'audiobooks'
                  ? 'border-indigo-600 text-indigo-900 font-semibold'
                  : 'border-transparent text-slate-700 hover:text-slate-950 hover:border-slate-300'
              }`}
            >
              <Headphones className="w-3.5 h-3.5 text-indigo-600" />
              <span>Audiobooks</span>
            </button>
            <button
              onClick={() => { setActiveTab('bookatlasplus'); }}
              className={`flex items-center gap-1.5 px-3 py-2.5 font-medium border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'bookatlasplus'
                  ? 'border-indigo-600 text-indigo-900 font-semibold'
                  : 'border-transparent text-slate-700 hover:text-slate-950 hover:border-slate-300'
              }`}
            >
              <span className="font-serif italic font-bold text-indigo-800">bookatlas</span>
              <span className="font-bold text-slate-900">Plus</span>
              <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wide">Unlimited</span>
            </button>
            <button
              onClick={() => { setActiveTab('deals'); }}
              className={`flex items-center gap-1.5 px-3 py-2.5 font-medium border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'deals'
                  ? 'border-indigo-600 text-indigo-900 font-semibold'
                  : 'border-transparent text-slate-700 hover:text-slate-950 hover:border-slate-300'
              }`}
            >
              <Tag className="w-3.5 h-3.5 text-amber-600" />
              <span>Deals Under €4.99</span>
            </button>

            {/* AI Studio Hub in Subnav */}
            <button
              onClick={onOpenAIHub}
              className="flex items-center gap-1.5 px-3 py-2.5 font-bold text-indigo-700 hover:text-indigo-900 border-b-2 border-transparent hover:border-indigo-500 whitespace-nowrap transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Gemini AI Hub</span>
              <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-bold">4 Modalities</span>
            </button>

            {/* Live Search Radar in Subnav */}
            <button
              onClick={onOpenSearch}
              className="flex items-center gap-1.5 px-3 py-2.5 font-medium text-slate-700 hover:text-sky-800 border-b-2 border-transparent hover:border-sky-500 whitespace-nowrap transition-colors cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-sky-600" />
              <span>Live Search Radar</span>
            </button>

            {/* Manager Studio Tab - Protected */}
            {isAdminAuthenticated && <button
              onClick={handleManagerTabClick}
              className={`flex items-center gap-1.5 px-3 py-2.5 font-medium border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'manager'
                  ? 'border-indigo-600 text-indigo-900 font-semibold'
                  : 'border-transparent text-slate-700 hover:text-slate-950 hover:border-slate-300'
              }`}
            >
              {isAdminAuthenticated ? (
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-amber-600" />
              )}
              <span>Manager Portal</span>
              {isAdminAuthenticated ? (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wide">Unlocked</span>
              ) : (
                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wide">Admin Lock</span>
              )}
            </button>}
          </div>


          <div className="hidden 2xl:flex shrink-0 items-center pl-4 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1 whitespace-nowrap text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <Award className="w-3.5 h-3.5 text-emerald-600" />
              Earn Super Points on every order
            </span>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div id="bookstore-mobile-menu" className="lg:hidden max-h-[calc(100dvh-8rem)] overflow-y-auto bg-white border-t border-slate-200 px-4 py-3 space-y-2">
          <button onClick={() => { setActiveTab('library'); setMobileMenuOpen(false); }} className="min-h-12 w-full rounded-lg bg-slate-50 px-3 text-left font-semibold text-slate-900">My Bookshelf</button>
          <button onClick={() => { onOpenWishlist(); setMobileMenuOpen(false); }} className="min-h-12 w-full rounded-lg bg-slate-50 px-3 text-left font-semibold text-slate-900">Wishlist{wishlistCount ? ` (${wishlistCount})` : ''}</button>
          {setLanguage && <label className="flex min-h-12 items-center justify-between gap-3 rounded-lg px-3 text-sm font-medium text-slate-800">
            <span>Language</span>
            <select value={language} onChange={event => setLanguage(event.target.value as 'en' | 'nl')} aria-label="Language" className="min-h-11 rounded-lg border border-slate-300 bg-white px-2">
              <option value="en">English</option><option value="nl">Nederlands</option>
            </select>
          </label>}
          <label className="flex min-h-12 items-center justify-between gap-3 rounded-lg px-3 text-sm font-medium text-slate-800">
            <span>Currency</span>
            <select value={currency} onChange={event => setCurrency(event.target.value)} aria-label="Currency" className="min-h-11 max-w-40 rounded-lg border border-slate-300 bg-white px-2">
              <option value="EUR">EUR (€)</option><option value="USD">USD ($)</option><option value="GBP">GBP (£)</option><option value="CAD">CAD ($)</option><option value="JPY">JPY (¥)</option>
            </select>
          </label>
          {/* Admin Session Mobile Bar */}
          {isAdminAuthenticated ? (
            <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-emerald-950">Admin: {adminEmail}</span>
              </div>
              <button
                onClick={() => { onAdminLogout(); setMobileMenuOpen(false); }}
                className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded text-[10px]"
              >
                Lock
              </button>
            </div>
          ) : null}

          {isAdminAuthenticated && <button
            onClick={() => { handleManagerTabClick(); setMobileMenuOpen(false); }}
            className="w-full text-left py-2 font-bold text-indigo-700 flex items-center gap-2 bg-indigo-50 px-3 rounded-lg"
          >
            {isAdminAuthenticated ? <ShieldCheck className="w-4 h-4 text-indigo-600" /> : <Lock className="w-4 h-4 text-amber-600" />}
            <span>Manager Portal {isAdminAuthenticated ? '(Active)' : '(Admin Locked)'}</span>
          </button>}
          <button
            onClick={() => { setActiveTab('store'); setMobileMenuOpen(false); }}
            className="min-h-12 w-full text-left py-2 font-medium text-slate-800"
          >
            All eBooks
          </button>
          <button
            onClick={() => { setActiveTab('audiobooks'); setMobileMenuOpen(false); }}
            className="min-h-12 w-full text-left py-2 font-medium text-slate-800 flex items-center gap-2"
          >
            <Headphones className="w-4 h-4 text-indigo-600" /> Audiobooks
          </button>
          <button
            onClick={() => { setActiveTab('bookatlasplus'); setMobileMenuOpen(false); }}
            className="min-h-12 w-full text-left py-2 font-medium text-indigo-700 flex items-center gap-2"
          >
            <Compass className="w-4 h-4" /> Bookatlas Plus (Unlimited Reads)
          </button>
          <button
            onClick={() => { setActiveTab('deals'); setMobileMenuOpen(false); }}
            className="min-h-12 w-full text-left py-2 font-medium text-amber-700 flex items-center gap-2"
          >
            <Tag className="w-4 h-4" /> Deals & Free eBooks
          </button>
          <button
            onClick={() => { onOpenAIMatchmaker(); setMobileMenuOpen(false); }}
            className="min-h-12 w-full text-left py-2 font-medium text-purple-700 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" /> Gemini AI Matchmaker
          </button>
          <button
            onClick={() => { onOpenAIHub(); setMobileMenuOpen(false); }}
            className="min-h-12 w-full text-left py-2 font-bold text-indigo-700 flex items-center gap-2 bg-purple-50 px-3 rounded-lg"
          >
            <Bot className="w-4 h-4 text-purple-600" /> AI reading tools
          </button>
          <button
            onClick={() => { onOpenVoice(); setMobileMenuOpen(false); }}
            className="min-h-12 w-full text-left py-2 font-medium text-violet-700 flex items-center gap-2"
          >
            <Headphones className="w-4 h-4" /> Live Voice companion
          </button>
          <div className="border-t border-slate-100 pt-2">
            <p className="px-1 pb-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">Publish with BookAtlas</p>
            {([
              ['Who it’s for', 'solutions', PenTool],
              ['Services and pricing', 'pricing', Ruler],
              ['How it works', 'how-it-works', ListOrdered],
              ['Earnings calculator', 'earnings', Calculator],
              ['About BookAtlas', 'about', Building2],
              ['Bookstore', 'bookstore', BookOpen],
            ] as const).map(([label, id, Icon]) => (
              <button
                key={id}
                onClick={() => { onNavigateSection(id); setMobileMenuOpen(false); }}
                className="min-h-12 w-full text-left py-2 font-medium text-slate-800 flex items-center gap-2"
              >
                <Icon className="w-4 h-4 text-indigo-600" /> {label}
              </button>
            ))}
            <a href={contactHref('Start my book')} className="flex min-h-12 w-full items-center gap-2 rounded-lg bg-amber-400 px-3 font-bold text-slate-950">
              <Mail className="w-4 h-4" /> Start my book
            </a>
          </div>
          {isAdminAuthenticated && <button
            onClick={() => { handleDocsClick(); setMobileMenuOpen(false); }}
            className="w-full text-left py-2 font-bold text-blue-700 flex items-center gap-2 bg-blue-50 px-3 rounded-lg"
          >
            {isAdminAuthenticated ? <ShieldCheck className="w-4 h-4 text-blue-600" /> : <Lock className="w-4 h-4 text-amber-600" />}
            <span>Download Documentation (Admin Only)</span>
          </button>}
          {isAdminAuthenticated && <button
            onClick={() => { onOpenArchitectureGuide(); setMobileMenuOpen(false); }}
            className="w-full text-left py-2 font-medium text-slate-700 flex items-center gap-2 border-t border-slate-100 pt-2"
          >
            <HelpCircle className="w-4 h-4" /> Platform Blueprint
          </button>}
        </div>
      )}
    </header>
  );
};

