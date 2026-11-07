import React, { useState } from 'react';
import { ShieldCheck, ChevronDown, Download, RefreshCw, Trash2 } from 'lucide-react';
import { exportOwnAccount, useDeleteOwnAccount } from '@workspace/api-client-react';
import { useClerk } from '@clerk/react';
import { useAccount } from '../auth/AuthContext';
import { describeError } from './publishing/AuthedAudioPlayer';

/** Signed-in reader's self-service data rights: download everything held, or erase the account. */
export const AccountPrivacy: React.FC = () => {
  const { account } = useAccount();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState('');
  const remove = useDeleteOwnAccount();

  if (!account) return null;

  const download = async () => {
    setMessage('');
    setExporting(true);
    try {
      const data = await exportOwnAccount();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const link = Object.assign(document.createElement('a'), { href: url, download: 'bookatlas-account-export.json' });
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setMessage(describeError(err, 'Your data could not be downloaded. Please try again.'));
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = () => {
    setMessage('');
    remove.mutate({ data: { confirm: 'DELETE' } }, {
      // The sign-in account no longer exists; end the local session and return to the public store.
      onSuccess: () => void signOut({ redirectUrl: new URL(import.meta.env.BASE_URL, window.location.origin).href }),
      onError: (err) => setMessage(describeError(err, 'Your account could not be deleted. Nothing was removed; please try again.')),
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="account-privacy-panel"
        className="inline-flex items-center gap-1 font-bold underline-offset-4 hover:underline cursor-pointer"
      >
        <ShieldCheck className="w-3.5 h-3.5" aria-hidden />Privacy &amp; data
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && (
        <section
          id="account-privacy-panel"
          aria-labelledby="account-privacy-title"
          className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-indigo-100 bg-white p-4 text-left shadow-xl space-y-4"
        >
          <div>
            <h2 id="account-privacy-title" className="text-sm font-serif font-bold text-slate-950">Your data</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
              Download a copy of everything Bookatlas holds about {account.email}, or permanently delete your account. See the <a href={`${import.meta.env.BASE_URL}privacy`} className="font-semibold text-indigo-700 underline">Privacy Notice</a>.
            </p>
          </div>

          <button
            type="button"
            onClick={download}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 disabled:opacity-60 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            {exporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden /> : <Download className="w-3.5 h-3.5" aria-hidden />}
            Download my data
          </button>

          {account.role === 'admin' ? (
            <p className="text-[11px] leading-relaxed text-slate-600">Administrator accounts are removed by another administrator, so the platform always keeps an owner.</p>
          ) : <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 space-y-2">
            <h3 className="text-xs font-bold text-rose-900">Delete account</h3>
            <p className="text-[11px] leading-relaxed text-rose-900/80">
              Permanently erases your reader profile, email preferences and sign-in account. Your cart and reading progress stay in this browser until you clear them. This cannot be undone.
            </p>
            <label className="block text-[11px] font-semibold text-rose-900">
              Type DELETE to confirm
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoComplete="off"
                className="mt-1 w-full rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
              />
            </label>
            <button
              type="button"
              onClick={deleteAccount}
              disabled={confirmText !== 'DELETE' || remove.isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-700 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
            >
              {remove.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden /> : <Trash2 className="w-3.5 h-3.5" aria-hidden />}
              Delete my account
            </button>
          </div>}
          {message && <p role="alert" className="text-[11px] font-semibold text-rose-700">{message}</p>}
        </section>
      )}
    </div>
  );
};
