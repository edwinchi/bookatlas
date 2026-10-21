import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw, AlertCircle, XCircle, RotateCcw, Upload, Send, Mail, FlaskConical, CheckCircle2, Clock } from 'lucide-react';
import {
  useGetPublishingJob,
  getGetPublishingJobQueryKey,
  getListPublishingJobsQueryKey,
  useActOnPublishingJob,
  downloadPublishingAsset,
} from '@workspace/api-client-react';
import type { PublishingJob, PublishingJobAction } from '@workspace/api-client-react';
import { AuthedAudioPlayer, BlobDownloadButton, assetName, describeError, useAuthedRequest } from './AuthedAudioPlayer';

export const STATUS_STYLE: Record<PublishingJob['status'], string> = {
  queued: 'bg-slate-100 text-slate-700 border-slate-200',
  running: 'bg-sky-50 text-sky-800 border-sky-200',
  review: 'bg-amber-50 text-amber-800 border-amber-200',
  published: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  failed: 'bg-rose-50 text-rose-800 border-rose-200',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
};

const usd = (n: number) => `US$${n.toFixed(2)}`;

interface Props {
  jobId: string;
  onPublished: (job: PublishingJob) => void;
}

export const PublishingJobDetail: React.FC<Props> = ({ jobId, onPublished }) => {
  const qc = useQueryClient();
  const authed = useAuthedRequest();
  const job = useGetPublishingJob(jobId, {
    query: {
      enabled: !!jobId,
      queryKey: getGetPublishingJobQueryKey(jobId),
      refetchOnMount: 'always',
      refetchInterval: (q) => {
        const s = q.state.data?.status;
        return s === 'queued' || s === 'running' ? 2000 : false;
      },
    },
  });
  const act = useActOnPublishingJob();
  const [actionError, setActionError] = useState('');
  const [pending, setPending] = useState<PublishingJobAction['action'] | null>(null);
  const [notifyPublisher, setNotifyPublisher] = useState(false);
  const [publisherEmail, setPublisherEmail] = useState('');
  const [readerCampaign, setReaderCampaign] = useState(false);
  const [confirmLaunch, setConfirmLaunch] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);

  const run = (data: PublishingJobAction) => {
    setActionError('');
    setPending(data.action);
    act.mutate(
      { id: jobId, data },
      {
        onSuccess: (updated) => {
          qc.setQueryData(getGetPublishingJobQueryKey(jobId), updated);
          qc.invalidateQueries({ queryKey: getListPublishingJobsQueryKey() });
          if (data.action === 'publish') { setConfirmPublish(false); onPublished(updated); }
          if (data.action === 'launch') { setConfirmLaunch(false); }
        },
        onError: (err) => setActionError(describeError(err, 'The action could not be completed.')),
        onSettled: () => setPending(null),
      },
    );
  };

  if (job.isLoading) {
    return <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-3" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="h-10 rounded-xl bg-slate-100 animate-pulse" />)}</div>;
  }
  if (job.isError || !job.data) {
    return (
      <div role="alert" className="bg-rose-50 rounded-3xl border border-rose-200 p-6 text-xs text-rose-800 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0" aria-hidden />
        <div className="flex-1"><p className="font-bold">Job could not be loaded</p><p>{describeError(job.error, 'Unknown error.')}</p></div>
        <button type="button" onClick={() => job.refetch()} className="font-bold underline cursor-pointer">Retry</button>
      </div>
    );
  }

  const j = job.data;
  const active = j.status === 'queued' || j.status === 'running';
  const btn = 'inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600';
  const busy = act.isPending;

  return (
    <section aria-labelledby="job-title" className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border ${STATUS_STYLE[j.status]}`}>{j.status}</span>
            {j.isTest && <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border bg-violet-50 text-violet-800 border-violet-200 inline-flex items-center gap-1"><FlaskConical className="w-3 h-3" aria-hidden />Test, isolated catalog</span>}
          </div>
          <h3 id="job-title" className="text-lg font-serif font-bold text-slate-950 break-words">{j.title}</h3>
          <p className="text-xs text-slate-500">by {j.author}</p>
        </div>
        <button type="button" onClick={() => job.refetch()} disabled={job.isFetching} className={`${btn} bg-slate-50 border border-slate-200 text-slate-700`}>
          <RefreshCw className={`w-3.5 h-3.5 ${job.isFetching ? 'animate-spin' : ''}`} aria-hidden />Refresh
        </button>
      </header>

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200"><dt className="text-[10px] uppercase font-bold text-slate-500">Server stage</dt><dd className="font-semibold text-slate-900 break-words" aria-live="polite">{j.stage || '—'}</dd></div>
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200"><dt className="text-[10px] uppercase font-bold text-slate-500">Cost cap</dt><dd className="font-semibold text-slate-900">{usd(j.budgetUsd)}</dd></div>
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200"><dt className="text-[10px] uppercase font-bold text-slate-500">Reserved</dt><dd className="font-semibold text-slate-900">{usd(j.reservedUsd)}</dd></div>
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200"><dt className="text-[10px] uppercase font-bold text-slate-500">Updated</dt><dd className="font-semibold text-slate-900">{new Date(j.updatedAt).toLocaleString()}</dd></div>
      </dl>

      {active && (
        <p className="text-xs text-sky-800 bg-sky-50 border border-sky-200 rounded-xl p-3 flex items-center gap-2" role="status">
          <Clock className="w-4 h-4" aria-hidden />The server is working on this job. Status is checked every 2 seconds; you can leave this page and return.
        </p>
      )}
      {j.error && (
        <p role="alert" className="text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden />{j.error}</p>
      )}
      {actionError && (
        <p role="alert" className="text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-3">{actionError}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {active && (
          <button type="button" disabled={busy} onClick={() => run({ action: 'cancel' })} className={`${btn} bg-white border border-rose-200 text-rose-700 hover:bg-rose-50`}>
            {pending === 'cancel' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden /> : <XCircle className="w-3.5 h-3.5" aria-hidden />}Cancel job
          </button>
        )}
        {(j.status === 'failed' || j.status === 'cancelled') && (
          <button type="button" disabled={busy} onClick={() => run({ action: 'retry' })} className={`${btn} bg-slate-900 text-white`}>
            {pending === 'retry' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden /> : <RotateCcw className="w-3.5 h-3.5" aria-hidden />}Retry
          </button>
        )}
        {j.epubUrl && (
          <BlobDownloadButton label="Download private EPUB" fileName={`${j.title}.epub`} load={async () => downloadPublishingAsset(jobId, assetName(j.epubUrl!), await authed())} />
        )}
      </div>

      {j.status === 'review' && (
        <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/60 space-y-3">
          <p className="text-xs font-bold text-amber-900">Review before publishing</p>
          <p className="text-xs text-amber-900/80">
            {j.canPublish
              ? j.isTest
                ? 'Publishing a test job places it in the isolated test catalog only. It never appears in the public storefront.'
                : 'Publishing makes this book visible in the public storefront. Readers still need to sign in for the full EPUB and narration.'
              : 'The server has not marked this output ready to publish. Review the chapters below; publishing stays disabled.'}
          </p>
          {j.canPublish && (
            <>
              <label className="flex items-start gap-2 text-xs text-slate-800 cursor-pointer">
                <input type="checkbox" checked={confirmPublish} onChange={(e) => setConfirmPublish(e.target.checked)} className="mt-0.5 w-4 h-4" />
                I have reviewed the chapter text{j.chapters.some((c) => c.audioUrl) ? ' and narration' : ''}.
              </label>
              <button type="button" disabled={busy || !confirmPublish} onClick={() => run({ action: 'publish' })} className={`${btn} bg-emerald-700 text-white hover:bg-emerald-800`}>
                {pending === 'publish' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden /> : <Upload className="w-3.5 h-3.5" aria-hidden />}
                {j.isTest ? 'Publish to test catalog' : 'Publish to storefront'}
              </button>
            </>
          )}
        </div>
      )}

      {j.status === 'published' && (
        <p className="text-xs flex items-center gap-2 p-3 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-900">
          <CheckCircle2 className="w-4 h-4" aria-hidden />
          {j.isTest ? 'Published to the isolated test catalog. Not visible to the public.' : 'Published to the public storefront.'}
        </p>
      )}

      {j.status === 'published' && !j.isTest && (
        <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1.5"><Send className="w-4 h-4 text-indigo-600" aria-hidden />Launch announcements</p>
          <p className="text-[11px] text-slate-600">Both options are off by default. Messages are only sent through the configured email provider after you confirm.</p>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
            <input type="checkbox" checked={notifyPublisher} onChange={(e) => { setNotifyPublisher(e.target.checked); setConfirmLaunch(false); }} className="w-4 h-4" />Notify publisher
          </label>
          {notifyPublisher && (
            <input type="email" value={publisherEmail} onChange={(e) => { setPublisherEmail(e.target.value); setConfirmLaunch(false); }} placeholder="publisher@example.com" aria-label="Publisher email address" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs" />
          )}
          <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
            <input type="checkbox" checked={readerCampaign} onChange={(e) => { setReaderCampaign(e.target.checked); setConfirmLaunch(false); }} className="w-4 h-4" />Send reader announcement to opted-in readers
          </label>
          {(notifyPublisher || readerCampaign) && (
            !confirmLaunch ? (
              <button type="button" disabled={busy || (notifyPublisher && !publisherEmail.trim())} onClick={() => setConfirmLaunch(true)} className={`${btn} bg-slate-900 text-white`}>Review launch</button>
            ) : (
              <div role="alertdialog" aria-labelledby="launch-confirm" className="p-3 rounded-xl border border-indigo-200 bg-white space-y-2">
                <p id="launch-confirm" className="text-xs text-slate-800">
                  Send {[notifyPublisher && `a publisher notice to ${publisherEmail.trim()}`, readerCampaign && 'the reader announcement'].filter(Boolean).join(' and ')}? This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button type="button" disabled={busy} onClick={() => run({ action: 'launch', notifyPublisher, publisherEmail: notifyPublisher ? publisherEmail.trim() : undefined, readerCampaign })} className={`${btn} bg-indigo-700 text-white`}>
                    {pending === 'launch' && <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden />}Confirm and send
                  </button>
                  <button type="button" onClick={() => setConfirmLaunch(false)} className={`${btn} bg-white border border-slate-200 text-slate-700`}>Go back</button>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {j.messages && j.messages.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1.5"><Mail className="w-4 h-4 text-slate-500" aria-hidden />Message delivery</p>
            <button type="button" disabled={busy} onClick={() => run({ action: 'refresh-delivery' })} className={`${btn} bg-white border border-slate-200 text-slate-700`}>
              <RefreshCw className={`w-3.5 h-3.5 ${pending === 'refresh-delivery' ? 'animate-spin' : ''}`} aria-hidden />Check provider status
            </button>
          </div>
          <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
            {j.messages.map((m, i) => (
              <li key={i} className="p-3 text-xs flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0"><p className="font-bold text-slate-900 break-all">{m.recipient}</p><p className="text-[11px] text-slate-500">{m.kind}{m.error ? ` — ${m.error}` : ''}</p></div>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-700">{m.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-3">
        <p className="text-xs font-extrabold uppercase tracking-wider text-slate-900">Chapters ({j.chapters.length})</p>
        {j.chapters.length === 0 ? (
          <p className="text-xs text-slate-500 p-4 rounded-xl border border-dashed border-slate-200 text-center">{active ? 'Chapters appear here once the server writes them.' : 'No chapters were produced.'}</p>
        ) : (
          <ol className="space-y-3">
            {j.chapters.map((ch, i) => (
              <li key={i} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2">
                <details>
                  <summary className="text-sm font-serif font-bold text-slate-900 cursor-pointer">{i + 1}. {ch.title}</summary>
                  <p className="mt-2 text-xs text-slate-700 leading-relaxed whitespace-pre-line">{ch.text}</p>
                </details>
                {ch.audioUrl ? (
                  <AuthedAudioPlayer label={`Narration for ${ch.title}`} durationSeconds={ch.durationSeconds} load={async () => downloadPublishingAsset(jobId, assetName(ch.audioUrl!), await authed())} />
                ) : (
                  <p className="text-[11px] text-slate-500">No narration file for this chapter.</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
};
