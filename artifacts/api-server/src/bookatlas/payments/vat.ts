/**
 * VAT on BookAtlas eBook sales (owner decision 2026-11-14: BookAtlas, not Stripe, handles tax).
 *
 * Prices are VAT-inclusive consumer prices. The seller is established in the Netherlands. Below the EU-wide
 * €10,000 threshold for cross-border distance sales of electronic services (VAT Directive art. 59c), Dutch VAT
 * applies to buyers in every EU country: 9% for e-books. Above it, each buyer's own country's rate applies
 * through OSS; `crossBorderStatus` warns before the threshold is reached, and the switch is a code change
 * with a rate table the owner's accountant confirms.
 *
 * Buyers outside the EU: the place of supply is the buyer's country, so no Dutch VAT is charged. Whether a
 * local registration is needed there (UK, Norway, Switzerland, African countries …) is for the accountant.
 */

export const SELLER_COUNTRY = 'NL';
/** Dutch reduced rate for books, e-books included (basis points). */
export const NL_EBOOK_RATE_BP = 900;
/** EU-wide annual threshold for cross-border B2C electronic services, in euro cents (net of VAT). */
export const EU_THRESHOLD_CENTS = 1_000_000;
/** Warn the owner from this share of the threshold. */
export const THRESHOLD_WARNING_SHARE = 0.8;

export const EU_COUNTRIES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU',
  'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
]);

export type VatScheme = 'nl-domestic' | 'nl-eu-threshold' | 'outside-eu' | 'unknown-country-nl';

export interface VatBreakdown {
  /** ISO 3166-1 alpha-2 country of the buyer, as Stripe reports it; null when unknown. */
  country: string | null;
  scheme: VatScheme;
  rateBp: number;
  /** All amounts in the smallest currency unit; gross = net + vat. */
  gross: number;
  net: number;
  vat: number;
}

const normaliseCountry = (country: string | null | undefined) => {
  const c = country?.trim().toUpperCase();
  return c && /^[A-Z]{2}$/.test(c) ? c : null;
};

/**
 * Split a VAT-inclusive amount. An unknown country is treated as Dutch: the safe side, since VAT that
 * was due but not charged comes out of the seller's margin either way.
 */
export function vatFor(gross: number, buyerCountry: string | null | undefined): VatBreakdown {
  const country = normaliseCountry(buyerCountry);
  let scheme: VatScheme;
  if (!country) scheme = 'unknown-country-nl';
  else if (country === SELLER_COUNTRY) scheme = 'nl-domestic';
  else if (EU_COUNTRIES.has(country)) scheme = 'nl-eu-threshold';
  else scheme = 'outside-eu';
  const rateBp = scheme === 'outside-eu' ? 0 : NL_EBOOK_RATE_BP;
  const vat = Math.round((gross * rateBp) / (10_000 + rateBp));
  return { country, scheme, rateBp, gross, net: gross - vat, vat };
}

/** Sum the lines of one order; VAT is computed per line and added, so the invoice lines always add up. */
export function vatForLines(lines: number[], buyerCountry: string | null | undefined) {
  const parts = lines.map((gross) => vatFor(gross, buyerCountry));
  const first = parts[0] ?? vatFor(0, buyerCountry);
  return {
    country: first.country, scheme: first.scheme, rateBp: first.rateBp,
    gross: parts.reduce((s, p) => s + p.gross, 0),
    net: parts.reduce((s, p) => s + p.net, 0),
    vat: parts.reduce((s, p) => s + p.vat, 0),
    lines: parts,
  };
}

/** Whether cross-border EU sales (net) this or last calendar year are near or over the €10,000 threshold. */
export function crossBorderStatus(netThisYear: number, netLastYear: number) {
  const highest = Math.max(netThisYear, netLastYear);
  const state = highest > EU_THRESHOLD_CENTS ? 'over' : highest >= EU_THRESHOLD_CENTS * THRESHOLD_WARNING_SHARE ? 'warning' : 'ok';
  return {
    state, thresholdCents: EU_THRESHOLD_CENTS, netThisYearCents: netThisYear, netLastYearCents: netLastYear,
    message: state === 'ok'
      ? 'Below the EU €10,000 threshold: Dutch 9% VAT applies to all EU buyers.'
      : state === 'warning'
        ? 'Cross-border EU sales are above 80% of the €10,000 threshold. Register for OSS and switch to per-country rates before it is passed.'
        : 'Cross-border EU sales passed €10,000: per-country VAT through OSS is due from the sale that crossed it. Contact the accountant now.',
  };
}
