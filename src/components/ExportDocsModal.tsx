import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  Download, 
  FileCheck, 
  Sparkles, 
  ShieldCheck, 
  Building2, 
  Layers, 
  Cpu, 
  Database,
  BookOpen,
  CheckCircle2,
  Printer
} from 'lucide-react';
import { Book } from '../types';
import { downloadWordDocument, downloadPDFDocument } from '../utils/exportDocs';

interface ExportDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
  books: Book[];
}

export function ExportDocsModal({ isOpen, onClose, books }: ExportDocsModalProps) {
  const [isExportingWord, setIsExportingWord] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownloadWord = async () => {
    setIsExportingWord(true);
    try {
      await downloadWordDocument(books);
      setDownloadSuccess('Microsoft Word document (.docx) successfully generated and downloaded!');
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch (err) {
      console.error('Word export error:', err);
    } finally {
      setIsExportingWord(false);
    }
  };

  const handleDownloadPDF = () => {
    setIsExportingPDF(true);
    try {
      downloadPDFDocument(books);
      setDownloadSuccess('PDF document (.pdf) successfully generated and downloaded!');
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white text-slate-900 w-full max-w-4xl h-[90vh] max-h-[860px] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Complete Project Documentation & Architecture Export
                </h2>
                <span className="bg-blue-500/20 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-400/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Certified Dutch B.V.
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Official specifications report: In-Browser eReader, Manager Autopilot, and Google Gemini Multi-Modal Engine
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

        {/* Download Action Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Download Official Package:</span>
            {downloadSuccess && (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {downloadSuccess}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Word Download */}
            <button
              onClick={handleDownloadWord}
              disabled={isExportingWord}
              className="px-4 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md cursor-pointer transition-colors"
            >
              <FileCheck className="w-4 h-4" />
              <span>{isExportingWord ? 'Building .DOCX...' : 'Download Microsoft Word (.docx)'}</span>
            </button>

            {/* PDF Download */}
            <button
              onClick={handleDownloadPDF}
              disabled={isExportingPDF}
              className="px-4 py-2.5 bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>{isExportingPDF ? 'Generating PDF...' : 'Download PDF Document (.pdf)'}</span>
            </button>
          </div>
        </div>

        {/* Document Interactive Preview Canvas */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-[#f8fafc] space-y-6 font-sans">
          
          {/* Document Cover Card */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-200 pb-6 text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold border border-indigo-200">
                <Building2 className="w-3.5 h-3.5" /> Atlantean Globals Services B.V. (Netherlands)
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Bookatlas™ Enterprise Architecture & AI Operations Report
              </h1>
              <p className="text-sm text-slate-500 max-w-2xl mx-auto">
                Comprehensive Engineering Specification, DRM-Compliant In-Browser eReader, Single-Manager Autopilot Suite, and Google Gemini Multi-Modal Model Integrations.
              </p>
            </div>

            {/* Section 1: Executive Summary */}
            <div className="space-y-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                1. Executive Summary & Corporate Ownership
              </h3>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                Bookatlas is the world-class digital eBook Store, audiobook distributor, and browser-native EPUB3 reading engine operated by <strong>Atlantean Globals Services B.V.</strong>, registered in the Netherlands (Amsterdam Keizersgracht publishing corridor). The application empowers readers with over 1.5 million titles, Bookatlas Plus subscription reading (€9.99/mo), and fully autonomous AI agents that run on a high-throughput single-port full-stack architecture.
              </p>
            </div>

            {/* Section 2: Technology Stack */}
            <div className="space-y-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                2. Technology Stack & Runtime Architecture
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="font-bold text-slate-900 mb-1">Frontend Engineering</div>
                  <p className="text-slate-600">React 19, TypeScript, Tailwind CSS v4, Motion layout animations, Lucide icons, Canvas Confetti celebrations.</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="font-bold text-slate-900 mb-1">Backend & Server-Side Security</div>
                  <p className="text-slate-600">Express, Node.js runtime, bundled standalone esbuild CommonJS (dist/server.cjs), port 3000 host 0.0.0.0 ingress routing.</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="font-bold text-slate-900 mb-1">In-Browser EPUB3 eReader</div>
                  <p className="text-slate-600">5 reading palettes (Day, Sepia, Night, Mint, Black), 3 font engines, 4-color highlighters, TTS speech engine, and AI copilot.</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="font-bold text-slate-900 mb-1">Single-Manager Portal</div>
                  <p className="text-slate-600">Dynamic pricing yield management, weekend flash sales (-40%), 1-click multi-category generation, and marketing studio.</p>
                </div>
              </div>
            </div>

            {/* Section 3: Gemini AI & Multi-Modal Ecosystem */}
            <div className="space-y-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Cpu className="w-4 h-4 text-indigo-600" />
                3. Google Gemini AI Models & Multi-Modal Integrations
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-indigo-600 shrink-0">• gemini-3.1-pro-preview:</span>
                  <span>Powering complex literary critiques, deep thematic scholarship, and multi-turn author coaching in the AI Chatbot.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-indigo-600 shrink-0">• gemini-3.5-flash:</span>
                  <span>Executing real-time Google Search Grounding with citations for European bestseller radars, awards, and book adaptations.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-indigo-600 shrink-0">• gemini-3.1-flash-lite:</span>
                  <span>Providing sub-second instant book briefing summaries, speed takeaways, and rapid catalog queries.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-indigo-600 shrink-0">• gemini-3.1-flash-live-preview:</span>
                  <span>Real-time bidirectional live voice companion with spoken audio synthesis and conversational memory.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-indigo-600 shrink-0">• veo-3.1-fast-generate-preview:</span>
                  <span>Animating static 2D cover illustrations into 16:9 cinematic store hero trailers and 9:16 mobile marketing reels.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-indigo-600 shrink-0">• Gemini 3.7 Flash:</span>
                  <span>Synthesizing full published-grade original books across 15 distinct genre categories with multi-paragraph sample chapters.</span>
                </li>
              </ul>
            </div>

            {/* Section 4: Catalog Manifest */}
            <div className="space-y-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Database className="w-4 h-4 text-indigo-600" />
                4. Active Catalog Manifest ({books.length} Books Live)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-100 text-slate-700 font-bold">
                    <tr>
                      <th className="p-2.5">Title</th>
                      <th className="p-2.5">Author</th>
                      <th className="p-2.5">Genre</th>
                      <th className="p-2.5">Price</th>
                      <th className="p-2.5">Bookatlas Plus</th>
                      <th className="p-2.5">Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {books.slice(0, 8).map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-semibold text-slate-900">{b.title}</td>
                        <td className="p-2.5 text-slate-600">{b.author}</td>
                        <td className="p-2.5 text-slate-600">{b.primaryGenre}</td>
                        <td className="p-2.5 font-bold text-slate-900">€{b.price.toFixed(2)}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            b.isBookatlasPlus ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {b.isBookatlasPlus ? 'Included' : 'Standard'}
                          </span>
                        </td>
                        <td className="p-2.5 text-amber-600 font-semibold">★ {b.rating}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Sign-Off */}
            <div className="pt-4 border-t border-slate-200 text-center text-xs text-slate-500">
              © 2026 Atlantean Globals Services B.V. • Amsterdam, Netherlands • Certified Technical Report
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
