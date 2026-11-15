import React from 'react';
import * as Collapsible from '@radix-ui/react-collapsible';
import { ChevronDown, Rocket, Tags } from 'lucide-react';
import type { SubmissionIntake } from '@workspace/bookatlas-catalog/publishing';
import { launchScore } from './launch';

const ring = (score: number) => (score >= 85 ? 'text-emerald-500' : score >= 65 ? 'text-amber-500' : 'text-rose-500');

/**
 * Launch Score and Smart Pricing, live while the author fills in the form (no AI, no cost): the score, what to
 * improve first, and a suggested price with the author's earnings per sale.
 */
export function LaunchPanel({ intake, words, cover, findings, onUsePrice, onFocusField }: {
  intake: SubmissionIntake;
  words?: number;
  cover?: { width: number; height: number } | null;
  findings?: { errors: number; warnings: number };
  onUsePrice: (price: number) => void;
  onFocusField?: (id: string) => void;
}) {
  const r = launchScore({ intake, words, cover, findings });
  const p = r.price;
  const circumference = 2 * Math.PI * 26;
  return (
    <section aria-labelledby="launch-score" className="grid gap-4 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-white p-4 sm:grid-cols-[auto,1fr]">
      <div className="flex items-center gap-3 sm:flex-col sm:items-center">
        <svg viewBox="0 0 64 64" className="h-20 w-20 -rotate-90" role="img" aria-label={`Launch Score ${r.score} out of 100`}>
          <circle cx="32" cy="32" r="26" className="fill-none stroke-slate-200" strokeWidth="6" />
          <circle cx="32" cy="32" r="26" className={`fill-none stroke-current transition-[stroke-dashoffset] duration-500 ${ring(r.score)}`} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={circumference * (1 - r.score / 100)} />
          <text x="32" y="32" transform="rotate(90 32 32)" textAnchor="middle" dominantBaseline="central" className="fill-slate-900 text-[15px] font-bold">{r.score}</text>
        </svg>
        <div className="sm:text-center">
          <h3 id="launch-score" className="flex items-center gap-1.5 text-sm font-bold text-slate-900 sm:justify-center"><Rocket className="h-4 w-4 text-indigo-600" aria-hidden />Launch Score</h3>
          <p className="text-xs font-semibold text-slate-600">{r.grade}</p>
        </div>
      </div>

      <div className="min-w-0 space-y-3">
        {r.improvements.length ? (
          <ol className="space-y-1.5 text-xs text-slate-700">
            {r.improvements.slice(0, 4).map((i) => (
              <li key={i.id} className="flex gap-2">
                <span className="mt-0.5 shrink-0 rounded-full bg-indigo-600 px-1.5 text-[10px] font-bold leading-4 text-white">+{i.gain}</span>
                <span><button type="button" onClick={() => onFocusField?.(i.id)} className="font-semibold text-slate-900 hover:underline cursor-pointer">{i.label}:</button> {i.tip}</span>
              </li>
            ))}
          </ol>
        ) : <p className="text-xs text-emerald-800">Everything readers see first is in good shape. Ready to launch.</p>}
        {r.improvements.length > 4 && (
          <Collapsible.Root>
            <Collapsible.Trigger className="group inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:underline cursor-pointer">
              {r.improvements.length - 4} more <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]:rotate-180" aria-hidden />
            </Collapsible.Trigger>
            <Collapsible.Content>
              <ol className="mt-1.5 space-y-1.5 text-xs text-slate-700">{r.improvements.slice(4).map((i) => <li key={i.id}><span className="font-semibold text-slate-900">{i.label}:</span> {i.tip}</li>)}</ol>
            </Collapsible.Content>
          </Collapsible.Root>
        )}

        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
          <Tags className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
          <p className="min-w-0 flex-1 text-xs text-slate-700">
            <span className="font-semibold text-slate-900">Smart price: €{p.recommended.toFixed(2)}</span> (books like this sell between €{p.low.toFixed(2)} and €{p.high.toFixed(2)}{p.wordsKnown ? '' : '; based on the category, the length is not known yet'}).
            {' '}You earn €{p.earningsPerSale.toFixed(2)} a sale; about {p.copiesFor100} sales a month make €100.
          </p>
          {Math.abs((Number(intake.price) || 0) - p.recommended) > 0.005 && (
            <button type="button" onClick={() => onUsePrice(p.recommended)} className="rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-slate-950 hover:bg-amber-300 cursor-pointer">Use €{p.recommended.toFixed(2)}</button>
          )}
        </div>
      </div>
    </section>
  );
}
