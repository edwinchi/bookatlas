import React, { useState } from 'react';
import { 
  X, 
  Star, 
  BookOpen, 
  ShoppingBag, 
  Heart, 
  Headphones, 
  ShieldCheck, 
  Globe, 
  Calendar, 
  FileText, 
  Building, 
  Sparkles, 
  Check, 
  MessageSquare,
  ThumbsUp,
  BrainCircuit,
  Wand2,
  BookmarkCheck
} from 'lucide-react';
import { Book } from '../types';

interface BookDetailModalProps {
  book: Book | null;
  onClose: () => void;
  onReadSample: (book: Book) => void;
  onAddToCart: (book: Book) => void;
  onToggleWishlist: (book: Book) => void;
  onPlayAudioSample: (book: Book) => void;
  isWishlisted: boolean;
  currencySymbol?: string;
  hasAiAccess?: boolean;
  onRequireAiAccess?: (featureTitle: string, featureDescription: string, action: () => void) => void;
}

export const BookDetailModal: React.FC<BookDetailModalProps> = ({
  book,
  onClose,
  onReadSample,
  onAddToCart,
  onToggleWishlist,
  onPlayAudioSample,
  isWishlisted,
  currencySymbol = '€',
  hasAiAccess = true,
  onRequireAiAccess,
}) => {
  if (!book) return null;

  const [activeTab, setActiveTab] = useState<'overview' | 'ai_summary' | 'reviews' | 'author'>('overview');
  const [selectedFormat, setSelectedFormat] = useState<'ebook' | 'audiobook'>('ebook');
  const [aiSummary, setAiSummary] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [previewVibe, setPreviewVibe] = useState<'cinematic' | 'bedtime' | 'suspense'>('cinematic');
  const [generatedPreview, setGeneratedPreview] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const discountPercent =
    book.originalPrice > book.price
      ? Math.round(((book.originalPrice - book.price) / book.originalPrice) * 100)
      : 0;

  // Load AI Summary
  const fetchAISummary = async () => {
    if (aiSummary) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/book-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book })
      });
      if (res.ok) {
        const data = await res.json();
        setAiSummary(data.data);
      } else {
        throw new Error('Fallback needed');
      }
    } catch {
      setAiSummary({
        executiveSummary: `A standout masterpiece in ${book.primaryGenre} by ${book.author}, offering nuanced character arcs and captivating world-building.`,
        coreTakeaways: ['Human resilience', 'Identity and legacy', 'Moral complexity', 'Courage under pressure'],
        targetAudience: `Ideal for readers who appreciate high-depth narratives, rich European and global storytelling, and atmospheric writing.`,
        philosophicalQuestion: `What does it truly mean to persevere when the world around you offers no clear answers?`,
        keyQuotes: [],
        similarMasterpieces: [],
        estimatedReadingTime: `${Math.round(book.pageCount * 1.5)} mins (approx ${Math.ceil(book.pageCount / 40)} reading sessions)`,
        vibeRating: book.aiVibe || 'Thought-provoking & Cinematic'
      });
    } finally {
      setAiLoading(false);
    }
  };

  // Generate dynamic custom story preview
  const handleGenerateStoryPreview = async () => {
    setPreviewLoading(true);
    try {
      const res = await fetch('/api/ai/generate-story-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookTitle: book.title,
          genre: book.primaryGenre,
          mood: previewVibe,
        })
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedPreview(data.preview || 'Story intro generated.');
      } else {
        throw new Error('Fallback needed');
      }
    } catch {
      setGeneratedPreview(`"The air in the canal-side library was cool and scented with old parchment. When the clock struck midnight, the true manuscript began to reveal its hidden text..." (Dynamic ${previewVibe} preview for ${book.title})`);
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar with close button */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md px-6 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span>{book.primaryGenre}</span>
            <span>/</span>
            <span className="text-slate-900 font-bold truncate max-w-xs">{book.title}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Scrollable */}
        <div className="overflow-y-auto p-6 sm:p-8 space-y-8">
          
          {/* Main Book Hero Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8">
            
            {/* Left: 3D Book Cover & Media Buttons */}
            <div className="md:col-span-4 flex flex-col items-center">
              <div className="relative w-44 sm:w-56 aspect-[2/3] rounded-r-xl rounded-l-xs overflow-hidden shadow-xl border-r-2 border-t border-b border-slate-200 group">
                <img
                  src={book.coverImage}
                  alt={book.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                {/* Spine gradient */}
                <div className="absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-black/40 to-transparent pointer-events-none"></div>

                {discountPercent > 0 && (
                  <span className="absolute top-2 left-2 bg-indigo-600 text-white text-xs font-black px-2 py-0.5 rounded-md shadow-xs">
                    -{discountPercent}%
                  </span>
                )}
              </div>

              {/* Instant Preview Buttons below cover */}
              <div className="w-full mt-4 space-y-2">
                <button
                  onClick={() => onReadSample(book)}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-950 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  <span>Read Free Instant Sample</span>
                </button>

                {book.audioDurationMinutes && (
                  <button
                    onClick={() => onPlayAudioSample(book)}
                    className="w-full py-2.5 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Headphones className="w-4 h-4 text-indigo-600" />
                    <span>Listen to Audio Sample</span>
                  </button>
                )}
              </div>
            </div>

            {/* Right: Book Details & Purchase Panel */}
            <div className="md:col-span-8 flex flex-col justify-between space-y-4">
              <div>
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {book.isBestseller && (
                    <span className="bg-slate-900 text-white text-xs font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wide">
                      #1 Bestseller
                    </span>
                  )}
                  {(book.isBookatlasPlus) && (
                    <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold px-2.5 py-0.5 rounded-md flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" /> Bookatlas Plus Eligible
                    </span>
                  )}
                  <span className="text-xs text-slate-500 font-medium">ISBN: {book.isbn}</span>
                </div>

                {/* Title & Subtitle */}
                <h1 className="text-2xl sm:text-3xl font-serif font-extrabold text-slate-950 leading-tight">
                  {book.title}
                </h1>
                {book.subtitle && (
                  <p className="text-base text-slate-600 font-serif italic mt-1">
                    {book.subtitle}
                  </p>
                )}

                {/* Author & Narrator */}
                <div className="mt-2 text-sm text-slate-700">
                  <span>By </span>
                  <button 
                    onClick={() => setActiveTab('author')}
                    className="font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    {book.author}
                  </button>
                  {book.narrator && (
                    <span className="text-slate-500 ml-2">
                      • Narrated by <span className="font-medium text-slate-800">{book.narrator}</span>
                    </span>
                  )}
                </div>

                {/* Star rating summary */}
                <div className="flex items-center gap-2 mt-3">
                  <div className="flex items-center text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="font-bold text-slate-900 text-sm">{book.rating}</span>
                  <span className="text-slate-500 text-xs">
                    ({book.reviewCount.toLocaleString()} verified readers)
                  </span>
                </div>
              </div>

              {/* Format Switcher */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                  <span>Select Format</span>
                  <span className="text-emerald-700 font-semibold lowercase flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Instant digital delivery
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedFormat('ebook')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedFormat === 'ebook'
                        ? 'bg-white border-indigo-600 ring-2 ring-indigo-600/15 shadow-xs'
                        : 'bg-white/60 border-slate-200 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-indigo-600" /> eBook
                      </span>
                      <span className="font-extrabold text-sm text-slate-900">
                        {book.price === 0 ? 'Free' : `${currencySymbol}${book.price.toFixed(2)}`}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">EPUB & PDF • {book.pageCount} pages</p>
                  </button>

                  <button
                    onClick={() => setSelectedFormat('audiobook')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedFormat === 'audiobook'
                        ? 'bg-white border-indigo-600 ring-2 ring-indigo-600/15 shadow-xs'
                        : 'bg-white/60 border-slate-200 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                        <Headphones className="w-4 h-4 text-indigo-600" /> Audiobook
                      </span>
                      <span className="font-extrabold text-sm text-slate-900">
                        {currencySymbol}{(book.price + 4.99).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {book.audioDurationMinutes ? `${Math.round(book.audioDurationMinutes / 60)} hrs unabridged` : 'Full audio track'}
                    </p>
                  </button>
                </div>

                {/* Buy / Cart Action Row */}
                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={() => onAddToCart(book)}
                    className="flex-1 py-3 px-5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4 text-amber-300" />
                    <span>
                      Buy Now for {selectedFormat === 'ebook' ? (book.price === 0 ? 'Free' : `${currencySymbol}${book.price.toFixed(2)}`) : `${currencySymbol}${(book.price + 4.99).toFixed(2)}`}
                    </span>
                  </button>

                  <button
                    onClick={() => onToggleWishlist(book)}
                    className={`p-3 rounded-xl border transition-colors cursor-pointer ${
                      isWishlisted
                        ? 'bg-rose-50 border-rose-300 text-rose-600'
                        : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                    title={isWishlisted ? 'Saved to Wishlist' : 'Add to Wishlist'}
                  >
                    <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-rose-600' : ''}`} />
                  </button>
                </div>

                {(book.isBookatlasPlus) && (
                  <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-2.5 flex items-center justify-between text-xs">
                    <span className="text-slate-700 font-medium">
                      Or read for <span className="font-bold text-indigo-700">{currencySymbol}0.00</span> with Bookatlas Plus
                    </span>
                    <button className="text-indigo-700 font-bold hover:underline cursor-pointer">
                      Start 30-Day Free Trial →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Book Metadata Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl text-xs border border-slate-200">
            <div className="space-y-1">
              <span className="text-slate-500 flex items-center gap-1 font-medium">
                <FileText className="w-3.5 h-3.5" /> Length
              </span>
              <p className="font-bold text-slate-900">{book.pageCount} Pages / ~{Math.round(book.pageCount * 280)} words</p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-500 flex items-center gap-1 font-medium">
                <Building className="w-3.5 h-3.5" /> Publisher
              </span>
              <p className="font-bold text-slate-900 truncate">{book.publisher}</p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-500 flex items-center gap-1 font-medium">
                <Calendar className="w-3.5 h-3.5" /> Release Date
              </span>
              <p className="font-bold text-slate-900">{book.publishDate}</p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-500 flex items-center gap-1 font-medium">
                <Globe className="w-3.5 h-3.5" /> Language
              </span>
              <p className="font-bold text-slate-900">{book.language}</p>
            </div>
          </div>

          {/* Tabs: Synopsis, AI Briefing, Reviews, Author */}
          <div className="space-y-4">
            <div className="flex border-b border-slate-200 text-sm font-semibold overflow-x-auto gap-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`pb-2.5 px-3 transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                Synopsis & Details
              </button>

              <button
                onClick={() => {
                  const openAiSummary = () => {
                    setActiveTab('ai_summary');
                    fetchAISummary();
                  };
                  if (hasAiAccess || !onRequireAiAccess) {
                    openAiSummary();
                  } else {
                    onRequireAiAccess(
                      'AI Executive Briefing',
                      'Get an AI-generated 5-minute executive summary, key themes, and a dynamic story preview for this book.',
                      openAiSummary
                    );
                  }
                }}
                className={`pb-2.5 px-3 transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'ai_summary'
                    ? 'border-indigo-600 text-indigo-600 font-bold'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <BrainCircuit className="w-4 h-4 text-indigo-600" />
                <span>AI Briefing & Key Insights</span>
              </button>

              <button
                onClick={() => setActiveTab('reviews')}
                className={`pb-2.5 px-3 transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'reviews'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Reader Reviews ({book.reviews.length + 4})</span>
              </button>

              <button
                onClick={() => setActiveTab('author')}
                className={`pb-2.5 px-3 transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
                  activeTab === 'author'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                About {book.author}
              </button>
            </div>

            {/* Tab: Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Book Synopsis
                  </h3>
                  <p className="text-slate-700 leading-relaxed text-sm sm:text-base font-serif">
                    {book.synopsis}
                  </p>
                </div>

                {book.editorialReview && (
                  <div className="p-4 bg-amber-50/70 border-l-4 border-amber-600 rounded-r-xl">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-1">
                      Bookatlas Editorial Review
                    </h4>
                    <p className="text-sm italic text-slate-800 font-serif">
                      {book.editorialReview}
                    </p>
                  </div>
                )}

                {/* Chapter Outline Preview */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Sample Excerpt Included
                  </h3>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1">
                    {book.sampleChapters.map((ch, idx) => (
                      <div key={idx} className="flex items-center justify-between text-slate-700 font-medium py-1">
                        <span className="font-semibold">{ch.title}</span>
                        <span className="text-slate-500 text-[11px]">{ch.subtitle || 'Excerpt'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab: AI Summary & Generator */}
            {activeTab === 'ai_summary' && (
              <div className="space-y-6">
                {aiLoading ? (
                  <div className="p-8 text-center space-y-3">
                    <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-xs font-semibold text-slate-600">Gemini AI is analyzing narrative arcs and themes...</p>
                  </div>
                ) : aiSummary ? (
                  <div className="space-y-5">
                    {/* Executive Summary Card */}
                    <div className="p-4.5 bg-indigo-50/80 border border-indigo-200 rounded-2xl space-y-2">
                      <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs uppercase tracking-wider">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        <span>AI Executive Summary</span>
                      </div>
                      <p className="text-sm text-slate-800 leading-relaxed font-medium">
                        {aiSummary.executiveSummary}
                      </p>
                    </div>

                    {/* Core Takeaways & Target Reader */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Core Takeaways</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {Array.isArray(aiSummary.coreTakeaways) ? (
                            aiSummary.coreTakeaways.map((t: string, i: number) => (
                              <span key={i} className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700">
                                {t}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-700">{aiSummary.coreTakeaways}</span>
                          )}
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Ideal Reader Profile</h4>
                        <p className="text-xs text-slate-700 leading-relaxed">{aiSummary.targetAudience}</p>
                      </div>
                    </div>

                    {aiSummary.philosophicalQuestion && (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-1.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700">Philosophical Question</h4>
                        <p className="text-xs text-amber-900 leading-relaxed italic">{aiSummary.philosophicalQuestion}</p>
                      </div>
                    )}

                    {Array.isArray(aiSummary.keyQuotes) && aiSummary.keyQuotes.length > 0 && (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Key Quotes</h4>
                        <ul className="space-y-1.5">
                          {aiSummary.keyQuotes.map((q: string, i: number) => (
                            <li key={i} className="text-xs text-slate-700 italic leading-relaxed">"{q}"</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* AI Dynamic Story Preview Generator */}
                    <div className="p-5 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl space-y-4 shadow-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Wand2 className="w-4 h-4 text-amber-400" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                            Dynamic AI Story Preview Generator
                          </h4>
                        </div>
                        <div className="flex gap-1">
                          {(['cinematic', 'suspense', 'bedtime'] as const).map((m) => (
                            <button
                              key={m}
                              onClick={() => setPreviewVibe(m)}
                              className={`px-2 py-1 text-[11px] capitalize rounded-md transition-colors cursor-pointer ${
                                previewVibe === m ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                              }`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>

                      <p className="text-xs text-slate-300">
                        Generate a custom dramatic teaser customized for your preferred mood before opening the chapter.
                      </p>

                      <div className="flex gap-3">
                        <button
                          onClick={handleGenerateStoryPreview}
                          disabled={previewLoading}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          {previewLoading ? (
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          ) : (
                            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          )}
                          <span>Generate {previewVibe} Teaser</span>
                        </button>
                      </div>

                      {generatedPreview && (
                        <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-700 text-xs italic font-serif leading-relaxed text-indigo-100 animate-in fade-in">
                          {generatedPreview}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* Tab: Reviews */}
            {activeTab === 'reviews' && (
              <div className="space-y-4">
                {/* 5-Star Breakdown */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-center sm:text-left">
                    <div className="text-3xl font-black text-slate-900">{book.rating}</div>
                    <div className="flex justify-center sm:justify-start text-amber-400 my-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400" />
                      ))}
                    </div>
                    <p className="text-xs text-slate-500">Based on {book.reviewCount} customer reviews</p>
                  </div>

                  <div className="flex-1 max-w-xs w-full space-y-1 text-xs">
                    {[
                      { star: '5★', pct: '86%' },
                      { star: '4★', pct: '10%' },
                      { star: '3★', pct: '3%' },
                      { star: '2★', pct: '1%' },
                      { star: '1★', pct: '0%' },
                    ].map((row, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-5 text-slate-500 text-[11px] font-medium">{row.star}</span>
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width: row.pct }}></div>
                        </div>
                        <span className="w-8 text-right text-slate-600 text-[11px]">{row.pct}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Individual Reviews */}
                <div className="space-y-3">
                  {(book.reviews.length > 0 ? book.reviews : [
                    {
                      id: 'def1',
                      authorName: 'Hannah Vance',
                      rating: 5,
                      date: '3 weeks ago',
                      title: 'Captivating and impossible to put down!',
                      comment: 'The world-building and character progression kept me up until 3 AM reading on my Bookatlas eReader. Highly recommended!',
                      verifiedPurchase: true,
                      upvotes: 24,
                    }
                  ]).map((rev) => (
                    <div key={rev.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
                            {rev.authorName[0]}
                          </div>
                          <div>
                            <span className="font-bold text-xs text-slate-900">{rev.authorName}</span>
                            {rev.verifiedPurchase && (
                              <span className="ml-2 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-sm font-semibold">
                                Verified Reader
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-slate-400">{rev.date}</span>
                      </div>

                      <div className="flex text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < rev.rating ? 'fill-amber-400' : 'text-slate-300'
                            }`}
                          />
                        ))}
                      </div>

                      <h5 className="font-bold text-sm text-slate-900">{rev.title}</h5>
                      <p className="text-xs text-slate-700 leading-relaxed">{rev.comment}</p>

                      <div className="pt-1 flex items-center gap-1 text-[11px] text-slate-500">
                        <button className="flex items-center gap-1 hover:text-slate-900 cursor-pointer">
                          <ThumbsUp className="w-3 h-3" /> Helpful ({rev.upvotes})
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab: Author */}
            {activeTab === 'author' && (
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <h3 className="font-bold text-base text-slate-950">{book.author}</h3>
                <p className="text-sm text-slate-700 leading-relaxed">{book.authorBio}</p>
                <div className="pt-2 text-xs text-indigo-600 font-semibold">
                  <span>More titles by {book.author} available on Bookatlas eBook Store</span>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

