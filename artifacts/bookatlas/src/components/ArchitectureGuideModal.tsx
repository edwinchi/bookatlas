import React, { useState } from 'react';
import { 
  X, 
  HelpCircle, 
  Layers, 
  BookOpen, 
  Server, 
  ShieldCheck, 
  CreditCard, 
  Smartphone, 
  Database, 
  Cpu, 
  Search, 
  Code, 
  CheckCircle2,
  ChevronRight
} from 'lucide-react';

interface ArchitectureGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureGuideModal: React.FC<ArchitectureGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeSection, setActiveSection] = useState<'overview' | 'reader' | 'backend' | 'drm' | 'ecommerce' | 'sync'>('overview');

  if (!isOpen) return null;

  const sections = [
    { id: 'overview', title: '1. Architecture Blueprint', icon: Layers },
    { id: 'reader', title: '2. In-Browser eReader Engine', icon: BookOpen },
    { id: 'backend', title: '3. Microservices & Search', icon: Server },
    { id: 'drm', title: '4. EPUB Ingestion & DRM', icon: ShieldCheck },
    { id: 'ecommerce', title: '5. Subscriptions & Loyalty', icon: CreditCard },
    { id: 'sync', title: '6. Cross-Device Reading Sync', icon: Smartphone },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="bg-[#1c1d1f] text-white px-6 sm:px-8 py-5 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-serif font-black text-xl shadow-xs">
              B
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Technical Blueprint</span>
                <span className="text-xs text-slate-400">• Bookatlas & Atlantean Globals Architecture</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                How to Build an Enterprise eBook & Audiobook Platform
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Sidebar + Main Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Navigation Sidebar */}
          <aside className="w-full md:w-64 bg-gray-50 border-r border-gray-200 p-4 shrink-0 space-y-1 overflow-y-auto">
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-3 py-2">
              Implementation Guide
            </div>
            {sections.map((sec) => {
              const Icon = sec.icon;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id as any)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer text-left ${
                    activeSection === sec.id
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'text-gray-700 hover:bg-gray-200/70 hover:text-gray-950'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{sec.title}</span>
                </button>
              );
            })}

            <div className="pt-6 px-3">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5" /> Key Tech Stack
                </div>
                <p className="text-amber-800">
                  React/Next.js, Node/Go, Epub.js / Readium, Elasticsearch, PostgreSQL, Redis, Stripe, CDN.
                </p>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 p-6 sm:p-8 overflow-y-auto space-y-6">
            
            {activeSection === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-950">
                    High-Level System Architecture of Bookatlas.com
                  </h3>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                    Building an enterprise digital bookstore and reading ecosystem requires orchestrating five major pillars: an editorial discovery storefront, an in-browser reflowable reader with Gemini AI Co-Pilot, DRM/content ingestion pipeline, recurring subscriptions (Bookatlas Plus), and cross-device sync.
                  </p>
                </div>

                {/* Architecture Visual Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-sm text-gray-900">1. Storefront & Web eReader</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Next.js/React storefront with server-side rendered book detail pages (for SEO), instant book previews, audio sample waveform players, and customizable typography themes.
                    </p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      <Database className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-sm text-gray-900">2. Catalog & Fast Search</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Elasticsearch or Typesense cluster indexing millions of book records with fuzzy search for authors, ISBNs, series rankings, genre hierarchies, and reader reviews.
                    </p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-sm text-gray-900">3. EPUB & DRM Pipeline</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Publisher ingestion microservice receiving ONIX XML feeds, unpacking EPUB3 ZIP containers, validating XML schemas, and encrypting with Adobe Content Server / Readium LCP.
                    </p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-sm text-gray-900">4. Whispersync State Engine</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      WebSocket / REST sync protocol updating canonical fragment identifiers (EPUB CFIs), bookmarks, and note highlights across browser, eReaders, and native mobile apps.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-stone-900 text-white rounded-2xl space-y-2">
                  <h4 className="font-bold text-sm text-amber-300">💡 Step-by-Step Implementation Roadmap:</h4>
                  <ol className="text-xs space-y-1.5 text-gray-300 list-decimal pl-4">
                    <li><strong className="text-white">Phase 1:</strong> Build the digital storefront catalog with filters, search, cart, and sample chapters (as demonstrated in this app).</li>
                    <li><strong className="text-white">Phase 2:</strong> Embed an open-source EPUB renderer (Epub.js or Foliate-js) for reading reflowable books with font settings and themes.</li>
                    <li><strong className="text-white">Phase 3:</strong> Build the backend catalog API and user library sync service using PostgreSQL and Redis.</li>
                    <li><strong className="text-white">Phase 4:</strong> Integrate payment gateways (Stripe) and subscription billing for unlimited reading plans.</li>
                    <li><strong className="text-white">Phase 5:</strong> Add publisher ONIX ingestion, social watermarking, or DRM protection.</li>
                  </ol>
                </div>
              </div>
            )}

            {activeSection === 'reader' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-xl font-bold text-gray-950">
                    In-Browser eReader & AI Rendering Architecture
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    How enterprise eReaders like Bookatlas render reflowable EPUB3 files in modern web browsers.
                  </p>
                </div>

                <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                    <h4 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      1. Open-Source Web EPUB Renderers
                    </h4>
                    <p>
                      Rather than writing a full HTML/XML layout engine from scratch, modern web apps use:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-gray-600">
                      <li><strong>Epub.js</strong>: The most popular JavaScript library for rendering EPUB files across modern browsers with pagination and CFI support.</li>
                      <li><strong>Readium.js / Readium Web</strong>: The industry standard open-source framework developed by the European Digital Reading Lab (EDRLab).</li>
                      <li><strong>Foliate-js</strong>: Modern, lightweight reader engine supporting EPUB, MOBI, AZW, and CBZ comic archives.</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                    <h4 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      2. Canonical Fragment Identifiers (EPUB CFI)
                    </h4>
                    <p>
                      Because screen sizes and font settings change, page numbers like "Page 42" are not fixed. Bookatlas uses <strong>EPUB CFI</strong> strings (e.g. <code className="bg-gray-200 px-1 py-0.5 rounded-sm font-mono text-[11px]">epubcfi(/6/4[chap01]!/4/2/10/1:0)</code>) to pinpoint the exact DOM node and character offset where the user stopped reading.
                    </p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                    <h4 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      3. Reader Themes & Typography Controls
                    </h4>
                    <p>
                      Dynamic CSS variables allow immediate switching between Day, Sepia (warm paper #fbf0d9), and Dark OLED modes, font size scaling, line height, and specialized fonts like Literata, Bookerly, and OpenDyslexic.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'backend' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-xl font-bold text-gray-950">
                    Backend Microservices & Search Engine
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Scaling catalog search and user libraries to handle millions of titles and concurrent readers.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-2">
                    <h4 className="font-bold text-sm text-gray-900">Catalog Database (PostgreSQL)</h4>
                    <p className="text-gray-600">
                      Stores relational book metadata: ISBN-13, authors, publishers, pricing tiers per country/currency, tax codes, and DRM licensing tokens.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-2">
                    <h4 className="font-bold text-sm text-gray-900">Search Cluster (Elasticsearch)</h4>
                    <p className="text-gray-600">
                      Powers typeahead autocomplete, fuzzy search, facet aggregations (genre, price buckets, rating filters), and vector embeddings for AI book matching.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-2">
                    <h4 className="font-bold text-sm text-gray-900">Session & Cache (Redis)</h4>
                    <p className="text-gray-600">
                      Caches hot book records, trending bestseller carousels, active cart state, and user authentication tokens.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-2">
                    <h4 className="font-bold text-sm text-gray-900">Audio HLS CDN (Cloudflare / S3)</h4>
                    <p className="text-gray-600">
                      Stores encrypted audiobook segments streamed via HTTP Live Streaming (HLS) with pre-signed authorization cookies.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'drm' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-xl font-bold text-gray-950">
                    Content Ingestion, ONIX Feeds & DRM
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    How books arrive from publishers and how digital copyrights are enforced.
                  </p>
                </div>

                <div className="space-y-3 text-xs text-gray-700">
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <h4 className="font-bold text-sm text-gray-900 mb-1">1. ONIX 3.0 Standard</h4>
                    <p>
                      Major publishers (Penguin Random House, HarperCollins, Simon & Schuster) send automated ONIX XML feeds daily containing book metadata, territory rights, and release dates.
                    </p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <h4 className="font-bold text-sm text-gray-900 mb-1">2. DRM Choices</h4>
                    <p>
                      <strong>Adobe Content Server (ACS):</strong> Traditional DRM used for standard EPUB/PDF lending and purchases. Requires Adobe ID.<br />
                      <strong>Readium LCP (Lightweight Content Protection):</strong> Modern, open, accessible DRM standard adopted by European digital libraries.<br />
                      <strong>Social Watermarking:</strong> Embedding the buyer's encrypted name & transaction ID invisibly into the EPUB code (common for indie authors).
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'ecommerce' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-xl font-bold text-gray-950">
                    E-Commerce, Subscriptions & Loyalty Points
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Handling one-off purchases, recurring memberships (Bookatlas Plus), and Reader Club points.
                  </p>
                </div>

                <div className="space-y-3 text-xs text-gray-700">
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <h4 className="font-bold text-sm text-gray-900 mb-1">Bookatlas Plus Unlimited Subscription Model</h4>
                    <p>
                      Users pay a fixed monthly subscription ($9.99/mo). Royalty payouts to authors/publishers are calculated from a global subscriber pool based on validated page reads (tracked by CFI progress beacons).
                    </p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <h4 className="font-bold text-sm text-gray-900 mb-1">Bookatlas Reader Club Points Integration</h4>
                    <p>
                      Users earn 10-20 points per dollar spent. Points can be redeemed at checkout for instant order discounts, driving cross-ecosystem retention.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'sync' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-xl font-bold text-gray-950">
                    Cross-Device Reading Sync (Hardware & Mobile)
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    How Bookatlas synchronizes reading position between e-Ink eReaders (Bookatlas Clara, Libra), iPhone, Android, and Web browsers.
                  </p>
                </div>

                <div className="p-4 bg-stone-900 text-white rounded-2xl text-xs space-y-3">
                  <h4 className="font-bold text-amber-300">Sync Beacon JSON Schema:</h4>
                  <pre className="bg-stone-950 p-3 rounded-lg text-emerald-400 font-mono text-[11px] overflow-x-auto">
{`{
  "bookId": "atlas-001",
  "userId": "usr_99812",
  "lastReadLocation": "epubcfi(/6/12[ch03]!/4/2/8)",
  "progressPercentage": 42.5,
  "readingTimeSeconds": 1420,
  "clientTimestamp": "2026-08-24T08:30:00Z",
  "deviceType": "Bookatlas_Libra_Colour",
  "bookmarks": ["epubcfi(/6/4[ch01]!/4/2/1)"],
  "highlights": [
    {
      "id": "hl_102",
      "cfiRange": "epubcfi(/6/12[ch03]!/4/2/8:12,/4/2/8:94)",
      "color": "yellow",
      "note": "Important celestial coordinate"
    }
  ]
}`}
                  </pre>
                  <p className="text-gray-300">
                    Whenever an eReader wakes from sleep or connects to Wi-Fi, it pushes the latest reading timestamp to the synchronization service, resolving conflicts with a Last-Write-Wins (LWW) or Highest-Progression algorithm.
                  </p>
                </div>
              </div>
            )}

          </main>
        </div>

      </div>
    </div>
  );
};
