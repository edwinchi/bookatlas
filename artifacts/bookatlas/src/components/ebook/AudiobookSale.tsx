import React, { useState } from 'react';
import * as RadioGroup from '@radix-ui/react-radio-group';
import { Loader2, Tag } from 'lucide-react';
import type { NarrationSale, useEbookApi } from './ebookApi';
import { AUTHOR_SHARE } from '../landing/earnings';

const euro = (n: number) => `€${n.toFixed(2)}`;
/** Dutch VAT on e-books and audiobooks; the share shown is an example for a Dutch buyer. */
const NL_VAT = 0.09;

/**
 * Cycle 9: the author decides how readers get the finished audiobook: included with the eBook, or sold as an
 * add-on (a second line in the cart, with the same 81% author share).
 */
export function AudiobookSale({ api, bookId, sale, onSaved }: { api: ReturnType<typeof useEbookApi>; bookId: string; sale: NarrationSale; onSaved: () => void }) {
  const [mode, setMode] = useState<'included' | 'addon'>(sale.audioPrice > 0 ? 'addon' : 'included');
  const [price, setPrice] = useState(sale.audioPrice > 0 ? sale.audioPrice.toFixed(2) : '4.99');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const amount = Number(price.replace(',', '.'));
  const valid = mode === 'included' || (Number.isFinite(amount) && amount >= 0.99 && amount <= 999);
  const changed = mode === 'included' ? sale.audioPrice > 0 : Math.round(amount * 100) !== Math.round(sale.audioPrice * 100);

  const save = async () => {
    setBusy(true); setMessage(null);
    try {
      const r = await api.setAudioPrice(bookId, mode === 'included' ? 0 : Math.round(amount * 100) / 100);
      setMessage({ ok: true, text: r.audioPrice > 0 ? `Readers can now add the audiobook for ${euro(r.audioPrice)}.` : 'The audiobook is now included with every eBook.' });
      onSaved();
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : 'The price could not be saved.' });
    } finally { setBusy(false); }
  };

  const option = (value: 'included' | 'addon', title: string, detail: string) => (
    <RadioGroup.Item value={value} className="flex w-full items-start gap-2 rounded-lg border border-slate-200 bg-white p-2.5 text-left data-[state=checked]:border-indigo-500 data-[state=checked]:ring-2 data-[state=checked]:ring-indigo-500/15 cursor-pointer">
      <span className="mt-0.5 grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border border-slate-400"><RadioGroup.Indicator className="h-1.5 w-1.5 rounded-full bg-indigo-600" /></span>
      <span><span className="block text-xs font-bold text-slate-900">{title}</span><span className="block text-[11px] text-slate-500">{detail}</span></span>
    </RadioGroup.Item>
  );

  return (
    <div className="space-y-2.5 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
      <p className="flex items-center gap-1.5 text-xs font-bold text-slate-900"><Tag className="h-3.5 w-3.5 text-indigo-600" aria-hidden />How readers get the audiobook</p>
      <RadioGroup.Root value={mode} onValueChange={(v) => setMode(v as 'included' | 'addon')} className="grid gap-2 sm:grid-cols-2" aria-label="How readers get the audiobook">
        {option('addon', 'Sell it as an add-on', 'Readers buy the eBook, then add the audiobook. Everyone hears a free narrated preview.')}
        {option('included', 'Include it with the eBook', `Every eBook buyer (${euro(sale.ebookPrice)}) hears the whole audiobook.`)}
      </RadioGroup.Root>
      {mode === 'addon' && (
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-[11px] font-semibold text-slate-700">
            Audiobook price (incl. VAT)
            <span className="mt-1 flex items-center rounded-lg border border-slate-300 bg-white px-2 focus-within:border-indigo-500">
              <span className="text-xs text-slate-500">€</span>
              <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" aria-invalid={!valid}
                className="w-20 bg-transparent px-1 py-1.5 text-sm font-bold text-slate-900 outline-none" />
            </span>
          </label>
          {valid && <p className="pb-1.5 text-[11px] text-slate-600">You keep about <b>{euro((amount / (1 + NL_VAT)) * AUTHOR_SHARE)}</b> per audiobook sold (81% of the price excluding VAT; example for a Dutch buyer).</p>}
          {!valid && <p className="pb-1.5 text-[11px] text-rose-700">Enter a price between €0.99 and €999.</p>}
        </div>
      )}
      {mode === 'addon' && <p className="text-[11px] text-slate-500">Our suggestion: €2–5. Readers know this is an AI voice, so a small add-on sells better than studio audiobook prices. Readers can always listen with their own device’s voice for free; the natural voice is worth paying for because it keeps playing with the screen off and sounds the same everywhere.</p>}
      {mode === 'included' && <p className="text-[11px] text-slate-500">Including it gives readers one more reason to buy the eBook.</p>}
      {mode === 'addon' && sale.audioPricedAt && <p className="text-[11px] text-slate-500">Readers who bought the eBook before {new Date(sale.audioPricedAt).toLocaleDateString()} keep the whole audiobook.</p>}
      {mode === 'addon' && !sale.audioPricedAt && <p className="text-[11px] text-slate-500">Readers who already bought the eBook keep the whole audiobook.</p>}
      <div className="flex items-center gap-3">
        <button type="button" disabled={busy || !valid || !changed} onClick={save}
          className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-3.5 py-1.5 text-[11px] font-bold text-white hover:bg-indigo-500 disabled:opacity-50 cursor-pointer">
          {busy && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}Save
        </button>
        {message && <p role="status" className={`text-[11px] ${message.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{message.text}</p>}
      </div>
    </div>
  );
}
