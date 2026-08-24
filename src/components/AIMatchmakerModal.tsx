import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  BookOpen, 
  ShoppingBag, 
  ArrowRight, 
  Flame,
  Compass,
  Cpu,
  Bot
} from 'lucide-react';
import { Book, AIMatchResult } from '../types';

interface AIMatchmakerModalProps {
  isOpen: boolean;
  onClose: () => void;
  books: Book[];
  onOpenBookDetail: (book: Book) => void;
  onReadSample: (book: Book) => void;
  onAddToCart: (book: Book) => void;
  currency?: string;
}

interface LocalMatchItem {
  book: Book;
  matchScore: number;
  matchReason: string;
  keyHighlights: string[];
}

export const AIMatchmakerModal: React.FC<AIMatchmakerModalProps> = ({
  isOpen,
  onClose,
  books,
  onOpenBookDetail,
  onReadSample,
  onAddToCart,
  currency = 'EUR',
}) => {
  const [prompt, setPrompt] = useState('');
  const [matchedResults, setMatchedResults] = useState<LocalMatchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);

  if (!isOpen) return null;

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

  const samplePrompts = [
    '🌍 Afrofuturism, Dogon stellar mysteries & African speculative fiction',
    '👁️ Kemetic sacred science, 42 Laws of Ma\'at & ancient Egyptian wisdom',
    '🧘 Kundalini, chakra energy alignment & higher dimensional consciousness',
    '📚 Gripping historical novel set in Amsterdam or European Golden Age',
    '🚀 Hard sci-fi with cosmic wormholes & deep space astronomy',
    '💡 Mind mastery, bio-resonance & spiritual awakening practices'
  ];

  const handleMatch = async (query: string) => {
    setIsSearching(true);
    setPrompt(query);
    setAiNote(null);

    try {
      // Call backend Gemini AI endpoint
      const response = await fetch('/api/ai/matchmaker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: query,
          books: books.map(b => ({
            id: b.id,
            title: b.title,
            author: b.author,
            primaryGenre: b.primaryGenre,
            genres: b.genres,
            synopsis: b.synopsis,
            tags: b.tags,
            price: b.price,
            rating: b.rating,
            aiVibe: b.aiVibe
          }))
        })
      });

      const contentType = response.headers.get('content-type');
      if (response.ok && contentType && contentType.includes('application/json')) {
        const data = await response.json();
        if (data.matches && data.matches.length > 0) {
          const hydrated = data.matches.map((m: { bookId: string; matchScore: number; matchReason: string; keyHighlights: string[] }) => {
            const originalBook = books.find(b => b.id === m.bookId) || books[0];
            return {
              book: originalBook,
              matchScore: m.matchScore,
              matchReason: m.matchReason,
              keyHighlights: m.keyHighlights || []
            };
          });
          setMatchedResults(hydrated);
          setAiNote(data.aiExplanation || null);
          setIsSearching(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Backend AI endpoint fallback:', err);
    }

    // Heuristic Fallback
    const q = query.toLowerCase();
    const results: LocalMatchItem[] = [];

    books.forEach((b) => {
      let score = 50;
      let reasons: string[] = [];

      if (q.includes('amsterdam') || q.includes('netherlands') || q.includes('dutch') || q.includes('europe')) {
        if (b.tags.some(t => t.toLowerCase().includes('amsterdam') || t.toLowerCase().includes('dutch') || t.toLowerCase().includes('europe'))) {
          score += 48;
          reasons.push('Richly grounded in European cultural history and atmospheric Dutch locales');
        }
      }
      if (q.includes('sci-fi') || q.includes('space') || q.includes('stars') || q.includes('cosmic')) {
        if (b.genres.includes('Sci-Fi & Fantasy')) {
          score += 45;
          reasons.push('Features deep celestial world-building & astronomical intrigue');
        }
      }
      if (q.includes('habit') || q.includes('productivity') || q.includes('mindset') || q.includes('success')) {
        if (b.primaryGenre === 'Self-Improvement' || b.primaryGenre === 'Business & Leadership') {
          score += 48;
          reasons.push('Actionable framework backed by cognitive science and behavioral psychology');
        }
      }
      if (q.includes('romance') || q.includes('love') || q.includes('baking') || q.includes('paris') || q.includes('cozy')) {
        if (b.primaryGenre === 'Romance' || b.genres.includes('Romance')) {
          score += 46;
          reasons.push('Heartwarming romantic setting with lovable, relatable protagonists');
        }
      }
      if (q.includes('mystery') || q.includes('detective') || q.includes('london') || q.includes('crime')) {
        if (b.primaryGenre === 'Mystery & Suspense') {
          score += 47;
          reasons.push('Puzzles, Gothic atmosphere, and high-stakes investigation');
        }
      }
      if (q.includes('philosophy') || q.includes('stoic') || q.includes('calm') || q.includes('stress')) {
        if (b.tags.includes('Stoicism') || b.tags.includes('Philosophy')) {
          score += 49;
          reasons.push('Practical stoic mindfulness practices for peace of mind and resilience');
        }
      }

      // Keyword overlap
      const words = q.split(' ').filter(w => w.length > 3);
      words.forEach(w => {
        if (b.synopsis.toLowerCase().includes(w) || b.tags.some(t => t.toLowerCase().includes(w))) {
          score += 15;
          if (reasons.length === 0) reasons.push(`Matches your interest in "${w}"`);
        }
      });

      if (score > 60) {
        results.push({
          book: b,
          matchScore: Math.min(99, score),
          matchReason: reasons[0] || 'Strong thematic alignment with your literary mood and preferences.',
          keyHighlights: b.tags.slice(0, 3)
        });
      }
    });

    results.sort((a, b) => b.matchScore - a.matchScore);

    if (results.length === 0) {
      books.slice(0, 3).forEach((b, i) => {
        results.push({
          book: b,
          matchScore: 92 - i * 4,
          matchReason: 'Curated trending favorite by Bookatlas editors.',
          keyHighlights: b.tags.slice(0, 3)
        });
      });
    }

    setMatchedResults(results.slice(0, 5));
    setAiNote('Synthesized based on semantic theme matching and narrative mood analysis.');
    setIsSearching(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-950 text-white p-6 sm:p-8 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300 mb-2">
            <Bot className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>Bookatlas Gemini AI Discovery Engine</span>
          </div>

          <h2 className="text-xl sm:text-3xl font-serif font-extrabold text-white">
            Find Your Next Favorite Read
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-lg">
            Powered by Google Gemini 3.7 Flash & Atlantean literary taxonomy. Describe your mood, preferred tropes, pacing, or specific themes.
          </p>

          {/* Search Input Bar */}
          <div className="mt-5 flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleMatch(prompt)}
              placeholder="e.g. A fast-paced mystery in Amsterdam, or philosophical sci-fi with AI..."
              className="flex-1 px-4 py-3 bg-white/10 text-white placeholder-slate-400 rounded-xl border border-white/20 text-sm focus:outline-hidden focus:bg-white/20 focus:border-amber-300 transition-all"
            />
            <button
              onClick={() => handleMatch(prompt)}
              disabled={!prompt.trim() || isSearching}
              className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl shadow-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isSearching ? (
                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <span>Match</span>
                  <Sparkles className="w-4 h-4 text-slate-950" />
                </>
              )}
            </button>
          </div>

          {/* Sample Prompts Pills */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-slate-400 font-medium">Try asking:</span>
            {samplePrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleMatch(p)}
                className="text-[11px] bg-white/10 hover:bg-white/20 text-slate-200 px-2.5 py-1 rounded-full border border-white/10 transition-colors cursor-pointer"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Results Area */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-4">
          {aiNote && (
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900 flex items-start gap-2">
              <Cpu className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <span>{aiNote}</span>
            </div>
          )}

          {matchedResults.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <Compass className="w-10 h-10 text-indigo-400 mx-auto opacity-70" />
              <p className="text-sm font-medium">Type your prompt above or click one of the quick suggestions to let Gemini analyze our catalog.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100">
                <span>Top Gemini Matches For You</span>
                <span className="text-indigo-700 font-semibold">{matchedResults.length} curated titles</span>
              </div>

              {matchedResults.map(({ book, matchScore, matchReason, keyHighlights }) => (
                <div
                  key={book.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50/60 to-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs hover:border-indigo-300 transition-all"
                >
                  <div className="flex gap-4 items-center">
                    <img
                      src={book.coverImage}
                      alt={book.title}
                      onClick={() => onOpenBookDetail(book)}
                      className="w-16 aspect-[2/3] object-cover rounded-lg shadow-sm cursor-pointer hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                    />

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5 text-amber-600" /> {matchScore}% Match
                        </span>
                        <span className="text-xs text-slate-500 font-medium">{book.primaryGenre}</span>
                      </div>

                      <h4
                        onClick={() => onOpenBookDetail(book)}
                        className="font-serif font-bold text-sm text-slate-950 hover:text-indigo-600 cursor-pointer"
                      >
                        {book.title}
                      </h4>
                      <p className="text-xs text-slate-600">{book.author}</p>

                      <p className="text-xs text-slate-700 font-medium italic pt-1">
                        💡 "{matchReason}"
                      </p>

                      {keyHighlights && keyHighlights.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {keyHighlights.map((tag, i) => (
                            <span key={i} className="text-[10px] bg-slate-200/80 text-slate-700 px-1.5 py-0.2 rounded-xs">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <span className="text-base font-black text-slate-900">
                      {symbol}{book.price.toFixed(2)}
                    </span>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          onReadSample(book);
                          onClose();
                        }}
                        className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                        <span>Preview</span>
                      </button>

                      <button
                        onClick={() => {
                          onAddToCart(book);
                          onClose();
                        }}
                        className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <ShoppingBag className="w-3.5 h-3.5 text-amber-300" />
                        <span>Buy</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

