// The pricing calculator's arithmetic (owner request 2026-11-23): what an author earns on BooksAtlas, and the
// published headline rates of other platforms for the same eBook. Amounts are in euros; the store price includes
// VAT and every share is taken of the price excluding VAT, as the platforms do.
import { narrationPriceCents } from './narration';
import { AUTHOR_SHARE, PLANS } from '../landing/earnings';

export { narrationPriceCents };

/** When the other platforms' rates below were last checked against their own pages. */
export const RATES_CHECKED = '23 November 2026';

const cents = (n: number) => Math.round(n * 100) / 100;
export const excludingVat = (price: number, vatPercent: number) => Math.max(0, price) / (1 + Math.max(0, vatPercent) / 100);

export interface PlatformRow {
  id: string;
  name: string;
  /** The author's earnings per copy, in euros. */
  perSale: number;
  /** The share applied, for display ("81%"). */
  rate: string;
  note: string;
  source?: string;
  ours?: boolean;
}

/**
 * What one eBook sale earns on each platform at this price. `fileMb` is the EPUB size (Amazon deducts a delivery
 * fee per megabyte under its 70% option).
 */
export function ebookComparison(price: number, vatPercent: number, fileMb = 2): PlatformRow[] {
  const net = excludingVat(price, vatPercent);
  // Amazon KDP (euro marketplaces): 70% between €2.69 and €9.99, after a delivery fee per MB; 35% otherwise.
  const kdp70 = price >= 2.69 && price <= 9.99;
  const kdp = kdp70 ? 0.7 * Math.max(0, net - 0.12 * Math.max(0, fileMb)) : 0.35 * net;
  // Kobo Writing Life: 70% from 2.99, 45% below.
  const kobo = price >= 2.99 ? 0.7 : 0.45;
  // Smashwords store (Draft2Digital): 75% from 2.99, 40% below. Through D2D to other stores: the store's 70% less 10% of list.
  const smash = price >= 2.99 ? 0.75 : 0.4;
  const rows: PlatformRow[] = [
    { id: 'booksatlas', name: 'BooksAtlas', perSale: cents(net * AUTHOR_SHARE), rate: `${Math.round(AUTHOR_SHARE * 100)}%`, note: 'No setup fee, no delivery fee, no minimum price. Sold worldwide, including every country in Africa.', ours: true },
    { id: 'booksatlas-pro', name: 'BooksAtlas Author Pro', perSale: cents(net * (1 - PLANS.pro.commission)), rate: `${Math.round((1 - PLANS.pro.commission) * 100)}%`, note: `€${PLANS.pro.monthlyFee} a month; pays more from a handful of sales a month.`, ours: true },
    { id: 'lulu', name: 'Lulu Bookstore', perSale: cents(net * 0.9), rate: '90%', note: "Lulu's headline eBook share on its own bookstore; through retailers it pays from what the retailer pays it.", source: 'https://www.lulu.com/sell/sell-on-lulu' },
    { id: 'smashwords', name: 'Smashwords store (Draft2Digital)', perSale: cents(net * smash), rate: `${Math.round(smash * 100)}%`, note: 'From 2026: 75% at 2.99 and up, 40% below.', source: 'https://draft2digital.com/blog/royalty-rates/' },
    { id: 'apple', name: 'Apple Books', perSale: cents(net * 0.7), rate: '70%', note: 'Headline rate for direct authors.', source: 'https://authors.apple.com' },
    { id: 'google', name: 'Google Play Books', perSale: cents(net * 0.7), rate: '70%', note: '70% in 60+ countries; 52% elsewhere.', source: 'https://support.google.com/books/partner/answer/9331459' },
    { id: 'kobo', name: 'Kobo Writing Life', perSale: cents(net * kobo), rate: `${Math.round(kobo * 100)}%`, note: '70% from 2.99, 45% below; no delivery fee.', source: 'https://kobowritinglife.zendesk.com/hc/en-us/articles/360058976032' },
    { id: 'kdp', name: 'Amazon KDP', perSale: cents(kdp), rate: kdp70 ? '70%' : '35%', note: kdp70 ? `70% between €2.69 and €9.99, after a delivery fee of about €0.12 per MB (${fileMb} MB file).` : '35% outside €2.69–€9.99.', source: 'https://kdp.amazon.com/help/topic/G200644210' },
    { id: 'd2d', name: 'Draft2Digital to other stores', perSale: cents(net * 0.6), rate: '≈60%', note: "The store's 70% less Draft2Digital's 10% of list.", source: 'https://draft2digital.com/blog/royalty-rates/' },
  ];
  return rows.sort((a, b) => b.perSale - a.perSale || (a.ours ? -1 : 1));
}

/** Natural-voice audiobook: the narration price, what each sale earns and the copies that pay it back. */
export function audiobookPlan(words: number, addOnPrice: number, vatPercent: number) {
  const narration = narrationPriceCents(Math.max(0, words)) / 100;
  const perSale = cents(excludingVat(addOnPrice, vatPercent) * AUTHOR_SHARE);
  const hours = Math.round((Math.max(0, words) / 150 / 60) * 10) / 10;
  return { narration, perSale, hours, paysBackAfter: perSale > 0 ? Math.ceil(narration / perSale) : null };
}

/**
 * Print: what one copy earns, given the printer's cost per copy. BooksAtlas sells and ships printed copies itself
 * (2026-11-24) and pays 81% of the price excluding VAT after printing; KDP pays 60% of the price excluding VAT on
 * Amazon, less printing; Lulu pays 80% of what remains after printing.
 */
export function printEarnings(price: number, vatPercent: number, printCost: number) {
  const net = excludingVat(price, vatPercent);
  const cost = Math.max(0, printCost);
  return {
    booksatlas: cents(Math.max(0, (net - cost) * AUTHOR_SHARE)),
    kdp: cents(Math.max(0, 0.6 * net - cost)),
    lulu: cents(Math.max(0, (net - cost) * 0.8)),
    /** The lowest price (incl. VAT) at which a KDP copy earns anything. */
    kdpMinimumPrice: cents((cost / 0.6) * (1 + Math.max(0, vatPercent) / 100)),
  };
}

/** BooksAtlas's one-off print services. */
export const PRINT_PACKAGES = [
  { id: 'print', name: 'Print-ready package', price: 99, body: 'Interior PDF and full wrap-around cover with spine, sized and checked for KDP and Lulu, plus an upload checklist.' },
  { id: 'premium', name: 'Premium package', price: 249, body: 'Everything in the print-ready package, with an original cover designed for your title, genre and readers.' },
] as const;
