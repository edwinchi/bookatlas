import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/react';
import { Headphones, Download, RefreshCw, AlertCircle } from 'lucide-react';

/** Returns a request-init factory that attaches a Clerk bearer token as a header (never in a URL). */
export function useAuthedRequest() {
  const { getToken } = useAuth();
  const ref = useRef(getToken);
  ref.current = getToken;
  return async (): Promise<RequestInit & { responseType: 'blob' }> => {
    let token: string | null = null;
    try { token = await ref.current(); } catch { token = null; }
    return {
      credentials: 'include',
      responseType: 'blob',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    };
  };
}

/** Last path segment of a server asset URL, used as the `asset` argument of the generated download helpers. */
export function assetName(url: string): string {
  const clean = url.split('?')[0].replace(/\/+$/, '');
  return decodeURIComponent(clean.slice(clean.lastIndexOf('/') + 1));
}

export function describeError(err: unknown, fallback: string): string {
  const e = err as { status?: number; data?: { error?: string; message?: string }; message?: string } | null;
  if (e?.status === 401) return 'Your session has expired. Sign in again.';
  if (e?.status === 403) return 'This account is not allowed to access this resource.';
  return e?.data?.error || e?.data?.message || e?.message || fallback;
}

type LoadBlob = () => Promise<Blob>;

export const AuthedAudioPlayer: React.FC<{ load: LoadBlob; label: string; durationSeconds?: number }> = ({ load, label, durationSeconds }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState('');
  const [rate, setRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);
  useEffect(() => { if (audioRef.current) audioRef.current.playbackRate = rate; }, [rate, url]);

  const fetchAudio = async () => {
    setState('loading');
    setError('');
    try {
      const blob = await load();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      const next = URL.createObjectURL(blob);
      urlRef.current = next;
      setUrl(next);
      setState('idle');
    } catch (err) {
      setError(describeError(err, 'Narration could not be loaded.'));
      setState('error');
    }
  };

  if (!url) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={fetchAudio} disabled={state === 'loading'} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-900 text-white disabled:opacity-60 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">
          {state === 'loading' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden /> : <Headphones className="w-3.5 h-3.5" aria-hidden />}
          {state === 'loading' ? 'Loading narration…' : `Load narration${durationSeconds ? ` (${formatDuration(durationSeconds)})` : ''}`}
        </button>
        {state === 'error' && (
          <span role="alert" className="text-[11px] text-rose-700 inline-flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" aria-hidden /> {error}
            <button type="button" onClick={fetchAudio} className="underline font-bold cursor-pointer">Retry</button>
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <audio ref={audioRef} src={url} controls preload="metadata" aria-label={label} className="w-full sm:flex-1 h-10" />
      <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
        Speed
        <select value={rate} onChange={(e) => setRate(Number(e.target.value))} className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs">
          {[0.75, 1, 1.25, 1.5, 2].map((r) => <option key={r} value={r}>{r}x</option>)}
        </select>
      </label>
    </div>
  );
};

export function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export const BlobDownloadButton: React.FC<{ load: LoadBlob; fileName: string; label: string }> = ({ load, fileName, label }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async () => {
    setBusy(true);
    setError('');
    try {
      const blob = await load();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 1000);
    } catch (err) {
      setError(describeError(err, 'Download failed.'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button type="button" onClick={run} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-100 hover:bg-indigo-100 disabled:opacity-60 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">
        {busy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden /> : <Download className="w-3.5 h-3.5" aria-hidden />}
        {busy ? 'Preparing…' : label}
      </button>
      {error && <span role="alert" className="text-[11px] text-rose-700">{error}</span>}
    </span>
  );
};
