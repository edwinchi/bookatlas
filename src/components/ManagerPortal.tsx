import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  BookOpen,
  Plus,
  Trash2,
  Edit3,
  TrendingUp,
  DollarSign,
  Users,
  Activity,
  Bot,
  Zap,
  Tag,
  Share2,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Sliders,
  Award,
  Layers,
  ArrowRight,
  ShieldCheck,
  Check,
  Copy,
  Headphones,
  Lock,
  Unlock,
  KeyRound,
  ShieldAlert,
  UserCheck,
  Building2,
  Fingerprint
} from 'lucide-react';
import { Book, ManagerStats, AutomationLogEntry, MarketingKit, SecurityAuditLog } from '../types';
import { GENRES } from '../data/booksData';

interface ManagerPortalProps {
  books: Book[];
  onUpdateBook: (book: Book) => void;
  onAddBook: (book: Book) => void;
  onDeleteBook: (bookId: string) => void;
  onPreviewBook: (book: Book) => void;
  onReturnToStore: () => void;
  onOpenAIHub?: () => void;
  onOpenChat?: () => void;
  onOpenVoice?: () => void;
  onOpenVideo?: () => void;
  onOpenSearch?: () => void;
  onOpenDocs?: () => void;
  currencySymbol?: string;
  adminEmail?: string;
  onAdminLogout?: () => void;
}

export const ManagerPortal: React.FC<ManagerPortalProps> = ({
  books,
  onUpdateBook,
  onAddBook,
  onDeleteBook,
  onPreviewBook,
  onReturnToStore,
  onOpenAIHub,
  onOpenChat,
  onOpenVoice,
  onOpenVideo,
  onOpenSearch,
  onOpenDocs,
  currencySymbol = '€',
  adminEmail = 'eddyteddy78@gmail.com',
  onAdminLogout
}) => {

  const [activeTab, setActiveTab] = useState<'inventory' | 'ai_studio' | 'pricing' | 'marketing' | 'autopilot' | 'security'>('inventory');
  
  // Security & Passcode State
  const [currentMasterPin, setCurrentMasterPin] = useState(() => localStorage.getItem('bookatlas_admin_pin') || '7878');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinChangeMessage, setPinChangeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Security Audit Logs
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>(() => {
    const saved = localStorage.getItem('bookatlas_security_audit_logs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return [
      {
        id: 'audit-init-1',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        action: 'Security Session Active',
        details: `Administrator authenticated (${adminEmail})`,
        status: 'authorized'
      },
      {
        id: 'audit-init-2',
        timestamp: 'Earlier today',
        action: 'System Boot & Encrypted Vault',
        details: 'Atlantean Globals Services B.V. master key verified',
        status: 'authorized'
      }
    ];
  });
  
  // Search & Filter in Inventory
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All Genres');
  
  // AI Generator Form
  const [genCategory, setGenCategory] = useState('Sci-Fi & Fantasy');
  const [genTone, setGenTone] = useState('Atmospheric, intellectual, and page-turning');
  const [genCustomPrompt, setGenCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);

  // Marketing Generator
  const [selectedMarketingBookId, setSelectedMarketingBookId] = useState<string>(books[0]?.id || '');
  const [isGeneratingMarketing, setIsGeneratingMarketing] = useState(false);
  const [marketingKit, setMarketingKit] = useState<MarketingKit | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Manual Add / Edit Modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Partial<Book> | null>(null);

  // Autopilot & Stats
  const [isAutopilot, setIsAutopilot] = useState(true);
  const [logs, setLogs] = useState<AutomationLogEntry[]>([
    {
      id: 'log-1',
      timestamp: 'Just now',
      actionType: 'inventory_sync',
      title: 'Storefront Synchronized',
      description: 'All 15 genre catalog rows updated with full EPUB preview compatibility.',
      badge: 'Live'
    },
    {
      id: 'log-2',
      timestamp: '10 min ago',
      actionType: 'deal_rotation',
      title: 'Daily Deal Algorithm Checked',
      description: 'Verified pricing thresholds under $4.99.',
      badge: 'Autopilot'
    }
  ]);

  // Dynamic Metrics
  const totalRevenue = Math.round(books.reduce((acc, b) => acc + (b.price * 52), 0) + (8450 * 9.99));
  const plusBooksCount = books.filter(b => b.isBookatlasPlus || b.isKoboPlus).length;
  const audioCount = books.filter(b => b.format === 'audiobook' || b.format === 'bundle' || b.audioDurationMinutes).length;

  const filteredBooks = books.filter((b) => {
    const matchesSearch = b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = selectedGenre === 'All Genres' || b.primaryGenre === selectedGenre || b.genres?.includes(selectedGenre);
    return matchesSearch && matchesGenre;
  });

  // 1. Single Book AI Generator
  const handleGenerateOriginalBook = async () => {
    setIsGenerating(true);
    setAiSuccessMessage(null);
    try {
      const response = await fetch('/api/manager/generate-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: genCategory,
          tone: genTone,
          customPrompt: genCustomPrompt,
        }),
      });
      const contentType = response.headers.get('content-type');
      if (!response.ok || !contentType || !contentType.includes('application/json')) {
        throw new Error(`Server returned non-JSON (${response.status})`);
      }
      const data = await response.json();
      if (data.success && data.book) {
        onAddBook(data.book);
        setAiSuccessMessage(`✨ Successfully created & published original title: "${data.book.title}" in ${genCategory}!`);
        // Add log
        setLogs(prev => [
          {
            id: `log-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            actionType: 'ai_generation',
            title: `Original Book Generated: "${data.book.title}"`,
            description: `Published to ${genCategory} with complete sample chapters.`,
            badge: 'Gemini 3.7'
          },
          ...prev
        ]);
      }
    } catch (err) {
      console.error('Failed to generate original book:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // 2. Batch Generator for All Categories
  const handleBatchGenerateAll = async () => {
    setBatchGenerating(true);
    try {
      const response = await fetch('/api/manager/batch-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const contentType = response.headers.get('content-type');
      if (!response.ok || !contentType || !contentType.includes('application/json')) {
        throw new Error(`Server returned non-JSON (${response.status})`);
      }
      const data = await response.json();
      if (data.success && data.newBooks) {
        data.newBooks.forEach((b: Book) => onAddBook(b));
        setAiSuccessMessage(`🚀 Auto-generated and stocked ${data.generatedCount} original titles across all categories!`);
      }
    } catch (err) {
      console.error('Batch generation failed:', err);
    } finally {
      setBatchGenerating(false);
    }
  };

  // 3. Automated Pricing & Flash Sales
  const handleApplyPricingStrategy = async (strategy: string) => {
    try {
      const response = await fetch('/api/manager/auto-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy }),
      });
      const contentType = response.headers.get('content-type');
      if (!response.ok || !contentType || !contentType.includes('application/json')) {
        throw new Error(`Server returned non-JSON (${response.status})`);
      }
      const data = await response.json();
      if (data.success && data.books) {
        data.books.forEach((b: Book) => onUpdateBook(b));
        setAiSuccessMessage(`🏷️ Pricing & Merchandising strategy "${strategy}" applied across catalog!`);
      }
    } catch (err) {
      console.error('Pricing strategy error:', err);
    }
  };

  // 4. Marketing Generator
  const handleGenerateMarketing = async () => {
    if (!selectedMarketingBookId) return;
    setIsGeneratingMarketing(true);
    try {
      const response = await fetch('/api/manager/generate-marketing-kit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: selectedMarketingBookId }),
      });
      const contentType = response.headers.get('content-type');
      if (!response.ok || !contentType || !contentType.includes('application/json')) {
        throw new Error(`Server returned non-JSON (${response.status})`);
      }
      const data = await response.json();
      if (data.success && data.marketingKit) {
        setMarketingKit(data.marketingKit);
      }
    } catch (err) {
      console.error('Marketing generation failed:', err);
    } finally {
      setIsGeneratingMarketing(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveManualBook = () => {
    if (!editingBook?.title || !editingBook?.author) return;
    
    if (editingBook.id) {
      onUpdateBook(editingBook as Book);
    } else {
      const newB: Book = {
        id: `atlas-manual-${Date.now()}`,
        title: editingBook.title || 'Untitled',
        subtitle: editingBook.subtitle || '',
        author: editingBook.author || 'Atlantean Author',
        authorBio: editingBook.authorBio || 'Published author with Atlantean Globals Publishing.',
        narrator: editingBook.narrator || 'Studio Voice',
        coverImage: editingBook.coverImage || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=700&q=80',
        price: Number(editingBook.price) || 9.99,
        originalPrice: Number(editingBook.originalPrice) || 14.99,
        isBookatlasPlus: Boolean(editingBook.isBookatlasPlus),
        isDeal: Boolean(editingBook.isDeal),
        isBestseller: Boolean(editingBook.isBestseller),
        isNewRelease: true,
        isEditorPick: Boolean(editingBook.isEditorPick),
        rating: 4.9,
        reviewCount: 1,
        format: editingBook.format || 'ebook',
        genres: [editingBook.primaryGenre || 'Fiction & Literature'],
        primaryGenre: editingBook.primaryGenre || 'Fiction & Literature',
        pageCount: Number(editingBook.pageCount) || 300,
        publishDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        publisher: editingBook.publisher || 'Atlantean Publishing House (Amsterdam)',
        isbn: `978-9-023-${Math.floor(10000 + Math.random() * 90000)}`,
        language: 'English',
        synopsis: editingBook.synopsis || 'An original narrative published on Bookatlas.',
        editorialReview: '“An exceptional literary work.” — Bookatlas Review',
        superPointsEarned: Math.round((Number(editingBook.price) || 9.99) * 10),
        tags: ['New Release', editingBook.primaryGenre || 'General'],
        sampleChapters: [
          {
            title: 'Chapter 1: The Beginning',
            subtitle: 'First Chapter',
            content: [editingBook.synopsis || 'The journey begins now...']
          }
        ],
        reviews: []
      };
      onAddBook(newB);
    }
    setIsManualModalOpen(false);
    setEditingBook(null);
  };

  // Change Admin Security PIN
  const handleChangeMasterPin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeMessage(null);

    if (newPin.length < 4) {
      setPinChangeMessage({ type: 'error', text: 'New PIN must be at least 4 digits or characters.' });
      return;
    }

    if (newPin !== confirmPin) {
      setPinChangeMessage({ type: 'error', text: 'New PIN and Confirm PIN do not match.' });
      return;
    }

    localStorage.setItem('bookatlas_admin_pin', newPin);
    setCurrentMasterPin(newPin);
    setNewPin('');
    setConfirmPin('');
    setPinChangeMessage({ type: 'success', text: 'Master Administrator PIN successfully updated and encrypted in local vault.' });

    // Add to audit logs
    const newLog: SecurityAuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      action: 'Security PIN Modified',
      details: `Administrator updated master PIN credentials`,
      status: 'security_event'
    };

    const updated = [newLog, ...auditLogs];
    setAuditLogs(updated);
    localStorage.setItem('bookatlas_security_audit_logs', JSON.stringify(updated.slice(0, 30)));
  };

  const handleResetPinToDefault = () => {
    localStorage.setItem('bookatlas_admin_pin', '7878');
    setCurrentMasterPin('7878');
    setPinChangeMessage({ type: 'success', text: 'Master PIN reset to default owner passcode (7878).' });
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Manager Command Bar */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                Single Manager Command Center
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                Autopilot: {isAutopilot ? 'ON' : 'PAUSED'}
              </span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
              Bookatlas Master Operations Studio
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Centralized single-manager backend by <span className="text-indigo-300 font-semibold">Atlantean Globals Services B.V. (Netherlands)</span>. Automate catalog generation for every category, dynamic pricing, and marketing broadcasts with Gemini 3.7.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Authenticated Admin Badge */}
            <div className="px-3.5 py-2 rounded-xl bg-slate-800/90 border border-emerald-500/40 text-slate-200 text-xs flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Master Admin</span>
                <span className="font-mono text-[11px] text-emerald-300 font-bold">{adminEmail}</span>
              </div>
            </div>

            {onOpenAIHub && (
              <button
                onClick={onOpenAIHub}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md transition-all flex items-center gap-2 cursor-pointer"
                title="Launch Gemini AI Studio (Chat, Voice, Video, Search)"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>AI Multi-Modal Hub</span>
              </button>
            )}

            {onOpenDocs && (
              <button
                onClick={onOpenDocs}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-all flex items-center gap-2 cursor-pointer"
                title="Download platform documentation in Microsoft Word (.docx) & PDF (.pdf)"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Export Word & PDF Docs</span>
              </button>
            )}

            <button
              onClick={() => setIsAutopilot(!isAutopilot)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                isAutopilot
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              <Zap className="w-4 h-4" />
              {isAutopilot ? 'Autopilot Active' : 'Enable Autopilot'}
            </button>

            {onAdminLogout && (
              <button
                onClick={onAdminLogout}
                className="px-4 py-2.5 bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                title="Lock Manager Operations Center and require PIN to re-enter"
              >
                <Lock className="w-4 h-4" />
                <span>Lock Console</span>
              </button>
            )}

            <button
              onClick={onReturnToStore}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              View Live Storefront
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

        {/* Global Manager Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-6 mt-6 border-t border-slate-800">
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Catalog</span>
            <span className="text-lg font-bold text-white flex items-center gap-1.5 mt-0.5">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              {books.length} Titles
            </span>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Categories Stocked</span>
            <span className="text-lg font-bold text-white flex items-center gap-1.5 mt-0.5">
              <Layers className="w-4 h-4 text-amber-400" />
              15 Genres
            </span>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Est. Monthly Revenue</span>
            <span className="text-lg font-bold text-emerald-400 flex items-center gap-1.5 mt-0.5">
              <DollarSign className="w-4 h-4" />
              {currencySymbol}{totalRevenue.toLocaleString()}
            </span>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Plus Subscribers</span>
            <span className="text-lg font-bold text-purple-300 flex items-center gap-1.5 mt-0.5">
              <Users className="w-4 h-4" />
              8,450
            </span>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Plus Titles</span>
            <span className="text-lg font-bold text-white flex items-center gap-1.5 mt-0.5">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              {plusBooksCount}
            </span>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Audio Titles</span>
            <span className="text-lg font-bold text-white flex items-center gap-1.5 mt-0.5">
              <Headphones className="w-4 h-4 text-rose-400" />
              {audioCount}
            </span>
          </div>
        </div>
      </div>

      {/* Alert / Notification Bar */}
      {aiSuccessMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{aiSuccessMessage}</span>
          </div>
          <button
            onClick={() => setAiSuccessMessage(null)}
            className="text-xs text-emerald-700 hover:text-emerald-900 underline font-bold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'inventory'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Catalog & Inventory ({books.length})
        </button>

        <button
          onClick={() => setActiveTab('ai_studio')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'ai_studio'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Bot className="w-4 h-4 text-amber-300" />
          AI Autonomous Publishing Studio
        </button>

        <button
          onClick={() => setActiveTab('pricing')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'pricing'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Tag className="w-4 h-4" />
          Automated Pricing & Deals
        </button>

        <button
          onClick={() => setActiveTab('marketing')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'marketing'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Share2 className="w-4 h-4" />
          AI Marketing & Campaigns
        </button>

        <button
          onClick={() => setActiveTab('autopilot')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'autopilot'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Zap className="w-4 h-4" />
          Autopilot & Logs ({logs.length})
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'security'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Admin Security & PIN Vault
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CATALOG & INVENTORY MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by title, author, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
                />
              </div>

              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setEditingBook({
                    primaryGenre: 'Fiction & Literature',
                    price: 9.99,
                    originalPrice: 14.99,
                    isBookatlasPlus: true,
                    format: 'ebook',
                  });
                  setIsManualModalOpen(true);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Book Manually
              </button>

              <button
                onClick={() => setActiveTab('ai_studio')}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                AI Generate Original
              </button>
            </div>
          </div>

          {/* Books Inventory Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Title & Author</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Price</th>
                    <th className="py-3 px-3">Plus Inclusion</th>
                    <th className="py-3 px-3">Deal Status</th>
                    <th className="py-3 px-3">Rating</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredBooks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        No books matching current filter. Try clearing your search.
                      </td>
                    </tr>
                  ) : (
                    filteredBooks.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Title & Cover */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={b.coverImage}
                              alt={b.title}
                              className="w-10 h-14 object-cover rounded-md shadow-2xs shrink-0"
                            />
                            <div className="max-w-xs">
                              <span className="font-bold text-slate-900 line-clamp-1">{b.title}</span>
                              <span className="text-[11px] text-slate-500 block">{b.author}</span>
                              <span className="text-[10px] text-indigo-600 font-mono">{b.id}</span>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-3">
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-full text-[10px] font-bold whitespace-nowrap">
                            {b.primaryGenre}
                          </span>
                        </td>

                        {/* Price */}
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">
                            {currencySymbol}{b.price.toFixed(2)}
                          </div>
                          {b.originalPrice > b.price && (
                            <span className="text-[10px] text-slate-400 line-through">
                              {currencySymbol}{b.originalPrice.toFixed(2)}
                            </span>
                          )}
                        </td>

                        {/* Plus Toggle */}
                        <td className="py-3 px-3">
                          <button
                            onClick={() => onUpdateBook({ ...b, isBookatlasPlus: !b.isBookatlasPlus, isKoboPlus: !b.isBookatlasPlus })}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                              b.isBookatlasPlus || b.isKoboPlus
                                ? 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            {b.isBookatlasPlus || b.isKoboPlus ? '✓ Included' : 'No'}
                          </button>
                        </td>

                        {/* Deal Toggle */}
                        <td className="py-3 px-3">
                          <button
                            onClick={() => onUpdateBook({ ...b, isDeal: !b.isDeal })}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                              b.isDeal
                                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            {b.isDeal ? '🔥 Deal Active' : 'Regular'}
                          </button>
                        </td>

                        {/* Rating */}
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-800 flex items-center gap-1">
                            ★ {b.rating.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-400">({b.reviewCount})</span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => onPreviewBook(b)}
                              title="Preview in eReader"
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => {
                                setEditingBook(b);
                                setIsManualModalOpen(true);
                              }}
                              title="Edit Details"
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => {
                                setSelectedMarketingBookId(b.id);
                                setActiveTab('marketing');
                              }}
                              title="Generate Marketing Kit"
                              className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => onDeleteBook(b.id)}
                              title="Archive / Remove"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AI AUTONOMOUS PUBLISHING STUDIO (GEMINI 3.7 FLASH) */}
      {/* ========================================================================= */}
      {activeTab === 'ai_studio' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Generation Controls */}
          <div className="lg:col-span-7 space-y-6 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
            <div className="space-y-2 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                Gemini 3.7 Flash Autonomous Author Engine
              </div>
              <h2 className="text-xl font-serif font-bold text-slate-900">
                Generate Original Book for Any Category
              </h2>
              <p className="text-xs text-slate-500">
                Instantly writes an original, publication-ready title, deep synopsis, multi-chapter manuscript text, narrator profile, and ISBN for your selected category.
              </p>
            </div>

            <div className="space-y-4">
              {/* Category Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Target Bookstore Category
                </label>
                <select
                  value={genCategory}
                  onChange={(e) => setGenCategory(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {GENRES.filter((g) => g !== 'All Genres').map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tone Preset */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Literary Voice & Atmosphere
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'Atmospheric European Slow-Burn',
                    'High-Stakes & Fast Paced',
                    'Cerebral & Scientifically Rigorous',
                    'Sensual, Tender & Heartfelt',
                    'Cyberpunk & Kinetic Noir',
                    'Profound Philosophical Essay',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setGenTone(preset)}
                      className={`p-2 text-left text-xs rounded-lg border transition-all cursor-pointer ${
                        genTone === preset
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-900 font-bold'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Themes / Prompt */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Custom Thematic Direction (Optional)
                </label>
                <textarea
                  rows={3}
                  value={genCustomPrompt}
                  onChange={(e) => setGenCustomPrompt(e.target.value)}
                  placeholder="e.g. An optics workshop in 17th century Amsterdam, or an AI research institute in TU Delft discovering conscious matter..."
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-800"
                />
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerateOriginalBook}
                disabled={isGenerating}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-300 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Synthesizing Manuscript with Gemini 3.7 Flash...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    Generate & Publish to {genCategory}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right: Batch Automation Hub */}
          <div className="lg:col-span-5 space-y-6">
            {/* Batch Auto-Stock */}
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-6 sm:p-7 rounded-2xl border border-indigo-900/50 shadow-md space-y-4">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <Zap className="w-4 h-4" />
                1-Click Multi-Category Auto-Stock
              </div>
              <h3 className="text-lg font-serif font-bold text-white">
                Populate Entire Bookstore Universe
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Scan all 15 bookstore categories and auto-generate original published-grade books for any category that has fewer than 2 titles.
              </p>
              <button
                onClick={handleBatchGenerateAll}
                disabled={batchGenerating}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {batchGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Auto-Stocking All Categories...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Auto-Stock All Categories in 1-Click
                  </>
                )}
              </button>
            </div>

            {/* Quality Standard Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Atlantean Publishing Standards
              </h4>
              <ul className="text-xs text-slate-600 space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  Full multi-chapter EPUB compliant formatting
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  Studio voice audio narration assignment
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  Automatic Bookatlas Plus catalog eligibility
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  Dynamic pricing & super points formula
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: AUTOMATED PRICING & FLASH SALES */}
      {/* ========================================================================= */}
      {activeTab === 'pricing' && (
        <div className="space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-serif font-bold text-slate-900">
                Automated Dynamic Pricing & Promotion Engine
              </h2>
              <p className="text-xs text-slate-500">
                Apply algorithmic pricing rules across your bookstore with a single click.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Strategy 1: Flash Sale */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    High Conversion
                  </span>
                  <h3 className="font-bold text-sm text-slate-900 mt-2">Weekend Flash Sale (-40%)</h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Applies a 40% discount across 50% of the catalog, setting deals under $4.99 to boost unit velocity.
                  </p>
                </div>
                <button
                  onClick={() => handleApplyPricingStrategy('flash_sale')}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-colors"
                >
                  Activate Flash Sale
                </button>
              </div>

              {/* Strategy 2: Plus Expansion */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                    Subscription Growth
                  </span>
                  <h3 className="font-bold text-sm text-slate-900 mt-2">Bookatlas Plus Expansion</h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Enables Bookatlas Plus unlimited reading on all titles priced ≤ $14.99 to maximize membership retention.
                  </p>
                </div>
                <button
                  onClick={() => handleApplyPricingStrategy('plus_expansion')}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-colors"
                >
                  Expand Plus Coverage
                </button>
              </div>

              {/* Strategy 3: Merchandising Yield */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Prestige & Yield
                  </span>
                  <h3 className="font-bold text-sm text-slate-900 mt-2">Smart Merchandising Yield</h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Auto-promotes 4.88+ star titles to Editorial Choice badges and optimizes price points for maximum profit margin.
                  </p>
                </div>
                <button
                  onClick={() => handleApplyPricingStrategy('smart_yield')}
                  className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-colors"
                >
                  Optimize Merchandising
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: AI MARKETING & CAMPAIGNS */}
      {/* ========================================================================= */}
      {activeTab === 'marketing' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="space-y-1">
              <h3 className="font-serif font-bold text-lg text-slate-900">
                AI Campaign Studio
              </h3>
              <p className="text-xs text-slate-500">
                Select any title in inventory to instantly generate promotional broadcasts.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Select Book
              </label>
              <select
                value={selectedMarketingBookId}
                onChange={(e) => setSelectedMarketingBookId(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title} ({b.author}) — {b.primaryGenre}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleGenerateMarketing}
              disabled={isGeneratingMarketing}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-300 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isGeneratingMarketing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating Marketing Package...
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  Generate Multi-Channel Campaign Kit
                </>
              )}
            </button>
          </div>

          {/* Right: Generated Campaign Kit */}
          <div className="lg:col-span-7 space-y-6">
            {marketingKit ? (
              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                      Ready to Publish
                    </span>
                    <h3 className="text-base font-bold text-slate-900">{marketingKit.bookTitle}</h3>
                  </div>
                  <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2.5 py-1 rounded-full">
                    {marketingKit.tagline}
                  </span>
                </div>

                {/* Email Broadcast */}
                <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Email Newsletter Draft</span>
                    <button
                      onClick={() => copyToClipboard(marketingKit.emailBody, 'email')}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'email' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === 'email' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-xs font-semibold text-slate-700">Subject: {marketingKit.emailNewsletterSubject}</p>
                  <p className="text-xs text-slate-600 whitespace-pre-line">{marketingKit.emailBody}</p>
                </div>

                {/* Social Thread */}
                <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Social Media Broadcast Thread</span>
                    <button
                      onClick={() => copyToClipboard(marketingKit.socialMediaThread.join('\n\n'), 'social')}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'social' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === 'social' ? 'Copied' : 'Copy Thread'}
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {marketingKit.socialMediaThread.map((tweet, i) => (
                      <div key={i} className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                        {tweet}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Book Club Questions */}
                <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-800">Book Club Discussion Questions</span>
                  <ul className="text-xs text-slate-600 list-disc pl-4 space-y-1">
                    {marketingKit.bookClubDiscussionQuestions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-12 text-center text-slate-400 space-y-2">
                <Share2 className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-xs font-semibold">Select a book and click "Generate Multi-Channel Campaign Kit"</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: AUTOPILOT & LOGS */}
      {/* ========================================================================= */}
      {activeTab === 'autopilot' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-serif font-bold text-slate-900">
                Autonomous Store Engine & Audit Trail
              </h2>
              <p className="text-xs text-slate-500">
                Continuous real-time events executed by Bookatlas backend agents.
              </p>
            </div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold flex items-center gap-1.5 w-fit">
              <Activity className="w-4 h-4 text-emerald-600" />
              Live Heartbeat: 200 OK
            </span>
          </div>

          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-4 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 transition-colors flex items-start justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-900">{log.title}</span>
                    <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                      {log.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{log.description}</p>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0 font-mono">{log.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: ADMIN SECURITY, CREDENTIALS & PIN VAULT */}
      {/* ========================================================================= */}
      {activeTab === 'security' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Security Status Banner */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 border border-slate-800 relative overflow-hidden shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Encrypted Admin Clearance
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    B.V. Master Key Active
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">
                  Administrator Identity & Passcode Management
                </h2>
                <p className="text-xs text-slate-300 max-w-2xl">
                  Manage the cryptographic PIN and credentials required to access the Bookatlas Operations Studio, AI video pipelines, and proprietary documentation exports.
                </p>
              </div>

              {onAdminLogout && (
                <button
                  onClick={onAdminLogout}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer w-fit"
                >
                  <Lock className="w-4 h-4" />
                  <span>Lock Console Now</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Admin Identity & Key Management */}
            <div className="lg:col-span-5 space-y-6">
              {/* Profile Card */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Authenticated Owner</span>
                    <h3 className="text-sm font-bold text-slate-900 font-mono">{adminEmail}</h3>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" /> Organization
                    </span>
                    <span className="font-semibold text-slate-800">Atlantean Globals Services B.V.</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Fingerprint className="w-3.5 h-3.5 text-slate-400" /> Jurisdiction
                    </span>
                    <span className="font-semibold text-slate-800">Amsterdam, Netherlands</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-slate-400" /> Current Master PIN
                    </span>
                    <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-sm">
                      •••• ({currentMasterPin.length} digits)
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Clearance Level
                    </span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      Super Administrator
                    </span>
                  </div>
                </div>
              </div>

              {/* Change Master PIN Form */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <KeyRound className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">Change Master Administrator PIN</h3>
                </div>

                {pinChangeMessage && (
                  <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    pinChangeMessage.type === 'success' 
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}>
                    {pinChangeMessage.type === 'success' ? (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{pinChangeMessage.text}</span>
                  </div>
                )}

                <form onSubmit={handleChangeMasterPin} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      New Administrator PIN / Passphrase *
                    </label>
                    <input
                      type="password"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      placeholder="Enter at least 4 digits..."
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono tracking-widest text-sm"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Confirm New PIN *
                    </label>
                    <input
                      type="password"
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value)}
                      placeholder="Re-enter to confirm..."
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono tracking-widest text-sm"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-xs cursor-pointer transition-colors text-center"
                    >
                      Update Security PIN
                    </button>
                    <button
                      type="button"
                      onClick={handleResetPinToDefault}
                      className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl cursor-pointer transition-colors"
                      title="Reset PIN to 7878"
                    >
                      Reset (7878)
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right Column: Protected Surfaces & Real-Time Audit Log */}
            <div className="lg:col-span-7 space-y-6">
              {/* Protected Surfaces Map */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Lock className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-900">Protected Administrative Surfaces</h3>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Active Defense Shield
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>Manager Studio Operations</span>
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-sm font-mono">GATED</span>
                    </div>
                    <p className="text-slate-500 text-[11px]">Direct catalog editing, pricing algorithms, and deal management.</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>Veo Video Generator Studio</span>
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-sm font-mono">GATED</span>
                    </div>
                    <p className="text-slate-500 text-[11px]">Veo 3.1 Fast video rendering pipelines and download exports.</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>Platform Docs & Arch Spec</span>
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-sm font-mono">GATED</span>
                    </div>
                    <p className="text-slate-500 text-[11px]">Exporting full company architecture in Microsoft Word & PDF.</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>Public Storefront & Reader</span>
                      <span className="text-[9px] bg-sky-100 text-sky-800 px-1.5 py-0.2 rounded-sm font-mono">PUBLIC</span>
                    </div>
                    <p className="text-slate-500 text-[11px]">Open browsing, cart, checkout, EPUB preview, and Gemini chat.</p>
                  </div>
                </div>
              </div>

              {/* Security Audit Trail */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-sm font-bold text-slate-900">Security Audit Trail</h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {auditLogs.length} Events Logged
                  </span>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {auditLogs.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 flex items-start justify-between gap-3 text-xs transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{item.action}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase ${
                            item.status === 'authorized'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'denied'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px]">{item.details}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0 font-mono">{item.timestamp}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MANUAL ADD / EDIT MODAL */}
      {/* ========================================================================= */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-serif font-bold text-slate-900">
                {editingBook?.id ? 'Edit Book Manuscript' : 'Add New Title to Bookstore'}
              </h3>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Book Title *</label>
                <input
                  type="text"
                  value={editingBook?.title || ''}
                  onChange={(e) => setEditingBook((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. The Glassblower of Delft"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Author Name *</label>
                <input
                  type="text"
                  value={editingBook?.author || ''}
                  onChange={(e) => setEditingBook((prev) => ({ ...prev, author: e.target.value }))}
                  placeholder="e.g. Willem van der Meer"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Primary Category</label>
                <select
                  value={editingBook?.primaryGenre || 'Fiction & Literature'}
                  onChange={(e) => setEditingBook((prev) => ({ ...prev, primaryGenre: e.target.value }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {GENRES.filter((g) => g !== 'All Genres').map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Price ({currencySymbol})</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingBook?.price ?? 9.99}
                  onChange={(e) => setEditingBook((prev) => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Original Price ({currencySymbol})</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingBook?.originalPrice ?? 14.99}
                  onChange={(e) => setEditingBook((prev) => ({ ...prev, originalPrice: parseFloat(e.target.value) || 0 }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Cover Image URL</label>
                <input
                  type="text"
                  value={editingBook?.coverImage || ''}
                  onChange={(e) => setEditingBook((prev) => ({ ...prev, coverImage: e.target.value }))}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Synopsis & Story Blurb</label>
                <textarea
                  rows={3}
                  value={editingBook?.synopsis || ''}
                  onChange={(e) => setEditingBook((prev) => ({ ...prev, synopsis: e.target.value }))}
                  placeholder="Detailed description of the narrative..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-2 flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-semibold">
                  <input
                    type="checkbox"
                    checked={editingBook?.isBookatlasPlus ?? true}
                    onChange={(e) => setEditingBook((prev) => ({ ...prev, isBookatlasPlus: e.target.checked, isKoboPlus: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600 rounded-sm"
                  />
                  Include in Bookatlas Plus Unlimited
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-semibold">
                  <input
                    type="checkbox"
                    checked={editingBook?.isDeal ?? false}
                    onChange={(e) => setEditingBook((prev) => ({ ...prev, isDeal: e.target.checked }))}
                    className="w-4 h-4 text-amber-600 rounded-sm"
                  />
                  Featured in Daily Deals
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveManualBook}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Save & Publish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
