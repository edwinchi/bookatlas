export type BookFormat = 'ebook' | 'audiobook' | 'bundle';

export interface Chapter {
  title: string;
  subtitle?: string;
  content: string[];
}

export interface Highlight {
  id: string;
  text: string;
  note?: string;
  color: 'yellow' | 'green' | 'blue' | 'pink';
  chapterIndex: number;
  paragraphIndex: number;
  date: string;
}

export interface BookReview {
  id: string;
  authorName: string;
  avatar?: string;
  rating: number;
  date: string;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
  upvotes: number;
}

export interface Book {
  id: string;
  title: string;
  subtitle?: string;
  author: string;
  authorBio: string;
  narrator?: string;
  coverImage: string;
  price: number;
  originalPrice: number;
  isBookatlasPlus?: boolean;
  isKoboPlus?: boolean; // legacy alias
  isDeal: boolean;
  isBestseller: boolean;
  isNewRelease: boolean;
  isEditorPick?: boolean;
  rating: number;
  reviewCount: number;
  format: BookFormat;
  genres: string[];
  primaryGenre: string;
  pageCount: number;
  audioDurationMinutes?: number;
  publishDate: string;
  publisher: string;
  isbn: string;
  language: string;
  synopsis: string;
  editorialReview: string;
  sampleChapters: Chapter[];
  audioSampleUrl?: string;
  superPointsEarned: number;
  tags: string[];
  reviews: BookReview[];
  awards?: string[];
  readingTimeHours?: number;
  aiVibe?: string;
}

export interface CartItem {
  book: Book;
  format: BookFormat;
  addedAt: number;
}

export interface UserLibraryItem {
  book: Book;
  format: BookFormat;
  progressPercent: number;
  currentChapterIndex: number;
  currentParagraphIndex: number;
  lastReadTimestamp: number;
  highlights: Highlight[];
  bookmarks: number[]; // chapter indices
  isFavorite?: boolean;
  finished?: boolean;
  notes?: string[];
}

export interface FilterOptions {
  searchQuery: string;
  genre: string;
  format: 'all' | 'ebook' | 'audiobook';
  priceCategory: 'all' | 'free' | 'under5' | 'under10' | 'deals';
  minRating: number;
  sortBy: 'featured' | 'bestseller' | 'rating' | 'priceAsc' | 'priceDesc' | 'newest';
  koboPlusOnly: boolean; // Bookatlas Plus
  language?: string;
}

export type ReaderTheme = 'day' | 'sepia' | 'night' | 'mint' | 'black';
export type ReaderFont = 'literata' | 'sans' | 'mono';

export interface ReaderSettings {
  fontSize: number; // 14 to 28
  lineHeight: number; // 1.4 to 2.2
  fontFamily: ReaderFont;
  theme: ReaderTheme;
  marginWidth: 'narrow' | 'normal' | 'wide';
}

export interface AIMatchResult {
  bookId: string;
  matchScore: number;
  rationale: string;
  keyThemes: string[];
  pacing: string;
  readerVibe: string;
}

export interface AIBookSummaryData {
  executiveSummary: string;
  coreTakeaways: string[];
  targetAudience: string;
  philosophicalQuestion: string;
  keyQuotes: string[];
  similarMasterpieces: string[];
}

export interface ManagerStats {
  totalBooks: number;
  totalCategories: number;
  totalAudiobooks: number;
  monthlyRevenue: number;
  totalOrders: number;
  plusSubscribersCount: number;
  superPointsDistributed: number;
  autopilotActive: boolean;
  pagesReadToday: number;
  aiGenerationsCount: number;
}

export interface AutomationLogEntry {
  id: string;
  timestamp: string;
  actionType: 'ai_generation' | 'price_optimization' | 'deal_rotation' | 'inventory_sync' | 'marketing_blast';
  title: string;
  description: string;
  badge: string;
}

export interface MarketingKit {
  bookTitle: string;
  emailNewsletterSubject: string;
  emailBody: string;
  socialMediaThread: string[];
  bookClubDiscussionQuestions: string[];
  tagline: string;
  targetAudienceAnalysis: string;
}

// AI Chatbot Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: string;
  modelUsed?: string;
  citations?: Array<{ title: string; url: string; snippet?: string }>;
}

export type GeminiModelChoice = 'gemini-3.1-pro-preview' | 'gemini-3.5-flash' | 'gemini-3.1-flash-lite';

export interface ChatPersona {
  id: string;
  name: string;
  roleTitle: string;
  description: string;
  systemInstruction: string;
  recommendedModel: GeminiModelChoice;
  avatarIcon: string;
  badge: string;
  starterPrompts: string[];
}

// Search Grounding Types
export interface GroundingSource {
  title: string;
  url: string;
  snippet?: string;
}

export interface SearchGroundingResult {
  query: string;
  answer: string;
  sources: GroundingSource[];
  searchQueries?: string[];
  timestamp: string;
  model: string;
}

// Veo Video Generation Types
export interface VeoGenerationRequest {
  imageUrl?: string;
  prompt: string;
  aspectRatio: '16:9' | '9:16';
  resolution: '720p' | '1080p';
  motionStyle: 'cinematic_zoom' | 'atmospheric_fog' | 'neon_glow' | 'page_flurry' | 'watercolor_reveal';
  bookTitle?: string;
}

export interface GeneratedVideoItem {
  id: string;
  title: string;
  prompt: string;
  aspectRatio: '16:9' | '9:16';
  videoUrl: string;
  coverThumbnail: string;
  createdAt: string;
  status: 'rendering' | 'ready' | 'failed';
  progress: number;
}

// Live Voice Types
export interface VoiceConversationMessage {
  id: string;
  speaker: 'user' | 'assistant';
  text: string;
  timestamp: string;
  audioDuration?: number;
}

// Admin Security & Access Control Types
export interface AdminSession {
  isAuthenticated: boolean;
  email: string;
  name: string;
  role: 'super_admin' | 'manager';
  loginTimestamp: number;
  lastActiveTimestamp: number;
  autoLockMinutes: number;
}

export interface SecurityAuditLog {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  status: 'authorized' | 'denied' | 'security_event';
}

// Subscriber & Bulk CSV Email Blast Types
export interface SubscriberItem {
  email: string;
  name?: string;
  status: 'subscribed' | 'unsubscribed' | 'bounced';
  subscribedAt: number;
  unsubscribedAt?: number;
  tags?: string[];
  source?: string;
  unsubscribeToken: string;
  emailsReceivedCount: number;
  lastEmailSentAt?: number;
}

export interface SubscriberCampaign {
  id: string;
  title: string;
  subject: string;
  previewText?: string;
  senderName: string;
  content: string;
  bookTitle?: string;
  ctaText?: string;
  ctaUrl?: string;
  targetFilter: 'all_active' | 'vip' | 'custom_tags';
  totalRecipients: number;
  sentAt: number;
  status: 'sending' | 'completed' | 'draft';
  openRate?: number;
  clickRate?: number;
  unsubscribesCount?: number;
}

export interface CSVImportStats {
  totalRowsParsed: number;
  validEmailsProcessed: number;
  newSubscribersAdded: number;
  existingUpdated: number;
  invalidSkipped: number;
  unsubscribedPreserved: number;
  processingTimeMs: number;
}

