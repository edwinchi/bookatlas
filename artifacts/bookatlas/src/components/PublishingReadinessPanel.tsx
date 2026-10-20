import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ShieldAlert, ShieldCheck, RefreshCw, AlertCircle, Lock, WifiOff, CircleDashed, CheckCircle2, XCircle, Settings2 } from 'lucide-react';
import { getPublishingReadiness } from '@workspace/api-client-react';
import type { PublishingReadiness, PublishingReadinessCheckState } from '@workspace/api-client-react';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; data: PublishingReadiness }
  | { kind: 'unauthorized'; status: number }
  | { kind: 'error'; message: string };

const STATE_META: Record<PublishingReadinessCheckState, { label: string; cls: string; Icon: React.ElementType }> = {
  missing: { label: 'Missing', cls: 'bg-amber-50 text-amber-800 border-amber-200', Icon: CircleDashed },
  configured: { label: 'Configured, not verified', cls: 'bg-sky-50 text-sky-800 border-sky-200', Icon: Settings2 },
  verified: { label: 'Verified', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200', Icon: CheckCircle2 },
  blocked: { label: 'Blocked', cls: 'bg-slate-100 text-slate-800 border-slate-300', Icon: Lock },
  error: { label: 'Error', cls: 'bg-rose-50 text-rose-800 border-rose-200', Icon: XCircle },
};

interface Props {
  onReadinessChange: (canPublish: boolean) => void;
}

export const PublishingReadinessPanel: React.FC<Props> = ({ onReadinessChange }) => {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const cbRef = useRef(onReadinessChange);
  cbRef.current = onReadinessChange;
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setState({ kind: 'loading' });
    cbRef.current(false);
    try {
      const data = await getPublishingReadiness({ signal: ctrl.signal, credentials: 'include' });
      if (ctrl.signal.aborted) return;
      setState({ kind: 'ready', data });
      cbRef.current(data.canPublish === true);
    } catch (err: unknown) {
      if (ctrl.signal.aborted) return;
      const status = (err as { status?: number })?.status;
      if (status === 401 || status === 403) {
        setState({ kind: 'unauthorized', status });
      } else if (typeof status === 'number') {
        setState({ kind: 'error', message: `The readiness service responded with HTTP ${status}.` });
      } else {
        setState({ kind: 'error', message: 'The readiness service could not be reached. Check your connection and try again.' });
      }
      cbRef.current(false);
    }
  }, []);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  const canPublish = state.kind === 'ready' && state.data.canPublish;

  return (
    <section aria-labelledby="readiness-heading" aria-busy={state.kind === 'loading'} className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${canPublish ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
            {canPublish ? <ShieldCheck className="w-5 h-5" aria-hidden /> : <ShieldAlert className="w-5 h-5" aria-hidden />}
          </div>
          <div>
            <h3 id="readiness-heading" className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Publishing readiness</h3>
            <p className="text-xs text-slate-500">
              {state.kind === 'loading' ? 'Checking server configuration…' : canPublish ? 'All checks passed. Submission is enabled.' : 'Publishing is unavailable. Submission is disabled.'}
            </p>
          </div>
        </div>
        <button type="button" onClick={load} disabled={state.kind === 'loading'} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-100 disabled:opacity-50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">
          <RefreshCw className={`w-3.5 h-3.5 ${state.kind === 'loading' ? 'animate-spin' : ''}`} aria-hidden />
          Refresh
        </button>
      </div>

      <div aria-live="polite">
        {state.kind === 'loading' && (
          <ul className="space-y-2" aria-label="Loading readiness checks">
            {[0, 1, 2].map((i) => (
              <li key={i} className="h-14 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </ul>
        )}

        {state.kind === 'unauthorized' && (
          <div role="alert" className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex gap-3">
            <Lock className="w-5 h-5 text-slate-600 flex-shrink-0" aria-hidden />
            <div className="text-xs text-slate-700">
              <p className="font-bold text-slate-900">Administrator sign-in required</p>
              <p className="mt-0.5">
                {state.status === 401 ? 'Your session is missing or has expired. Sign in with an administrator account and refresh.' : 'This account does not have administrator access to publishing.'}
              </p>
            </div>
          </div>
        )}

        {state.kind === 'error' && (
          <div role="alert" className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex gap-3">
            <WifiOff className="w-5 h-5 text-rose-600 flex-shrink-0" aria-hidden />
            <div className="text-xs text-rose-800 flex-1">
              <p className="font-bold">Readiness could not be checked</p>
              <p className="mt-0.5">{state.message} Publishing stays disabled until readiness is confirmed.</p>
              <button type="button" onClick={load} className="mt-2 font-bold underline cursor-pointer">Try again</button>
            </div>
          </div>
        )}

        {state.kind === 'ready' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-700 leading-relaxed">{state.data.summary}</p>
            {state.data.checks.length === 0 ? (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden />
                No checks were reported by the server.
              </div>
            ) : (
              <ul className="space-y-2">
                {state.data.checks.map((c) => {
                  const meta = STATE_META[c.state] ?? STATE_META.error;
                  const Icon = meta.Icon;
                  return (
                    <li key={c.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3">
                      <span className={`inline-flex items-center gap-1 self-start whitespace-nowrap px-2 py-0.5 text-[10px] font-bold rounded-md border ${meta.cls}`}>
                        <Icon className="w-3 h-3" aria-hidden />
                        {meta.label}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900">{c.label}</p>
                        <p className="text-[11px] text-slate-600 mt-0.5 break-words">{c.detail}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
