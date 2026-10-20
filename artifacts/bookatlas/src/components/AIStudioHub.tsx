import React, { useState } from 'react';
import { 
  X, 
  Bot, 
  Radio, 
  Film, 
  Globe, 
  FileText, 
  Sparkles, 
  ArrowRight,
  Zap,
  ShieldCheck,
  Lock,
  Unlock
} from 'lucide-react';
import { Book } from '../types';

interface AIStudioHubProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenChat: () => void;
  onOpenVoice: () => void;
  onOpenVideo: () => void;
  onOpenSearch: () => void;
  onOpenDocs: () => void;
  booksCount: number;
  isAdminAuthenticated: boolean;
  onOpenAdminAuth: (featureName: string, callback?: () => void) => void;
}

export function AIStudioHub({
  isOpen,
  onClose,
  onOpenChat,
  onOpenVoice,
  onOpenVideo,
  onOpenSearch,
  onOpenDocs,
  booksCount,
  isAdminAuthenticated,
  onOpenAdminAuth
}: AIStudioHubProps) {
  if (!isOpen) return null;

  const handleVideoClick = () => {
    onClose();
    if (isAdminAuthenticated) {
      onOpenVideo();
    } else {
      onOpenAdminAuth('Veo AI Cover Image-to-Video Animator Studio', () => {
        onOpenVideo();
      });
    }
  };

  const handleDocsClick = () => {
    onClose();
    if (isAdminAuthenticated) {
      onOpenDocs();
    } else {
      onOpenAdminAuth('Official Platform Specifications & Architecture Export', () => {
        onOpenDocs();
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 text-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-800 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-pink-600 flex items-center justify-center text-white shadow-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Bookatlas AI Studio & Multi-Modal Hub
                </h2>
                <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-400/30">
                  Google Gemini Ecosystem
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Atlantean Globals Services B.V. (Amsterdam, Netherlands)
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

        {/* Feature Grid */}
        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/90">
          
          {/* Card 1: Gemini Chatbot */}
          <div 
            onClick={() => { onClose(); onOpenChat(); }}
            className="p-5 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/60 rounded-2xl transition-all group cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                  <Bot className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/60 px-2.5 py-1 rounded-full border border-indigo-800/50">
                  gemini-3.1-pro-preview
                </span>
              </div>
              <div>
                <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                  Multi-Turn Gemini Literary Chatbot
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Scrollable thread with configurable personas (Senior Scholar, Dutch Curator, Writing Coach) and multi-model toggle (3.1 Pro, 3.5 Flash, 3.1 Flash Lite).
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-indigo-400 group-hover:text-indigo-300 mt-4">
              <span>Open Literary Chat</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 2: Live Voice Companion */}
          <div 
            onClick={() => { onClose(); onOpenVoice(); }}
            className="p-5 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-violet-500/60 rounded-2xl transition-all group cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 group-hover:scale-110 transition-transform">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400 bg-violet-950/60 px-2.5 py-1 rounded-full border border-violet-800/50">
                  gemini-3.1-flash-live-preview
                </span>
              </div>
              <div>
                <h3 className="text-base font-bold text-white group-hover:text-violet-300 transition-colors">
                  Real-Time Live Voice Dialogue Companion
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Hands-free spoken conversations with visual audio waveforms, customizable voices (Zephyr, Kore, Puck), and conversational transcripts.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-violet-400 group-hover:text-violet-300 mt-4">
              <span>Launch Live Voice</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 3: Veo Video Generator - Admin Secured */}
          <div 
            onClick={handleVideoClick}
            className="p-5 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-pink-500/60 rounded-2xl transition-all group cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-pink-600/20 border border-pink-500/30 flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform">
                  <Film className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-1.5">
                  {!isAdminAuthenticated && (
                    <span className="text-[9px] font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-800/60 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Admin Only
                    </span>
                  )}
                  <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400 bg-pink-950/60 px-2.5 py-1 rounded-full border border-pink-800/50">
                    veo-3.1-fast
                  </span>
                </div>
              </div>
              <div>
                <h3 className="text-base font-bold text-white group-hover:text-pink-300 transition-colors">
                  Veo Cover Image-to-Video Animator
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Transform static book covers into 16:9 cinematic store trailers and 9:16 vertical reels with atmospheric particles, lighting, and MP4 downloads.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-pink-400 group-hover:text-pink-300 mt-4">
              <span>{isAdminAuthenticated ? 'Animate Video Trailers' : 'Unlock Video Studio (Admin)'}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 4: Google Search Grounding */}
          <div 
            onClick={() => { onClose(); onOpenSearch(); }}
            className="p-5 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-sky-500/60 rounded-2xl transition-all group cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-sky-600/20 border border-sky-500/30 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
                  <Globe className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 bg-sky-950/60 px-2.5 py-1 rounded-full border border-sky-800/50">
                  gemini-3.5-flash + search
                </span>
              </div>
              <div>
                <h3 className="text-base font-bold text-white group-hover:text-sky-300 transition-colors">
                  Google Search Grounding Literary Radar
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Real-time European bestseller charts (CPNB Netherlands), Booker & Nobel prize updates, and streaming adaptations with verified citation links.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-sky-400 group-hover:text-sky-300 mt-4">
              <span>Explore Live Trends</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

        </div>

        {/* Documentation Export Banner - Admin Secured */}
        <div className="p-6 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">Full Project Documentation & Specifications</h4>
                {!isAdminAuthenticated && (
                  <span className="text-[10px] bg-amber-950/80 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-800/60 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Admin Only
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">Download complete architecture in Microsoft Word (.docx) & PDF (.pdf)</p>
            </div>
          </div>

          <button
            onClick={handleDocsClick}
            className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {isAdminAuthenticated ? <FileText className="w-4 h-4" /> : <Lock className="w-4 h-4 text-amber-300" />}
            <span>{isAdminAuthenticated ? 'Open & Download Docs' : 'Admin Unlock & Download'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
