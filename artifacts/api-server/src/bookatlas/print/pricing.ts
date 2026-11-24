/**
 * Printed books sold and shipped from BooksAtlas (owner request 2026-11-24), printed on demand by Lulu's Print API.
 * This module holds the pure rules: Lulu product codes, the money split of an order and the price limits.
 *
 * Money (all in euro cents):
 * - The reader pays the author's print price per copy (VAT included, like every BooksAtlas price) plus shipping.
 * - Shipping is Lulu's shipping cost passed on at cost, with the same VAT as the book.
 * - BooksAtlas pays Lulu the printing, shipping and fulfilment.
 * - The author keeps 81% (`shareRate`) of what remains of the price excluding VAT after printing and fulfilment.
 */
import type { PaperId, TrimSizeId } from '@workspace/bookatlas-catalog/publishing';
import { vatFor } from '../payments/vat.js';
import { shareRate } from '../payments/authorSales.js';

export type Binding = 'paperback' | 'hardcover';
export interface PrintSpec { trimSize: TrimSizeId; paper: PaperId; binding: Binding }

/** Lulu trim codes (inches × 100, width then height). */
const TRIM_CODES: Record<TrimSizeId, string> = {
  '5x8': '0500X0800', '5.5x8.5': '0550X0850', '6x9': '0600X0900', '7x10': '0700X1000', '8.5x11': '0850X1100',
};

/**
 * Lulu's 27-character product code ("pod_package_id"): trim, colour, print quality, binding, paper, PPI, cover
 * finish, linen, foil. Black-and-white standard on 60# white or cream, or premium colour on 80# coated white;
 * paperback (perfect bound) or hardcover (case wrap); matte cover. Lulu's cost calculation rejects a code it does
 * not print, so every price is checked against Lulu before a book goes on sale.
 */
export function podPackageId(spec: PrintSpec): string {
  const trim = TRIM_CODES[spec.trimSize];
  if (!trim) throw new Error('Unknown trim size.');
  const colour = spec.paper === 'color' ? 'FCPRE' : 'BWSTD';
  const bind = spec.binding === 'hardcover' ? 'CW' : 'PB';
  const paper = spec.paper === 'color' ? '080CW444' : spec.paper === 'cream' ? '060UC444' : '060UW444';
  return `${trim}${colour}${bind}${paper}MXX`;
}

/** Delivery speeds Lulu offers, slowest (cheapest) first. */
export const SHIPPING_LEVELS = [
  { id: 'MAIL', label: 'Standard mail', note: 'Slowest and cheapest; tracking in some countries.' },
  { id: 'PRIORITY_MAIL', label: 'Priority mail', note: 'Faster mail service.' },
  { id: 'GROUND', label: 'Ground courier', note: 'Tracked courier (not every country).' },
  { id: 'EXPEDITED', label: 'Expedited', note: 'Tracked, a few days.' },
  { id: 'EXPRESS', label: 'Express', note: 'Tracked, fastest.' },
] as const;
export type ShippingLevel = typeof SHIPPING_LEVELS[number]['id'];
export const isShippingLevel = (v: unknown): v is ShippingLevel => SHIPPING_LEVELS.some((l) => l.id === v);

export const PRINT_PRICE = { minCents: 300, maxCents: 25_000 } as const;
export const MAX_COPIES = 10;
/** The author must keep at least this much per copy after printing (cents, excluding VAT). */
export const MIN_MARGIN_CENTS = 50;

/** VAT rate (basis points) charged on a printed book (and its shipping) for a buyer in `country`. */
export const printVatBp = (country: string) => vatFor(10_000, country).rateBp;

/** The VAT-inclusive charge for a cost excluding VAT. */
export const withVat = (exclCents: number, rateBp: number) => Math.round(exclCents * (1 + rateBp / 10_000));

export interface PrintCosts {
  /** Lulu's printing cost of all copies, excluding tax. */
  printExcl: number;
  /** Lulu's fulfilment fee for the order, excluding tax. */
  fulfilmentExcl: number;
  /** Lulu's shipping cost, excluding tax. */
  shippingExcl: number;
}

/** What the reader pays, what Lulu is paid and what the author earns, for `quantity` copies at `priceCents` each. */
export function printOrderSplit(priceCents: number, quantity: number, country: string, costs: PrintCosts, at = new Date().toISOString()) {
  const rateBp = printVatBp(country);
  const bookGross = priceCents * quantity;
  const book = vatFor(bookGross, country);
  const shippingGross = withVat(costs.shippingExcl, rateBp);
  const productionExcl = costs.printExcl + costs.fulfilmentExcl;
  const marginExcl = book.net - productionExcl;
  const authorShare = Math.max(0, Math.round(marginExcl * shareRate(at)));
  return {
    rateBp,
    bookGross,
    bookNet: book.net,
    shippingGross,
    totalGross: bookGross + shippingGross,
    /** Printing and fulfilment, excluding tax: deducted before the author's share. */
    productionExcl,
    authorShare,
    /** BooksAtlas's commission on the copies (after paying Lulu). */
    commission: Math.max(0, marginExcl - authorShare),
    marginExcl,
  };
}

/** The lowest VAT-inclusive price per copy at which the author keeps `MIN_MARGIN_CENTS` after printing one copy. */
export function minimumPrintPrice(unitProductionExclCents: number, country = 'NL') {
  const rateBp = printVatBp(country);
  return Math.ceil(withVat(unitProductionExclCents + MIN_MARGIN_CENTS, rateBp) / 10) * 10 - 1;
}

/** Validates an author's print price (euros, VAT included) and returns it in cents. */
export function printPriceCents(input: unknown) {
  const n = typeof input === 'number' ? input : typeof input === 'string' && input.trim() ? Number(input) : NaN;
  const cents = Math.round(n * 100);
  if (!Number.isFinite(n) || cents < PRINT_PRICE.minCents || cents > PRINT_PRICE.maxCents) {
    throw new RangeError(`Enter a print price between €${PRINT_PRICE.minCents / 100} and €${PRINT_PRICE.maxCents / 100}.`);
  }
  return cents;
}

/** Shipping address as Lulu needs it; checked here so Lulu and Stripe never receive malformed data. */
export interface ShippingAddress {
  name: string; street1: string; street2?: string; city: string; postcode: string; stateCode?: string;
  countryCode: string; phone: string; email: string;
}

export function shippingAddressFrom(input: unknown, fallbackEmail: string): ShippingAddress {
  const a = (input ?? {}) as Record<string, unknown>;
  const text = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max) : '');
  const out: ShippingAddress = {
    name: text(a.name, 80), street1: text(a.street1, 120), street2: text(a.street2, 120) || undefined,
    city: text(a.city, 80), postcode: text(a.postcode, 20), stateCode: text(a.stateCode, 10).toUpperCase() || undefined,
    countryCode: text(a.countryCode, 2).toUpperCase(), phone: text(a.phone, 30), email: text(a.email, 254) || fallbackEmail,
  };
  const missing = [
    !out.name && 'name', !out.street1 && 'street', !out.city && 'city', !out.postcode && 'postcode',
    !/^[A-Z]{2}$/.test(out.countryCode) && 'country', !/^\+?[0-9 ()-]{6,30}$/.test(out.phone) && 'phone number',
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email) && 'e-mail address',
  ].filter(Boolean);
  if (missing.length) throw new RangeError(`Please complete the delivery address: ${missing.join(', ')}.`);
  // Lulu needs a state or province for these countries.
  if (['US', 'CA', 'AU'].includes(out.countryCode) && !out.stateCode) throw new RangeError('Please add the state or province code (for example CA or ON).');
  return out;
}
