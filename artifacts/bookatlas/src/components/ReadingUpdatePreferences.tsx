import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Mail, RefreshCw, AlertCircle, ChevronDown } from 'lucide-react';
import {
  useGetReadingUpdatePreference,
  getGetReadingUpdatePreferenceQueryKey,
  useSetReadingUpdatePreference,
} from '@workspace/api-client-react';
import { useAccount } from '../auth/AuthContext';
import { describeError } from './publishing/AuthedAudioPlayer';

/** Signed-in reader's explicit, optional consent for new-release emails. */
export const ReadingUpdatePreferences: React.FC = () => {
  const { account } = useAccount();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saveError, setSaveError] = useState('');
  const accountId = account?.id ?? null;
  const baseKey = getGetReadingUpdatePreferenceQueryKey();
  const queryKey = [...baseKey, accountId ?? 'anon'] as const;

  // Drop any other user's cached preference whenever the verified account changes.
  useEffect(() => {
    qc.removeQueries({ queryKey: baseKey, predicate: (q) => q.queryKey[1] !== accountId });
    setSaveError('');
    setOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, qc]);

  const pref = useGetReadingUpdatePreference({
    query: { enabled: !!accountId && open, queryKey, refetchOnMount: 'always' },
  });
  const save = useSetReadingUpdatePreference();

  if (!account) return null;

  const setSubscribed = (subscribed: boolean) => {
    setSaveError('');
    save.mutate(
      { data: { subscribed } },
      {
        onSuccess: (saved) => qc.setQueryData(queryKey, saved),
        onError: (err) => setSaveError(describeError(err, 'Your preference could not be saved.')),
      },
    );
  };

  const subscribed = pref.data?.subscribed === true;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="reading-updates-panel"
        className="inline-flex items-center gap-1 font-bold underline-offset-4 hover:underline cursor-pointer"
      >
        <Mail className="w-3.5 h-3.5" aria-hidden />Reading updates
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && (
        <section
          id="reading-updates-panel"
          aria-labelledby="reading-updates-title"
          className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-indigo-100 bg-white p-4 text-left shadow-xl space-y-3"
        >
          <div>
            <h2 id="reading-updates-title" className="text-sm font-serif font-bold text-slate-950">New-release emails</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
              Optional. Browsing and reading stay open to everyone either way. If you opt in, Bookatlas may email {account.email} about newly published books. You can opt out here at any time.
            </p>
          </div>

          <div aria-live="polite">
            {pref.isLoading ? (
              <div className="h-10 rounded-xl bg-slate-100 animate-pulse" aria-busy="true" />
            ) : pref.isError ? (
              <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] text-rose-800">
                <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden />
                <span className="flex-1">{describeError(pref.error, 'Your preference could not be loaded.')}</span>
                <button type="button" onClick={() => pref.refetch()} className="font-bold underline cursor-pointer">Retry</button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-slate-800">
                  Status: <strong>{subscribed ? 'Opted in' : 'Not subscribed'}</strong>
                  {subscribed && pref.data?.consentAt && (
                    <span className="text-slate-500"> since {new Date(pref.data.consentAt).toLocaleDateString()}</span>
                  )}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={save.isPending}
                    onClick={() => setSubscribed(!subscribed)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold disabled:opacity-60 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${subscribed ? 'border border-slate-200 bg-white text-slate-800' : 'bg-indigo-700 text-white'}`}
                  >
                    {save.isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden />}
                    {subscribed ? 'Opt out' : 'Opt in to new-release emails'}
                  </button>
                  <button type="button" onClick={() => pref.refetch()} disabled={pref.isFetching} aria-label="Reload preference" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 cursor-pointer disabled:opacity-50">
                    <RefreshCw className={`w-3.5 h-3.5 ${pref.isFetching ? 'animate-spin' : ''}`} aria-hidden />
                  </button>
                </div>
              </div>
            )}
            {saveError && <p role="alert" className="mt-2 text-[11px] font-semibold text-rose-700">{saveError}</p>}
          </div>
        </section>
      )}
    </div>
  );
};
