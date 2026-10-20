import React, { useState } from 'react';
import {
  Sparkles,
  BookOpen,
  Tag,
  Gift,
  Flame,
  Award,
  Layers,
  Eye,
  Copy,
  Check,
  Smartphone,
  Monitor,
  Code,
  Sliders,
  Send,
  Palette,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { Book, SubscriberTier } from '../../types';

export interface VisualTemplateState {
  id: string;
  name: string;
  themeColor: string;
  bannerHeadline: string;
  preheader: string;
  greetingStyle: string;
  introText: string;
  featuredBookId: string;
  discountBadgeText: string;
  discountCode: string;
  highlightStats: boolean;
  ctaText: string;
  ctaLink: string;
  footerNote: string;
}

interface VisualTemplateDesignerProps {
  books: Book[];
  onApplyTemplateToCampaign?: (template: {
    title: string;
    subject: string;
    previewText: string;
    content: string;
    bookId: string;
    discountCode: string;
    ctaText: string;
  }) => void;
  onNotification?: (msg: string) => void;
}

export const VisualTemplateDesigner: React.FC<VisualTemplateDesignerProps> = ({
  books = [],
  onApplyTemplateToCampaign,
  onNotification
}) => {
  const [templatePreset, setTemplatePreset] = useState<'new_release' | 'vip_discount' | 'weekly_digest' | 'reading_streak' | 'audiobook_premiere'>('new_release');
  const [devicePreview, setDevicePreview] = useState<'desktop' | 'mobile'>('desktop');
  const [copiedPlaceholder, setCopiedPlaceholder] = useState<string | null>(null);
  
  // Simulated preview recipient
  const [sampleRecipientTier, setSampleRecipientTier] = useState<SubscriberTier>('vip_patron');
  const [sampleRecipientName, setSampleRecipientName] = useState('Eddy Teddy');

  // Active template configuration
  const [templateConfig, setTemplateConfig] = useState<VisualTemplateState>({
    id: 'tpl_curated_release',
    name: 'Weekend Literary Dispatch & Curated Release',
    themeColor: '#4f46e5', // indigo-600
    bannerHeadline: '✨ Discover This Week’s Masterpiece',
    preheader: 'Instant eReader delivery + exclusive subscriber privilege.',
    greetingStyle: 'Dear {{subscriber_name}},',
    introText: 'We are delighted to bring you our latest curated release from the Bookatlas Amsterdam archive. Crafted for inquiring minds who cherish authentic philosophy, indigenous epistemologies, and speculative literature.',
    featuredBookId: books[0]?.id || '',
    discountBadgeText: 'Exclusive Subscriber Privilege',
    discountCode: '{{user_discount_code}}',
    highlightStats: true,
    ctaText: 'Open in Bookatlas eReader',
    ctaLink: 'https://bookatlas.app/reader/{{book_recommendation_id}}',
    footerNote: 'You received this literary dispatch because you are subscribed to Bookatlas Amsterdam. You can update your reading preferences or unsubscribe anytime with 1-click.'
  });

  const featuredBook = books.find(b => b.id === templateConfig.featuredBookId) || books[0] || {
    id: 'sample_book',
    title: 'The Metaphysics of Akan Thought & Sacred Quantum Orature',
    author: 'Prof. Kofi Kwesi & Dr. Maya Osei',
    coverImage: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=800',
    primaryGenre: 'African Philosophy & Indigenous Traditions',
    synopsis: 'A profound exploration of ancestral consciousness, quantum ontology, and linguistic structures across West African cosmologies.',
    price: 14.99,
    pageCount: 384
  };

  // Preset switchers
  const loadPreset = (preset: 'new_release' | 'vip_discount' | 'weekly_digest' | 'reading_streak' | 'audiobook_premiere') => {
    setTemplatePreset(preset);
    if (preset === 'new_release') {
      setTemplateConfig({
        id: 'tpl_new_release',
        name: 'New Release Spotlight',
        themeColor: '#4f46e5',
        bannerHeadline: '✨ New Release From Amsterdam Archives',
        preheader: 'Experience our newest manuscript in DRM-free eReader & studio narration.',
        greetingStyle: 'Dear {{subscriber_name}},',
        introText: 'We have just published a seminal new title in our collection. As a valued {{tier_badge}}, you receive complimentary early sample chapters and full high-definition audio narration.',
        featuredBookId: books[0]?.id || '',
        discountBadgeText: '25% Launch Privilege',
        discountCode: 'ATLASLAUNCH25',
        highlightStats: true,
        ctaText: 'Read in eReader Now',
        ctaLink: 'https://bookatlas.app/reader',
        footerNote: 'Bookatlas Publishing Group • Keizersgracht 421, Amsterdam • The Netherlands'
      });
    } else if (preset === 'vip_discount') {
      setTemplateConfig({
        id: 'tpl_vip_discount',
        name: 'VIP Patron 40% Exclusive Perk',
        themeColor: '#d97706', // amber-600
        bannerHeadline: '👑 Exclusive VIP Patron Circle Reward',
        preheader: 'Your monthly 40% privilege code is now active across the entire bookstore.',
        greetingStyle: 'Honored {{subscriber_name}},',
        introText: 'Thank you for supporting independent philosophical and speculative literature on Bookatlas. As part of your {{tier_badge}} status, your exclusive 40% storewide perk is active.',
        featuredBookId: books[1]?.id || books[0]?.id || '',
        discountBadgeText: '40% Off All Formats & Bundles',
        discountCode: '{{user_discount_code}}',
        highlightStats: true,
        ctaText: 'Claim 40% VIP Perk in Store',
        ctaLink: 'https://bookatlas.app/store',
        footerNote: 'VIP Patron Priority Access • Direct from Atlantean Globals Services B.V.'
      });
    } else if (preset === 'weekly_digest') {
      setTemplateConfig({
        id: 'tpl_weekly_digest',
        name: 'Weekly Philosophy & Mind Digest',
        themeColor: '#059669', // emerald-600
        bannerHeadline: '🌿 The Sunday Epistemology Dispatch',
        preheader: 'Weekly curated essays, audiobook excerpts, and consciousness reading lists.',
        greetingStyle: 'Greetings {{subscriber_name}},',
        introText: 'This Sunday we explore ancient ontology, indigenous memory keeping, and new speculative Afrofuturist narratives.',
        featuredBookId: books[2]?.id || books[0]?.id || '',
        discountBadgeText: 'Featured Book of the Week',
        discountCode: 'SUNDAYREAD20',
        highlightStats: true,
        ctaText: 'Explore Sunday Curated List',
        ctaLink: 'https://bookatlas.app/curated',
        footerNote: 'Curated with care by the Bookatlas Editorial Board, Amsterdam.'
      });
    } else if (preset === 'reading_streak') {
      setTemplateConfig({
        id: 'tpl_reading_streak',
        name: 'Reading Streak & Milestone Celebration',
        themeColor: '#7c3aed', // purple-600
        bannerHeadline: '🔥 You Hit a Reading Milestone!',
        preheader: 'You have read {{reading_stats_pages}} pages with a {{reading_stats_streak}}-day streak!',
        greetingStyle: 'Bravo {{subscriber_name}}!',
        introText: 'Your dedication to deep literature is inspiring. You are in the top 5% of active readers on Bookatlas this month with {{reading_stats_pages}} pages finished.',
        featuredBookId: books[0]?.id || '',
        discountBadgeText: 'Milestone Reward: €5 Free Credit',
        discountCode: 'STREAKREWARD5',
        highlightStats: true,
        ctaText: 'Continue Your Streak in eReader',
        ctaLink: 'https://bookatlas.app/reader',
        footerNote: 'Keep reading every day to earn Bookatlas Super Points and unlock complimentary titles.'
      });
    } else if (preset === 'audiobook_premiere') {
      setTemplateConfig({
        id: 'tpl_audiobook_premiere',
        name: 'Audiobook Premiere & Studio Narration',
        themeColor: '#e11d48', // rose-600
        bannerHeadline: '🎧 New Studio Audiobook Premiere',
        preheader: 'Listen with immersive studio narration and custom cadence controls.',
        greetingStyle: 'Hello {{subscriber_name}},',
        introText: 'We have just uploaded full studio audiobook narration for {{book_recommendation_title}} by {{book_recommendation_author}}. Listen directly in your browser or eReader dock.',
        featuredBookId: books[0]?.id || '',
        discountBadgeText: 'Audiobook Included in Plus & VIP',
        discountCode: 'AUDIOATLAS',
        highlightStats: false,
        ctaText: 'Listen to Narration Dock',
        ctaLink: 'https://bookatlas.app/listen',
        footerNote: 'Full DRM-Free studio audio files available for Bookatlas subscribers.'
      });
    }
  };

  // Placeholder interpolation helper for the preview
  const interpolatePlaceholders = (text: string): string => {
    if (!text) return '';
    const tierLabels: Record<SubscriberTier, string> = {
      vip_patron: 'VIP Patron Circle (40% Tier)',
      member_subscriber: 'Bookatlas Plus Member',
      free_reader: 'Bookatlas Reader'
    };
    const discountMap: Record<SubscriberTier, string> = {
      vip_patron: 'ATLAS-VIP40-9281',
      member_subscriber: 'ATLAS-PLUS25-4102',
      free_reader: 'WELCOME15'
    };

    return text
      .replace(/{{subscriber_name}}/g, sampleRecipientName)
      .replace(/{{subscriber_email}}/g, 'eddy.reader@example.com')
      .replace(/{{tier_badge}}/g, tierLabels[sampleRecipientTier] || 'Valued Subscriber')
      .replace(/{{book_recommendation_title}}/g, featuredBook.title)
      .replace(/{{book_recommendation_author}}/g, featuredBook.author)
      .replace(/{{book_recommendation_id}}/g, featuredBook.id)
      .replace(/{{book_cover_url}}/g, featuredBook.coverImage)
      .replace(/{{user_discount_code}}/g, discountMap[sampleRecipientTier] || 'ATLAS2026')
      .replace(/{{reading_stats_streak}}/g, sampleRecipientTier === 'vip_patron' ? '28' : '14')
      .replace(/{{reading_stats_pages}}/g, sampleRecipientTier === 'vip_patron' ? '1,420' : '580')
      .replace(/{{1_click_unsubscribe_url}}/g, 'https://bookatlas.app/unsubscribe?token=sample_token_preview');
  };

  const handleCopyPlaceholder = (tag: string) => {
    navigator.clipboard.writeText(tag);
    setCopiedPlaceholder(tag);
    setTimeout(() => setCopiedPlaceholder(null), 2000);
    if (onNotification) onNotification(`Copied placeholder: ${tag}`);
  };

  const handleApplyToCampaign = () => {
    if (onApplyTemplateToCampaign) {
      const fullBody = `${templateConfig.greetingStyle}\n\n${templateConfig.introText}\n\nFeatured Title: {{book_recommendation_title}} by {{book_recommendation_author}}\n\nUse your perk code {{user_discount_code}} for instant discount at checkout.\n\n${templateConfig.footerNote}`;
      onApplyTemplateToCampaign({
        title: templateConfig.name,
        subject: templateConfig.bannerHeadline.replace(/^[^\w]+/, ''),
        previewText: templateConfig.preheader,
        content: fullBody,
        bookId: templateConfig.featuredBookId,
        discountCode: templateConfig.discountCode,
        ctaText: templateConfig.ctaText
      });
      if (onNotification) {
        onNotification(`✨ Template "${templateConfig.name}" transferred to Email Campaign Builder!`);
      }
    }
  };

  const placeholdersList = [
    { tag: '{{subscriber_name}}', label: 'Subscriber Name', desc: 'Recipient name or fallback' },
    { tag: '{{tier_badge}}', label: 'Tier Badge', desc: 'Free / Plus / VIP Patron' },
    { tag: '{{book_recommendation_title}}', label: 'Book Title', desc: 'Dynamic book recommendation' },
    { tag: '{{book_recommendation_author}}', label: 'Book Author', desc: 'Author name' },
    { tag: '{{book_cover_url}}', label: 'Book Cover URL', desc: 'High-res cover art' },
    { tag: '{{user_discount_code}}', label: 'User Perk Code', desc: 'Personalized discount token' },
    { tag: '{{reading_stats_streak}}', label: 'Reading Streak', desc: 'Consecutive reading days' },
    { tag: '{{reading_stats_pages}}', label: 'Pages Read', desc: 'Total reading statistics' },
    { tag: '{{1_click_unsubscribe_url}}', label: '1-Click Unsubscribe', desc: 'Mandatory compliant opt-out' }
  ];

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
              Visual Template Studio
            </span>
            <span className="text-xs text-slate-500 font-medium">WYSIWYG Dynamic Placeholder Engine</span>
          </div>
          <h2 className="text-lg font-serif font-bold text-slate-900 mt-1">
            Customizable Email Template Designer
          </h2>
          <p className="text-xs text-slate-500">
            Design high-converting literary newsletters with dynamic book recommendations, reading stats, and user-specific discount codes for 100,000+ contacts.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleApplyToCampaign}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Load into Campaign Builder</span>
          </button>
        </div>
      </div>

      {/* Preset Selector Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0 pl-1">
          Presets:
        </span>
        {[
          { id: 'new_release', label: '✨ New Release Spotlight', desc: 'Launch new book' },
          { id: 'vip_discount', label: '👑 VIP Patron 40% Reward', desc: 'Exclusive code' },
          { id: 'weekly_digest', label: '🌿 Philosophy & Mind Digest', desc: 'Curated essays' },
          { id: 'reading_streak', label: '🔥 Reading Milestone & Streak', desc: 'Engagement stats' },
          { id: 'audiobook_premiere', label: '🎧 Studio Audiobook Premiere', desc: 'Voice narration' }
        ].map((p) => (
          <button
            key={p.id}
            onClick={() => loadPreset(p.id as any)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              templatePreset === p.id
                ? 'bg-slate-900 text-white shadow-sm ring-2 ring-indigo-500/50'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Main Grid: Left Controls, Right Interactive Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Customizer & Placeholder Palette */}
        <div className="lg:col-span-5 space-y-5">
          {/* Dynamic Placeholders Tool Box */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Dynamic Placeholders (Click to Copy)
              </span>
              <span className="text-[10px] font-mono text-slate-400">100k Bulk Compatible</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Interpolated per contact from your CSV & reader profile records during campaign dispatch.
            </p>

            <div className="grid grid-cols-2 gap-2">
              {placeholdersList.map((ph) => (
                <button
                  key={ph.tag}
                  type="button"
                  onClick={() => handleCopyPlaceholder(ph.tag)}
                  className="p-2 bg-slate-50 hover:bg-indigo-50/80 border border-slate-200 hover:border-indigo-300 rounded-xl text-left transition-colors group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-800 group-hover:text-indigo-700 font-mono">
                      {ph.tag}
                    </span>
                    {copiedPlaceholder === ph.tag ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-400 group-hover:text-indigo-600" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 block line-clamp-1">{ph.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Form controls */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                Visual Layout Parameters
              </span>
              <span className="text-xs font-semibold text-slate-400">Template ID: {templateConfig.id}</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Banner Headline / Main Title
              </label>
              <input
                type="text"
                value={templateConfig.bannerHeadline}
                onChange={(e) => setTemplateConfig({ ...templateConfig, bannerHeadline: e.target.value })}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Preheader / Preview Subtitle
              </label>
              <input
                type="text"
                value={templateConfig.preheader}
                onChange={(e) => setTemplateConfig({ ...templateConfig, preheader: e.target.value })}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Accent Theme Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={templateConfig.themeColor}
                    onChange={(e) => setTemplateConfig({ ...templateConfig, themeColor: e.target.value })}
                    className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                  />
                  <span className="text-xs font-mono text-slate-600">{templateConfig.themeColor}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Featured Book Title
                </label>
                <select
                  value={templateConfig.featuredBookId}
                  onChange={(e) => setTemplateConfig({ ...templateConfig, featuredBookId: e.target.value })}
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {books.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.title.slice(0, 28)}...
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Greeting Line
              </label>
              <input
                type="text"
                value={templateConfig.greetingStyle}
                onChange={(e) => setTemplateConfig({ ...templateConfig, greetingStyle: e.target.value })}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Editorial Dispatch Body
              </label>
              <textarea
                rows={4}
                value={templateConfig.introText}
                onChange={(e) => setTemplateConfig({ ...templateConfig, introText: e.target.value })}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-indigo-500 leading-relaxed font-sans"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Discount Badge Label
                </label>
                <input
                  type="text"
                  value={templateConfig.discountBadgeText}
                  onChange={(e) => setTemplateConfig({ ...templateConfig, discountBadgeText: e.target.value })}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Discount Code
                </label>
                <input
                  type="text"
                  value={templateConfig.discountCode}
                  onChange={(e) => setTemplateConfig({ ...templateConfig, discountCode: e.target.value })}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-indigo-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  CTA Button Text
                </label>
                <input
                  type="text"
                  value={templateConfig.ctaText}
                  onChange={(e) => setTemplateConfig({ ...templateConfig, ctaText: e.target.value })}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={templateConfig.highlightStats}
                    onChange={(e) => setTemplateConfig({ ...templateConfig, highlightStats: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded-sm"
                  />
                  Include Reading Stats Box
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                CAN-SPAM / Opt-Out Footer
              </label>
              <textarea
                rows={2}
                value={templateConfig.footerNote}
                onChange={(e) => setTemplateConfig({ ...templateConfig, footerNote: e.target.value })}
                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-600"
              />
            </div>
          </div>
        </div>

        {/* Right: Live Interactive Visual Preview with Dynamic Sample Switcher */}
        <div className="lg:col-span-7 space-y-4">
          {/* Simulator Bar */}
          <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-md flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                Live Recipient Simulation:
              </span>
              <select
                value={sampleRecipientTier}
                onChange={(e) => setSampleRecipientTier(e.target.value as SubscriberTier)}
                className="px-2.5 py-1 text-xs bg-slate-800 text-emerald-300 font-bold rounded-lg border border-slate-700 focus:outline-hidden cursor-pointer"
              >
                <option value="vip_patron">👑 Eddy Teddy (VIP Patron - 40% Tier)</option>
                <option value="member_subscriber">✨ Sanne van Dijk (Plus Member)</option>
                <option value="free_reader">📖 Sophie Laurent (Free Reader)</option>
              </select>
            </div>

            {/* Device Switcher */}
            <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700">
              <button
                onClick={() => setDevicePreview('desktop')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                  devicePreview === 'desktop' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                Desktop
              </button>
              <button
                onClick={() => setDevicePreview('mobile')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                  devicePreview === 'mobile' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                Mobile
              </button>
            </div>
          </div>

          {/* Email Preview Frame */}
          <div className="bg-slate-100 p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-inner flex justify-center">
            <div
              className={`bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden transition-all duration-300 ${
                devicePreview === 'mobile' ? 'w-full max-w-sm' : 'w-full max-w-2xl'
              }`}
            >
              {/* Email Client Header Bar */}
              <div className="bg-slate-50 border-b border-slate-200 p-3.5 text-xs space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>From: <strong className="text-slate-800">Bookatlas Publishing (Amsterdam)</strong> &lt;dispatch@bookatlas.app&gt;</span>
                  <span className="font-mono text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md font-bold">Preview Render</span>
                </div>
                <div className="text-slate-800 font-bold text-sm">
                  Subject: {interpolatePlaceholders(templateConfig.bannerHeadline.replace(/^[^\w]+/, ''))}
                </div>
                <div className="text-slate-500 text-[11px]">
                  Preheader: {interpolatePlaceholders(templateConfig.preheader)}
                </div>
              </div>

              {/* Rendered Email Body Canvas */}
              <div className="p-6 sm:p-8 space-y-6">
                {/* Brand Header Banner */}
                <div
                  className="p-6 rounded-2xl text-white text-center space-y-2 relative overflow-hidden"
                  style={{ backgroundColor: templateConfig.themeColor }}
                >
                  <div className="text-[11px] uppercase tracking-widest font-bold opacity-85">
                    Bookatlas Amsterdam Literary Archive
                  </div>
                  <h1 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-tight">
                    {interpolatePlaceholders(templateConfig.bannerHeadline)}
                  </h1>
                  <p className="text-xs text-white/90 max-w-md mx-auto leading-relaxed">
                    {interpolatePlaceholders(templateConfig.preheader)}
                  </p>
                </div>

                {/* Greeting & Intro */}
                <div className="space-y-3 text-slate-700 text-xs sm:text-sm leading-relaxed">
                  <div className="font-bold text-slate-900 text-base">
                    {interpolatePlaceholders(templateConfig.greetingStyle)}
                  </div>
                  <p className="whitespace-pre-line text-slate-600 leading-relaxed">
                    {interpolatePlaceholders(templateConfig.introText)}
                  </p>
                </div>

                {/* Dynamic Reading Stats Block */}
                {templateConfig.highlightStats && (
                  <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                        <Flame className="w-5 h-5 text-amber-300" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-indigo-700 block">Personalized Reader Stats</span>
                        <span className="text-xs font-bold text-slate-900">
                          {interpolatePlaceholders('{{reading_stats_streak}}-Day Streak • {{reading_stats_pages}} Pages Explored')}
                        </span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-white text-indigo-800 text-[10px] font-bold rounded-lg border border-indigo-200 shrink-0">
                      {interpolatePlaceholders('{{tier_badge}}')}
                    </span>
                  </div>
                )}

                {/* Featured Book Recommendation Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row gap-5 items-center sm:items-start">
                  <img
                    src={featuredBook.coverImage}
                    alt={featuredBook.title}
                    className="w-28 h-40 object-cover rounded-xl shadow-md shrink-0 border border-slate-200"
                  />
                  <div className="space-y-2 text-center sm:text-left flex-1">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-[10px] font-bold">
                        {featuredBook.primaryGenre}
                      </span>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {templateConfig.discountBadgeText}
                      </span>
                    </div>

                    <h3 className="font-serif font-bold text-base text-slate-900 leading-snug">
                      {featuredBook.title}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">By {featuredBook.author}</p>
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                      {featuredBook.synopsis}
                    </p>
                  </div>
                </div>

                {/* Personalized Discount Coupon Card */}
                <div className="border-2 border-dashed border-amber-300 bg-amber-50/60 rounded-2xl p-4 text-center space-y-2">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-900 uppercase tracking-wider">
                    <Gift className="w-4 h-4 text-amber-600" />
                    <span>Your Unique Subscriber Privilege Voucher</span>
                  </div>
                  <div className="inline-block px-4 py-2 bg-white rounded-xl border border-amber-300 font-mono text-base font-extrabold text-amber-700 tracking-wider shadow-xs">
                    {interpolatePlaceholders(templateConfig.discountCode)}
                  </div>
                  <p className="text-[11px] text-amber-800 font-medium">
                    Apply at checkout for your personalized subscriber privilege discount.
                  </p>
                </div>

                {/* Call To Action Button */}
                <div className="text-center pt-2">
                  <button
                    type="button"
                    style={{ backgroundColor: templateConfig.themeColor }}
                    className="w-full sm:w-auto px-8 py-3.5 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md hover:opacity-95 transition-opacity cursor-pointer inline-flex items-center justify-center gap-2"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>{interpolatePlaceholders(templateConfig.ctaText)}</span>
                  </button>
                </div>

                {/* CAN-SPAM Footer */}
                <div className="border-t border-slate-200 pt-6 text-center text-[11px] text-slate-400 space-y-2 leading-relaxed">
                  <p>{interpolatePlaceholders(templateConfig.footerNote)}</p>
                  <p>
                    <a href="#optout" className="text-indigo-600 hover:underline font-bold">
                      1-Click Instant Unsubscribe
                    </a>{' '}
                    • <a href="#privacy" className="hover:underline">Privacy Policy</a> •{' '}
                    <a href="#preferences" className="hover:underline">Manage Reading Preferences</a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
