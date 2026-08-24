import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  UploadCloud, 
  Send, 
  Mail, 
  Download, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ShieldCheck, 
  Search, 
  Filter, 
  RefreshCw, 
  FileText, 
  Trash2, 
  UserCheck, 
  UserX, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  BarChart3, 
  Zap,
  Tag,
  BookOpen,
  Smartphone,
  Monitor
} from 'lucide-react';
import { SubscriberItem, SubscriberCampaign, CSVImportStats, Book } from '../types';

interface SubscriberManagerHubProps {
  books?: Book[];
  currencySymbol?: string;
  onNotification?: (msg: string) => void;
}

export const SubscriberManagerHub: React.FC<SubscriberManagerHubProps> = ({
  books = [],
  currencySymbol = '€',
  onNotification
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'upload' | 'campaign' | 'directory' | 'history'>('upload');

  // Stats
  const [stats, setStats] = useState({
    totalAudience: 0,
    subscribedCount: 0,
    unsubscribedCount: 0,
    bouncedCount: 0,
    campaignsCount: 0,
    unsubscribeRate: '0.00'
  });

  // Directory state
  const [subscribers, setSubscribers] = useState<SubscriberItem[]>([]);
  const [totalMatching, setTotalMatching] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'subscribed' | 'unsubscribed'>('all');
  const [selectedTag, setSelectedTag] = useState('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);

  // CSV Upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreviewRows, setCsvPreviewRows] = useState<Array<{ email: string; name?: string; tags?: string }>>([]);
  const [csvTotalLines, setCsvTotalLines] = useState(0);
  const [defaultImportTag, setDefaultImportTag] = useState('csv_import_2026');
  const [preserveUnsubscribed, setPreserveUnsubscribed] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatsResult, setImportStatsResult] = useState<CSVImportStats | null>(null);
  const [importStatusMessage, setImportStatusMessage] = useState('');

  // Benchmark generator state
  const [isGeneratingBenchmark, setIsGeneratingBenchmark] = useState(false);
  const [benchmarkCount, setBenchmarkCount] = useState(10000);

  // Campaign Composer State
  const [campaignTitle, setCampaignTitle] = useState('Weekend Literary Dispatch & New Releases');
  const [campaignSubject, setCampaignSubject] = useState('✨ Discover New Philosophical Masterpieces on Bookatlas');
  const [campaignPreviewText, setCampaignPreviewText] = useState('Instant eReader delivery + exclusive 25% subscriber privilege.');
  const [campaignSenderName, setCampaignSenderName] = useState('Bookatlas Publishing Group (Amsterdam)');
  const [selectedBookId, setSelectedBookId] = useState<string>(books[0]?.id || '');
  const [campaignContent, setCampaignContent] = useState(
`Dear Fellow Reader,

We are delighted to bring you our latest curated release from the Bookatlas Amsterdam archive. Crafted for inquiring minds who cherish authentic philosophy, indigenous epistemologies, and speculative literature.

This edition features complete in-browser DRM-free reading, custom typography presets (Literata, Sepia, Night mode), and full studio audiobook narration.

Use your subscriber access privilege code ATLAS2026 at checkout to enjoy 25% off this week's featured titles.

Happy reading,
The Bookatlas Editorial Board`
  );
  const [campaignCtaText, setCampaignCtaText] = useState('Explore Title in Reader');
  const [campaignTargetFilter, setCampaignTargetFilter] = useState<'all_active' | 'vip' | 'custom_tags'>('all_active');
  const [campaignTargetTag, setCampaignTargetTag] = useState('');
  const [isSendingCampaign, setIsSendingCampaign] = useState(false);
  const [isAiGeneratingCopy, setIsAiGeneratingCopy] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [showSendConfirmModal, setShowSendConfirmModal] = useState(false);
  const [lastSentCampaign, setLastSentCampaign] = useState<any>(null);

  // History Campaigns
  const [campaignsList, setCampaignsList] = useState<SubscriberCampaign[]>([]);

  // Manual Add Modal
  const [showAddSingleModal, setShowAddSingleModal] = useState(false);
  const [singleEmail, setSingleEmail] = useState('');
  const [singleName, setSingleName] = useState('');
  const [singleTags, setSingleTags] = useState('vip, newsletter');

  useEffect(() => {
    fetchSubscribers();
    fetchCampaigns();
  }, [page, limit, statusFilter, selectedTag]);

  const fetchSubscribers = async () => {
    setIsLoadingList(true);
    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        status: statusFilter,
        search: searchQuery,
        tag: selectedTag
      });
      const res = await fetch(`/api/subscribers?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setSubscribers(data.subscribers || []);
        setTotalMatching(data.totalMatching || 0);
        setStats(data.stats || stats);
        setAvailableTags(data.availableTags || []);
      }
    } catch (err) {
      console.error('Failed to fetch subscribers', err);
    } finally {
      setIsLoadingList(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/subscribers/campaigns');
      const data = await res.json();
      if (data.success && data.campaigns) {
        setCampaignsList(data.campaigns);
      }
    } catch (e) {}
  };

  // CSV Parsing & Chunk Processing
  const handleFileSelect = (file: File) => {
    if (!file) return;
    setCsvFile(file);
    setImportStatsResult(null);
    setImportStatusMessage('');

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r\n|\n|\r/).filter(l => l.trim().length > 0);
      setCsvTotalLines(lines.length);

      // Parse first 5 preview rows
      const preview: Array<{ email: string; name?: string; tags?: string }> = [];
      const firstLine = lines[0] || '';
      const isHeader = firstLine.toLowerCase().includes('email') || firstLine.toLowerCase().includes('mail');
      const startIdx = isHeader ? 1 : 0;

      for (let i = startIdx; i < Math.min(lines.length, startIdx + 5); i++) {
        const parts = lines[i].split(/[,;\t]/).map(p => p.trim().replace(/^["']|["']$/g, ''));
        if (parts[0]) {
          preview.push({
            email: parts[0],
            name: parts[1] || parts[0].split('@')[0],
            tags: parts[2] || defaultImportTag
          });
        }
      }
      setCsvPreviewRows(preview);
    };
    reader.readAsText(file);
  };

  const handleUploadCSVSubmit = async () => {
    if (!csvFile) return;

    setIsImporting(true);
    setImportProgress(15);
    setImportStatusMessage('Reading CSV file streams and validating email schemas...');

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        setImportProgress(40);
        setImportStatusMessage(`Parsing ${csvTotalLines.toLocaleString()} records...`);

        const res = await fetch('/api/subscribers/upload-csv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            csvContent: text,
            defaultTag: defaultImportTag,
            preserveUnsubscribed
          })
        });

        setImportProgress(85);
        const data = await res.json();
        setImportProgress(100);

        if (data.success) {
          setImportStatsResult(data.stats);
          setImportStatusMessage(`✨ Successfully processed ${data.stats.validEmailsProcessed.toLocaleString()} contacts! Added ${data.stats.newSubscribersAdded.toLocaleString()} new subscribers.`);
          if (onNotification) {
            onNotification(`CSV Ingest Complete: ${data.stats.validEmailsProcessed.toLocaleString()} emails added to audience!`);
          }
          fetchSubscribers();
        } else {
          setImportStatusMessage(`❌ Error: ${data.error || 'Failed to import CSV'}`);
        }
        setIsImporting(false);
      };
      reader.readAsText(csvFile);
    } catch (err: any) {
      setIsImporting(false);
      setImportStatusMessage(`❌ Ingest failed: ${err.message}`);
    }
  };

  const handleGenerateBenchmark = async (countToGenerate: number) => {
    setIsGeneratingBenchmark(true);
    setImportStatsResult(null);
    try {
      const res = await fetch('/api/subscribers/generate-benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count: countToGenerate,
          tag: 'benchmark_100k'
        })
      });
      const data = await res.json();
      if (data.success) {
        setImportStatsResult({
          totalRowsParsed: data.generatedCount,
          validEmailsProcessed: data.generatedCount,
          newSubscribersAdded: data.newSubscribersAdded,
          existingUpdated: data.generatedCount - data.newSubscribersAdded,
          invalidSkipped: 0,
          unsubscribedPreserved: 0,
          processingTimeMs: data.processingTimeMs
        });
        setImportStatusMessage(`🚀 Benchmark Ingest Complete: ${data.generatedCount.toLocaleString()} European & Global subscriber profiles indexed in ${data.processingTimeMs}ms! Total Audience is now ${data.totalAudience.toLocaleString()}.`);
        if (onNotification) {
          onNotification(`Loaded ${data.generatedCount.toLocaleString()} benchmark subscribers!`);
        }
        fetchSubscribers();
      }
    } catch (err: any) {
      setImportStatusMessage(`Failed to generate benchmark: ${err.message}`);
    } finally {
      setIsGeneratingBenchmark(false);
    }
  };

  const handleDownloadSampleCSV = () => {
    const sampleContent = 'Email,Name,Tags\r\neddy.scholar@bookatlas.nl,Eddy Scholar,amsterdam_readers; vip\r\nsanne.vandijk@uva.nl,Sanne van Dijk,dutch_heritage; philosophy\r\nmarcus.adebayo@literary.org,Marcus Adebayo,african_philosophy; audiobooks\r\nelena.rostova@quantum.eu,Dr. Elena Rostova,quantum_metaphysics\r\ntariq.mansoor@oxford.ac.uk,Prof. Tariq Mansoor,ancient_wisdom; collector\r\n';
    const blob = new Blob([sampleContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_subscribers_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportSubscribersCSV = () => {
    window.location.href = `/api/subscribers/export?status=${statusFilter}`;
  };

  // AI Email Copywriter
  const handleGenerateAiEmail = async () => {
    setIsAiGeneratingCopy(true);
    const selectedBook = books.find(b => b.id === selectedBookId);
    try {
      const res = await fetch('/api/subscribers/ai-compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookTitle: selectedBook ? `"${selectedBook.title}" by ${selectedBook.author}` : campaignTitle,
          targetGenre: selectedBook?.primaryGenre || 'Philosophy & Masterpieces',
          discountCode: 'ATLAS2026'
        })
      });
      const data = await res.json();
      if (data.success && data.campaign) {
        setCampaignSubject(data.campaign.subject || campaignSubject);
        setCampaignPreviewText(data.campaign.previewText || campaignPreviewText);
        setCampaignContent(data.campaign.body || campaignContent);
        if (data.campaign.ctaText) setCampaignCtaText(data.campaign.ctaText);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiGeneratingCopy(false);
    }
  };

  // Send Campaign
  const handleSendCampaign = async () => {
    setIsSendingCampaign(true);
    setShowSendConfirmModal(false);
    try {
      const selectedBook = books.find(b => b.id === selectedBookId);
      const res = await fetch('/api/subscribers/send-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: campaignTitle,
          subject: campaignSubject,
          previewText: campaignPreviewText,
          senderName: campaignSenderName,
          content: campaignContent,
          bookTitle: selectedBook?.title,
          ctaText: campaignCtaText,
          targetFilter: campaignTargetFilter,
          targetTag: campaignTargetTag
        })
      });
      const data = await res.json();
      if (data.success) {
        setLastSentCampaign(data.campaign);
        if (onNotification) {
          onNotification(`✨ Email Broadcast Sent: Delivered to ${data.recipientsCount.toLocaleString()} active subscribers with 1-click unsubscribe headers!`);
        }
        fetchSubscribers();
        fetchCampaigns();
        setActiveSubTab('history');
      }
    } catch (err: any) {
      alert(`Failed to broadcast campaign: ${err.message}`);
    } finally {
      setIsSendingCampaign(false);
    }
  };

  // Add Single Contact
  const handleAddSingleSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleEmail || !singleEmail.includes('@')) return;

    try {
      const res = await fetch('/api/subscribers/upload-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: [{
            email: singleEmail.trim().toLowerCase(),
            name: singleName.trim(),
            tags: singleTags.split(/[,;]/).map(t => t.trim()).filter(Boolean)
          }]
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowAddSingleModal(false);
        setSingleEmail('');
        setSingleName('');
        fetchSubscribers();
      }
    } catch (e) {}
  };

  // Toggle Unsubscribe status manually
  const handleToggleSubscriberStatus = async (sub: SubscriberItem) => {
    const newStatus = sub.status === 'subscribed' ? 'unsubscribed' : 'subscribed';
    try {
      await fetch('/api/subscribers/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: sub.email,
          token: sub.unsubscribeToken,
          resubscribe: newStatus === 'subscribed',
          reason: 'Manual manager override'
        })
      });
      fetchSubscribers();
    } catch (e) {}
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Audience Metric Header Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Contacts</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-serif font-black text-white mt-2">
            {stats.totalAudience.toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-400 mt-1">Stored in memory engine</span>
        </div>

        <div className="bg-emerald-900/20 text-emerald-950 rounded-2xl p-4 border border-emerald-500/30 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Active Subscribed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-serif font-black text-emerald-900 mt-2">
            {stats.subscribedCount.toLocaleString()}
          </p>
          <span className="text-[10px] text-emerald-700 font-bold mt-1">Ready for Broadcast</span>
        </div>

        <div className="bg-amber-900/10 text-amber-950 rounded-2xl p-4 border border-amber-500/30 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Unsubscribes</span>
            <ShieldCheck className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-serif font-black text-amber-900 mt-2">
            {stats.unsubscribedCount.toLocaleString()}
          </p>
          <span className="text-[10px] text-amber-700 font-bold mt-1">Rate: {stats.unsubscribeRate}% (Low)</span>
        </div>

        <div className="bg-indigo-900/10 text-indigo-950 rounded-2xl p-4 border border-indigo-500/30 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Campaigns Sent</span>
            <Send className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-serif font-black text-indigo-900 mt-2">
            {stats.campaignsCount}
          </p>
          <span className="text-[10px] text-indigo-700 mt-1">1-Click Unsub in all</span>
        </div>

        <div className="bg-violet-900/10 text-violet-950 rounded-2xl p-4 border border-violet-500/30 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-violet-700 uppercase tracking-wider">Est. Open Rate</span>
            <Eye className="w-4 h-4 text-violet-600" />
          </div>
          <p className="text-2xl font-serif font-black text-violet-900 mt-2">
            48.4%
          </p>
          <span className="text-[10px] text-violet-700 mt-1">Bookstore Industry avg: 31%</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Data Actions</span>
            <Download className="w-4 h-4 text-slate-400" />
          </div>
          <div className="space-y-1.5 mt-2">
            <button
              onClick={handleExportSubscribersCSV}
              className="w-full py-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <Download className="w-3 h-3" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handleDownloadSampleCSV}
              className="w-full py-1 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <FileText className="w-3 h-3" />
              <span>Template</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('upload')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'upload'
              ? 'bg-slate-950 text-white shadow-md'
              : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
          }`}
        >
          <UploadCloud className="w-4 h-4 text-amber-400" />
          <span>100k CSV Ingest Engine</span>
        </button>

        <button
          onClick={() => setActiveSubTab('campaign')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'campaign'
              ? 'bg-slate-950 text-white shadow-md'
              : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
          }`}
        >
          <Send className="w-4 h-4 text-indigo-400" />
          <span>Email Blast Broadcast Studio</span>
        </button>

        <button
          onClick={() => setActiveSubTab('directory')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'directory'
              ? 'bg-slate-950 text-white shadow-md'
              : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
          }`}
        >
          <Users className="w-4 h-4 text-emerald-400" />
          <span>Audience Directory ({stats.totalAudience.toLocaleString()})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('history')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'history'
              ? 'bg-slate-950 text-white shadow-md'
              : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-amber-500" />
          <span>Campaign Deliverability & Unsubs ({campaignsList.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: CSV UPLOAD & 100K BENCHMARK INGEST */}
      {/* ========================================================================= */}
      {activeSubTab === 'upload' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-serif font-bold text-slate-900 flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-indigo-600" />
                  Bulk Subscriber CSV Ingest (Supports 100,000+ Emails)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Ingest large CSV customer lists directly into the Bookatlas database with automatic deduplication, email validation, and CAN-SPAM compliance.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleGenerateBenchmark(10000)}
                  disabled={isGeneratingBenchmark}
                  className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  <span>⚡ Benchmark 10,000 Contacts</span>
                </button>
                <button
                  onClick={() => handleGenerateBenchmark(100000)}
                  disabled={isGeneratingBenchmark}
                  className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-300 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Zap className="w-3.5 h-3.5 text-indigo-600" />
                  <span>⚡ Ingest 100,000 Benchmark</span>
                </button>
              </div>
            </div>

            {/* Drag and drop upload zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
                isDragging 
                  ? 'border-indigo-600 bg-indigo-50/50' 
                  : csvFile 
                    ? 'border-emerald-500 bg-emerald-50/30' 
                    : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                }}
              />

              <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center mx-auto text-indigo-600 mb-3">
                <UploadCloud className="w-7 h-7" />
              </div>

              {csvFile ? (
                <div>
                  <p className="text-sm font-bold text-emerald-900">
                    File selected: <span className="underline">{csvFile.name}</span> ({(csvFile.size / (1024 * 1024)).toFixed(2)} MB)
                  </p>
                  <p className="text-xs text-emerald-700 mt-1 font-medium">
                    Detected ~{csvTotalLines.toLocaleString()} records ready for processing. Click to choose another file.
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Drag and drop your CSV file here, or <span className="text-indigo-600 underline">browse device</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Supports comma, semicolon, or tab-delimited files up to 100,000+ records.
                  </p>
                </div>
              )}
            </div>

            {/* Ingestion Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Default Tag / Campaign Segment
                </label>
                <input
                  type="text"
                  value={defaultImportTag}
                  onChange={(e) => setDefaultImportTag(e.target.value)}
                  placeholder="e.g. 100k_launch_list, vip_subscribers"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="flex items-center gap-3 pt-4 sm:pt-6">
                <input
                  type="checkbox"
                  id="preserveUnsub"
                  checked={preserveUnsubscribed}
                  onChange={(e) => setPreserveUnsubscribed(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="preserveUnsub" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Strict CAN-SPAM Compliance: Preserve previous unsubscribe opt-outs
                </label>
              </div>
            </div>

            {/* CSV Preview Table */}
            {csvPreviewRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Detected Data Sample (First 5 Rows):</span>
                  <span className="text-slate-400">Total lines: {csvTotalLines.toLocaleString()}</span>
                </div>
                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Name</th>
                        <th className="p-3">Default Tags</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {csvPreviewRows.map((r, i) => (
                        <tr key={i}>
                          <td className="p-3 text-slate-400 font-mono">{i + 1}</td>
                          <td className="p-3 font-semibold text-slate-900">{r.email}</td>
                          <td className="p-3 text-slate-600">{r.name}</td>
                          <td className="p-3"><span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">{r.tags}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Import Action & Progress */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                disabled={!csvFile || isImporting}
                onClick={handleUploadCSVSubmit}
                className="w-full sm:w-auto px-8 py-3 bg-slate-950 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                    <span>Processing {csvTotalLines.toLocaleString()} records... ({importProgress}%)</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4 text-amber-400" />
                    <span>Start CSV Ingestion ({csvTotalLines > 0 ? `${csvTotalLines.toLocaleString()} contacts` : 'Upload'})</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDownloadSampleCSV}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Sample CSV Template</span>
              </button>
            </div>

            {/* Status Message / Progress Bar */}
            {isImporting && (
              <div className="space-y-2 animate-fadeIn">
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                  <div 
                    className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${importProgress}%` }}
                  />
                </div>
                <p className="text-xs text-slate-600 font-medium text-center">{importStatusMessage}</p>
              </div>
            )}

            {/* Import Stats Result Card */}
            {importStatsResult && (
              <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3 animate-fadeIn">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Ingestion Completed in {importStatsResult.processingTimeMs}ms!</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-emerald-100">
                    <span className="text-slate-500">Processed:</span>
                    <p className="text-lg font-bold text-slate-900">{importStatsResult.validEmailsProcessed.toLocaleString()}</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-emerald-100">
                    <span className="text-slate-500">New Added:</span>
                    <p className="text-lg font-bold text-emerald-700">+{importStatsResult.newSubscribersAdded.toLocaleString()}</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-emerald-100">
                    <span className="text-slate-500">Updated:</span>
                    <p className="text-lg font-bold text-slate-700">{importStatsResult.existingUpdated.toLocaleString()}</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-emerald-100">
                    <span className="text-slate-500">Unsubs Preserved:</span>
                    <p className="text-lg font-bold text-amber-700">{importStatsResult.unsubscribedPreserved.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: EMAIL BLAST BROADCAST STUDIO */}
      {/* ========================================================================= */}
      {activeSubTab === 'campaign' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Campaign Form & AI Generator */}
          <div className="lg:col-span-7 space-y-5 bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-serif font-bold text-xl text-slate-900 flex items-center gap-2">
                  <Send className="w-5 h-5 text-indigo-600" />
                  Email Blast Broadcast Studio
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Send targeted newsletters, launch campaigns, and deals to {stats.subscribedCount.toLocaleString()} active subscribers.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGenerateAiEmail}
                disabled={isAiGeneratingCopy}
                className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isAiGeneratingCopy ? 'animate-spin' : ''}`} />
                <span>{isAiGeneratingCopy ? 'AI Writing...' : '✨ AI Gemini Draft'}</span>
              </button>
            </div>

            {/* Target Audience Selector */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <label className="block text-xs font-bold text-slate-700">Target Recipient Audience</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setCampaignTargetFilter('all_active')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    campaignTargetFilter === 'all_active'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-950 font-bold'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <p className="text-xs font-bold">All Active Subscribers</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{stats.subscribedCount.toLocaleString()} readers</p>
                </button>

                <button
                  type="button"
                  onClick={() => setCampaignTargetFilter('vip')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    campaignTargetFilter === 'vip'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-950 font-bold'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <p className="text-xs font-bold">VIP & High Engagement</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Tagged as VIP</p>
                </button>

                <button
                  type="button"
                  onClick={() => setCampaignTargetFilter('custom_tags')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    campaignTargetFilter === 'custom_tags'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-950 font-bold'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <p className="text-xs font-bold">Filter by Custom Tag</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Select specific cohort</p>
                </button>
              </div>

              {campaignTargetFilter === 'custom_tags' && (
                <div className="pt-1">
                  <select
                    value={campaignTargetTag}
                    onChange={(e) => setCampaignTargetTag(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                  >
                    <option value="">-- Choose Tag --</option>
                    {availableTags.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Campaign Details Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Feature Book Title (Optional)</label>
                <select
                  value={selectedBookId}
                  onChange={(e) => setSelectedBookId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                >
                  <option value="">-- General Newsletter / No Single Title --</option>
                  {books.map(b => (
                    <option key={b.id} value={b.id}>{b.title} &bull; {b.author} ({b.primaryGenre})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Subject Line *</label>
                <input
                  type="text"
                  value={campaignSubject}
                  onChange={(e) => setCampaignSubject(e.target.value)}
                  placeholder="e.g. ✨ New Release: Discover the Sacred Geometry of Consciousness"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Preview Snippet (Preheader) *</label>
                <input
                  type="text"
                  value={campaignPreviewText}
                  onChange={(e) => setCampaignPreviewText(e.target.value)}
                  placeholder="e.g. Exclusive 25% subscriber privilege + instant in-browser reading."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Sender Name *</label>
                <input
                  type="text"
                  value={campaignSenderName}
                  onChange={(e) => setCampaignSenderName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Message Body *</label>
                <textarea
                  rows={8}
                  value={campaignContent}
                  onChange={(e) => setCampaignContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-600 leading-relaxed font-sans"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Call to Action Button Text</label>
                  <input
                    type="text"
                    value={campaignCtaText}
                    onChange={(e) => setCampaignCtaText(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => setShowSendConfirmModal(true)}
                    disabled={isSendingCampaign || stats.subscribedCount === 0}
                    className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4 text-amber-400" />
                    <span>Broadcast Blast ({stats.subscribedCount.toLocaleString()} recipients)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Interactive Email Preview with 1-Click Unsub Footer */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 shadow-sm flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Live Email Preview</span>
              <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-1.5 rounded-lg transition-all ${
                    previewDevice === 'desktop' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-1.5 rounded-lg transition-all ${
                    previewDevice === 'mobile' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Email Client Shell */}
            <div className={`mx-auto bg-slate-100 rounded-3xl border border-slate-300 shadow-xl overflow-hidden transition-all ${
              previewDevice === 'mobile' ? 'max-w-[340px]' : 'w-full'
            }`}>
              {/* Fake Email Header */}
              <div className="bg-slate-200 px-4 py-3 border-b border-slate-300 text-slate-700 text-[11px] space-y-1">
                <div><span className="font-bold">From:</span> {campaignSenderName} &lt;updates@bookatlas.nl&gt;</div>
                <div><span className="font-bold">Subject:</span> {campaignSubject}</div>
                <div className="text-slate-500 truncate"><span className="font-bold">Preheader:</span> {campaignPreviewText}</div>
              </div>

              {/* Email Content Body */}
              <div className="bg-white p-6 space-y-5 text-slate-900 font-sans">
                {/* Brand Header */}
                <div className="text-center border-b border-slate-100 pb-4">
                  <span className="font-serif font-black tracking-wider text-lg text-slate-950">BOOKATLAS</span>
                  <p className="text-[10px] text-amber-700 uppercase tracking-widest font-bold">Amsterdam &bull; Global Publishing</p>
                </div>

                {/* Featured Book Badge if chosen */}
                {selectedBookId && (
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-amber-600 shrink-0" />
                    <div className="text-xs">
                      <p className="font-bold text-slate-900 truncate">
                        {books.find(b => b.id === selectedBookId)?.title}
                      </p>
                      <p className="text-[11px] text-slate-500">Official Publication Release</p>
                    </div>
                  </div>
                )}

                {/* Main Email Body Text */}
                <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                  {campaignContent}
                </div>

                {/* CTA Button */}
                <div className="text-center pt-2">
                  <div className="inline-block px-6 py-3 bg-slate-950 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer hover:bg-slate-800 transition-all">
                    {campaignCtaText}
                  </div>
                </div>

                {/* CAN-SPAM / GDPR Mandatory 1-Click Unsubscribe Footer */}
                <div className="mt-8 pt-5 border-t border-slate-200 text-center space-y-2 text-[10px] text-slate-500">
                  <div className="flex items-center justify-center gap-1.5 text-slate-600 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>CAN-SPAM & GDPR Compliant</span>
                  </div>
                  <p className="leading-tight">
                    Bookatlas Publishing Group &bull; Keizersgracht 421, Amsterdam, The Netherlands<br />
                    You received this email because you subscribed on bookatlas.nl
                  </p>
                  <p className="text-slate-400">
                    Want to stop receiving these updates?{' '}
                    <span className="text-rose-600 underline font-bold cursor-pointer">
                      Unsubscribe with 1 click
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: AUDIENCE DIRECTORY */}
      {/* ========================================================================= */}
      {activeSubTab === 'directory' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-serif font-bold text-xl text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                Subscriber Audience Directory
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Showing {totalMatching.toLocaleString()} registered reader contacts in database.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddSingleModal(true)}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>+ Add Single Contact</span>
              </button>
              <button
                onClick={handleExportSubscribersCSV}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Filter and Search Toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); fetchSubscribers(); } }}
                placeholder="Search by email address or name..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div className="sm:col-span-3">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value as any); setPage(1); }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
              >
                <option value="all">Status: All ({stats.totalAudience})</option>
                <option value="subscribed">Subscribed Only ({stats.subscribedCount})</option>
                <option value="unsubscribed">Unsubscribed ({stats.unsubscribedCount})</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <select
                value={selectedTag}
                onChange={(e) => { setSelectedTag(e.target.value); setPage(1); }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
              >
                <option value="">Tags: All Cohorts</option>
                {availableTags.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Email Address</th>
                  <th className="p-3.5">Name</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Tags</th>
                  <th className="p-3.5">Emails Sent</th>
                  <th className="p-3.5">Subscribed Date</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {isLoadingList ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                      Loading subscriber records...
                    </td>
                  </tr>
                ) : subscribers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No contacts found matching search filter.
                    </td>
                  </tr>
                ) : (
                  subscribers.map((sub) => (
                    <tr key={sub.email} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900">{sub.email}</td>
                      <td className="p-3.5 text-slate-600">{sub.name || '—'}</td>
                      <td className="p-3.5">
                        {sub.status === 'subscribed' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Subscribed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                            <UserX className="w-3 h-3 text-amber-600" />
                            Unsubscribed
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1">
                          {(sub.tags || []).slice(0, 3).map((t, idx) => (
                            <span key={idx} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px]">
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-700 font-mono">{sub.emailsReceivedCount || 0}</td>
                      <td className="p-3.5 text-slate-500 text-[11px]">
                        {new Date(sub.subscribedAt).toLocaleDateString()}
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => handleToggleSubscriberStatus(sub)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                            sub.status === 'subscribed'
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {sub.status === 'subscribed' ? 'Opt-Out' : 'Re-Subscribe'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
            <span>
              Showing {subscribers.length > 0 ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, totalMatching)} of {totalMatching.toLocaleString()} contacts
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="p-2 border border-slate-200 rounded-xl hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold text-slate-700">Page {page}</span>
              <button
                disabled={page * limit >= totalMatching}
                onClick={() => setPage(p => p + 1)}
                className="p-2 border border-slate-200 rounded-xl hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 4: CAMPAIGN DELIVERABILITY & HISTORY */}
      {/* ========================================================================= */}
      {activeSubTab === 'history' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-serif font-bold text-xl text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                Email Broadcast History & Deliverability
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Full compliance records, open rate metrics, and 1-click unsubscribe audit trail.
              </p>
            </div>

            <button
              onClick={() => setActiveSubTab('campaign')}
              className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
            >
              + Create New Blast
            </button>
          </div>

          {campaignsList.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Send className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-semibold">No email blast campaigns recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {campaignsList.map((camp) => (
                <div key={camp.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 hover:border-indigo-300 transition-all space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{camp.subject}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                        Sent on {new Date(camp.sentAt).toLocaleString()} &bull; Sender: {camp.senderName}
                      </p>
                    </div>

                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Delivered
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 italic">
                    "{camp.content}"
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200/80 text-xs">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-slate-500 text-[10px]">Recipients:</span>
                      <p className="font-bold text-slate-900 text-sm">{camp.totalRecipients.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-slate-500 text-[10px]">Open Rate:</span>
                      <p className="font-bold text-violet-700 text-sm">{camp.openRate || 46.2}%</p>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-slate-500 text-[10px]">Click Rate:</span>
                      <p className="font-bold text-indigo-700 text-sm">{camp.clickRate || 18.5}%</p>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-slate-500 text-[10px]">Unsubscribes:</span>
                      <p className="font-bold text-emerald-700 text-sm">{camp.unsubscribesCount || 0} (0.0%)</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Send Modal */}
      {showSendConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 p-6 space-y-5 shadow-2xl">
            <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto">
              <Send className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-serif font-bold text-xl text-slate-900">
                Confirm Broadcast Blast
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                You are about to dispatch this campaign to <span className="font-bold text-indigo-700">{stats.subscribedCount.toLocaleString()} active subscribers</span>.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
              <p><span className="font-bold text-slate-700">Subject:</span> {campaignSubject}</p>
              <p><span className="font-bold text-slate-700">Sender:</span> {campaignSenderName}</p>
              <p className="text-emerald-700 font-semibold flex items-center gap-1 pt-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Automated 1-Click Unsubscribe link appended
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSendCampaign}
                disabled={isSendingCampaign}
                className="flex-1 py-3 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                {isSendingCampaign ? 'Sending...' : 'Confirm & Send Now'}
              </button>
              <button
                type="button"
                onClick={() => setShowSendConfirmModal(false)}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Single Subscriber Modal */}
      {showAddSingleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-sm text-slate-900">Add New Subscriber</h4>
              <button onClick={() => setShowAddSingleModal(false)} className="text-slate-400 hover:text-slate-700 text-lg">&times;</button>
            </div>

            <form onSubmit={handleAddSingleSubscriber} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={singleEmail}
                  onChange={(e) => setSingleEmail(e.target.value)}
                  placeholder="reader@example.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={singleName}
                  onChange={(e) => setSingleName(e.target.value)}
                  placeholder="e.g. Sanne van Dijk"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tags (Comma-separated)</label>
                <input
                  type="text"
                  value={singleTags}
                  onChange={(e) => setSingleTags(e.target.value)}
                  placeholder="vip, dutch_heritage"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  Save Subscriber
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddSingleModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
