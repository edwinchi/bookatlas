import { bookatlasDb } from '../db/supabaseClient.js';
import { PaymentError } from './purchases.js';

/**
 * Author payout details (cycle 6, Author hub). Where BooksAtlas sends the author's share: a SEPA bank account
 * (IBAN). Stored server-side only; the author sees it masked. Tax details let BooksAtlas report payouts
 * (DAC7, Directive (EU) 2021/514: platforms report sellers' name, address, tax ID and earnings).
 */
export interface PayoutDetails {
  user_id: string;
  account_holder: string;
  iban: string;
  bic: string | null;
  address: string;
  country: string;
  tax_id: string | null;
  vat_id: string | null;
  business: boolean;
  updated_at: string;
}

const memory = new Map<string, PayoutDetails>();
const db = () => bookatlasDb;

/** ISO 13616 IBAN check: country, length 15–34 and the mod-97 checksum. */
export function validIban(raw: string) {
  const iban = raw.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return null;
  const digits = (iban.slice(4) + iban.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rest = 0;
  for (const d of digits) rest = (rest * 10 + Number(d)) % 97;
  return rest === 1 ? iban : null;
}
export const maskIban = (iban: string) => `${iban.slice(0, 4)} •••• •••• ${iban.slice(-4)}`;

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, max) : '');

export async function getPayout(userId: string): Promise<PayoutDetails | null> {
  if (!db()) return structuredClone(memory.get(userId) ?? null);
  const r = await db()!.from('author_payouts').select('*').eq('user_id', userId).maybeSingle();
  if (r.error) throw new PaymentError('Payout details could not be read.', 503);
  return r.data as PayoutDetails | null;
}

export function publicPayout(p: PayoutDetails | null) {
  if (!p) return { configured: false as const };
  return {
    configured: true as const, accountHolder: p.account_holder, iban: maskIban(p.iban), bic: p.bic, address: p.address,
    country: p.country, taxId: p.tax_id ? `•••${p.tax_id.slice(-3)}` : null, vatId: p.vat_id, business: p.business, updatedAt: p.updated_at,
  };
}

export async function savePayout(userId: string, body: Record<string, unknown>) {
  const accountHolder = text(body.accountHolder, 120);
  const iban = validIban(text(body.iban, 50));
  const bicRaw = text(body.bic, 11).toUpperCase().replace(/\s+/g, '');
  const address = text(body.address, 300);
  const country = text(body.country, 2).toUpperCase();
  const taxId = text(body.taxId, 30) || null;
  const vatId = text(body.vatId, 20).toUpperCase().replace(/\s+/g, '') || null;
  const business = body.business === true;
  const errors: Record<string, string> = {};
  if (accountHolder.length < 2) errors.accountHolder = 'Enter the name on the bank account.';
  if (!iban) errors.iban = 'Enter a valid IBAN (check the digits).';
  if (bicRaw && !/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bicRaw)) errors.bic = 'A BIC has 8 or 11 letters and digits.';
  if (address.length < 5) errors.address = 'Enter your address (needed for tax reporting).';
  if (!/^[A-Z]{2}$/.test(country)) errors.country = 'Choose your country of residence.';
  if (vatId && !/^[A-Z]{2}[A-Z0-9]{2,14}$/.test(vatId)) errors.vatId = 'A VAT number starts with the country code, e.g. NL123456789B01.';
  if (Object.keys(errors).length) throw Object.assign(new PaymentError(Object.values(errors)[0]!, 400), { fields: errors });
  const row: PayoutDetails = {
    user_id: userId, account_holder: accountHolder, iban: iban!, bic: bicRaw || null, address, country,
    tax_id: taxId, vat_id: vatId, business, updated_at: new Date().toISOString(),
  };
  if (!db()) memory.set(userId, row);
  else {
    const r = await db()!.from('author_payouts').upsert(row);
    if (r.error) throw new PaymentError('Payout details could not be saved.', 503);
  }
  return publicPayout(row);
}

export async function erasePayout(userId: string) {
  if (!db()) { memory.delete(userId); return; }
  const r = await db()!.from('author_payouts').delete().eq('user_id', userId);
  if (r.error) throw new PaymentError('Payout details could not be erased.', 503);
}
