/**
 * What a complete eBook and print edition need. The intake form, the checklist page and the
 * preparation engine all read from here, so a requirement is added in one place.
 *
 * Print figures follow Amazon KDP's published specifications (inches). Lulu is close but uses its
 * own cover template; authors download it with the final page count.
 */

export type RequirementScope = 'ebook' | 'print' | 'amazon';
export type RequirementGroup = 'Account' | 'Details' | 'Rights' | 'Cover' | 'File' | 'Interior' | 'Publishing';

export interface Requirement {
  id: string;
  scope: RequirementScope;
  group: RequirementGroup;
  label: string;
  detail: string;
  /** Intake field the author fills in; absent when the requirement concerns a file. */
  field?: keyof EbookIntake | keyof PrintIntake;
  /** True when BookAtlas checks or fixes it automatically after upload. */
  automatic?: boolean;
}

export interface EbookIntake {
  title: string;
  subtitle?: string;
  author: string;
  language: string;
  description: string;
  categories: string[];
  keywords: string[];
  copyrightHolder: string;
  copyrightYear: number;
  ebookIsbn?: string;
  price: number;
  rightsConfirmed: boolean;
  aiContent: 'none' | 'assisted' | 'generated';
}

export interface PrintIntake {
  wantsPrint: boolean;
  binding?: 'paperback' | 'hardcover';
  trimSize?: TrimSizeId;
  paper?: PaperId;
  pageCount?: number;
  printIsbn?: string;
  backCoverBlurb?: string;
  authorBio?: string;
}

export type SubmissionIntake = EbookIntake & PrintIntake;

export const EBOOK_REQUIREMENTS: Requirement[] = [
  { id: 'title', scope: 'ebook', group: 'Details', field: 'title', label: 'Title (and subtitle)', detail: 'Exactly as printed on the cover and the title page.' },
  { id: 'author', scope: 'ebook', group: 'Details', field: 'author', label: 'Author name', detail: 'As it should appear in the store and on the cover.' },
  { id: 'language', scope: 'ebook', group: 'Details', field: 'language', label: 'Language', detail: 'The main language of the text.' },
  { id: 'description', scope: 'ebook', group: 'Details', field: 'description', label: 'Description', detail: '150 to 4,000 characters. Shown on the book page and sent to stores.' },
  { id: 'categories', scope: 'ebook', group: 'Details', field: 'categories', label: 'Categories', detail: 'One to three. The first is the main category.' },
  { id: 'keywords', scope: 'ebook', group: 'Details', field: 'keywords', label: 'Keywords', detail: 'Up to seven words or short phrases readers would search for.' },
  { id: 'price', scope: 'ebook', group: 'Details', field: 'price', label: 'eBook price', detail: '0 for a free book. KDP pays 70% between $2.99 and $9.99.' },
  { id: 'copyright', scope: 'ebook', group: 'Rights', field: 'copyrightYear', label: 'Copyright holder and year', detail: 'Must match the copyright page inside the book. Stores reject a mismatch.', automatic: true },
  { id: 'ebook-isbn', scope: 'ebook', group: 'Rights', field: 'ebookIsbn', label: 'eBook ISBN (optional)', detail: 'Must be a valid ISBN and different from the paperback and hardcover ISBNs.', automatic: true },
  { id: 'rights', scope: 'ebook', group: 'Rights', field: 'rightsConfirmed', label: 'Publishing rights', detail: 'You own the rights to the text, images and fonts, or have permission.' },
  { id: 'ai-content', scope: 'ebook', group: 'Rights', field: 'aiContent', label: 'AI-generated content', detail: 'Stores ask whether text or images were AI-generated or AI-assisted.' },
  { id: 'cover-front-only', scope: 'ebook', group: 'Cover', label: 'Front cover only', detail: 'Portrait, no back cover, spine or barcode. A full print wrap is cropped to its front panel automatically.', automatic: true },
  { id: 'cover-size', scope: 'ebook', group: 'Cover', label: 'Cover size', detail: 'At least 1600 × 2560 pixels recommended (1:1.6). Below 1000 pixels tall is rejected.', automatic: true },
  { id: 'epub-file', scope: 'ebook', group: 'File', label: 'EPUB file', detail: 'Up to 150 MB. Upgraded to EPUB 3 and validated with EPUBCheck automatically.', automatic: true },
  { id: 'toc', scope: 'ebook', group: 'File', label: 'Table of contents', detail: 'Every chapter reachable from the contents. Built from the old table of contents if missing.', automatic: true },
  { id: 'fonts', scope: 'ebook', group: 'File', label: 'Fonts', detail: 'Fonts whose licence forbids embedding (for example Aptos, Calibri, Segoe UI) are removed automatically.', automatic: true },
  { id: 'no-barcode', scope: 'ebook', group: 'Interior', label: 'No print barcode inside', detail: 'A paperback barcode does not belong in the eBook.', automatic: true },
];

export const PRINT_REQUIREMENTS: Requirement[] = [
  { id: 'binding', scope: 'print', group: 'Details', field: 'binding', label: 'Binding', detail: 'Paperback, or hardcover (KDP 75–550 pages; Lulu up to 800).' },
  { id: 'trim', scope: 'print', group: 'Details', field: 'trimSize', label: 'Trim size', detail: '6 × 9 in suits most long books.' },
  { id: 'paper', scope: 'print', group: 'Details', field: 'paper', label: 'Paper and ink', detail: 'Cream for novels and memoirs, white for non-fiction and images, colour for full-colour books.' },
  { id: 'page-count', scope: 'print', group: 'Interior', field: 'pageCount', label: 'Page count after layout', detail: 'Counted at the trim size, not in Word at A4. Sets the spine width and the gutter.', automatic: true },
  { id: 'print-isbn', scope: 'print', group: 'Rights', field: 'printIsbn', label: 'Print ISBN', detail: 'One per format, different from the eBook ISBN. KDP and Lulu offer free ones tied to their platform.', automatic: true },
  { id: 'interior-pdf', scope: 'print', group: 'Interior', label: 'Interior PDF', detail: 'Pages at the trim size (plus 0.125 in bleed only if images reach the edge), every font embedded.', automatic: true },
  { id: 'margins', scope: 'print', group: 'Interior', label: 'Margins', detail: 'Gutter from the page count (see calculator); outside margins at least 0.25 in, 0.375 in with bleed.' },
  { id: 'wrap-cover', scope: 'print', group: 'Cover', label: 'Full-wrap cover PDF', detail: 'Back + spine + front in one PDF with 0.125 in bleed on every side, sized by the calculator.', automatic: true },
  { id: 'spine-text', scope: 'print', group: 'Cover', label: 'Spine text', detail: 'Only from 80 pages; keep 0.0625 in clear of each spine edge.' },
  { id: 'barcode-area', scope: 'print', group: 'Cover', label: 'Barcode area', detail: 'Leave 2 × 1.2 in clear on the back, lower right; KDP and Lulu print the barcode there.' },
  { id: 'back-blurb', scope: 'print', group: 'Cover', field: 'backCoverBlurb', label: 'Back-cover text', detail: 'A short pitch (up to about 150 words) for the back cover.' },
  { id: 'author-bio', scope: 'print', group: 'Cover', field: 'authorBio', label: 'Author bio', detail: 'Two to four sentences for the back cover and the book page.' },
];

// --- Print calculator -------------------------------------------------------------------

export const BLEED_IN = 0.125;
export const BARCODE_BOX_IN = { width: 2, height: 1.2 } as const;

/** Publishing the print edition on Amazon KDP (kdp.amazon.com) yourself, step by step. */
export const AMAZON_PRINT_REQUIREMENTS: Requirement[] = [
  { id: 'kdp-account', scope: 'amazon', group: 'Account', label: 'KDP account', detail: 'Sign in at kdp.amazon.com with an Amazon account, complete the tax interview and add the bank account for royalties.' },
  { id: 'kdp-formats', scope: 'amazon', group: 'Details', label: 'Paperback and hardcover', detail: 'Each is its own KDP edition with its own ISBN. Hardcovers take 75–550 pages.' },
  { id: 'kdp-trim', scope: 'amazon', group: 'Details', label: 'Trim size', detail: 'Choose it in KDP before uploading; the interior PDF and the cover must use the same size. 6 × 9 in is the most common.' },
  { id: 'kdp-ink', scope: 'amazon', group: 'Details', label: 'Ink and paper', detail: 'Black ink on cream (up to 776 pages) or white paper (up to 828), or standard or premium colour on white.' },
  { id: 'kdp-isbn', scope: 'amazon', group: 'Rights', label: 'ISBN', detail: 'Use the free KDP ISBN (imprint "Independently published") or your own. A free ISBN from Lulu or another service cannot be used on KDP.' },
  { id: 'kdp-interior', scope: 'amazon', group: 'Interior', label: 'Interior PDF', detail: 'One PDF at the trim size, every font embedded, images at 300 DPI. Add 0.125 in bleed on the top, bottom and outside edge only if images reach the edge.' },
  { id: 'kdp-margins', scope: 'amazon', group: 'Interior', label: 'Margins', detail: 'Inside margin by page count: 0.375 in up to 150 pages, 0.5 in to 300, 0.625 in to 500, 0.75 in to 700, 0.875 in above. Outside margins at least 0.25 in, 0.375 in with bleed.' },
  { id: 'kdp-cover', scope: 'amazon', group: 'Cover', label: 'Cover PDF', detail: 'One PDF with back, spine and front and 0.125 in bleed on every side. Size it with the calculator below or with the KDP cover template for your trim, paper and page count.' },
  { id: 'kdp-spine', scope: 'amazon', group: 'Cover', label: 'Spine text', detail: 'Only for books over 79 pages; keep it 0.0625 in clear of each spine edge.' },
  { id: 'kdp-barcode', scope: 'amazon', group: 'Cover', label: 'Barcode', detail: 'KDP prints the ISBN barcode for free. Keep 2 × 1.2 in clear on the back, lower right.' },
  { id: 'kdp-previewer', scope: 'amazon', group: 'Publishing', label: 'Print Previewer', detail: 'After uploading, KDP\'s previewer flags text outside the margins and low-resolution images. Fix everything it shows.' },
  { id: 'kdp-proof', scope: 'amazon', group: 'Publishing', label: 'Proof copy', detail: 'Order a printed proof from KDP to check colours, margins and the spine before you publish.' },
  { id: 'kdp-pricing', scope: 'amazon', group: 'Publishing', label: 'Price and royalties', detail: '60% of the list price minus the printing cost on Amazon marketplaces, 40% through Expanded Distribution. KDP shows the minimum price for your page count.' },
  { id: 'kdp-review', scope: 'amazon', group: 'Publishing', label: 'Review', detail: 'KDP reviews a new print book, usually within 72 hours, then it goes on sale on Amazon.' },
];

export const TRIM_SIZES = [
  { id: '5x8', label: '5 × 8 in (127 × 203 mm)', width: 5, height: 8 },
  { id: '5.5x8.5', label: '5.5 × 8.5 in (140 × 216 mm)', width: 5.5, height: 8.5 },
  { id: '6x9', label: '6 × 9 in (152 × 229 mm)', width: 6, height: 9 },
  { id: '7x10', label: '7 × 10 in (178 × 254 mm)', width: 7, height: 10 },
  { id: '8.5x11', label: '8.5 × 11 in (216 × 279 mm)', width: 8.5, height: 11 },
] as const;
export type TrimSizeId = typeof TRIM_SIZES[number]['id'];

/** Spine inches per page (KDP). */
export const PAPERS = [
  { id: 'white', label: 'White paper, black ink', perPage: 0.002252, kdpMax: 828 },
  { id: 'cream', label: 'Cream paper, black ink', perPage: 0.0025, kdpMax: 776 },
  { id: 'color', label: 'White paper, premium colour', perPage: 0.002347, kdpMax: 828 },
] as const;
export type PaperId = typeof PAPERS[number]['id'];

export const PAGE_LIMITS = {
  kdpPaperbackMin: 24,
  kdpHardcover: { min: 75, max: 550 },
  luluMax: 800,
} as const;

/** KDP minimum inside margin by page count. */
export function gutterInches(pages: number) {
  if (pages <= 150) return 0.375;
  if (pages <= 300) return 0.5;
  if (pages <= 500) return 0.625;
  if (pages <= 700) return 0.75;
  return 0.875;
}

const round = (n: number, places = 3) => Math.round(n * 10 ** places) / 10 ** places;
export const inchesToMm = (n: number) => round(n * 25.4, 1);

export interface PrintCoverSpec {
  spineIn: number;
  widthIn: number;
  heightIn: number;
  widthPx: number;
  heightPx: number;
  spineTextAllowed: boolean;
  gutterIn: number;
  /** Panels measured from the left edge of the full wrap, bleed included. */
  backPanel: { x: number; width: number };
  spinePanel: { x: number; width: number };
  frontPanel: { x: number; width: number };
  barcode: { x: number; y: number; width: number; height: number };
  problems: string[];
}

/** Full-wrap paperback cover dimensions for a trim, paper and final page count. */
export function printCoverSpec(trimId: TrimSizeId, paperId: PaperId, pages: number, binding: 'paperback' | 'hardcover' = 'paperback'): PrintCoverSpec {
  const trim = TRIM_SIZES.find((t) => t.id === trimId);
  const paper = PAPERS.find((p) => p.id === paperId);
  if (!trim || !paper) throw new Error('Unknown trim size or paper.');
  const problems: string[] = [];
  if (!Number.isInteger(pages) || pages < PAGE_LIMITS.kdpPaperbackMin) problems.push(`Page count must be a whole number of at least ${PAGE_LIMITS.kdpPaperbackMin}.`);
  if (pages > paper.kdpMax) problems.push(`KDP prints at most ${paper.kdpMax} pages on ${paper.label.toLowerCase()}.`);
  if (pages > PAGE_LIMITS.luluMax) problems.push(`Lulu prints at most ${PAGE_LIMITS.luluMax} pages.`);
  if (binding === 'hardcover' && (pages < PAGE_LIMITS.kdpHardcover.min || pages > PAGE_LIMITS.kdpHardcover.max)) {
    problems.push(`KDP hardcovers take ${PAGE_LIMITS.kdpHardcover.min}–${PAGE_LIMITS.kdpHardcover.max} pages; use Lulu for this hardcover.`);
  }
  if (binding === 'hardcover') problems.push('Hardcover wraps add board and hinge allowances; download the exact template from KDP or Lulu.');
  const spineIn = round(pages * paper.perPage, 4);
  const widthIn = round(BLEED_IN * 2 + trim.width * 2 + spineIn, 4);
  const heightIn = round(BLEED_IN * 2 + trim.height, 4);
  const back = { x: 0, width: round(BLEED_IN + trim.width, 4) };
  const spine = { x: back.width, width: spineIn };
  const front = { x: round(back.width + spineIn, 4), width: round(trim.width + BLEED_IN, 4) };
  return {
    spineIn, widthIn, heightIn,
    widthPx: Math.round(widthIn * 300), heightPx: Math.round(heightIn * 300),
    spineTextAllowed: pages >= 80,
    gutterIn: gutterInches(pages),
    backPanel: back, spinePanel: spine, frontPanel: front,
    // Lower right of the back panel, 0.25 in inside the trim edges; `y` is measured from the bottom edge.
    barcode: {
      x: round(back.width - 0.25 - BARCODE_BOX_IN.width, 4), y: round(BLEED_IN + 0.25, 4),
      width: BARCODE_BOX_IN.width, height: BARCODE_BOX_IN.height,
    },
    problems,
  };
}

// --- ISBN ---------------------------------------------------------------------------------

export function normaliseIsbn(value: string) {
  return value.replace(/^urn:isbn:/i, '').replace(/[\s-]/g, '').toUpperCase();
}

export function isValidIsbn(value: string) {
  const isbn = normaliseIsbn(value);
  if (/^\d{13}$/.test(isbn)) {
    const sum = [...isbn].reduce((acc, d, i) => acc + Number(d) * (i % 2 ? 3 : 1), 0);
    return sum % 10 === 0;
  }
  if (/^\d{9}[\dX]$/.test(isbn)) {
    const sum = [...isbn].reduce((acc, d, i) => acc + (d === 'X' ? 10 : Number(d)) * (10 - i), 0);
    return sum % 11 === 0;
  }
  return false;
}

// --- Intake validation ----------------------------------------------------------------------

export const LANGUAGES = ['English', 'Dutch', 'French', 'German', 'Spanish', 'Portuguese', 'Swahili', 'Yoruba', 'Igbo', 'Hausa', 'Zulu', 'Amharic', 'Arabic'] as const;

const currentYear = () => new Date().getUTCFullYear();

/** Returns a message per problem, keyed by field; an empty object means the intake is complete. */
export function validateIntake(intake: Partial<SubmissionIntake>): Record<string, string> {
  const errors: Record<string, string> = {};
  const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  if (!text(intake.title) || text(intake.title).length > 200) errors.title = 'Enter the title (up to 200 characters).';
  if (text(intake.subtitle).length > 200) errors.subtitle = 'Keep the subtitle under 200 characters.';
  if (!text(intake.author) || text(intake.author).length > 120) errors.author = 'Enter the author name.';
  if (!text(intake.language)) errors.language = 'Choose the language.';
  const description = text(intake.description);
  if (description.length < 150 || description.length > 4000) errors.description = 'The description needs 150 to 4,000 characters.';
  const categories = Array.isArray(intake.categories) ? intake.categories.map(text).filter(Boolean) : [];
  if (categories.length < 1 || categories.length > 3 || categories.some((c) => c.length > 100)) errors.categories = 'Choose one to three categories.';
  const keywords = Array.isArray(intake.keywords) ? intake.keywords.map(text).filter(Boolean) : [];
  if (keywords.length > 7 || keywords.some((k) => k.length > 50)) errors.keywords = 'Use up to seven keywords of 50 characters or fewer.';
  if (!text(intake.copyrightHolder)) errors.copyrightHolder = 'Enter the copyright holder.';
  const year = Number(intake.copyrightYear);
  if (!Number.isInteger(year) || year < 1900 || year > currentYear() + 1) errors.copyrightYear = 'Enter the copyright year shown on the copyright page.';
  const price = Number(intake.price);
  if (!Number.isFinite(price) || price < 0 || price > 500) errors.price = 'Enter a price between 0 and 500.';
  if (intake.rightsConfirmed !== true) errors.rightsConfirmed = 'Confirm that you hold the publishing rights.';
  if (!['none', 'assisted', 'generated'].includes(String(intake.aiContent))) errors.aiContent = 'Say whether the book contains AI-generated content.';
  if (text(intake.ebookIsbn) && !isValidIsbn(text(intake.ebookIsbn))) errors.ebookIsbn = 'This ISBN is not valid; check the digits.';
  if (intake.wantsPrint) {
    if (!['paperback', 'hardcover'].includes(String(intake.binding))) errors.binding = 'Choose paperback or hardcover.';
    if (!TRIM_SIZES.some((t) => t.id === intake.trimSize)) errors.trimSize = 'Choose a trim size.';
    if (!PAPERS.some((p) => p.id === intake.paper)) errors.paper = 'Choose the paper.';
    const pages = Number(intake.pageCount);
    if (!Number.isInteger(pages) || pages < PAGE_LIMITS.kdpPaperbackMin || pages > PAGE_LIMITS.luluMax) errors.pageCount = `Enter the page count after layout (${PAGE_LIMITS.kdpPaperbackMin}–${PAGE_LIMITS.luluMax}).`;
    if (text(intake.printIsbn) && !isValidIsbn(text(intake.printIsbn))) errors.printIsbn = 'This ISBN is not valid; check the digits.';
    if (text(intake.printIsbn) && text(intake.ebookIsbn) && normaliseIsbn(text(intake.printIsbn)) === normaliseIsbn(text(intake.ebookIsbn))) {
      errors.printIsbn = 'The print edition needs its own ISBN, different from the eBook.';
    }
    if (text(intake.backCoverBlurb).length > 1500) errors.backCoverBlurb = 'Keep the back-cover text under 1,500 characters.';
    if (text(intake.authorBio).length > 1200) errors.authorBio = 'Keep the author bio under 1,200 characters.';
  }
  return errors;
}
