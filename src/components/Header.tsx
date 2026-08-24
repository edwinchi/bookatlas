import React, { useState } from 'react';
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
  FileCheck,
  FileText,
  Lock,
  Unlock,
  KeyRound,
  ShieldAlert,
  UserCheck
} from 'lucide-react';

import { GENRES, AFRICAN_LITERATURE_GENRES, CONSCIOUSNESS_COMMUNITY_GENRES, GENERAL_GENRES } from '../data/booksData';

interface HeaderProps {
  activeTab: 'store' | 'library' | 'deals' | 'audiobooks' | 'koboplus' | 'manager';
  setActiveTab: (tab: 'store' | 'library' | 'deals' | 'audiobooks' | 'koboplus' | 'manager') => void;
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
  isAdminAuthenticated: boolean;
  adminEmail: string;
  onOpenAdminAuth: (featureName: string, callback?: () => void) => void;
  onAdminLogout: () => void;
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
  isAdminAuthenticated,
  adminEmail,
  onOpenAdminAuth,
  onAdminLogout
}) => {

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

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

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-stone-200 shadow-xs">
      {/* Top micro announcement bar */}
      <div className="bg-[#0f172a] text-slate-200 text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="flex items-center gap-1.5 font-medium text-white">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Bookatlas eBook Store & Reader
            </span>
            <span className="hidden sm:inline text-slate-500">|</span>
            <span className="hidden md:inline text-slate-300">
              Atlantean Globals Services (Netherlands)
            </span>
            <span className="hidden lg:inline text-slate-500">|</span>
            <span className="hidden lg:inline text-slate-400">
              Web, iOS, Android & Bookatlas eReaders
            </span>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3 text-slate-300">
            {/* Admin Session Indicator & Quick Lock */}
            {isAdminAuthenticated ? (
              <div className="flex items-center gap-1.5 bg-emerald-950/90 border border-emerald-600/60 px-2.5 py-0.5 rounded text-[11px] text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-bold hidden xl:inline">Admin:</span>
                <span className="font-mono text-[10px] truncate max-w-[110px] sm:max-w-[150px] text-emerald-100">{adminEmail}</span>
                <button
                  onClick={onAdminLogout}
                  className="ml-1 text-slate-300 hover:text-white hover:bg-emerald-900/80 px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                  title="Lock Administrator Session"
                >
                  <Lock className="w-3 h-3 text-amber-400" />
                  <span>Lock</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => onOpenAdminAuth('Administrator Verification & Control Panel')}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
                title="Log in as Administrator"
              >
                <Lock className="w-3 h-3 text-amber-400" />
                <span className="hidden sm:inline">Admin Login</span>
              </button>
            )}

            {/* AI Studio Hub in Topbar */}
            <button
              onClick={onOpenAIHub}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-xs transition-all cursor-pointer"
              title="Open Gemini AI Studio Hub"
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>AI Studio</span>
            </button>

            {/* Live Voice Quick Launch */}
            <button
              onClick={onOpenVoice}
              className="hidden md:flex items-center gap-1 text-xs text-violet-300 hover:text-violet-200 font-semibold transition-colors cursor-pointer"
              title="Real-Time Voice Companion"
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>Live Voice</span>
            </button>

            {/* Download Official Docs (.docx & .pdf) - Admin Protected */}
            <button
              onClick={handleDocsClick}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-900/80 hover:bg-blue-800 text-blue-200 border border-blue-700/50 transition-all cursor-pointer"
              title={isAdminAuthenticated ? "Download Platform Specifications in Word (.docx) & PDF (.pdf)" : "Admin Only: Download Platform Specifications"}
            >
              {isAdminAuthenticated ? (
                <FileCheck className="w-3.5 h-3.5 text-blue-300" />
              ) : (
                <Lock className="w-3 h-3 text-amber-400" />
              )}
              <span className="hidden sm:inline">Specs Export</span>
              <span className="sm:hidden">Docs</span>
            </button>

            {/* Manager Switch in Topbar - Admin Protected */}
            <button
              onClick={handleManagerTabClick}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                activeTab === 'manager'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : isAdminAuthenticated
                  ? 'bg-indigo-900/80 text-indigo-100 hover:bg-indigo-800 border border-indigo-700/50'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
              title={isAdminAuthenticated ? "Access Manager Control Center" : "Admin Only: Manager Studio"}
            >
              {isAdminAuthenticated ? (
                <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
              ) : (
                <Lock className="w-3 h-3 text-amber-400" />
              )}
              <span>{activeTab === 'manager' ? 'Exit Manager' : 'Manager Studio'}</span>
              {!isAdminAuthenticated && (
                <span className="text-[9px] bg-slate-900 text-amber-300 px-1 py-0.2 rounded-xs">Admin</span>
              )}
            </button>

            <button
              onClick={onOpenArchitectureGuide}
              className="hidden sm:flex items-center gap-1 text-xs text-amber-300 hover:text-amber-200 font-semibold transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Blueprint</span>
            </button>
            <div className="flex items-center gap-1 text-slate-300 hover:text-white">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-transparent text-xs text-slate-200 focus:outline-hidden cursor-pointer"
              >
                <option value="EUR" className="bg-slate-800 text-white">EUR (€) Netherlands</option>
                <option value="USD" className="bg-slate-800 text-white">USD ($) Global</option>
                <option value="GBP" className="bg-slate-800 text-white">GBP (£) UK</option>
                <option value="CAD" className="bg-slate-800 text-white">CAD ($) Canada</option>
                <option value="JPY" className="bg-slate-800 text-white">JPY (¥) Japan</option>
              </select>
            </div>
          </div>
        </div>
      </div>


      {/* Main navigation row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5">
        <div className="flex items-center justify-between gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { setActiveTab('store'); setSelectedGenre('All Genres'); setSearchQuery(''); }}
              className="flex items-center gap-2.5 text-left group focus:outline-hidden cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 text-amber-400 flex items-center justify-center font-serif font-black text-xl shadow-md group-hover:scale-105 transition-transform border border-blue-800/40">
                <Compass className="w-5 h-5 text-amber-300" />
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] tracking-widest uppercase font-bold text-slate-400">ATLANTEAN</span>
                  <span className="text-[9px] px-1 py-0.2 rounded-xs bg-slate-100 text-slate-600 font-semibold">NL</span>
                </div>
                <div className="text-xl font-extrabold tracking-tight text-slate-950 flex items-center font-serif">
                  bookatlas<span className="text-amber-600 font-sans">.</span>
                </div>
              </div>
            </button>

            {/* Categories selector button */}
            <div className="relative hidden md:block">
              <button
                onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
              >
                <Layers className="w-4 h-4 text-slate-500" />
                <span>{selectedGenre === 'All Genres' ? 'Categories' : selectedGenre}</span>
                <span className="text-xs text-slate-400">▾</span>
              </button>

              {categoryDropdownOpen && (
                <div 
                  className="absolute left-0 top-full mt-1.5 w-80 bg-white rounded-xl shadow-2xl border border-stone-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 max-h-[480px] overflow-y-auto"
                  onMouseLeave={() => setCategoryDropdownOpen(false)}
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
                </div>
              )}
            </div>
          </div>

          {/* Search bar */}
          <div className="flex-1 max-w-xl hidden sm:block">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeTab !== 'store') setActiveTab('store');
                }}
                placeholder="Search by Title, Author, ISBN, Dutch translations, or AI Mood..."
                className="w-full pl-10 pr-10 py-2 bg-slate-100 focus:bg-white border border-slate-200 rounded-full text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Right actions: AI Matchmaker, Manager, Wishlist, My Bookshelf, Cart */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Manager Operations CTA */}
            <button
              onClick={() => setActiveTab(activeTab === 'manager' ? 'store' : 'manager')}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'manager'
                  ? 'bg-slate-900 text-amber-300 ring-2 ring-indigo-500 shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
              }`}
              title="Single Manager Operations & AI Auto-Publishing Studio"
            >
              <Bot className="w-4 h-4 text-indigo-600" />
              <span>Manager Studio</span>
            </button>

            {/* AI Book Matchmaker button */}
            <button
              onClick={onOpenAIMatchmaker}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-indigo-200 text-indigo-900 text-xs sm:text-sm font-semibold hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer"
              title="AI Book Recommender & Gemini Mood Matcher"
            >
              <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
              <span className="hidden md:inline">Gemini AI Matchmaker</span>
              <span className="md:hidden">AI Match</span>
            </button>

            {/* My Bookshelf tab */}
            <button
              onClick={() => setActiveTab('library')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'library'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden lg:inline">My Bookshelf</span>
            </button>

            {/* Wishlist */}
            <button
              onClick={onOpenWishlist}
              className="relative p-2 text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Saved Wishlist"
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
              className="relative flex items-center gap-2 px-3 py-1.5 bg-[#0f172a] hover:bg-slate-800 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-amber-400" />
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
              className="md:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
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
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search books, authors, genres..."
              className="w-full pl-9 pr-8 py-1.5 bg-slate-100 text-sm rounded-lg border border-slate-200 focus:outline-hidden focus:bg-white"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>

      {/* Sub Navigation Bar (eBooks, Audiobooks, Bookatlas Plus, Deals, Manager) */}
      <nav className="bg-white border-t border-slate-100 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between text-sm">
          <div className="flex items-center space-x-1 overflow-x-auto scrollbar-none py-0.5">
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
              onClick={() => { setActiveTab('koboplus'); }}
              className={`flex items-center gap-1.5 px-3 py-2.5 font-medium border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'koboplus'
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
            <button
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
            </button>
          </div>


          <div className="flex items-center space-x-4 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <Award className="w-3.5 h-3.5 text-emerald-600" />
              Earn Bookatlas Super Points on every order
            </span>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-200 px-4 py-3 space-y-2">
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
          ) : (
            <button
              onClick={() => { onOpenAdminAuth('Administrator Verification'); setMobileMenuOpen(false); }}
              className="w-full text-left py-2 font-bold text-slate-700 flex items-center justify-between bg-slate-100 px-3 rounded-lg text-xs"
            >
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-500" />
                <span>Admin Login ({adminEmail})</span>
              </div>
              <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-bold">Lock</span>
            </button>
          )}

          <button
            onClick={() => { handleManagerTabClick(); setMobileMenuOpen(false); }}
            className="w-full text-left py-2 font-bold text-indigo-700 flex items-center gap-2 bg-indigo-50 px-3 rounded-lg"
          >
            {isAdminAuthenticated ? <ShieldCheck className="w-4 h-4 text-indigo-600" /> : <Lock className="w-4 h-4 text-amber-600" />}
            <span>Manager Portal {isAdminAuthenticated ? '(Active)' : '(Admin Locked)'}</span>
          </button>
          <button
            onClick={() => { setActiveTab('store'); setMobileMenuOpen(false); }}
            className="w-full text-left py-2 font-medium text-slate-800"
          >
            All eBooks
          </button>
          <button
            onClick={() => { setActiveTab('audiobooks'); setMobileMenuOpen(false); }}
            className="w-full text-left py-2 font-medium text-slate-800 flex items-center gap-2"
          >
            <Headphones className="w-4 h-4 text-indigo-600" /> Audiobooks
          </button>
          <button
            onClick={() => { setActiveTab('koboplus'); setMobileMenuOpen(false); }}
            className="w-full text-left py-2 font-medium text-indigo-700 flex items-center gap-2"
          >
            <Compass className="w-4 h-4" /> Bookatlas Plus (Unlimited Reads)
          </button>
          <button
            onClick={() => { setActiveTab('deals'); setMobileMenuOpen(false); }}
            className="w-full text-left py-2 font-medium text-amber-700 flex items-center gap-2"
          >
            <Tag className="w-4 h-4" /> Deals & Free eBooks
          </button>
          <button
            onClick={() => { onOpenAIMatchmaker(); setMobileMenuOpen(false); }}
            className="w-full text-left py-2 font-medium text-purple-700 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" /> Gemini AI Matchmaker
          </button>
          <button
            onClick={() => { onOpenAIHub(); setMobileMenuOpen(false); }}
            className="w-full text-left py-2 font-bold text-indigo-700 flex items-center gap-2 bg-purple-50 px-3 rounded-lg"
          >
            <Bot className="w-4 h-4 text-purple-600" /> Gemini AI Studio (Chat, Voice, Video, Search)
          </button>
          <button
            onClick={() => { handleDocsClick(); setMobileMenuOpen(false); }}
            className="w-full text-left py-2 font-bold text-blue-700 flex items-center gap-2 bg-blue-50 px-3 rounded-lg"
          >
            {isAdminAuthenticated ? <ShieldCheck className="w-4 h-4 text-blue-600" /> : <Lock className="w-4 h-4 text-amber-600" />}
            <span>Download Documentation (Admin Only)</span>
          </button>
          <button
            onClick={() => { onOpenArchitectureGuide(); setMobileMenuOpen(false); }}
            className="w-full text-left py-2 font-medium text-slate-700 flex items-center gap-2 border-t border-slate-100 pt-2"
          >
            <HelpCircle className="w-4 h-4" /> Platform Blueprint
          </button>
        </div>
      )}
    </header>
  );
};

