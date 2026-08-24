import React, { useState, useEffect } from 'react';
import { 
  X, 
  Globe, 
  Search, 
  Sparkles, 
  ExternalLink, 
  Award, 
  TrendingUp, 
  BookOpen, 
  Layers, 
  Compass, 
  RefreshCw,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { SearchGroundingResult, GroundingSource } from '../types';

interface GoogleSearchGroundingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_SEARCH_TOPICS = [
  {
    id: 'bestsellers',
    title: 'European & Dutch Bestsellers 2026',
    query: 'What are the current top bestselling books on the CPNB Bestseller 60 Netherlands and European fiction charts in 2026?'
  },
  {
    id: 'awards',
    title: 'Literary Prize Winners & Shortlists',
    query: 'What are the latest winners and shortlists for the Booker Prize, Nobel Prize in Literature, and Libris Literatuur Prijs?'
  },
  {
    id: 'adaptations',
    title: 'Book-to-Film & Streaming Adaptations',
    query: 'Which acclaimed sci-fi and literary fiction books are currently being adapted for Netflix, HBO, and Apple TV+ in 2026?'
  },
  {
    id: 'speculative',
    title: 'Trending Speculative & Climate Fiction',
    query: 'What are the most acclaimed speculative fiction, solarpunk, and climate fiction books published this year?'
  }
];

export function GoogleSearchGroundingModal({ isOpen, onClose }: GoogleSearchGroundingModalProps) {
  const [searchQuery, setSearchQuery] = useState(PRESET_SEARCH_TOPICS[0].query);
  const [isLoading, setIsLoading] = useState(false);
  const [groundingResult, setGroundingResult] = useState<SearchGroundingResult | null>(null);

  useEffect(() => {
    if (isOpen && !groundingResult) {
      executeSearch(PRESET_SEARCH_TOPICS[0].query);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const executeSearch = async (queryText: string) => {
    setIsLoading(true);
    setSearchQuery(queryText);

    try {
      const response = await fetch('/api/gemini/search-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText })
      });

      const data = await response.json();
      if (data.data) {
        setGroundingResult({
          query: queryText,
          answer: data.data.answer,
          sources: data.data.sources || [],
          searchQueries: data.data.searchQueries || [],
          timestamp: data.data.timestamp || new Date().toISOString(),
          model: 'gemini-3.5-flash'
        });
      } else {
        setGroundingResult({
          query: queryText,
          answer: data.answer || 'Search summary generated.',
          sources: data.sources || [],
          searchQueries: data.searchQueries || [],
          timestamp: data.timestamp || new Date().toISOString(),
          model: 'gemini-3.5-flash'
        });
      }
    } catch (err) {
      console.error('Search grounding error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white text-slate-900 w-full max-w-4xl h-[88vh] max-h-[840px] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-md">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Google Search Grounding Literary Radar
                </h2>
                <span className="bg-sky-500/20 text-sky-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-sky-400/30 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> Live Web Grounded
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Model: gemini-3.5-flash with googleSearch tool & real-time grounding citations
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preset Topic Bar */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Live Radars:
          </span>
          {PRESET_SEARCH_TOPICS.map((topic) => {
            const isActive = searchQuery === topic.query;
            return (
              <button
                key={topic.id}
                onClick={() => executeSearch(topic.query)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {topic.id === 'bestsellers' && <TrendingUp className="w-3 h-3" />}
                {topic.id === 'awards' && <Award className="w-3 h-3" />}
                {topic.id === 'adaptations' && <BookOpen className="w-3 h-3" />}
                {topic.id === 'speculative' && <Compass className="w-3 h-3" />}
                <span>{topic.title}</span>
              </button>
            );
          })}
        </div>

        {/* Custom Search Input */}
        <div className="p-4 bg-white border-b border-slate-200 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (searchQuery.trim()) executeSearch(searchQuery);
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search real-time author tours, international bestseller lists, award winners..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 focus:bg-white text-slate-900 border border-slate-300 focus:border-sky-600 rounded-xl text-xs sm:text-sm focus:outline-hidden transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !searchQuery.trim()}
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Search Grounding</span>
            </button>
          </form>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#fbfcfd]">
          {isLoading ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-12 h-12 rounded-full border-3 border-sky-600 border-t-transparent animate-spin mx-auto"></div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Querying Live Web via Google Search...</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Gemini 3.5 Flash is extracting verified literary records, citations, and awards...
                </p>
              </div>
            </div>
          ) : groundingResult ? (
            <div className="space-y-6">
              
              {/* Search Grounding Answer */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-sky-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Verified Grounded Search Intelligence</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(groundingResult.timestamp).toLocaleString()}</span>
                  </div>
                </div>

                <div className="prose prose-slate max-w-none text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans text-slate-800">
                  {groundingResult.answer}
                </div>
              </div>

              {/* Citations & Verified Sources */}
              {groundingResult.sources && groundingResult.sources.length > 0 && (
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                    <ExternalLink className="w-3.5 h-3.5 text-sky-600" />
                    <span>Live Source Citations & References ({groundingResult.sources.length})</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {groundingResult.sources.map((src, i) => (
                      <a
                        key={i}
                        href={src.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-3 bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-xl transition-all group flex flex-col justify-between"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-800 group-hover:text-sky-700 flex items-center justify-between">
                            <span className="truncate">{src.title}</span>
                            <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-sky-600 shrink-0 ml-1" />
                          </div>
                          {src.snippet && (
                            <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                              {src.snippet}
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 truncate mt-2 font-mono">
                          {src.url.replace(/^https?:\/\//, '')}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ) : null}
        </div>

      </div>
    </div>
  );
}
