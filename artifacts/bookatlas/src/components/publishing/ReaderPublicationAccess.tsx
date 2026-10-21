import React from 'react';
import { Lock, BookOpen, AlertCircle, RefreshCw } from 'lucide-react';
import { useGetReaderPublication, getGetReaderPublicationQueryKey, downloadReaderPublicationAsset } from '@workspace/api-client-react';
import { useAccount } from '../../auth/AuthContext';
import { AuthedAudioPlayer, BlobDownloadButton, assetName, describeError, useAuthedRequest } from './AuthedAudioPlayer';

/** Full generated EPUB + chapter narration for signed-in readers. Server rejects test and draft publications. */
export const ReaderPublicationAccess: React.FC<{ publicationId: string }> = ({ publicationId }) => {
  const { account, loading, requireSignIn } = useAccount();
  const authed = useAuthedRequest();
  const query = useGetReaderPublication(publicationId, {
    query: { enabled: !!account && !!publicationId, queryKey: [...getGetReaderPublicationQueryKey(publicationId), account?.id ?? 'anon'] },
  });

  if (!account) {
    return (
      <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center gap-3">
        <Lock className="w-5 h-5 text-slate-600 flex-shrink-0" aria-hidden />
        <p className="text-xs text-slate-700 flex-1">
          {loading ? 'Checking your reader session…' : 'Sign in as a reader to open the complete EPUB and chapter narration. The free sample stays available without an account.'}
        </p>
        {!loading && (
          <button type="button" onClick={() => requireSignIn()} className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-900 text-white cursor-pointer">Sign in</button>
        )}
      </div>
    );
  }

  if (query.isLoading) {
    return <div className="space-y-2" aria-busy="true">{[0, 1].map((i) => <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" />)}</div>;
  }

  if (query.isError || !query.data) {
    return (
      <div role="alert" className="p-4 rounded-2xl border border-rose-200 bg-rose-50 text-xs text-rose-800 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden />
        <div className="flex-1">
          <p className="font-bold">Full publication unavailable</p>
          <p>{describeError(query.error, 'The publication could not be loaded.')}</p>
        </div>
        <button type="button" onClick={() => query.refetch()} className="inline-flex items-center gap-1 font-bold underline cursor-pointer"><RefreshCw className="w-3 h-3" aria-hidden />Retry</button>
      </div>
    );
  }

  const pub = query.data;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-indigo-600" aria-hidden />Complete generated edition, {pub.chapters.length} chapters</p>
        {pub.epubUrl && (
          <BlobDownloadButton label="Download EPUB" fileName={`${pub.title}.epub`} load={async () => downloadReaderPublicationAsset(publicationId, assetName(pub.epubUrl!), await authed())} />
        )}
      </div>
      <ol className="space-y-2">
        {pub.chapters.map((ch, i) => (
          <li key={i} className="p-3 rounded-xl border border-slate-200 bg-white space-y-2">
            <p className="text-xs font-bold text-slate-900">{i + 1}. {ch.title}</p>
            {ch.audioUrl ? (
              <AuthedAudioPlayer label={`Narration for ${ch.title}`} durationSeconds={ch.durationSeconds} load={async () => downloadReaderPublicationAsset(publicationId, assetName(ch.audioUrl!), await authed())} />
            ) : (
              <p className="text-[11px] text-slate-500">No narration for this chapter.</p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
};
