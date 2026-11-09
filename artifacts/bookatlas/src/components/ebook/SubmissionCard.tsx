import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Download, Info, Loader2, Pencil, Send, XCircle } from 'lucide-react';
import type { Submission, SubmissionStatus } from './ebookApi';

const STATUS: Record<SubmissionStatus, { label: string; tone: string; detail: string }> = {
  uploading: { label: 'Uploading', tone: 'bg-slate-100 text-slate-700', detail: 'The upload did not finish. Upload the file again.' },
  preparing: { label: 'Preparing', tone: 'bg-indigo-50 text-indigo-700', detail: 'Fixing and checking your eBook.' },
  checking: { label: 'Validating', tone: 'bg-indigo-50 text-indigo-700', detail: 'Running the official EPUBCheck validator. This takes a minute or two.' },
  ready: { label: 'Ready for review', tone: 'bg-emerald-50 text-emerald-800', detail: 'Your eBook passed every check. BookAtlas reviews it before it goes on sale.' },
  needs_author: { label: 'Needs your input', tone: 'bg-amber-50 text-amber-900', detail: 'A few things need you; everything fixable was fixed automatically.' },
  published: { label: 'Published', tone: 'bg-emerald-600 text-white', detail: 'On sale in the BookAtlas store.' },
  rejected: { label: 'Not accepted', tone: 'bg-rose-50 text-rose-800', detail: '' },
};

const ICON = { error: AlertCircle, warning: AlertTriangle, info: Info } as const;
const TONE = { error: 'text-rose-700', warning: 'text-amber-700', info: 'text-slate-500' } as const;
const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`;

export const SubmissionCard: React.FC<{
  submission: Submission;
  isAdmin: boolean;
  onDownload: (file: 'epub' | 'cover') => Promise<void>;
  onEdit: () => void;
  onPublish: () => Promise<void>;
  onReject: (reason: string) => Promise<void>;
}> = ({ submission: s, isAdmin, onDownload, onEdit, onPublish, onReject }) => {
  const [busy, setBusy] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const status = STATUS[s.status];
  const run = async (key: string, task: () => Promise<void>) => { setBusy(key); try { await task(); } finally { setBusy(null); } };
  const fixes = s.report?.rounds.flatMap((r) => r.changes) ?? [];
  const findings = s.report?.findings ?? [];
  const editable = ['needs_author', 'ready', 'checking'].includes(s.status);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-serif text-lg font-bold text-slate-900">{s.intake.title}</h3>
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
                  return <li key={i} className={`flex gap-2 text-sm ${TONE[f.severity]}`}><Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /><span>{f.message}</span></li>;
                })}
              </ul>
            ) : <p className="mt-2 text-sm text-emerald-700">No open issues.</p>}
            <p className="mt-3 text-xs text-slate-500">
              EPUB {s.report.epubVersion} · {mb(s.report.bytes.before)} → {mb(s.report.bytes.after)}
              {s.report.cover && ` · cover ${s.report.cover.width} × ${s.report.cover.height}`}
              {s.epubcheck?.ran ? ` · EPUBCheck: ${s.epubcheck.messages.length} messages` : ''}
            </p>
          </section>
        </div>
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
        {editable && (
          <button type="button" onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            <Pencil className="h-3.5 w-3.5" aria-hidden />Edit details
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
