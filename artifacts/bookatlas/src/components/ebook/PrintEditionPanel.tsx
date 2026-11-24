import React, { useEffect, useRef, useState } from 'react';
import * as RadioGroup from '@radix-ui/react-radio-group';
import { AlertTriangle, CheckCircle2, FileUp, Loader2, Package, Printer, Ruler } from 'lucide-react';
import { PAPERS, TRIM_SIZES, inchesToMm, printCoverSpec, type PaperId, type TrimSizeId } from '@workspace/bookatlas-catalog/publishing';
import type { PrintEditionView, PrintFileKind, useEbookApi } from './ebookApi';
import { AUTHOR_SHARE } from '../landing/earnings';
import { SelectBox } from '../ui/select-box';
import { Switch } from '../ui/switch';
import { Progress } from '../ui/progress';

const euro = (cents: number) => `€${(cents / 100).toFixed(2)}`;
const NL_VAT = 0.09;
const MB = 1024 * 1024;

/**
 * Printed copies sold and shipped by BooksAtlas (owner request 2026-11-24). The author picks the format and price and
 * uploads the print-ready interior and cover PDFs; the printer checks both, and the book page then sells printed
 * copies, printed on demand and shipped to the reader. The author keeps 81% of each copy's price excluding VAT, after
 * the printing cost.
 */
export function PrintEditionPanel({ api, bookId, title }: { api: ReturnType<typeof useEbookApi>; bookId: string; title: string }) {
  const [view, setView] = useState<PrintEditionView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [trimSize, setTrimSize] = useState<TrimSizeId>('6x9');
  const [paper, setPaper] = useState<PaperId>('cream');
  const [binding, setBinding] = useState<'paperback' | 'hardcover'>('paperback');
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<Partial<Record<PrintFileKind, number>>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const loaded = useRef(false);

  const apply = (v: PrintEditionView) => {
    setView(v);
    if (v.edition && !loaded.current) {
      setTrimSize(v.edition.spec.trimSize as TrimSizeId);
      setPaper(v.edition.spec.paper as PaperId);
      setBinding(v.edition.spec.binding);
      if (v.edition.priceCents != null) setPrice((v.edition.priceCents / 100).toFixed(2));
    }
    loaded.current = true;
  };

  useEffect(() => {
    let alive = true;
    api.printEdition(bookId).then((v) => { if (alive) apply(v); }).catch((e) => alive && setError(e instanceof Error ? e.message : 'The printed edition could not be loaded.'));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  // While the printer checks the files, look again every 15 seconds.
  const checking = !!view?.edition && Object.values(view.edition.checks).some((c) => c?.status === 'checking');
  useEffect(() => {
    if (!checking) return;
    const t = setInterval(() => { api.printEdition(bookId).then(apply).catch(() => undefined); }, 15_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking, bookId]);

  const amount = Number(price.replace(',', '.'));
  const priceValid = Number.isFinite(amount) && amount >= 3 && amount <= 250;
  const unitCost = view?.edition?.unitCostExclCents ?? null;
  const perCopy = priceValid && unitCost != null ? Math.max(0, Math.round(((amount * 100) / (1 + NL_VAT) - unitCost) * AUTHOR_SHARE)) : null;
  const pages = view?.edition?.pageCount ?? null;
  const spec = pages ? printCoverSpec(trimSize, paper, Math.max(24, pages), binding) : null;

  const save = async (extra: { wanted?: boolean } = {}) => {
    setBusy('save'); setMessage(null);
    try {
      const v = await api.savePrintEdition(bookId, { trimSize, paper, binding, price: priceValid ? amount : null, ...extra });
      apply(v);
      setMessage({ ok: true, text: v.onSale ? 'Saved. Readers can order printed copies now.' : 'Saved.' });
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : 'The printed edition could not be saved.' });
    } finally { setBusy(null); }
  };

  const upload = async (kind: PrintFileKind, file: File | undefined) => {
    if (!file || !view) return;
    if (file.type && file.type !== 'application/pdf') { setMessage({ ok: false, text: 'Choose a PDF file.' }); return; }
    if (file.size > view.maxFileBytes) { setMessage({ ok: false, text: `This file is ${(file.size / MB).toFixed(0)} MB; the limit is ${view.maxFileBytes / MB} MB. Export the PDF with images at 300 dpi.` }); return; }
    setBusy(kind); setMessage(null); setProgress((p) => ({ ...p, [kind]: 0 }));
    try {
      // Save the format first so the printer checks the cover against the right size.
      if (!view.edition) apply(await api.savePrintEdition(bookId, { trimSize, paper, binding, price: priceValid ? amount : null }));
      apply(await api.uploadPrintFile(bookId, kind, file, (share) => setProgress((p) => ({ ...p, [kind]: share }))));
      setMessage({ ok: true, text: `${kind === 'interior' ? 'Interior' : 'Cover'} uploaded. The printer is checking it.` });
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : 'The upload failed.' });
    } finally { setBusy(null); setProgress((p) => ({ ...p, [kind]: undefined })); }
  };

  if (error) return <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</p>;
  if (!view) return <p className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />Loading the printed edition…</p>;

  const e = view.edition;
  const fileRow = (kind: PrintFileKind, label: string, hint: string) => {
    const f = e?.files[kind], c = e?.checks[kind];
    const p = progress[kind];
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold text-slate-900">{label}</p>
            <p className="text-[11px] text-slate-500">{hint}</p>
          </div>
          <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 ${busy ? 'pointer-events-none opacity-50' : ''}`}>
            {busy === kind ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : <FileUp className="h-3 w-3" aria-hidden />}
            {f?.uploaded ? 'Replace PDF' : 'Upload PDF'}
            <input type="file" accept="application/pdf,.pdf" className="sr-only" disabled={!!busy} aria-label={`${label} (PDF)`} onChange={(ev) => { void upload(kind, ev.target.files?.[0]); ev.target.value = ''; }} />
          </label>
        </div>
        {p !== undefined && <Progress value={Math.round(p * 100)} className="mt-2 h-1.5" aria-label={`Uploading the ${kind}`} />}
        {f?.uploaded && (
          <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="text-slate-500">{((f.size ?? 0) / MB).toFixed(1)} MB</span>
            {c?.status === 'passed' && <span className="inline-flex items-center gap-1 font-semibold text-emerald-700"><CheckCircle2 className="h-3 w-3" aria-hidden />Passed the printer’s check</span>}
            {c?.status === 'checking' && <span className="inline-flex items-center gap-1 text-slate-600"><Loader2 className="h-3 w-3 animate-spin" aria-hidden />The printer is checking it…</span>}
            {c?.status === 'failed' && <span className="inline-flex items-center gap-1 font-semibold text-rose-700"><AlertTriangle className="h-3 w-3" aria-hidden />Not accepted by the printer</span>}
            {!c && kind === 'cover' && <span className="text-slate-500">Checked after the interior (its size depends on the page count).</span>}
          </p>
        )}
        {c?.status === 'failed' && c.errors.length > 0 && (
          <ul className="mt-1 list-disc pl-4 text-[11px] text-rose-700">{c.errors.slice(0, 5).map((m) => <li key={m}>{m}</li>)}</ul>
        )}
      </div>
    );
  };

  return (
    <section aria-label={`Printed copies of ${title}`} className="mt-3 space-y-3 rounded-xl border border-amber-200 bg-amber-50/40 p-3">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-bold text-slate-900"><Printer className="h-3.5 w-3.5 text-amber-700" aria-hidden />Printed copies, sold and shipped by BooksAtlas</p>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${view.onSale ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>{view.onSale ? 'On sale' : 'Not on sale yet'}</span>
      </header>
      <p className="text-[11px] text-slate-600">
        Readers order printed copies on your book page. Each copy is printed when it is ordered and shipped to the reader in about 1–2 weeks, worldwide.
        No stock, no upfront cost: you keep 81% of the price excluding VAT after the printing cost.
      </p>
      {!view.configured && (
        <p className="rounded-lg border border-slate-200 bg-white p-2 text-[11px] text-slate-600">BooksAtlas is finishing its printer account. Prepare your files and price now; printed copies go on sale as soon as the printer is live.</p>
      )}

      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-[11px] font-semibold text-slate-700">Trim size
          <SelectBox value={trimSize} onChange={(ev: React.ChangeEvent<HTMLSelectElement>) => setTrimSize(ev.target.value as TrimSizeId)} className="mt-1 w-full">
            {TRIM_SIZES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </SelectBox>
        </label>
        <label className="text-[11px] font-semibold text-slate-700">Paper and ink
          <SelectBox value={paper} onChange={(ev: React.ChangeEvent<HTMLSelectElement>) => setPaper(ev.target.value as PaperId)} className="mt-1 w-full">
            {PAPERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </SelectBox>
        </label>
        <div className="text-[11px] font-semibold text-slate-700">Binding
          <RadioGroup.Root value={binding} onValueChange={(v) => setBinding(v as 'paperback' | 'hardcover')} aria-label="Binding" className="mt-1 flex gap-1.5">
            {(['paperback', 'hardcover'] as const).map((b) => (
              <RadioGroup.Item key={b} value={b} className="flex-1 cursor-pointer rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold capitalize text-slate-700 data-[state=checked]:border-amber-500 data-[state=checked]:bg-amber-50 data-[state=checked]:text-amber-900">{b}</RadioGroup.Item>
            ))}
          </RadioGroup.Root>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-[11px] font-semibold text-slate-700">Price per copy (incl. VAT)
          <span className="mt-1 flex items-center rounded-lg border border-slate-300 bg-white px-2 focus-within:border-amber-500">
            <span className="text-xs text-slate-500">€</span>
            <input value={price} onChange={(ev) => setPrice(ev.target.value)} inputMode="decimal" placeholder="14.99" aria-invalid={!!price && !priceValid} className="w-20 bg-transparent px-1 py-1.5 text-sm font-bold text-slate-900 outline-none" />
          </span>
        </label>
        <div className="pb-1 text-[11px] text-slate-600">
          {unitCost != null && <p>Printing one copy costs about <b>{euro(unitCost)}</b> before VAT{e?.minimumPriceCents ? <>; the lowest price is <b>{euro(e.minimumPriceCents)}</b></> : null}.</p>}
          {perCopy != null && <p>You keep about <b>{euro(perCopy)}</b> per copy (example for a Dutch reader; delivery is paid by the reader).</p>}
          {unitCost == null && <p>The printing cost appears once the interior PDF has passed the printer’s check.</p>}
          {!!price && !priceValid && <p className="text-rose-700">Enter a price between €3 and €250.</p>}
        </div>
      </div>

      {fileRow('interior', 'Interior PDF', `All pages, ${TRIM_SIZES.find((t) => t.id === trimSize)?.label}, fonts embedded. Up to ${view.maxFileBytes / MB} MB.`)}
      {fileRow('cover', 'Cover PDF', 'One page: back, spine and front, with 3 mm (0.125 in) bleed on every side.')}
      {(view.coverDimensions || spec) && (
        <p className="flex items-start gap-1.5 text-[11px] text-slate-600"><Ruler className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
          <span>Cover size for {pages} pages: {view.coverDimensions
            ? <b>{view.coverDimensions.widthMm.toFixed(1)} × {view.coverDimensions.heightMm.toFixed(1)} mm</b>
            : <b>{inchesToMm(spec!.widthIn)} × {inchesToMm(spec!.heightIn)} mm</b>} including bleed{spec ? <>, spine {inchesToMm(spec.spineIn)} mm</> : null}.</span>
        </p>
      )}

      {view.missing.length > 0 && (
        <ul className="space-y-0.5 text-[11px] text-slate-600" aria-label="Still to do">
          {view.missing.map((m) => <li key={m} className="flex items-start gap-1.5"><Package className="mt-0.5 h-3 w-3 shrink-0 text-amber-700" aria-hidden />{m}</li>)}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={!!busy || (!!price && !priceValid)} onClick={() => save()} className="inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-3.5 py-1.5 text-[11px] font-bold text-white hover:bg-amber-500 disabled:opacity-50 cursor-pointer">
          {busy === 'save' && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}Save format and price
        </button>
        {e && (
          <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-700">
            <Switch checked={e.wanted} disabled={!!busy} onCheckedChange={(on) => save({ wanted: on })} aria-label="Offer printed copies" />
            Offer printed copies
          </label>
        )}
        {message && <p role="status" className={`text-[11px] ${message.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{message.text}</p>}
      </div>
    </section>
  );
}
