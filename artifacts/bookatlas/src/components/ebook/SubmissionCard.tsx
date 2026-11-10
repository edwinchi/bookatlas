import React, { useRef, useState } from 'react';
import { AlertCircle, AlertTriangle, BookCopy, Upload, CheckCircle2, Download, ImageUp, Info, Loader2, Maximize2, Pencil, RotateCcw, Send, XCircle } from 'lucide-react';
import type { Finding, ReadinessPackage, Submission, SubmissionStatus } from './ebookApi';
import { ReadinessPanel } from './ReadinessPanel';

const STATUS: Record<SubmissionStatus, { label: string; tone: string; detail: string }> = {
  uploading: { label: 'Uploading', tone: 'bg-slate-100 text-slate-700', detail: 'The upload did not finish. Choose "Upload again" to send the file again.' },
  preparing: { label: 'Preparing', tone: 'bg-indigo-50 text-indigo-700', detail: 'Fixing and checking your eBook.' },
  checking: { label: 'Validating', tone: 'bg-indigo-50 text-indigo-700', detail: 'Running the official EPUBCheck validator. This takes a minute or two.' },
  ready: { label: 'Ready for review', tone: 'bg-emerald-50 text-emerald-800', detail: 'Your eBook passed every check. BookAtlas reviews it before it goes on sale.' },
  needs_author: { label: 'Needs your input', tone: 'bg-amber-50 text-amber-900', detail: 'A few things need you; everything fixable was fixed automatically.' },
  published: { label: 'Published', tone: 'bg-emerald-600 text-white', detail: 'On sale in the BookAtlas store. Made corrections? Upload a new version; this one stays on sale until the new one is published.' },
  rejected: { label: 'Not accepted', tone: 'bg-rose-50 text-rose-800', detail: '' },
};

const ICON = { error: AlertCircle, warning: AlertTriangle, info: Info } as const;
const TONE = { error: 'text-rose-700', warning: 'text-amber-700', info: 'text-slate-500' } as const;
const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`;
const COVER_RULES = ['cover-size', 'cover-front-only'];
const button = 'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold disabled:opacity-50';

/** The live price of a published book; changes apply to the store and checkout at once. */
const PriceEditor: React.FC<{ price: number; onSave: (price: number) => Promise<void> }> = ({ price, onSave }) => {
  const [value, setValue] = useState(price.toFixed(2));
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const next = Number(value.replace(',', '.'));
  const valid = Number.isFinite(next) && next >= 0 && next <= 999;
  const changed = valid && Math.round(next * 100) !== Math.round(price * 100);
  return (
    <form className="mt-4 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3" onSubmit={async (e) => {
      e.preventDefault(); if (!changed) return; setState('saving');
      try { await onSave(Math.round(next * 100) / 100); setState('saved'); } catch { setState('idle'); }
    }}>
      <label className="text-xs font-semibold text-slate-700">
        Price (EUR, VAT included)
        <span className="mt-1 flex items-center rounded-lg border border-slate-300 bg-white focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/20">
          <span className="pl-2.5 text-slate-500">€</span>
          <input inputMode="decimal" aria-label="Price in euros" value={value} onChange={(e) => { setValue(e.target.value); setState('idle'); }}
            className="w-24 rounded-lg px-1.5 py-1.5 text-sm tabular-nums focus:outline-hidden" />
        </span>
      </label>
      <button type="submit" disabled={!changed || state === 'saving'} className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
        {state === 'saving' && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}{state === 'saved' && !changed ? 'Price updated' : 'Change price'}
      </button>
      <p className="basis-full text-[11px] text-slate-500">{!valid ? 'Enter a price between 0 and 999.' : next === 0 ? 'At €0 every signed-in reader can read the whole book.' : 'Applies at once in the store, on the book page and at checkout.'}</p>
    </form>
  );
};

/** Amazon and Lulu pages of the printed book; shown on the BookAtlas book page, also after publishing. */
const PrintLinks: React.FC<{ links: { amazon?: string; lulu?: string }; onSave: (links: { amazon?: string; lulu?: string }) => Promise<void> }> = ({ links, onSave }) => {
  const [amazon, setAmazon] = useState(links.amazon ?? '');
  const [lulu, setLulu] = useState(links.lulu ?? '');
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const changed = amazon.trim() !== (links.amazon ?? '') || lulu.trim() !== (links.lulu ?? '');
  const field = 'w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-indigo-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20';
  return (
    <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600"><BookCopy className="h-3.5 w-3.5" aria-hidden />Printed book</h4>
      <p className="mt-1 text-xs text-slate-600">Selling the paperback or hardcover on Amazon or Lulu? Add the book's page and readers see "Also in print" on BookAtlas.</p>
      <form className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]" onSubmit={async (e) => {
        e.preventDefault(); setState('saving');
        try { await onSave({ amazon: amazon.trim(), lulu: lulu.trim() }); setState('saved'); } catch { setState('idle'); }
      }}>
        <input className={field} type="url" inputMode="url" placeholder="https://www.amazon.com/dp/…" aria-label="Amazon page of the printed book" value={amazon} onChange={(e) => { setAmazon(e.target.value); setState('idle'); }} />
        <input className={field} type="url" inputMode="url" placeholder="https://www.lulu.com/shop/…" aria-label="Lulu page of the printed book" value={lulu} onChange={(e) => { setLulu(e.target.value); setState('idle'); }} />
        <button type="submit" disabled={!changed || state === 'saving'} className="inline-flex items-center justify-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
          {state === 'saving' && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}{state === 'saved' && !changed ? 'Saved' : 'Save links'}
        </button>
      </form>
    </section>
  );
};

/** How to fix a cover finding, with the fixes the author can apply here. */
const CoverFix: React.FC<{
  finding: Finding;
  busy: string | null;
  onUpload: (file: File) => void;
  onEnlarge: () => void;
}> = ({ finding, busy, onUpload, onEnlarge }) => {
  const input = useRef<HTMLInputElement>(null);
  const tooSmall = finding.rule === 'cover-size' && finding.severity === 'warning';
  return (
    <div className="mt-2 ml-6 rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-slate-700">
      <p className="font-semibold text-slate-900">How to fix</p>
      <p className="mt-1">
        {tooSmall
          ? 'Export the front cover from your design file at 1600 × 2560 pixels or larger (JPEG or PNG, front only: no back cover, spine or barcode) and upload it here.'
          : 'Upload the front cover on its own, as a JPEG or PNG, ideally 1600 × 2560 pixels: no back cover, spine or barcode.'}
        {' '}We put it into your eBook and check the book again.
      </p>
      {tooSmall && <p className="mt-1 text-slate-500">No larger file? Enlarge this one instead. It meets the recommended size, but cannot add detail the original does not have.</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        <input ref={input} type="file" accept="image/jpeg,image/png" className="hidden" aria-label="Replacement front cover"
          onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) onUpload(file); }} />
        <button type="button" disabled={!!busy} onClick={() => input.current?.click()} className={`${button} border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-500`}>
          {busy === 'cover-upload' ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <ImageUp className="h-3.5 w-3.5" aria-hidden />}Upload a larger cover
        </button>
        {tooSmall && (
          <button type="button" disabled={!!busy} onClick={onEnlarge} className={`${button} border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}>
            {busy === 'cover-enlarge' ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Maximize2 className="h-3.5 w-3.5" aria-hidden />}Enlarge to 2560 px tall
          </button>
        )}
      </div>
    </div>
  );
};

export const SubmissionCard: React.FC<{
  submission: Submission;
  isAdmin: boolean;
  onDownload: (file: 'epub' | 'cover') => Promise<void>;
  onEdit: () => void;
  onCover: (fix: { upload: File } | 'enlarge' | 'original') => Promise<void>;
  onPrintLinks: (links: { amazon?: string; lulu?: string }) => Promise<void>;
  onPrice: (price: number) => Promise<void>;
  onReadiness: () => Promise<ReadinessPackage>;
  onPublish: () => Promise<void>;
  onReject: (reason: string) => Promise<void>;
}> = ({ submission: s, isAdmin, onDownload, onEdit, onCover, onPrintLinks, onPrice, onReadiness, onPublish, onReject }) => {
  const [busy, setBusy] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const status = STATUS[s.status];
  const run = async (key: string, task: () => Promise<void>) => { setBusy(key); try { await task(); } finally { setBusy(null); } };
  const fixes = s.report?.rounds.flatMap((r) => r.changes) ?? [];
  const findings = s.report?.findings ?? [];
  const editable = ['needs_author', 'ready', 'checking'].includes(s.status);
  // Details and the EPUB itself can be changed until the book is published.
  const canEdit = editable || s.status === 'uploading' || s.status === 'rejected';
  const coverFinding = editable ? findings.find((f) => COVER_RULES.includes(f.rule) && f.severity !== 'info') : undefined;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-serif text-lg font-bold text-slate-900">
            {s.intake.title}
            {s.replacesBookId && <span className="ml-2 align-middle rounded-full bg-indigo-50 px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wide text-indigo-700">New version</span>}
          </h3>
          <p className="text-xs text-slate-500">
            {s.intake.author} · {s.upload?.fileName}{s.ownerEmail ? ` · ${s.ownerEmail}` : ''} · {new Date(s.createdAt).toLocaleDateString()}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${status.tone}`}>{status.label}</span>
      </header>
      <p className="mt-2 text-sm text-slate-600">{s.status === 'rejected' ? s.rejectReason : status.detail}</p>

      {s.report && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <section>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Fixed automatically ({fixes.length})</h4>
            {fixes.length ? (
              <ul className="mt-2 space-y-1.5">
                {fixes.map((f, i) => <li key={i} className="flex gap-2 text-sm text-slate-700"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />{f.change}</li>)}
              </ul>
            ) : <p className="mt-2 text-sm text-slate-500">Nothing needed fixing.</p>}
          </section>
          <section>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Still to check ({findings.length})</h4>
            {findings.length ? (
              <ul className="mt-2 space-y-1.5">
                {findings.map((f, i) => {
                  const Icon = ICON[f.severity];
                  return (
                    <li key={i}>
                      <p className={`flex gap-2 text-sm ${TONE[f.severity]}`}><Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /><span>{f.message}</span></p>
                      {f === coverFinding && (
                        <CoverFix finding={f} busy={busy}
                          onUpload={(file) => run('cover-upload', () => onCover({ upload: file }))}
                          onEnlarge={() => run('cover-enlarge', () => onCover('enlarge'))} />
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : <p className="mt-2 text-sm text-emerald-700">No open issues.</p>}
            <p className="mt-3 text-xs text-slate-500">
              EPUB {s.report.epubVersion} · {mb(s.report.bytes.before)} → {mb(s.report.bytes.after)}
              {s.report.cover && ` · cover ${s.report.cover.width} × ${s.report.cover.height}`}
              {s.epubcheck?.ran ? ` · EPUBCheck: ${s.epubcheck.messages.length} messages` : ''}
            </p>
            {s.coverFix && (
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                {s.coverFix.kind === 'upload' ? `Using the cover you uploaded (${s.coverFix.width} × ${s.coverFix.height}).` : 'Cover enlarged at your request.'}
                {editable && (
                  <button type="button" disabled={!!busy} onClick={() => run('cover-original', () => onCover('original'))} className="inline-flex items-center gap-1 font-semibold text-indigo-700 hover:underline disabled:opacity-50">
                    {busy === 'cover-original' ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : <RotateCcw className="h-3 w-3" aria-hidden />}Use the original cover
                  </button>
                )}
              </p>
            )}
          </section>
        </div>
      )}

      {s.prepared && s.status !== 'uploading' && <ReadinessPanel key={`${s.id}:${s.prepared.sha256 ?? ''}:${s.updatedAt ?? ''}`} title={s.intake.title} load={onReadiness} />}
      {s.status === 'published' && <PriceEditor key={s.intake.price} price={Number(s.intake.price) || 0} onSave={onPrice} />}
      {['ready', 'checking', 'needs_author', 'published'].includes(s.status) && (
        <PrintLinks key={`${s.printLinks?.amazon ?? ''}|${s.printLinks?.lulu ?? ''}`} links={s.printLinks ?? {}} onSave={onPrintLinks} />
      )}

      <footer className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
        {s.prepared && (
          <button type="button" onClick={() => run('epub', () => onDownload('epub'))} className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            {busy === 'epub' ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Download className="h-3.5 w-3.5" aria-hidden />}Prepared EPUB
          </button>
        )}
        {s.cover && (
          <button type="button" onClick={() => run('cover', () => onDownload('cover'))} className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            {busy === 'cover' ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Download className="h-3.5 w-3.5" aria-hidden />}Store cover (JPG)
          </button>
        )}
        {s.status === 'published' && (
          <button type="button" onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            <Upload className="h-3.5 w-3.5" aria-hidden />Upload a new version
          </button>
        )}
        {canEdit && (
          <button type="button" onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            <Pencil className="h-3.5 w-3.5" aria-hidden />{s.status === 'uploading' ? 'Upload again' : s.status === 'rejected' ? 'Correct and resubmit' : 'Edit details or replace EPUB'}
          </button>
        )}
        {isAdmin && s.status === 'ready' && (
          <button type="button" onClick={() => run('publish', onPublish)} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500">
            {busy === 'publish' ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Send className="h-3.5 w-3.5" aria-hidden />}Publish to the store
          </button>
        )}
        {isAdmin && !['published', 'rejected'].includes(s.status) && (
          <span className="ml-auto flex items-center gap-2">
            <input aria-label="Reason for the author" placeholder="Reason for the author" value={reason} onChange={(e) => setReason(e.target.value)}
              className="w-48 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs" />
            <button type="button" disabled={!reason.trim()} onClick={() => run('reject', () => onReject(reason))} className="inline-flex items-center gap-1.5 rounded-full border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">
              <XCircle className="h-3.5 w-3.5" aria-hidden />Reject
            </button>
          </span>
        )}
      </footer>
    </article>
  );
};
