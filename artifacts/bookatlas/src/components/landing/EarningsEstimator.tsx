import React, { useId, useState } from 'react';
import { Crown, TrendingUp } from 'lucide-react';
import { betterPlan, monthlyEarnings, PLANS, PlanId, proPaysMoreFrom } from './earnings';

const eur = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });

/** Interactive comparison of Standard and Author Pro eBook earnings. */
export const EarningsEstimator: React.FC = () => {
  const [price, setPrice] = useState(7.99);
  const [copies, setCopies] = useState(40);
  const priceId = useId();
  const copiesId = useId();
  const best = betterPlan(price, copies);
  const proFrom = proPaysMoreFrom(price);

  return (
    <div className="grid gap-8 rounded-3xl bg-white p-6 shadow-xl shadow-indigo-900/5 ring-1 ring-slate-200 sm:p-10 lg:grid-cols-2 lg:gap-12">
      <div className="space-y-8">
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor={priceId} className="text-sm font-semibold text-slate-800">eBook price</label>
            <output htmlFor={priceId} className="font-serif text-2xl font-bold text-slate-900">{eur.format(price)}</output>
          </div>
          <input id={priceId} type="range" min={0.99} max={24.99} step={1} value={price} onChange={(e) => setPrice(Number(e.target.value))} className="mt-3 w-full cursor-pointer accent-indigo-600" />
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor={copiesId} className="text-sm font-semibold text-slate-800">Copies sold a month</label>
            <output htmlFor={copiesId} className="font-serif text-2xl font-bold text-slate-900">{copies}</output>
          </div>
          <input id={copiesId} type="range" min={0} max={500} step={5} value={copies} onChange={(e) => setCopies(Number(e.target.value))} className="mt-3 w-full cursor-pointer accent-indigo-600" />
        </div>
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 ring-1 ring-amber-200">
          <TrendingUp className="mt-0.5 h-4 w-4 shrink-0" />
          {proFrom === null ? 'Pick a price to compare plans.' : `At this price, Author Pro pays more from ${proFrom} copies a month.`}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2" aria-live="polite">
        {(Object.keys(PLANS) as PlanId[]).map((plan) => {
          const e = monthlyEarnings(price, copies, plan);
          const winner = plan === best && copies > 0;
          return (
            <div key={plan} className={`relative flex flex-col rounded-2xl p-5 ring-1 transition-[background-color,box-shadow] duration-300 ${winner ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 ring-indigo-600' : 'bg-slate-50 text-slate-900 ring-slate-200'}`}>
              {winner && <span className="absolute -top-2.5 right-4 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-950"><Crown className="h-3 w-3" /> Best for you</span>}
              <h3 className="text-sm font-bold">{PLANS[plan].label}</h3>
              <p className={`text-xs ${winner ? 'text-indigo-100' : 'text-slate-500'}`}>
                You keep {Math.round((1 - PLANS[plan].commission) * 100)}%{PLANS[plan].monthlyFee ? ` · ${eur.format(PLANS[plan].monthlyFee)}/month` : ' · no monthly fee'}
              </p>
              <p className="mt-4 font-serif text-3xl font-bold tabular-nums">{eur.format(e.net)}</p>
              <p className={`text-xs ${winner ? 'text-indigo-100' : 'text-slate-500'}`}>a month · {eur.format(e.net * 12)} a year</p>
              <dl className={`mt-4 space-y-1 border-t pt-3 text-xs tabular-nums ${winner ? 'border-white/20 text-indigo-50' : 'border-slate-200 text-slate-600'}`}>
                <div className="flex justify-between gap-2"><dt>Sales</dt><dd className="whitespace-nowrap">{eur.format(e.sales)}</dd></div>
                <div className="flex justify-between gap-2"><dt>Our commission</dt><dd className="whitespace-nowrap">−{eur.format(e.commission)}</dd></div>
                {e.fee > 0 && <div className="flex justify-between gap-2"><dt>Plan fee</dt><dd className="whitespace-nowrap">−{eur.format(e.fee)}</dd></div>}
              </dl>
            </div>
          );
        })}
        <p className="text-[11px] leading-relaxed text-slate-500 sm:col-span-2">Estimates before VAT and payment fees. Paperback royalties are paid to you directly by Amazon or Lulu and are not included.</p>
      </div>
    </div>
  );
};
