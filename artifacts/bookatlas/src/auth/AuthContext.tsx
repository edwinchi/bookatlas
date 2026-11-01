import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useClerk, useUser } from '@clerk/react';
import { useLocation } from 'wouter';
import { safeReaderReturnPath } from './navigation';
import { completeSignOut } from './session';

export type Account = { id: string; email: string; name: string; role: 'reader' | 'admin' };
type AuthState = {
  account: Account | null;
  tier: 'free_reader' | 'member_subscriber' | 'vip_patron';
  loading: boolean;
  error: string;
  refresh: () => void;
  requireSignIn: (feature?: string, returnTo?: string) => boolean;
  requireAdmin: (feature?: string) => boolean;
  signOut: () => void;
};
const Context = createContext<AuthState | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const [, navigate] = useLocation();
  const [profile, setProfile] = useState<{ user: Account; tier: AuthState['tier'] } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState('');
  const account = profile && profile.user.id === user?.id ? profile.user : null;

  useEffect(() => {
    setProfile(null);
    setError('');
    setNotice('');
    if (!isLoaded || !isSignedIn) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true);
    (async () => {
      try {
        const response = await fetch('/api/auth/me', { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not verify your account.');
        if (data.user.id !== user.id) throw new Error('Your session changed. Please reload the page.');
        setProfile(data);
        // The server derives this identity from the verified session, not a form.
        try {
          const sync = await fetch('/api/users/register', { method: 'POST', signal: controller.signal });
          if (!sync.ok) throw new Error('Reader profile sync failed.');
        } catch {
          if (!controller.signal.aborted) setNotice('You are signed in. Reader profile sync failed; please retry later.');
        }
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Account verification failed.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [isLoaded, isSignedIn, user?.id, revision]);

  const requireSignIn = (feature = 'this service', returnTo?: string) => {
    if (account) return true;
    const currentPath = `${window.location.pathname}${window.location.search}`;
    const destination = safeReaderReturnPath(returnTo ?? currentPath, window.location.origin, import.meta.env.BASE_URL);
    navigate(`/sign-in?feature=${encodeURIComponent(feature)}&returnTo=${encodeURIComponent(destination)}`);
    return false;
  };
  const requireAdmin = (feature = 'Manager Studio') => {
    if (!requireSignIn()) return false;
    if (account?.role === 'admin') return true;
    setNotice(`${feature} is available only to administrators. Your reader account does not have permission.`);
    return false;
  };
  return (
    <Context.Provider value={{
      account, tier: account ? profile!.tier : 'free_reader',
      loading: !isLoaded || loading, error, refresh: () => setRevision(value => value + 1),
      requireSignIn, requireAdmin,
      signOut: () => {
        void completeSignOut(
          () => signOut({ redirectUrl: new URL(import.meta.env.BASE_URL, window.location.origin).href }),
          () => { setProfile(null); setError(''); },
          () => setNotice('Sign out failed. Please check your connection and try again.'),
        );
      },
    }}>
      {children}
      {notice && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-5">
        <section role="alertdialog" aria-labelledby="admin-notice-title" className="max-w-md rounded-2xl bg-white p-7 text-slate-900 shadow-xl">
          <h2 id="admin-notice-title" className="text-xl font-bold">Account notice</h2>
          <p className="my-4 text-sm leading-relaxed text-slate-600">{notice}</p>
          <button onClick={() => setNotice('')} className="rounded-xl bg-indigo-700 px-5 py-2.5 font-semibold text-white">Back to Bookatlas</button>
        </section>
      </div>}
    </Context.Provider>
  );
}

export function useAccount() {
  const value = useContext(Context);
  if (!value) throw new Error('AccountProvider is required.');
  return value;
}

/** Personal browser data is namespaced by verified account, never legacy email/PIN state. */
export function useAccountList<T>(name: string) {
  const { account } = useAccount();
  const key = account ? `bookatlas:account:${account.id}:${name}` : null;
  const [items, setItems] = useState<T[]>(() => {
    if (!key) return [];
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(value) ? value : [];
    } catch { return []; }
  });
  useEffect(() => {
    if (key) {
      try { localStorage.setItem(key, JSON.stringify(items)); }
      catch { console.error('Bookatlas could not save browser data. Storage may be full or disabled.'); }
    }
  }, [key, items]);
  return [items, setItems] as const;
}
