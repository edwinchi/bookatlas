export type LanguageCode = 'en' | 'nl' | 'fr' | 'es' | 'de' | 'pt' | 'sw' | 'yo';

export interface TranslationStrings {
  // Brand & Top Navigation
  appName: string;
  appSubtitle: string;
  store: string;
  library: string;
  deals: string;
  audiobooks: string;
  bookatlasPlus: string;
  managerStudio: string;
  blueprint: string;
  searchPlaceholder: string;
  adminLogin: string;
  adminLocked: string;
  adminBadge: string;
  lockSession: string;
  exploreCategories: string;
  allCategories: string;
  myBookshelf: string;
  cart: string;
  wishlist: string;

  // Category management & sections
  africanLiterature: string;
  consciousnessWisdom: string;
  generalFiction: string;
  allGenres: string;
  customCategories: string;

  // Book Card & Detail
  ebook: string;
  audiobook: string;
  bundle: string;
  preview: string;
  readNow: string;
  listenSample: string;
  addToCart: string;
  buyNow: string;
  includedInPlus: string;
  freeSample: string;
  readingTime: string;
  pages: string;
  superPoints: string;
  narratedBy: string;

  // Library & Reading Stats
  personalLibrary: string;
  readingStreak: string;
  totalReadTime: string;
  booksCompleted: string;
  readingChallenge: string;
  currentlyReading: string;
  finished: string;
  exportPdf: string;
  exportPdfTooltip: string;
  exportSuccess: string;
  offlineReady: string;
  offlineCached: string;
  enableOffline: string;
  cacheAllBooks: string;

  // Auth & Gate
  registrationRequired: string;
  registrationSubtitle: string;
  enterEmailToExplore: string;
  emailPlaceholder: string;
  fullName: string;
  startReading: string;
  guestPreviewBadge: string;
  gdprNotice: string;

  // Manager & Publishing Studio
  authorPublisherStudio: string;
  uploadManuscript: string;
  uploadSubtitle: string;
  generateEbookAudiobook: string;
  categoryManagement: string;
  addCategory: string;
  categoryName: string;
  categoryDescription: string;
  saveCategory: string;
  sendEmailToPublisher: string;
  campaignReady: string;
  dispatchCampaignToUsers: string;
  dynamicPricing: string;
  marketRadar: string;
  culturalLocalization: string;
}

export const TRANSLATIONS: Record<'en' | 'nl', TranslationStrings> = {
  en: {
    appName: 'Bookatlas eBook Store & Reader',
    appSubtitle: 'Atlantean Globals Services (Amsterdam, Netherlands)',
    store: 'Store',
    library: 'My Bookshelf',
    deals: 'Flash Deals',
    audiobooks: 'Audiobooks',
    bookatlasPlus: 'Bookatlas Plus',
    managerStudio: 'Manager Studio',
    blueprint: 'Architecture',
    searchPlaceholder: 'Search 1.5M+ eBooks, audiobooks, authors, ISBNs...',
    adminLogin: 'Admin Login',
    adminLocked: 'Locked',
    adminBadge: 'Admin',
    lockSession: 'Lock Session',
    exploreCategories: 'Browse Categories',
    allCategories: 'All Categories',
    myBookshelf: 'My Digital Bookshelf',
    cart: 'Shopping Cart',
    wishlist: 'Saved Wishlist',

    africanLiterature: 'African Literature & Diaspora',
    consciousnessWisdom: 'Consciousness & Sacred Wisdom',
    generalFiction: 'General & European Classics',
    allGenres: 'All Genres & Epistemologies',
    customCategories: 'Custom Publisher Categories',

    ebook: 'eBook (EPUB3)',
    audiobook: 'Audiobook (HQ)',
    bundle: 'eBook + Audio Bundle',
    preview: 'Instant Preview',
    readNow: 'Read Now',
    listenSample: 'Audio Sample',
    addToCart: 'Add to Cart',
    buyNow: 'Buy Now',
    includedInPlus: 'Included in Bookatlas Plus',
    freeSample: 'Free Chapter Sample',
    readingTime: 'Reading Time',
    pages: 'Pages',
    superPoints: 'SuperPoints',
    narratedBy: 'Narrated by',

    personalLibrary: 'Your Personal Digital Library',
    readingStreak: 'Day Streak',
    totalReadTime: 'Total Read Time',
    booksCompleted: 'Books Finished',
    readingChallenge: '2026 Reading Challenge',
    currentlyReading: 'Currently Reading',
    finished: 'Finished Books',
    exportPdf: 'Export Library Report (PDF)',
    exportPdfTooltip: 'Download a beautifully formatted personal reading log, active progress, and shelf manifest in PDF',
    exportSuccess: 'Library reading report generated and downloaded successfully!',
    offlineReady: 'Offline Storage Enabled',
    offlineCached: 'All active manuscripts, EPUB text, and playback assets are cached locally.',
    enableOffline: 'Enable Offline Caching',
    cacheAllBooks: 'Cache Entire Bookshelf',

    registrationRequired: 'Welcome to Bookatlas — Registration Required',
    registrationSubtitle: 'Please enter your email address to register and unlock full instant access to explore the catalog, read sample chapters, listen to audiobooks, and sync your digital bookshelf.',
    enterEmailToExplore: 'Enter your email to explore the digital library',
    emailPlaceholder: 'name@example.com (e.g. reader@bookatlas.com)',
    fullName: 'Your Name or Reader Handle',
    startReading: 'Unlock & Explore Bookatlas',
    guestPreviewBadge: 'Free Lifetime Reader Pass',
    gdprNotice: 'Compliant with GDPR (EU-2016/679) & Dutch Consumer Privacy Law. Zero spam.',

    authorPublisherStudio: 'Autonomous Publishing & Multimodal Studio',
    uploadManuscript: 'Multimodal Ingest: Upload Files & Generate Complete Book',
    uploadSubtitle: 'Upload text files (.txt, .md), PDFs, images, or audio transcripts to synthesize an eBook, generate expressive studio TTS audio, assign the category, and automatically launch email and reader campaigns.',
    generateEbookAudiobook: 'Synthesize eBook & Audiobook Asset',
    categoryManagement: 'Publisher Category Manager',
    addCategory: 'Add New Category',
    categoryName: 'Category Name',
    categoryDescription: 'Scope & Editorial Focus',
    saveCategory: 'Create & Publish Category',
    sendEmailToPublisher: 'Send Notification to Publisher',
    campaignReady: 'Marketing Campaign Ready',
    dispatchCampaignToUsers: 'Dispatch Launch Campaign to All Registered Users',
    dynamicPricing: 'Dynamic Pricing Optimizer',
    marketRadar: 'Live Market Radar',
    culturalLocalization: 'Cultural Localization'
  },
  nl: {
    appName: 'Bookatlas e-Boekenwinkel & eReader',
    appSubtitle: 'Atlantean Globals Services (Amsterdam, Nederland)',
    store: 'Winkel',
    library: 'Mijn Boekenplank',
    deals: 'Dagdeals',
    audiobooks: 'Luisterboeken',
    bookatlasPlus: 'Bookatlas Plus',
    managerStudio: 'Beheerdersstudio',
    blueprint: 'Architectuur',
    searchPlaceholder: 'Zoek in 1,5M+ e-boeken, luisterboeken, auteurs, ISBN...',
    adminLogin: 'Beheerder Inloggen',
    adminLocked: 'Vergrendeld',
    adminBadge: 'Beheer',
    lockSession: 'Sessie Vergrendelen',
    exploreCategories: 'Categorieën Bekijken',
    allCategories: 'Alle Categorieën',
    myBookshelf: 'Mijn Digitale Boekenplank',
    cart: 'Winkelwagen',
    wishlist: 'Verlanglijst',

    africanLiterature: 'Afrikaanse Literatuur & Diaspora',
    consciousnessWisdom: 'Bewustzijn & Oude Wijsheid',
    generalFiction: 'Algemeen & Europese Klassiekers',
    allGenres: 'Alle Genres & Stromingen',
    customCategories: 'Aangepaste Uitgeverscategorieën',

    ebook: 'e-Boek (EPUB3)',
    audiobook: 'Luisterboek (HQ)',
    bundle: 'e-Boek + Audio Bundel',
    preview: 'Direct Inkijken',
    readNow: 'Nu Lezen',
    listenSample: 'Audiofragment',
    addToCart: 'In Winkelwagen',
    buyNow: 'Direct Kopen',
    includedInPlus: 'Inbegrepen bij Bookatlas Plus',
    freeSample: 'Gratis Hoofdstuk Preview',
    readingTime: 'Leestijd',
    pages: 'Pagina\'s',
    superPoints: 'SuperPunten',
    narratedBy: 'Ingegesproken door',

    personalLibrary: 'Uw Persoonlijke Digitale Bibliotheek',
    readingStreak: 'Dagen Reeks',
    totalReadTime: 'Totale Leestijd',
    booksCompleted: 'Voltooide Boeken',
    readingChallenge: 'Leesuitdaging 2026',
    currentlyReading: 'Nu aan het Lezen',
    finished: 'Uitgelezen Boeken',
    exportPdf: 'Exporteer Bibliotheekrapport (PDF)',
    exportPdfTooltip: 'Download een prachtig geformatteerd leeslogboek, actieve voortgang en boekenplankoverzicht in PDF',
    exportSuccess: 'Leesrapport met succes gegenereerd en gedownload!',
    offlineReady: 'Offline Opslag Ingeschakeld',
    offlineCached: 'Alle actieve manuscripten, teksten en audiofragmenten zijn lokaal opgeslagen.',
    enableOffline: 'Offline Caching Activeren',
    cacheAllBooks: 'Gehele Boekenplank Cachen',

    registrationRequired: 'Welkom bij Bookatlas — Registratie Vereist',
    registrationSubtitle: 'Voer uw e-mailadres in om u te registreren en direct volledige toegang te krijgen tot de catalogus, proefhoofdstukken, luisterboeken en uw persoonlijke boekenplank.',
    enterEmailToExplore: 'Voer uw e-mail in om de digitale bibliotheek te verkennen',
    emailPlaceholder: 'naam@voorbeeld.nl (bijv. lezer@bookatlas.nl)',
    fullName: 'Uw Naam of Gebruikersnaam',
    startReading: 'Ontgrendel & Verken Bookatlas',
    guestPreviewBadge: 'Gratis Lezerspas voor het Leven',
    gdprNotice: 'Volledig in overeenstemming met de AVG (EU-2016/679) & Nederlandse privacywetgeving. Geen spam.',

    authorPublisherStudio: 'Autonome Uitgeverij & Multimodale Studio',
    uploadManuscript: 'Multimodale Ingest: Upload Bestanden & Genereer Compleet Boek',
    uploadSubtitle: 'Upload tekstbestanden (.txt, .md), PDF\'s, afbeeldingen of audiotranscripties om een e-boek te synthetiseren, expressieve studio-TTS te genereren, de juiste categorie toe te wijzen en automatisch e-mail- en lezerscampagnes te lanceren.',
    generateEbookAudiobook: 'Synthetiseer e-Boek & Luisterboek',
    categoryManagement: 'Uitgevers Categorie Beheerder',
    addCategory: 'Nieuwe Categorie Toevoegen',
    categoryName: 'Categorienaam',
    categoryDescription: 'Bereik & Redactionele Focus',
    saveCategory: 'Categorie Aanmaken & Publiceren',
    sendEmailToPublisher: 'E-mail Melding naar Uitgever Sturen',
    campaignReady: 'Marketingcampagne Gereed',
    dispatchCampaignToUsers: 'Lanceercampagne Verzenden naar Alle Geregistreerde Gebruikers',
    dynamicPricing: 'Dynamische Prijsoptimalisatie',
    marketRadar: 'Live Marktradar',
    culturalLocalization: 'Culturele Lokalisatie'
  }
};
