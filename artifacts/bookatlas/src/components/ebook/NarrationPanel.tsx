import React, { useEffect, useRef, useState } from 'react';
import * as RadioGroup from '@radix-ui/react-radio-group';
import { AlertCircle, CheckCircle2, Clock, Headphones, Loader2, Pause, Play } from 'lucide-react';
import { ProgressBar } from './ManuscriptPicker';
import { AudiobookSale } from './AudiobookSale';
import type { NarrationQuote, NarrationVoice, useEbookApi } from './ebookApi';

const euro = (cents: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' }).format(cents / 100);
const VOICES: Record<NarrationVoice, { label: string; style: string }> = {
  Sulafat: { label: 'Sulafat', style: 'Warm, female' },
  Charon: { label: 'Charon', style: 'Informative, male' },
};

/**
 * "Add a natural audiobook" on a published book (TASK-0008): what it is, the price and length, voice samples,
 * ordering through Stripe, then the order's progress until readers can listen.
 */
export function NarrationPanel({ api, bookId }: { api: ReturnType<typeof useEbookApi>; bookId: string }) {
  const [quote, setQuote] = useState<NarrationQuote | null>(null);
  const [error, setError] = useState('');
  const [voice, setVoice] = useState<NarrationVoice>('Sulafat');
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState<NarrationVoice | null>(null);
  const [loadingSample, setLoadingSample] = useState<NarrationVoice | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const urls = useRef(new Map<NarrationVoice, string>());

  const load = () => api.narrationQuote(bookId).then(setQuote).catch((e) => setError(e instanceof Error ? e.message : 'Narration details could not be loaded.'));
  useEffect(() => { void load(); return () => { audio.current?.pause(); for (const u of urls.current.values()) URL.revokeObjectURL(u); }; }, [bookId]);
  // While narrating, follow the progress.
  const status = quote?.current?.status;
  useEffect(() => {
    if (status !== 'approved' && status !== 'running') return;
    const t = setInterval(() => void load(), 15_000);
    return () => clearInterval(t);
  }, [status]);

  const sample = async (v: NarrationVoice) => {
    if (playing === v) { audio.current?.pause(); setPlaying(null); return; }
    audio.current?.pause();
    setError('');
    try {
      let url = urls.current.get(v);
      if (!url) { setLoadingSample(v); url = await api.narrationSample(v); urls.current.set(v, url); }
      const a = new Audio(url);
      audio.current = a;
      a.onended = () => setPlaying(null);
      await a.play();
      setPlaying(v);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The sample could not be played.');
    } finally { setLoadingSample(null); }
  };
  const orderIt = async () => {
    setBusy(true); setError('');
    try {
      const r = await api.orderNarration(bookId, voice);
      // Administrators narrate at no charge: no payment page, narration starts at once.
      if (r.free || !r.url) { await load(); setBusy(false); return; }
      window.location.assign(r.url);
    }
    catch (e) { setError(e instanceof Error ? e.message : 'The order could not be started.'); setBusy(false); }
  };

  const current = quote?.current;
  return (
    <section aria-labelledby={`narration-${bookId}`} className="mt-4 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4">
      <h3 id={`narration-${bookId}`} className="flex items-center gap-2 text-sm font-bold text-slate-900">
        <Headphones className="h-4 w-4 text-amber-600" aria-hidden />Natural audiobook
        <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-950">New</span>
      </h3>
      {!quote && !error && <p className="mt-2 flex items-center gap-2 text-xs text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />Loading…</p>}
      {error && <p role="alert" className="mt-2 flex items-start gap-1.5 text-xs text-rose-700"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />{error}</p>}

      {quote && !current && (
        <div className="mt-2 space-y-3">
          <p className="text-xs leading-relaxed text-slate-700">
            Your book read aloud by a natural Google Gemini studio voice instead of the robotic device voice. It is recorded once, then every reader can
            listen, chapter by chapter, with the paragraph being read highlighted. Readers without the book hear the free preview part.
            Code examples and tables are not read aloud (a short spoken note points to them), and diagrams and screenshots are not narrated; only the words read aloud are counted in the price.
          </p>
          <dl className="grid grid-cols-3 gap-2 text-center">
            {[['Words', quote.words.toLocaleString()], ['About', `${quote.hours} hours`], ['Price', quote.free ? 'Free (admin)' : euro(quote.priceCents)]].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-white px-2 py-1.5 ring-1 ring-amber-100"><dt className="text-[10px] uppercase tracking-wide text-slate-500">{k}</dt><dd className="text-sm font-bold text-slate-900">{v}</dd></div>
            ))}
          </dl>
          <RadioGroup.Root value={voice} onValueChange={(v) => setVoice(v as NarrationVoice)} aria-label="Narrator voice" className="grid gap-2 sm:grid-cols-2">
            {quote.voices.map((v) => (
              <div key={v} className={`flex items-center gap-3 rounded-xl border bg-white px-3 py-2 ${voice === v ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200'}`}>
                <RadioGroup.Item value={v} id={`voice-${bookId}-${v}`} className="grid h-4 w-4 shrink-0 place-items-center rounded-full border border-slate-400 data-[state=checked]:border-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer">
                  <RadioGroup.Indicator className="h-2 w-2 rounded-full bg-indigo-600" />
                </RadioGroup.Item>
                <label htmlFor={`voice-${bookId}-${v}`} className="min-w-0 flex-1 cursor-pointer text-xs"><span className="block font-semibold text-slate-900">{VOICES[v].label}</span><span className="text-slate-500">{VOICES[v].style}</span></label>
                <button type="button" onClick={() => void sample(v)} aria-label={`${playing === v ? 'Stop' : 'Play'} a sample of ${v}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50 cursor-pointer">
                  {loadingSample === v ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : playing === v ? <Pause className="h-3 w-3" aria-hidden /> : <Play className="h-3 w-3" aria-hidden />}Sample
                </button>
              </div>
            ))}
          </RadioGroup.Root>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => void orderIt()} disabled={busy}
              className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300 disabled:opacity-60 cursor-pointer">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Headphones className="h-3.5 w-3.5" aria-hidden />}{quote.free ? 'Narrate free (admin)' : `Order for ${euro(quote.priceCents)}`}
            </button>
            <p className="text-[11px] text-slate-500">{quote.free
              ? `As an administrator you narrate at no charge; it starts straight away. Authors pay ${euro(quote.priceCents)} for this book.`
              : 'Incl. 21% VAT. Paid securely with Stripe; an administrator approves before narration starts. You receive an invoice.'}</p>
          </div>
        </div>
      )}

      {current && (
        <div className="mt-2 space-y-2 text-xs text-slate-700">
          <p className="text-slate-500">Voice: {VOICES[current.voice].label} ({VOICES[current.voice].style}) · {current.priceCents === 0 ? 'Free (admin)' : euro(current.priceCents)}</p>
          {current.status === 'awaiting_payment' && <p className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-amber-600" aria-hidden />Waiting for payment. If you closed the payment page, order again.</p>}
          {current.status === 'paid' && <p className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-amber-600" aria-hidden />Paid, thank you. An administrator approves the narration, usually within 2 working days.</p>}
          {(current.status === 'approved' || current.status === 'running') && (
            <ProgressBar value={current.total ? (current.done / current.total) * 100 : 0} label={`Narrating: part ${current.done} of ${current.total}…`} />
          )}
          {/* Waiting for Google's free-tier limit: it continues by itself (owner request 2026-11-16). */}
          {current.status === 'running' && current.error && <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 p-2 text-amber-900"><Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />{current.error}</p>}
          {current.status === 'done' && <p className="flex items-center gap-1.5 font-semibold text-emerald-800"><CheckCircle2 className="h-4 w-4" aria-hidden />Your natural audiobook is live ({Math.round(current.seconds / 360) / 10} hours). Readers choose “Listen to the book”.</p>}
          {current.status === 'done' && quote?.sale && <AudiobookSale api={api} bookId={bookId} sale={quote.sale} onSaved={() => void load()} />}
          {current.status === 'failed' && (quote?.free ? (
            // Administrators see the reason and can resume here.
            <div className="space-y-2 rounded-lg bg-rose-50 p-2.5 text-rose-800">
              <p className="flex items-start gap-1.5"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />{current.error ?? 'Narration paused after an error.'}</p>
              <p className="text-[11px] text-rose-700">{current.done} of {current.total} parts recorded so far.</p>
              <button type="button" disabled={busy} onClick={() => { setBusy(true); setError(''); api.decideNarration(current.id, 'resume').then(() => load()).catch((e) => setError(e instanceof Error ? e.message : 'Could not resume.')).finally(() => setBusy(false)); }}
                className="inline-flex items-center gap-1.5 rounded-full bg-rose-700 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-rose-600 disabled:opacity-60 cursor-pointer">
                {busy ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : <Play className="h-3 w-3" aria-hidden />}Resume narration
              </button>
            </div>
          ) : <p className="flex items-start gap-1.5 text-rose-700"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />Narration paused after an error. An administrator will resume it; you do not need to do anything.</p>)}
        </div>
      )}
    </section>
  );
}
