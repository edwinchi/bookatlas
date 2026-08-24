import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Sliders, 
  List, 
  Bookmark, 
  Highlighter, 
  Volume2, 
  VolumeX, 
  Type, 
  Maximize2, 
  Minimize2,
  Check,
  ShoppingBag,
  Sparkles,
  Clock,
  Bot,
  MessageSquare,
  HelpCircle,
  BookOpen
} from 'lucide-react';
import { Book, ReaderSettings, ReaderTheme, ReaderFont, Highlight } from '../types';

interface EReaderModalProps {
  book: Book;
  onClose: () => void;
  onAddToCart: (book: Book) => void;
  initialChapterIndex?: number;
  initialParagraphIndex?: number;
  onSaveProgress?: (chapterIndex: number, paragraphIndex: number, progressPct: number) => void;
  currency?: string;
}

export const EReaderModal: React.FC<EReaderModalProps> = ({
  book,
  onClose,
  onAddToCart,
  initialChapterIndex = 0,
  initialParagraphIndex = 0,
  onSaveProgress,
  currency = 'EUR',
}) => {
  const [currentChapterIndex, setCurrentChapterIndex] = useState(initialChapterIndex);
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState(initialParagraphIndex);
  const [showToc, setShowToc] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAICopilot, setShowAICopilot] = useState(false);
  const [copilotQueryType, setCopilotQueryType] = useState<'explain' | 'themes' | 'historical_context' | 'character_dynamics'>('explain');
  const [copilotResponse, setCopilotResponse] = useState<string | null>(null);
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [selectedPassage, setSelectedPassage] = useState<string>('');

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [selectedHighlightColor, setSelectedHighlightColor] = useState<'yellow' | 'green' | 'blue' | 'pink'>('yellow');
  const [activeHighlightMode, setActiveHighlightMode] = useState(false);

  const [settings, setSettings] = useState<ReaderSettings>({
    fontSize: 18,
    lineHeight: 1.7,
    fontFamily: 'literata',
    theme: 'sepia',
    marginWidth: 'normal',
  });

  const readerContainerRef = useRef<HTMLDivElement>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  const getCurrencySymbol = (c: string) => {
    switch (c) {
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'CAD': return 'CA$';
      case 'JPY': return '¥';
      default: return '$';
    }
  };
  const symbol = getCurrencySymbol(currency);

  const chapters = book.sampleChapters && book.sampleChapters.length > 0 
    ? book.sampleChapters 
    : [
        {
          title: 'Chapter 1',
          content: [
            book.synopsis,
            'This is a preview edition provided by Bookatlas eBook Store (Atlantean Globals Services). To read the complete work, purchase the full eBook or start a Bookatlas Plus trial.'
          ]
        }
      ];

  const currentChapter = chapters[currentChapterIndex] || chapters[0];

  // Calculate overall progress percentage
  const totalParas = chapters.reduce((acc, c) => acc + c.content.length, 0);
  const readParas = chapters.slice(0, currentChapterIndex).reduce((acc, c) => acc + c.content.length, 0) + (currentParagraphIndex + 1);
  const progressPercent = Math.min(100, Math.round((readParas / Math.max(1, totalParas)) * 100));

  // Stable ref for progress callback to prevent infinite re-render loops
  const onSaveProgressRef = useRef(onSaveProgress);
  useEffect(() => {
    onSaveProgressRef.current = onSaveProgress;
  }, [onSaveProgress]);

  const lastSavedRef = useRef<string>('');

  useEffect(() => {
    const key = `${currentChapterIndex}-${currentParagraphIndex}-${progressPercent}`;
    if (key !== lastSavedRef.current && onSaveProgressRef.current) {
      lastSavedRef.current = key;
      onSaveProgressRef.current(currentChapterIndex, currentParagraphIndex, progressPercent);
    }
  }, [currentChapterIndex, currentParagraphIndex, progressPercent]);

  // Speech synthesis setup
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const toggleSpeech = () => {
    if (!synthRef.current) return;

    if (isSpeaking) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    } else {
      const textToRead = currentChapter.content.join(' ');
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.rate = 0.95;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      synthRef.current.speak(utterance);
      setIsSpeaking(true);
    }
  };

  // Run AI Copilot
  const runAICopilot = async (type: 'explain' | 'themes' | 'historical_context' | 'character_dynamics', passageText?: string) => {
    setCopilotLoading(true);
    setCopilotQueryType(type);
    const passage = passageText || selectedPassage || currentChapter.content[0] || book.synopsis;

    try {
      const res = await fetch('/api/ai/reader-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookTitle: book.title,
          author: book.author,
          passage,
          chapterTitle: currentChapter.title,
          analysisType: type,
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCopilotResponse(data.analysis || 'Analysis generated.');
      } else {
        throw new Error('Fallback needed');
      }
    } catch (err) {
      // Heuristic fallback
      if (type === 'explain') {
        setCopilotResponse(`In "${book.title}", this passage establishes the central tension and thematic weight of ${book.author}'s narrative. Key metaphors reveal subtle character psychological motivations.`);
      } else if (type === 'historical_context') {
        setCopilotResponse(`This passage reflects broader sociopolitical currents and the author's philosophical inquiries into modern human nature and European literary traditions.`);
      } else if (type === 'themes') {
        setCopilotResponse(`Key themes illustrated here: existential agency, destiny vs. choice, and emotional resilience under high stakes.`);
      } else {
        setCopilotResponse(`Character dynamics display underlying unspoken friction and subtextual bonding, driving forward the immediate plot conflict.`);
      }
    } finally {
      setCopilotLoading(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        nextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        prevPage();
      } else if (e.key === 'Escape') {
        if (showSettings) setShowSettings(false);
        else if (showToc) setShowToc(false);
        else if (showAICopilot) setShowAICopilot(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentChapterIndex, chapters.length, showSettings, showToc, showAICopilot]);

  const nextPage = () => {
    if (currentChapterIndex < chapters.length - 1) {
      setCurrentChapterIndex((prev) => prev + 1);
      setCurrentParagraphIndex(0);
    }
  };

  const prevPage = () => {
    if (currentChapterIndex > 0) {
      setCurrentChapterIndex((prev) => prev - 1);
      setCurrentParagraphIndex(0);
    }
  };

  // Theme styling helpers
  const getThemeClasses = (theme: ReaderTheme) => {
    switch (theme) {
      case 'day':
        return 'bg-white text-[#1c1d1f] border-slate-200';
      case 'sepia':
        return 'bg-[#fbf0d9] text-[#3e2723] border-[#e8d7b8]';
      case 'night':
        return 'bg-[#18191c] text-[#d1d5db] border-[#2d2f36]';
      case 'mint':
        return 'bg-[#e8f4ec] text-[#1e3a29] border-[#c8e2d0]';
      case 'black':
        return 'bg-[#000000] text-[#e5e7eb] border-[#222222]';
      default:
        return 'bg-[#fbf0d9] text-[#3e2723]';
    }
  };

  const getFontFamilyClass = (font: ReaderFont) => {
    switch (font) {
      case 'literata':
        return 'font-serif-book';
      case 'sans':
        return 'font-reader-sans';
      case 'mono':
        return 'font-reader-mono';
      default:
        return 'font-serif-book';
    }
  };

  const getMarginClass = (m: 'narrow' | 'normal' | 'wide') => {
    switch (m) {
      case 'narrow':
        return 'max-w-4xl px-4 sm:px-8';
      case 'normal':
        return 'max-w-3xl px-6 sm:px-12';
      case 'wide':
        return 'max-w-2xl px-8 sm:px-16';
    }
  };

  const handleParagraphClick = (pIndex: number, text: string) => {
    setSelectedPassage(text);
    if (!activeHighlightMode) return;
    const existing = highlights.find(
      (h) => h.chapterIndex === currentChapterIndex && h.paragraphIndex === pIndex
    );
    if (existing) {
      setHighlights((prev) => prev.filter((h) => h.id !== existing.id));
    } else {
      setHighlights((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          text,
          color: selectedHighlightColor,
          chapterIndex: currentChapterIndex,
          paragraphIndex: pIndex,
          date: new Date().toLocaleDateString(),
        },
      ]);
    }
  };

  const isParagraphHighlighted = (pIndex: number) => {
    return highlights.find(
      (h) => h.chapterIndex === currentChapterIndex && h.paragraphIndex === pIndex
    );
  };

  return (
    <div 
      ref={readerContainerRef}
      className={`fixed inset-0 z-50 flex flex-col transition-colors duration-200 select-text ${getThemeClasses(settings.theme)}`}
    >
      {/* Top eReader Control Header */}
      <header className={`px-4 sm:px-6 py-3 border-b flex items-center justify-between transition-colors ${
        settings.theme === 'night' || settings.theme === 'black'
          ? 'bg-black/70 border-white/10 text-slate-200'
          : 'bg-white/80 border-slate-200 text-slate-800'
      } backdrop-blur-md`}>
        
        {/* Left: Close & Table of Contents */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/10 transition-colors cursor-pointer"
            title="Exit Reader"
          >
            <X className="w-5 h-5" />
          </button>

          <button
            onClick={() => setShowToc(!showToc)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-black/10 text-xs font-semibold transition-colors cursor-pointer"
            title="Table of Contents"
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">Contents</span>
          </button>

          <div className="hidden md:flex flex-col">
            <span className="text-xs font-bold truncate max-w-xs">{book.title}</span>
            <span className="text-[11px] opacity-75">{book.author} · Bookatlas</span>
          </div>
        </div>

        {/* Center: Current Chapter Indicator */}
        <div className="text-center truncate px-2">
          <span className="text-xs sm:text-sm font-serif font-bold">
            {currentChapter.title}
          </span>
          <span className="text-[11px] opacity-70 ml-2 hidden sm:inline">
            ({currentChapterIndex + 1} of {chapters.length})
          </span>
        </div>

        {/* Right: Tools & Settings */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Gemini AI Co-Pilot Button */}
          <button
            onClick={() => {
              setShowAICopilot(!showAICopilot);
              if (!showAICopilot && !copilotResponse) {
                runAICopilot('explain', currentChapter.content[0]);
              }
            }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              showAICopilot 
                ? 'bg-indigo-600 text-white shadow-xs' 
                : 'bg-indigo-50 text-indigo-900 border border-indigo-200 hover:bg-indigo-100'
            }`}
            title="Gemini AI Reader Co-Pilot (Literary Analysis)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span className="hidden sm:inline">AI Co-Pilot</span>
          </button>

          {/* Highlight Marker Mode */}
          <button
            onClick={() => setActiveHighlightMode(!activeHighlightMode)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              activeHighlightMode ? 'bg-amber-400 text-slate-950 font-bold shadow-xs' : 'hover:bg-black/10'
            }`}
            title="Highlight Mode (Click paragraph to highlight)"
          >
            <Highlighter className="w-4 h-4" />
          </button>

          {/* Bookmark toggle */}
          <button
            onClick={() => setBookmarked(!bookmarked)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              bookmarked ? 'text-indigo-600' : 'hover:bg-black/10 opacity-75'
            }`}
            title={bookmarked ? 'Bookmark Saved' : 'Bookmark this page'}
          >
            <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-indigo-600' : ''}`} />
          </button>

          {/* Text to Speech toggle */}
          <button
            onClick={toggleSpeech}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isSpeaking ? 'text-indigo-600 animate-pulse bg-indigo-50' : 'hover:bg-black/10 opacity-75'
            }`}
            title={isSpeaking ? 'Pause Narration' : 'Listen to Chapter'}
          >
            {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Display Settings Toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              showSettings ? 'bg-black/15' : 'hover:bg-black/10'
            }`}
            title="Font & Theme Settings"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={() => {
              if (!document.fullscreenElement) {
                readerContainerRef.current?.requestFullscreen?.();
                setIsFullscreen(true);
              } else {
                document.exitFullscreen?.();
                setIsFullscreen(false);
              }
            }}
            className="p-1.5 rounded-lg hover:bg-black/10 transition-colors hidden sm:block cursor-pointer opacity-75"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Reading Canvas & Lateral Arrows */}
      <div className="flex-1 relative overflow-y-auto flex items-stretch">
        
        {/* Left Page Turn Button / Margin Click */}
        <button
          onClick={prevPage}
          disabled={currentChapterIndex === 0}
          className={`w-12 sm:w-16 flex items-center justify-center opacity-30 hover:opacity-100 transition-opacity cursor-pointer disabled:opacity-0 disabled:pointer-events-none z-10`}
          aria-label="Previous Chapter"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Center: Scrollable/Paginated Text Body */}
        <div className={`flex-1 py-8 sm:py-12 mx-auto ${getMarginClass(settings.marginWidth)}`}>
          
          {/* Chapter Header */}
          <div className="text-center mb-8 pb-6 border-b border-current/15">
            <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight mb-2 ${getFontFamilyClass(settings.fontFamily)}`}>
              {currentChapter.title}
            </h2>
            {currentChapter.subtitle && (
              <p className="text-sm opacity-80 italic font-serif">
                {currentChapter.subtitle}
              </p>
            )}
          </div>

          {/* Chapter Paragraphs */}
          <div 
            className={`space-y-6 ${getFontFamilyClass(settings.fontFamily)}`}
            style={{
              fontSize: `${settings.fontSize}px`,
              lineHeight: settings.lineHeight,
            }}
          >
            {currentChapter.content.map((paragraph, pIdx) => {
              const highlight = isParagraphHighlighted(pIdx);
              let highlightBg = '';
              if (highlight) {
                if (highlight.color === 'yellow') highlightBg = 'bg-yellow-200/50 text-slate-900 px-1 rounded-xs';
                if (highlight.color === 'green') highlightBg = 'bg-emerald-200/50 text-slate-900 px-1 rounded-xs';
                if (highlight.color === 'blue') highlightBg = 'bg-sky-200/50 text-slate-900 px-1 rounded-xs';
                if (highlight.color === 'pink') highlightBg = 'bg-pink-200/50 text-slate-900 px-1 rounded-xs';
              }

              return (
                <p
                  key={pIdx}
                  onClick={() => handleParagraphClick(pIdx, paragraph)}
                  className={`relative transition-all cursor-text ${
                    activeHighlightMode ? 'hover:bg-amber-100/30 cursor-pointer p-1 rounded-sm' : ''
                  } ${highlightBg}`}
                >
                  {pIdx === 0 && (
                    <span className="float-left text-4xl sm:text-5xl font-bold font-serif mr-2 leading-none">
                      {paragraph[0]}
                    </span>
                  )}
                  {pIdx === 0 ? paragraph.slice(1) : paragraph}
                </p>
              );
            })}
          </div>

          {/* End of Preview Banner */}
          <div className="mt-14 p-6 rounded-2xl border border-current/20 bg-current/5 text-center space-y-3">
            <h4 className="font-bold text-base">Enjoying this excerpt of {book.title}?</h4>
            <p className="text-xs sm:text-sm opacity-80 max-w-md mx-auto">
              Get instant full access to all {book.pageCount} pages, offline downloads, and automatic reading progress syncing across your Bookatlas eReaders and mobile apps.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => {
                  onAddToCart(book);
                  onClose();
                }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center gap-2 shadow-md transition-colors cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 text-amber-300" />
                <span>Buy Full eBook for {symbol}{book.price.toFixed(2)}</span>
              </button>

              {(book.isBookatlasPlus || book.isKoboPlus) && (
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 bg-white/20 hover:bg-white/30 border border-current/20 font-semibold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer"
                >
                  Read on Bookatlas Plus (Free Trial)
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Page Turn Button / Margin Click */}
        <button
          onClick={nextPage}
          disabled={currentChapterIndex === chapters.length - 1}
          className={`w-12 sm:w-16 flex items-center justify-center opacity-30 hover:opacity-100 transition-opacity cursor-pointer disabled:opacity-0 disabled:pointer-events-none z-10`}
          aria-label="Next Chapter"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Bottom eReader Navigation & Scrubber Footer */}
      <footer className={`px-6 py-2.5 border-t flex items-center justify-between text-xs transition-colors ${
        settings.theme === 'night' || settings.theme === 'black'
          ? 'bg-black/70 border-white/10 text-slate-300'
          : 'bg-white/80 border-slate-200 text-slate-700'
      } backdrop-blur-md`}>
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 opacity-70" />
          <span className="font-medium">Estimated 4 mins left in chapter</span>
        </div>

        {/* Reading Progress Slider */}
        <div className="flex-1 max-w-xs sm:max-w-md mx-4 flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={chapters.length - 1}
            value={currentChapterIndex}
            onChange={(e) => {
              setCurrentChapterIndex(Number(e.target.value));
              setCurrentParagraphIndex(0);
            }}
            className="w-full h-1.5 bg-current/20 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <span className="font-bold whitespace-nowrap">{progressPercent}%</span>
        </div>

        <div className="text-right">
          <span>Chapter {currentChapterIndex + 1} of {chapters.length}</span>
        </div>
      </footer>

      {/* Table of Contents Drawer */}
      {showToc && (
        <div className="absolute inset-y-0 left-0 w-80 bg-slate-950 text-white z-50 shadow-2xl p-5 overflow-y-auto animate-in slide-in-from-left duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <List className="w-4 h-4" /> Table of Contents
            </h3>
            <button onClick={() => setShowToc(false)} className="p-1 hover:text-slate-400">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-4 space-y-1">
            {chapters.map((ch, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentChapterIndex(idx);
                  setCurrentParagraphIndex(0);
                  setShowToc(false);
                }}
                className={`w-full text-left p-3 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer flex items-center justify-between ${
                  currentChapterIndex === idx
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <div>
                  <div>{ch.title}</div>
                  {ch.subtitle && <div className="text-[11px] opacity-75 font-normal">{ch.subtitle}</div>}
                </div>
                {currentChapterIndex === idx && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>

          {highlights.length > 0 && (
            <div className="mt-8 pt-4 border-t border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-1.5">
                <Highlighter className="w-3.5 h-3.5" /> Saved Highlights ({highlights.length})
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {highlights.map((h) => (
                  <div key={h.id} className="p-2.5 bg-slate-900/90 rounded-lg text-xs space-y-1 border border-slate-800">
                    <p className="line-clamp-2 italic text-slate-300">"{h.text}"</p>
                    <span className="text-[10px] text-slate-500">Ch. {h.chapterIndex + 1} • {h.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Gemini AI Co-Pilot Panel */}
      {showAICopilot && (
        <div className="absolute top-16 right-4 sm:right-6 w-96 max-w-[90vw] bg-white text-slate-900 rounded-3xl shadow-2xl border border-indigo-200 p-5 z-50 animate-in fade-in slide-in-from-top-2 duration-150 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Bot className="w-4 h-4 text-indigo-600" />
              <span>Gemini AI Reader Co-Pilot</span>
            </h3>
            <button onClick={() => setShowAICopilot(false)} className="text-slate-400 hover:text-slate-700">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Selector */}
          <div className="grid grid-cols-2 gap-1.5 text-[11px] font-semibold">
            {[
              { id: 'explain', label: 'Explain Passage' },
              { id: 'themes', label: 'Key Themes' },
              { id: 'historical_context', label: 'Historical Context' },
              { id: 'character_dynamics', label: 'Character Dynamics' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => runAICopilot(t.id as any)}
                className={`py-1.5 px-2 rounded-lg border text-center transition-all cursor-pointer ${
                  copilotQueryType === t.id
                    ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Active Context */}
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
            <span className="font-bold text-slate-900 block mb-0.5">Analyzing:</span>
            <p className="italic line-clamp-2">{selectedPassage || currentChapter.content[0]}</p>
          </div>

          {/* AI Response Output */}
          <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-xs leading-relaxed text-indigo-950 min-h-24 flex items-center justify-center">
            {copilotLoading ? (
              <div className="flex items-center gap-2 text-indigo-600 font-semibold">
                <span className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                <span>Synthesizing literary analysis...</span>
              </div>
            ) : copilotResponse ? (
              <p className="whitespace-pre-line">{copilotResponse}</p>
            ) : (
              <span className="text-slate-400">Click a prompt above to generate Gemini insights.</span>
            )}
          </div>
        </div>
      )}

      {/* Reader Settings Floating Popup */}
      {showSettings && (
        <div className="absolute top-16 right-4 sm:right-6 w-80 bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 p-5 z-50 animate-in fade-in slide-in-from-top-2 duration-150 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Type className="w-4 h-4 text-indigo-600" /> Reading Display
            </h3>
            <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-700">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Color Themes */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Theme</label>
            <div className="grid grid-cols-5 gap-2">
              {[
                { id: 'day', name: 'Day', bg: 'bg-white', text: 'text-black', border: 'border-slate-300' },
                { id: 'sepia', name: 'Sepia', bg: 'bg-[#fbf0d9]', text: 'text-[#3e2723]', border: 'border-[#e8d7b8]' },
                { id: 'mint', name: 'Mint', bg: 'bg-[#e8f4ec]', text: 'text-[#1e3a29]', border: 'border-[#c8e2d0]' },
                { id: 'night', name: 'Night', bg: 'bg-[#18191c]', text: 'text-slate-200', border: 'border-slate-700' },
                { id: 'black', name: 'OLED', bg: 'bg-black', text: 'text-slate-300', border: 'border-slate-800' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSettings((s) => ({ ...s, theme: t.id as ReaderTheme }))}
                  className={`h-10 rounded-lg flex flex-col items-center justify-center text-[10px] font-bold border transition-all cursor-pointer ${t.bg} ${t.text} ${t.border} ${
                    settings.theme === t.id ? 'ring-2 ring-indigo-600 shadow-sm scale-105' : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  <span>{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Font Family */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Font</label>
            <div className="grid grid-cols-3 gap-1.5 text-xs font-semibold">
              {[
                { id: 'literata', label: 'Literata Serif' },
                { id: 'sans', label: 'Plus Sans' },
                { id: 'mono', label: 'Dyslexic / Mono' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSettings((s) => ({ ...s, fontFamily: f.id as ReaderFont }))}
                  className={`py-2 px-2 rounded-lg border transition-colors cursor-pointer text-center ${
                    settings.fontFamily === f.id
                      ? 'bg-slate-900 text-white border-slate-900 font-bold'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span>Text Size</span>
              <span className="text-slate-900 font-extrabold">{settings.fontSize}px</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-serif font-bold">A</span>
              <input
                type="range"
                min={14}
                max={26}
                value={settings.fontSize}
                onChange={(e) => setSettings((s) => ({ ...s, fontSize: Number(e.target.value) }))}
                className="w-full accent-indigo-600"
              />
              <span className="text-xl font-serif font-bold">A</span>
            </div>
          </div>

          {/* Margins */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Margins</label>
            <div className="grid grid-cols-3 gap-1.5 text-xs font-semibold">
              {(['narrow', 'normal', 'wide'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setSettings((s) => ({ ...s, marginWidth: m }))}
                  className={`py-1.5 capitalize rounded-md border cursor-pointer ${
                    settings.marginWidth === m
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

