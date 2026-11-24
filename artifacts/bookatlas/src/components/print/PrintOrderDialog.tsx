import React, { useEffect, useMemo, useState } from 'react';
import * as RadioGroup from '@radix-ui/react-radio-group';
import { Loader2, Lock, Minus, Plus, Printer, Truck } from 'lucide-react';
import type { Book } from '../../types';
import { useEbookApi, type DeliveryAddress, type PrintConfig, type PrintQuote, type ShippingLevel } from '../ebook/ebookApi';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { SelectBox } from '../ui/select-box';

const euro = (cents: number) => `€${(cents / 100).toFixed(2)}`;
/** Countries printed copies are commonly shipped to; the printer confirms each address when pricing. */
const COUNTRIES = 'NL BE DE FR LU AT IE IT ES PT DK SE FI PL CZ SK SI HR HU RO BG GR CY MT EE LV LT GB NO CH IS US CA AU NZ ZA NG GH KE UG TZ RW ET EG MA TN SN CI CM ZW ZM BW NA MU JM TT BB BR MX AR CL CO IN PK BD LK SG MY PH ID TH VN JP KR HK TW AE SA QA IL TR'.split(' ');
const NEEDS_STATE = new Set(['US', 'CA', 'AU']);
const FORMAT: Record<string, string> = { '5x8': '5 × 8 in', '5.5x8.5': '5.5 × 8.5 in', '6x9': '6 × 9 in', '7x10': '7 × 10 in', '8.5x11': '8.5 × 11 in' };

/** "Paperback · 6 × 9 in · 212 pages" for a book's printed edition. */
export const printFormat = (p: NonNullable<Book['printEdition']>) => `${p.binding === 'hardcover' ? 'Hardcover' : 'Paperback'} · ${FORMAT[p.trimSize] ?? p.trimSize} · ${p.pageCount} pages`;

/**
 * Ordering printed copies (owner request 2026-11-24): copies, delivery address and speed, a live price from the
 * printer (copies at the author's price, delivery at cost, VAT included), then payment through Stripe. The copies are
 * printed on demand and shipped by the printer.
 */
export function PrintOrderDialog({ book, open, onOpenChange }: { book: Book; open: boolean; onOpenChange: (open: boolean) => void }) {
  const api = useEbookApi();
  const [config, setConfig] = useState<PrintConfig | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [level, setLevel] = useState<ShippingLevel>('MAIL');
  const [address, setAddress] = useState<DeliveryAddress>({ name: '', street1: '', street2: '', city: '', postcode: '', stateCode: '', countryCode: 'NL', phone: '' });
  const [quote, setQuote] = useState<PrintQuote | null>(null);
  const [busy, setBusy] = useState<'quote' | 'pay' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const regions = useMemo(() => { try { return new Intl.DisplayNames(['en'], { type: 'region' }); } catch { return null; } }, []);
  const countries = useMemo(() => COUNTRIES.map((c) => ({ code: c, name: regions?.of(c) ?? c })).sort((a, b) => a.name.localeCompare(b.name)), [regions]);

  useEffect(() => { if (open && !config) api.printConfig().then(setConfig).catch(() => setConfig(null)); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  // Any change to the order makes the price out of date.
  useEffect(() => { setQuote(null); }, [quantity, level, address]);

  const set = (field: keyof DeliveryAddress) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setAddress((a) => ({ ...a, [field]: e.target.value }));
  const body = () => ({ bookId: book.id, quantity, shippingLevel: level, address: { ...address, street2: address.street2 || undefined, stateCode: address.stateCode || undefined } });

  const getQuote = async () => {
    setBusy('quote'); setError(null);
    try { setQuote(await api.printQuote(body())); } catch (e) { setError(e instanceof Error ? e.message : 'The price could not be calculated.'); } finally { setBusy(null); }
  };
  const pay = async () => {
    setBusy('pay'); setError(null);
    try { window.location.assign((await api.orderPrint(body())).url); } catch (e) { setError(e instanceof Error ? e.message : 'The checkout could not be opened.'); setBusy(null); }
  };

  const p = book.printEdition;
  if (!p) return null;
  const field = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Printer className="h-5 w-5 text-amber-600" aria-hidden />Order printed copies</DialogTitle>
          <DialogDescription>{book.title} · {printFormat(p)} · {euro(Math.round(p.price * 100))} a copy. Printed when you order and shipped to your door.</DialogDescription>
        </DialogHeader>

        {config && !config.enabled && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Printed copies can’t be ordered at the moment. Please try again later.</p>}

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-slate-800" id="print-copies">Copies</span>
            <div className="flex items-center gap-2" role="group" aria-labelledby="print-copies">
              <button type="button" aria-label="One copy fewer" disabled={quantity <= 1} onClick={() => setQuantity((q) => q - 1)} className="grid h-8 w-8 place-items-center rounded-full border border-slate-300 disabled:opacity-40"><Minus className="h-3.5 w-3.5" aria-hidden /></button>
              <output aria-live="polite" className="w-6 text-center text-sm font-bold">{quantity}</output>
              <button type="button" aria-label="One copy more" disabled={quantity >= (config?.maxCopies ?? 10)} onClick={() => setQuantity((q) => q + 1)} className="grid h-8 w-8 place-items-center rounded-full border border-slate-300 disabled:opacity-40"><Plus className="h-3.5 w-3.5" aria-hidden /></button>
            </div>
          </div>

          <fieldset className="grid gap-2 sm:grid-cols-2">
            <legend className="mb-1 text-sm font-semibold text-slate-800">Deliver to</legend>
            <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Full name<input autoComplete="name" value={address.name} onChange={set('name')} className={field} /></label>
            <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Street and number<input autoComplete="address-line1" value={address.street1} onChange={set('street1')} className={field} /></label>
            <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Apartment, building (optional)<input autoComplete="address-line2" value={address.street2} onChange={set('street2')} className={field} /></label>
            <label className="text-xs font-semibold text-slate-600">Postcode<input autoComplete="postal-code" value={address.postcode} onChange={set('postcode')} className={field} /></label>
            <label className="text-xs font-semibold text-slate-600">City<input autoComplete="address-level2" value={address.city} onChange={set('city')} className={field} /></label>
            <label className="text-xs font-semibold text-slate-600">Country
              <SelectBox value={address.countryCode} onChange={(e) => setAddress((a) => ({ ...a, countryCode: e.target.value }))} className="mt-1 w-full">
                {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </SelectBox>
            </label>
            {NEEDS_STATE.has(address.countryCode) && <label className="text-xs font-semibold text-slate-600">State or province code<input autoComplete="address-level1" value={address.stateCode} onChange={set('stateCode')} placeholder="e.g. CA" className={field} /></label>}
            <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Phone (for the courier)<input type="tel" autoComplete="tel" value={address.phone} onChange={set('phone')} className={field} /></label>
          </fieldset>

          {config && (
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-slate-800"><Truck className="h-4 w-4 text-slate-500" aria-hidden />Delivery</p>
              <RadioGroup.Root value={level} onValueChange={(v) => setLevel(v as ShippingLevel)} aria-label="Delivery speed" className="grid gap-1.5 sm:grid-cols-2">
                {config.shippingLevels.map((l) => (
                  <RadioGroup.Item key={l.id} value={l.id} className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-2 text-left data-[state=checked]:border-indigo-500 data-[state=checked]:ring-2 data-[state=checked]:ring-indigo-500/15 cursor-pointer">
                    <span className="mt-0.5 grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border border-slate-400"><RadioGroup.Indicator className="h-1.5 w-1.5 rounded-full bg-indigo-600" /></span>
                    <span><span className="block text-xs font-bold text-slate-900">{l.label}</span><span className="block text-[11px] text-slate-500">{l.note}</span></span>
                  </RadioGroup.Item>
                ))}
              </RadioGroup.Root>
            </div>
          )}

          {quote && (
            <dl className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm" aria-label="Price">
              <div className="flex justify-between"><dt>{quote.quantity} × {euro(quote.unitPriceCents)}</dt><dd>{euro(quote.booksCents)}</dd></div>
              <div className="flex justify-between"><dt>Delivery</dt><dd>{euro(quote.shippingCents)}</dd></div>
              <div className="flex justify-between border-t border-slate-200 pt-1 font-bold"><dt>Total</dt><dd>{euro(quote.totalCents)}</dd></div>
              <p className="text-[11px] text-slate-500">{quote.vatRateBp ? `Including ${quote.vatRateBp / 100}% VAT.` : 'No Dutch VAT for this country; local import charges may apply.'} Usually delivered within 1–2 weeks.</p>
            </dl>
          )}
          {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}

          <div className="flex flex-wrap items-center justify-end gap-2">
            {!quote ? (
              <button type="button" disabled={!!busy || !config?.enabled} onClick={getQuote} className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-700 disabled:opacity-50">
                {busy === 'quote' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}See the total
              </button>
            ) : (
              <button type="button" disabled={!!busy} onClick={pay} className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-50">
                {busy === 'pay' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Lock className="h-4 w-4" aria-hidden />}Pay {euro(quote.totalCents)}
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-500">You can withdraw within 14 days of delivery. A damaged or faulty copy is replaced or refunded.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
