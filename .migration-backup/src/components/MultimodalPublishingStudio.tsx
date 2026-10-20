import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Headphones,
  BookOpen,
  Sparkles,
  Send,
  Mail,
  CheckCircle2,
  AlertCircle,
  Layers,
  ArrowRight,
  RefreshCw,
  Plus,
  Trash2,
  FolderPlus,
  Share2,
  Tag,
  Clock,
  Mic
} from 'lucide-react';
import { Book } from '../types';
import { GENRES } from '../data/booksData';
import { TRANSLATIONS } from '../data/translations';

interface MultimodalPublishingStudioProps {
  onBookPublished: (book: Book) => void;
  language?: 'en' | 'nl';
  currencySymbol?: string;
  categories: string[];
  onAddCategory: (categoryName: string) => void;
}

export const MultimodalPublishingStudio: React.FC<MultimodalPublishingStudioProps> = ({
  onBookPublished,
  language = 'en',
  currencySymbol = '€',
  categories,
  onAddCategory
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  // Form State
  const [fileList, setFileList] = useState<File[]>([]);
  const [fileTextContent, setFileTextContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [authorName, setAuthorName] = useState<string>('Atlantean Scholar & Archivist');
  const [rawTitle, setRawTitle] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>(categories[0] || 'African Philosophy & Ancient Wisdom');
  const [newCategoryInput, setNewCategoryInput] = useState<string>('');
  const [showAddCategoryBox, setShowAddCategoryBox] = useState<boolean>(false);
  const [editorNotes, setEditorNotes] = useState<string>('Synthesize into a high-caliber publication with authentic chapter cadence, historical grounding, and expressive studio TTS narration.');
  const [voiceNarrator, setVoiceNarrator] = useState<string>('Kore (Studio AI Vocalist)');
  const [targetLanguage, setTargetLanguage] = useState<string>('English');
  
  // Automation Flags
  const [notifyPublisher, setNotifyPublisher] = useState<boolean>(true);
  const [publisherEmail, setPublisherEmail] = useState<string>('eddyteddy78@gmail.com');
  const [dispatchUserCampaign, setDispatchUserCampaign] = useState<boolean>(true);

  // Processing State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processStep, setProcessStep] = useState<string>('');
  const [resultData, setResultData] = useState<{
    book?: Book;
    publisherEmail?: any;
    userCampaign?: any;
    dispatchedUsersCount?: number;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Email Dispatches History
  const [recentDispatches, setRecentDispatches] = useState<any[]>([]);

  useEffect(() => {
    fetchEmailDispatches();
  }, []);

  const fetchEmailDispatches = async () => {
    try {
      const res = await fetch('/api/manager/email-dispatches');
      const data = await res.json();
      if (data.success && data.dispatches) {
        setRecentDispatches(data.dispatches);
      }
    } catch (e) {
      // ignore
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setFileName(file.name);
    setFileList(Array.from(files));

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setFileTextContent(content || '');
      if (!rawTitle) {
        setRawTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
      }
    };

    if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      reader.readAsText(file);
    } else {
      // For binary files (PDF/Images), read preview note
      setFileTextContent(`[Ingested Document Stream: ${file.name}, size: ${(file.size / 1024).toFixed(1)} KB, type: ${file.type}]`);
      if (!rawTitle) {
        setRawTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
      }
    }
  };

  const handleCreateNewCategory = () => {
    if (!newCategoryInput.trim()) return;
    const cat = newCategoryInput.trim();
    onAddCategory(cat);
    setSelectedCategory(cat);
    setNewCategoryInput('');
    setShowAddCategoryBox(false);
  };

  const handleSynthesizeAndPublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setErrorMessage(null);
    setResultData(null);
    setProcessStep('Ingesting Multimodal Files & Synthesizing Manuscript...');

    try {
      setTimeout(() => setProcessStep('Generating Chapter Structure, EPUB3 & Studio TTS Audio...'), 700);
      setTimeout(() => setProcessStep('Assigning Category, DRM Verification & Dispatching Campaigns...'), 1400);

      const response = await fetch('/api/manager/multimodal-ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileContents: fileTextContent,
          fileName,
          targetCategory: selectedCategory,
          authorName,
          rawTitle,
          notes: editorNotes,
          voiceNarrator,
          notifyPublisher,
          publisherEmail,
          dispatchUserCampaign,
          targetLanguage
        })
      });

      const data = await response.json();
      if (data.success && data.book) {
        setResultData(data);
        onBookPublished(data.book);
        fetchEmailDispatches();
      } else {
        throw new Error(data.error || 'Failed to synthesize eBook and Audiobook');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during autonomous publishing.');
    } finally {
      setIsProcessing(false);
      setProcessStep('');
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Hero Ingest Header */}
      <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-2">
            <span className="bg-amber-400 text-slate-950 text-xs font-extrabold px-3 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Multimodal Ingest Studio
            </span>
            <span className="text-xs text-slate-400">Autonomous eBook, Audiobook & Launch Engine</span>
          </div>

          <span className="text-xs text-indigo-300 font-bold bg-white/10 px-3 py-1 rounded-xl">
            Model: Gemini 3.7 Flash & Studio Voice
          </span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-serif font-extrabold text-white">
          {t.uploadManuscript}
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-3xl leading-relaxed">
          {t.uploadSubtitle}
        </p>
      </div>

      {/* Success Notification Card */}
      {resultData && resultData.book && (
        <div className="bg-emerald-950/40 border-2 border-emerald-500/60 rounded-3xl p-6 shadow-xl animate-fadeIn text-white space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-bold text-emerald-200">
                  eBook & Audiobook Published Live in Storefront!
                </h3>
                <p className="text-xs text-slate-300">
                  Assigned Category: <strong className="text-amber-400">{resultData.book.primaryGenre}</strong> • ISBN: {resultData.book.isbn}
                </p>
              </div>
            </div>

            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-xl border border-emerald-500/30">
              Live in Catalog
            </span>
          </div>

          {/* Book Details Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/60 p-4 rounded-2xl border border-white/10">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Title & Author</p>
              <p className="text-sm font-bold text-white">{resultData.book.title}</p>
              <p className="text-xs text-slate-300">by {resultData.book.author}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Narrator & Format</p>
              <p className="text-xs font-semibold text-slate-200">{resultData.book.narrator}</p>
              <p className="text-xs text-amber-400 font-bold">EPUB3 + {resultData.book.audioDurationMinutes} min Studio Audio</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Campaign Dispatch Status</p>
              <p className="text-xs text-emerald-400 font-bold">
                ✓ Publisher Notification Sent
              </p>
              <p className="text-xs text-indigo-300 font-bold">
                ✓ Campaign Broadcasted to {resultData.dispatchedUsersCount || 3} Registered Readers
              </p>
            </div>
          </div>

          {/* Quick Preview of Email and Campaign */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {resultData.publisherEmail && (
              <div className="p-3.5 bg-white/5 rounded-xl border border-white/10">
                <p className="font-bold text-amber-300 flex items-center gap-1.5 mb-1">
                  <Mail className="w-3.5 h-3.5" /> Publisher Letter Delivered:
                </p>
                <p className="text-slate-300 line-clamp-3 italic">"{resultData.publisherEmail.body}"</p>
              </div>
            )}
            {resultData.userCampaign && (
              <div className="p-3.5 bg-white/5 rounded-xl border border-white/10">
                <p className="font-bold text-indigo-300 flex items-center gap-1.5 mb-1">
                  <Send className="w-3.5 h-3.5" /> Reader Launch Campaign:
                </p>
                <p className="text-slate-300 line-clamp-3 italic">"{resultData.userCampaign.emailBody}"</p>
              </div>
            )}
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <p className="text-xs font-semibold">{errorMessage}</p>
        </div>
      )}

      {/* Main Form Layout */}
      <form onSubmit={handleSynthesizeAndPublish} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Upload & Content Details (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* File Dropzone */}
          <div className="bg-white rounded-3xl border-2 border-dashed border-indigo-200 hover:border-indigo-500 p-6 sm:p-8 transition-colors text-center relative group">
            <input
              type="file"
              accept=".txt,.md,.pdf,.png,.jpg,.jpeg,.json,.docx"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
            />
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-7 h-7" />
            </div>

            <h3 className="text-base font-serif font-bold text-slate-900 mb-1">
              {fileName ? `Loaded: ${fileName}` : 'Drop Text Files, PDFs, Pictures or Notes here'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-3">
              Supports .txt, .md, PDF manuscript drafts, book cover art, chapter outlines, and audio transcripts.
            </p>
            <span className="inline-block px-4 py-1.5 bg-slate-950 text-white text-xs font-bold rounded-xl shadow-sm">
              Browse Local Files
            </span>
          </div>

          {/* Text/Manuscript Preview Area */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600" />
                Ingested Content & Manuscript Excerpt
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                {fileTextContent.length} characters
              </span>
            </div>

            <textarea
              rows={5}
              value={fileTextContent}
              onChange={(e) => setFileTextContent(e.target.value)}
              placeholder="Paste raw text, manuscript chapters, research notes, or let the uploaded file populate here..."
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all leading-relaxed"
            ></textarea>
          </div>

          {/* Book Metadata Inputs */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
              Publication Coordinates
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target / Suggested Title
                </label>
                <input
                  type="text"
                  value={rawTitle}
                  onChange={(e) => setRawTitle(e.target.value)}
                  placeholder="e.g. The Sacred Horizon of Nubia"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Author / Collective Name
                </label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="e.g. Dr. Cheikh Anta Diop"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Editorial & Synthesis Instructions
              </label>
              <input
                type="text"
                value={editorNotes}
                onChange={(e) => setEditorNotes(e.target.value)}
                placeholder="Direct the AI on tone, chapter depth, or philosophical themes..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Category, Voice, Email & Publishing Automation (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Category Assignment Box */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-500" />
                Target Bookstore Category
              </label>
              <button
                type="button"
                onClick={() => setShowAddCategoryBox(!showAddCategoryBox)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                {t.addCategory}
              </button>
            </div>

            {showAddCategoryBox && (
              <div className="p-3.5 bg-indigo-50/70 rounded-2xl border border-indigo-100 space-y-2 animate-fadeIn">
                <p className="text-[11px] font-bold text-indigo-950">Add Custom Publisher Category</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCategoryInput}
                    onChange={(e) => setNewCategoryInput(e.target.value)}
                    placeholder="e.g. Afrofuturism & Speculative Space"
                    className="flex-1 px-3 py-1.5 bg-white border border-indigo-200 rounded-xl text-xs font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleCreateNewCategory}
                    className="px-3 py-1.5 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-600 cursor-pointer"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Voice Narrator & Language */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Headphones className="w-4 h-4 text-indigo-600" />
              Audiobook Synthesizer & Language
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  TTS Narrator Voice
                </label>
                <select
                  value={voiceNarrator}
                  onChange={(e) => setVoiceNarrator(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                >
                  <option value="Kore (Studio AI Vocalist)">Kore (Warm, Resonant)</option>
                  <option value="Fenrir (Studio AI Vocalist)">Fenrir (Deep, Authoritative)</option>
                  <option value="Puck (Studio AI Vocalist)">Puck (Playful, Dynamic)</option>
                  <option value="Zephyr (Studio AI Vocalist)">Zephyr (Calm, Meditative)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Language / Taal
                </label>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                >
                  <option value="English">English</option>
                  <option value="Dutch">Nederlands (Dutch)</option>
                  <option value="French">Français (French)</option>
                  <option value="Spanish">Español (Spanish)</option>
                  <option value="Swahili">Kiswahili</option>
                </select>
              </div>
            </div>
          </div>

          {/* Automated Notifications & Marketing Triggers */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-emerald-600" />
              Autonomous Distribution & Campaigns
            </h4>

            <div className="space-y-3">
              {/* Publisher Email Checkbox */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="notify-pub-check"
                    checked={notifyPublisher}
                    onChange={(e) => setNotifyPublisher(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                  />
                  <label htmlFor="notify-pub-check" className="text-xs font-bold text-slate-900 cursor-pointer">
                    {t.sendEmailToPublisher}
                  </label>
                </div>
                {notifyPublisher && (
                  <input
                    type="email"
                    value={publisherEmail}
                    onChange={(e) => setPublisherEmail(e.target.value)}
                    placeholder="publisher@atlanteanglobals.nl"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                  />
                )}
              </div>

              {/* User Launch Campaign Checkbox */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="dispatch-user-check"
                    checked={dispatchUserCampaign}
                    onChange={(e) => setDispatchUserCampaign(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                  />
                  <label htmlFor="dispatch-user-check" className="text-xs font-bold text-slate-900 cursor-pointer">
                    {t.dispatchCampaignToUsers}
                  </label>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 pl-6">
                  Broadcasts new release newsletter, BookTok hooks, and subscriber discount codes to all registered emails.
                </p>
              </div>
            </div>
          </div>

          {/* Main Action Publish Button */}
          <button
            type="submit"
            disabled={isProcessing}
            className="w-full py-4 bg-gradient-to-r from-slate-950 via-indigo-900 to-slate-950 hover:from-slate-900 hover:to-indigo-800 disabled:opacity-50 text-white font-extrabold text-sm rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2.5 cursor-pointer"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
                <span>{processStep || 'Synthesizing Multimodal Book...'}</span>
              </span>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span>Synthesize & Publish Book</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>

      </form>

      {/* Recent Dispatches Log */}
      {recentDispatches.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-indigo-600" />
              Live Publisher & Reader Email Dispatch Logs
            </h4>
            <span className="text-xs text-slate-400 font-medium">
              {recentDispatches.length} emails dispatched
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-1">
            {recentDispatches.slice(0, 8).map((d) => (
              <div key={d.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${d.type === 'publisher_notification' ? 'bg-amber-500' : 'bg-indigo-500'}`}></span>
                  <div>
                    <p className="font-bold text-slate-900">{d.subject}</p>
                    <p className="text-[11px] text-slate-500">To: {d.recipient} • {d.timestamp}</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold text-[10px] rounded-md">
                  Delivered
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
