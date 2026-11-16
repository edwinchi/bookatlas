import { authorPath } from './AuthorProfileModal';
import { ReviewsPanel, Stars } from './ebook/ReviewsPanel';
import { coverProps } from '../utils/coverImage';
import React, { useEffect, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import * as RadioGroup from '@radix-ui/react-radio-group';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import { AppModal } from './ui/app-modal';
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
  BookmarkCheck,
  ExternalLink,
  Lock,
  PlayCircle,
} from 'lucide-react';
import { Book } from '../types';
import { ReaderPublicationAccess } from './publishing/ReaderPublicationAccess';
import { useAccount } from '../auth/AuthContext';
import { audioOnSale, audioProductOf, isNarrated } from '../audioEdition';
import { NaturalVoiceInfo } from './ebook/NaturalVoiceInfo';

interface BookDetailModalProps {
  book: Book | null;
  onClose: () => void;
  onReadSample: (book: Book) => void;
  /** Bought by this account (TASK-0004): the whole book opens in the reader. */
  owned?: boolean;
  /** Bought the natural audiobook add-on (cycle 9). */
  ownsAudio?: boolean;
  onAddToCart: (book: Book) => void;
  onToggleWishlist: (book: Book) => void;
  onPlayAudioSample: (book: Book) => void;
  isWishlisted: boolean;
  currencySymbol?: string;
  hasAiAccess?: boolean;
  onRequireAiAccess?: (featureTitle: string, featureDescription: string, action: () => void) => void;
}

export const BookDetailModal: React.FC<BookDetailModalProps> = (props) => {
  if (!props.book) return null;
  return <BookDetailContent {...props} book={props.book} />;
};

const BookDetailContent: React.FC<BookDetailModalProps & { book: Book }> = ({
  book,
  onClose,
  onReadSample,
  owned = false,
  ownsAudio = false,
  onAddToCart,
  onToggleWishlist,
  onPlayAudioSample,
  isWishlisted,
  currencySymbol = '€',
  hasAiAccess = true,
  onRequireAiAccess,
}) => {
  const publicationId = (book as Book & { publicationId?: string }).publicationId;
  const isGenerated = !!publicationId;
  // Prepared eBooks (TASK-0003): everyone gets the preview; free books open in full for signed-in readers. No ratings until real readers leave them.
  const prepared = !!book.hasReaderContent;
  // Only real reviews (TASK-0009): demo titles and books without reviews show no rating at all.
  const unrated = isGenerated || !prepared || !book.reviewCount;
  const readsFree = prepared && book.price === 0;
  const opensInFull = prepared && (readsFree || owned);
  // Cycle 9: a narrated book is sold with its natural audiobook included, or with the audiobook as an add-on.
  const narrated = isNarrated(book);
  const audioAddOn = audioOnSale(book);
  const audioPrice = book.audioPrice ?? 0;
  const audioHours = book.audioDurationMinutes ? (book.audioDurationMinutes >= 90 ? `${Math.round(book.audioDurationMinutes / 6) / 10} hours` : `${book.audioDurationMinutes} min`) : '';
  const money = (n: number) => (n === 0 ? 'Free' : `${currencySymbol}${n.toFixed(2)}`);
  const { account, requireSignIn } = useAccount();
  const openFullBook = () => { if (account) onReadSample(book); else requireSignIn('reading the full book'); };

  const [activeTab, setActiveTab] = useState<'overview' | 'ai_summary' | 'reviews' | 'author'>('overview');
  /** The book's real chapter titles (prepared books), for "Sample excerpt included". */
  const [outline, setOutline] = useState<{ title: string; subtitle: string | null; preview: boolean }[] | null>(null);
  useEffect(() => {
    if (!book.hasReaderContent) return;
    let cancelled = false;
    fetch(`/api/book-outline/${encodeURIComponent(book.id)}`).then((r) => (r.ok ? r.json() : null))
      .then((r) => { if (!cancelled && r?.chapters) setOutline(r.chapters); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [book.id, book.hasReaderContent]);
  const [selectedFormat, setSelectedFormat] = useState<'ebook' | 'audiobook'>('ebook');
  /** What "Buy" adds when the audiobook is chosen: the add-on, plus the eBook unless it is owned or free. */
  const buysAudio = narrated && audioAddOn && !ownsAudio && selectedFormat === 'audiobook';
  const buyAudio = () => { if (!owned && !readsFree) onAddToCart(book); onAddToCart(audioProductOf(book)); };
  const audioTotal = (owned || readsFree ? 0 : book.price) + audioPrice;
  const [aiSummary, setAiSummary] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
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
    setAiError('');
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
        throw new Error(res.status === 401 ? 'Sign in to get the AI briefing.' : 'The AI briefing could not be made right now.');
      }
    } catch (e) {
      // Never invented text presented as AI analysis: say it failed and offer a retry.
      setAiError(e instanceof Error && e.message.startsWith('Sign in') ? e.message : 'The AI briefing could not be made right now. Please try again in a moment.');
    } finally {
      setAiLoading(false);
    }
  };

  const changeTab = (value: string) => {
    const tab = value as typeof activeTab;
    if (tab !== 'ai_summary') { setActiveTab(tab); return; }
    const openAiSummary = () => { setActiveTab('ai_summary'); void fetchAISummary(); };
    // Visitors stay on the book: the tab explains and offers sign-in (back to this book).
    if (!account) { setActiveTab('ai_summary'); return; }
    if (hasAiAccess || !onRequireAiAccess) openAiSummary();
    else onRequireAiAccess('AI Executive Briefing', 'Get an AI-generated 5-minute executive summary, key themes, and a dynamic story preview for this book.', openAiSummary);
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
    <AppModal onClose={onClose} label={book.title} overlayClassName="z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
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
                  {...coverProps(book.coverImage, 380)}
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
                  <span>{opensInFull && account ? 'Open the Book' : prepared ? 'Read & Listen to the Free Preview' : 'Read Free Instant Sample'}</span>
                </button>

                {/* Owner request 2026-11-16: every book has a real audio sample, for everyone. */}
                {(
                  <button
                    onClick={() => (narrated ? onReadSample(book) : onPlayAudioSample(book))}
                    className="w-full py-2.5 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Headphones className="w-4 h-4 text-indigo-600" />
                    <span>{narrated ? (ownsAudio || (opensInFull && !audioAddOn) ? 'Listen to the audiobook' : 'Listen to the narrated preview') : 'Listen to Audio Sample'}</span>
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
                      <Sparkles className="w-3 h-3 text-amber-500" /> BooksAtlas Plus Eligible
                    </span>
                  )}
                  {book.isSample && (
                    <span className="bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wide">Sample title · not for sale</span>
                  )}
                  {book.availability === 'listed' && (
                    <span className="bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wide">Coming soon to BooksAtlas</span>
                  )}
                  {prepared && book.isNewRelease && (
                    <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wide">New release</span>
                  )}
                  {isGenerated ? (
                    <span className="text-xs text-violet-800 bg-violet-50 border border-violet-200 font-bold px-2 py-0.5 rounded-md">AI-assisted short edition</span>
                  ) : book.isbn ? (
                    <span className="text-xs text-slate-500 font-medium">ISBN: {book.isbn}</span>
                  ) : null}
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
                  {prepared ? (
                    // Real books link to the author's page (TASK-0009); sample authors are fictional.
                    <a href={authorPath(book.author)} className="font-bold text-indigo-600 hover:underline">{book.author}</a>
                  ) : (
                    <button onClick={() => setActiveTab('author')} className="font-bold text-indigo-600 hover:underline cursor-pointer">{book.author}</button>
                  )}
                  {book.narrator && (
                    <span className="text-slate-500 ml-2">
                      • Narrated by <span className="font-medium text-slate-800">{book.narrator}</span>
                    </span>
                  )}
                </div>

                {/* Star rating summary: real reviews only */}
                {unrated ? (
                  <p className="mt-3 text-xs text-slate-500">{isGenerated ? 'Generated from an uploaded source and reviewed by a BooksAtlas editor. No reader ratings yet.' : prepared ? 'New on BooksAtlas. No reader ratings yet.' : 'Sample title on BooksAtlas: shown as an example, without reader ratings.'}</p>
                ) : (
                  <button type="button" onClick={() => setActiveTab('reviews')} className="mt-3 flex items-center gap-2 cursor-pointer">
                    <Stars value={book.rating} />
                    <span className="text-sm font-bold text-slate-900">{book.rating.toFixed(1)}</span>
                    <span className="text-xs text-slate-500 underline-offset-2 hover:underline">({book.reviewCount.toLocaleString()} reader review{book.reviewCount === 1 ? '' : 's'})</span>
                  </button>
                )}
                {isGenerated && publicationId && (
                  <div className="mt-4">
                    <ReaderPublicationAccess publicationId={publicationId} />
                  </div>
                )}
              </div>

              {/* Format Switcher */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                  <span>Select Format</span>
                  <span className="text-emerald-700 font-semibold lowercase flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Instant digital delivery
                  </span>
                </div>

                <RadioGroup.Root value={selectedFormat} onValueChange={(v) => setSelectedFormat(v as 'ebook' | 'audiobook')} aria-label="Format" className="grid grid-cols-2 gap-2">
                  <RadioGroup.Item value="ebook" className="group relative p-3 rounded-xl border text-left transition-all cursor-pointer bg-white/60 border-slate-200 hover:bg-white hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 data-[state=checked]:bg-white data-[state=checked]:border-indigo-600 data-[state=checked]:ring-2 data-[state=checked]:ring-indigo-600/15 data-[state=checked]:shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-indigo-600" /> eBook
                      </span>
                      <span className="font-extrabold text-sm text-slate-900">
                        {book.price === 0 ? 'Free' : `${currencySymbol}${book.price.toFixed(2)}`}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">{isGenerated ? 'EPUB, reader sign-in required' : prepared ? <>EPUB • about {book.pageCount} pages{readsFree ? ' • free with a BooksAtlas account' : ''}</> : <>EPUB & PDF • {book.pageCount} pages</>}</p>
                  </RadioGroup.Item>

                  {prepared && !narrated ? (
                    // Not narrated yet: no audiobook to sell, but a real sample of the book, read aloud.
                    <button type="button" onClick={() => onPlayAudioSample(book)}
                      className="group p-3 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 text-left transition-all hover:border-indigo-400 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                          <Headphones className="w-4 h-4 text-indigo-600" /> Audiobook
                        </span>
                        <PlayCircle className="w-5 h-5 text-indigo-600 transition-transform group-hover:scale-110" aria-hidden />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">Free audio sample • full audiobook not narrated yet</p>
                    </button>
                  ) : (
                    <RadioGroup.Item value="audiobook" className="group relative p-3 rounded-xl border text-left transition-all cursor-pointer bg-white/60 border-slate-200 hover:bg-white hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 data-[state=checked]:bg-white data-[state=checked]:border-indigo-600 data-[state=checked]:ring-2 data-[state=checked]:ring-indigo-600/15 data-[state=checked]:shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                        <Headphones className="w-4 h-4 text-indigo-600" /> Audiobook
                      </span>
                      <span className="font-extrabold text-sm text-slate-900">
                        {narrated ? (ownsAudio ? 'Owned' : audioAddOn ? `+${money(audioPrice)}` : 'Included') : `${currencySymbol}${(book.price + 4.99).toFixed(2)}`}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {narrated ? `Natural voice${book.narrator ? ` (${book.narrator.replace(/ \(BooksAtlas natural voice\)$/, '')})` : ''}${audioHours ? ` • ${audioHours}` : ''} • ${audioAddOn ? 'add-on to the eBook' : 'included with the eBook'}` : isGenerated ? 'Chapter narration, reader sign-in required' : book.audioDurationMinutes ? `${Math.round(book.audioDurationMinutes / 60)} hrs unabridged` : 'Full audio track'}
                    </p>
                    </RadioGroup.Item>
                  )}
                </RadioGroup.Root>
                {narrated && audioAddOn && !ownsAudio && (
                  <p className="-mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
                    <span>The audiobook keeps playing with your screen off; reading along with your device’s voice stays free.</span>
                    <NaturalVoiceInfo />
                  </p>
                )}

                {/* The printed book, sold by Amazon or Lulu */}
                {(book.printLinks?.amazon || book.printLinks?.lulu) && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Also in print</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {book.printLinks.amazon && (
                        <a href={book.printLinks.amazon} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-2xs transition hover:border-amber-400 hover:bg-amber-50">
                          Paperback on Amazon <ExternalLink className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                        </a>
                      )}
                      {book.printLinks.lulu && (
                        <a href={book.printLinks.lulu} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-2xs transition hover:border-indigo-400 hover:bg-indigo-50">
                          Print edition on Lulu <ExternalLink className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Buy / Cart Action Row */}
                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={() => (buysAudio ? buyAudio() : opensInFull ? openFullBook() : onAddToCart(book))}
                    className="flex-1 py-3 px-5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4 text-amber-300" />
                    <span>
                      {buysAudio ? (owned || readsFree ? <>Add the Audiobook for {money(audioPrice)}</> : <>Buy eBook + Audiobook for {money(audioTotal)}</>) : owned ? 'Read the Full Book' : readsFree ? (account ? 'Read the Full Book Free' : 'Sign In to Read Free') : <>Buy Now for {selectedFormat === 'ebook' ? (book.price === 0 ? 'Free' : `${currencySymbol}${book.price.toFixed(2)}`) : `${currencySymbol}${(book.price + 4.99).toFixed(2)}`}</>}
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
                      Or read for <span className="font-bold text-indigo-700">{currencySymbol}0.00</span> with BooksAtlas Plus
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
          <Tabs.Root value={activeTab} onValueChange={changeTab} className="space-y-4">
            <Tabs.List aria-label="About this book" className="flex border-b border-slate-200 text-sm font-semibold overflow-x-auto gap-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <Tabs.Trigger value="overview" className="pb-2.5 px-3 -mb-px transition-colors cursor-pointer border-b-2 border-transparent flex items-center gap-1.5 whitespace-nowrap text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-t-md data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 data-[state=active]:font-bold">Synopsis & Details</Tabs.Trigger>
              <Tabs.Trigger value="ai_summary" className="pb-2.5 px-3 -mb-px transition-colors cursor-pointer border-b-2 border-transparent flex items-center gap-1.5 whitespace-nowrap text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-t-md data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 data-[state=active]:font-bold">
                <BrainCircuit className="w-4 h-4 text-indigo-600" />
                <span>AI Briefing & Key Insights</span>
              </Tabs.Trigger>
              <Tabs.Trigger value="reviews" className="pb-2.5 px-3 -mb-px transition-colors cursor-pointer border-b-2 border-transparent flex items-center gap-1.5 whitespace-nowrap text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-t-md data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 data-[state=active]:font-bold">
                <MessageSquare className="w-4 h-4" />
                <span>Reader Reviews{prepared && book.reviewCount ? ` (${book.reviewCount})` : ''}</span>
              </Tabs.Trigger>
              <Tabs.Trigger value="author" className="pb-2.5 px-3 -mb-px transition-colors cursor-pointer border-b-2 border-transparent flex items-center gap-1.5 whitespace-nowrap text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-t-md data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 data-[state=active]:font-bold">About {book.author}</Tabs.Trigger>
            </Tabs.List>

            {/* Tab: Overview */}
            <Tabs.Content value="overview" className="focus-visible:outline-none">
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
                      BooksAtlas Editorial Review
                    </h4>
                    <p className="text-sm italic text-slate-800 font-serif">
                      {book.editorialReview}
                    </p>
                  </div>
                )}

                {/* Chapter outline: the sample title's sample chapters, or a published book's real chapters */}
                {(outline?.length || book.sampleChapters?.length) ? (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {outline?.length ? 'Inside this book' : 'Sample Excerpt Included'}
                    </h3>
                    <ScrollArea.Root type="auto" className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                      <ScrollArea.Viewport className="max-h-64 w-full">
                        <ul className="divide-y divide-slate-200/70 p-1.5 text-xs">
                          {(outline ?? book.sampleChapters.map((c) => ({ title: c.title, subtitle: c.subtitle ?? null, preview: true }))).map((ch, idx) => (
                            <li key={idx} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-slate-700 transition-colors hover:bg-white">
                              <span className="min-w-0 truncate font-semibold">{ch.title}</span>
                              {outline ? (
                                ch.preview
                                  ? <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">Free preview</span>
                                  : <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-label="In the full book" />
                              ) : <span className="shrink-0 text-[11px] text-slate-500">{ch.subtitle || 'Excerpt'}</span>}
                            </li>
                          ))}
                        </ul>
                      </ScrollArea.Viewport>
                      <ScrollArea.Scrollbar orientation="vertical" className="flex w-2 touch-none select-none p-0.5">
                        <ScrollArea.Thumb className="relative flex-1 rounded-full bg-slate-300 hover:bg-slate-400" />
                      </ScrollArea.Scrollbar>
                    </ScrollArea.Root>
                    {outline && (
                      <button type="button" onClick={() => onReadSample(book)} className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:underline cursor-pointer">
                        <BookOpen className="h-3.5 w-3.5" aria-hidden />Read the free preview
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            </Tabs.Content>

            {/* Tab: AI Summary & Generator */}
            <Tabs.Content value="ai_summary" className="focus-visible:outline-none">
              <div className="space-y-6">
                {!account ? (
                  <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-5 text-center space-y-3">
                    <Sparkles className="mx-auto h-6 w-6 text-indigo-600" aria-hidden />
                    <p className="text-sm font-semibold text-slate-900">An AI briefing of this book: summary, key themes and who it is for.</p>
                    <p className="text-xs text-slate-600">Free with a BooksAtlas account. You come straight back to this book.</p>
                    <button type="button" onClick={() => requireSignIn('the AI briefing', `/books/${encodeURIComponent(book.id)}`)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 cursor-pointer">
                      Sign in for the AI briefing
                    </button>
                  </div>
                ) : aiError ? (
                  <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center space-y-2">
                    <p className="text-xs text-rose-800">{aiError}</p>
                    <button type="button" onClick={() => void fetchAISummary()} className="rounded-full bg-rose-700 px-3.5 py-1.5 text-[11px] font-bold text-white hover:bg-rose-600 cursor-pointer">Try again</button>
                  </div>
                ) : aiLoading ? (
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
            </Tabs.Content>

            {/* Tab: Reviews (real readers only) */}
            <Tabs.Content value="reviews" className="focus-visible:outline-none">{prepared
              ? <ReviewsPanel bookId={book.id} />
              : <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">This is a sample title. Reviews are available for books published on BooksAtlas.</p>}</Tabs.Content>

            {/* Tab: Author */}
            <Tabs.Content value="author" className="focus-visible:outline-none">
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <h3 className="font-bold text-base text-slate-950">{book.author}</h3>
                <p className="text-sm text-slate-700 leading-relaxed">{book.authorBio}</p>
                <div className="pt-2 text-xs text-indigo-600 font-semibold">
                  <span>More titles by {book.author} available on BooksAtlas eBook Store</span>
                </div>
              </div>
            </Tabs.Content>
          </Tabs.Root>

        </div>
      </div>
    </AppModal>
  );
};

