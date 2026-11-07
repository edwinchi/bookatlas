import { ClerkProvider, SignIn, SignUp, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Router as WouterRouter, Switch, Route, Redirect, Link, useLocation } from 'wouter';
import App from '../App';
import { AccountProvider, useAccount } from './AuthContext';
import { ReadingUpdatePreferences } from '../components/ReadingUpdatePreferences';
import { readerReturnUrl, safeReaderReturnPath, clerkRouterPath } from './navigation';
import { AdminEntry } from './AdminWorkspace';
import { AccountPrivacy } from '../components/AccountPrivacy';
import { PrivacyNotice } from '../components/PrivacyNotice';
import { readSignupConsent, saveSignupConsent } from './signupConsent';
import { useEffect, useState } from 'react';

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
function stripBase(path: string): string {
  return clerkRouterPath(path, window.location.origin, basePath);
}

const appearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#4338ca', colorForeground: '#0f172a', colorMutedForeground: '#475569',
    colorDanger: '#b91c1c', colorBackground: '#ffffff', colorInput: '#f8fafc',
    colorInputForeground: '#0f172a', colorNeutral: '#475569',
    fontFamily: '"Plus Jakarta Sans", sans-serif', borderRadius: '0.75rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl border border-slate-200',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-slate-950 font-bold', headerSubtitle: 'text-slate-600',
    socialButtonsBlockButtonText: 'text-slate-800 font-semibold', formFieldLabel: 'text-slate-800',
    footerActionLink: 'text-indigo-700 font-bold', footerActionText: 'text-slate-600',
    dividerText: 'text-slate-500', identityPreviewEditButton: 'text-indigo-700',
    formFieldSuccessText: 'text-emerald-700', alertText: 'text-red-800',
    logoBox: 'mb-4', logoImage: 'max-w-[190px] h-12',
    socialButtonsBlockButton: 'border border-slate-300 bg-white',
    formButtonPrimary: 'bg-indigo-700 text-white', formFieldInput: 'bg-slate-50 text-slate-900 border-slate-300',
    footerAction: 'bg-slate-50', dividerLine: 'bg-slate-200', alert: 'bg-red-50',
    otpCodeFieldInput: 'text-slate-900 border-slate-300', formFieldRow: 'mb-4', main: 'gap-5',
  },
};

const AUTH_LOAD_TIMEOUT_MS = 6000;

function SessionBar({ authUnavailable = false }: { authUnavailable?: boolean }) {
  const { account, signOut } = useAccount();
  if (authUnavailable) return <div role="status" className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs text-amber-950 sm:px-4">
    Sign-in is temporarily unavailable. You can keep browsing the bookstore as a guest.
  </div>;
  return <div className="border-b border-indigo-100 bg-indigo-50 px-3 py-2 sm:px-4">
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 text-xs text-indigo-950">
      <span>{account ? `Signed in as ${account.email}${account.role === 'admin' ? ' · Administrator' : ''}` : 'Your next chapter starts here. Browse freely, or sign in to build your bookshelf.'}</span>
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        {account ? <>{account.role === 'admin' && <Link href="/admin" className="font-bold underline underline-offset-4">Admin workspace</Link>}<ReadingUpdatePreferences /><AccountPrivacy /><button onClick={signOut} className="min-h-11 font-bold underline underline-offset-4">Sign out</button></> :
          <><Link href="/sign-in" className="inline-flex min-h-12 items-center font-bold">Sign in</Link><Link href="/sign-up" className="inline-flex min-h-12 items-center rounded-lg bg-indigo-700 px-3 font-bold text-white">Create account</Link></>}
      </div>
    </div>
  </div>;
}

function Store({ portal = false, resumeCheckout = false }: { portal?: boolean; resumeCheckout?: boolean }) {
  const { isLoaded, isSignedIn } = useUser();
  const { account, loading, error, refresh, signOut } = useAccount();
  // A failed or unreachable auth provider must not block the public storefront; fall through as a guest.
  // Clerk retries an unreachable script for about 15 seconds before reporting an error.
  const clerkStatus = useClerk().status;
  const [authSlow, setAuthSlow] = useState(false);
  useEffect(() => {
    if (isLoaded) return;
    const timer = setTimeout(() => setAuthSlow(true), AUTH_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isLoaded]);
  const authUnavailable = clerkStatus === 'error' || (authSlow && !isLoaded);
  if (!authUnavailable && (!isLoaded || (isSignedIn && loading))) return <div className="flex min-h-screen items-center justify-center text-indigo-950" role="status">Loading your Bookatlas account…</div>;
  if (portal && !isSignedIn) return <Redirect to="/" />;
  if (isSignedIn && (!account || error)) return <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-5 p-6 text-center">
    <img src={`${basePath}/logo.svg`} alt="Bookatlas" className="h-12" />
    <h1 className="text-2xl font-bold">We couldn’t verify your account</h1>
    <p className="text-slate-600">{error || 'Please finish verifying your email address, then try again.'}</p>
    <button onClick={refresh} className="rounded-xl bg-indigo-700 px-5 py-3 font-bold text-white">Try again</button>
    <button onClick={signOut} className="text-indigo-700 underline">Sign out</button>
  </main>;
  const returnTo = safeReaderReturnPath(
    new URLSearchParams(window.location.search).get('returnTo'),
    window.location.origin,
    basePath,
  );
  const currentPath = stripBase(window.location.pathname);
  const isAdmin = currentPath === '/admin';
  if (isAdmin) return <AdminEntry />;
  const libraryTab = portal && new URLSearchParams(window.location.search).get('view') === 'wishlist' ? 'wishlist' as const : 'reading' as const;
  const pendingReaderService = portal && new URLSearchParams(window.location.search).get('view') === 'ai'
    ? new URLSearchParams(window.location.search).get('service') || 'studio' : undefined;
  return <><SessionBar authUnavailable={authUnavailable} /><App key={account?.id || 'guest'} initialTab={portal ? 'library' : 'store'} initialLibraryTab={libraryTab} resumeCheckout={resumeCheckout || currentPath === '/checkout'} pendingReaderService={pendingReaderService} /></>;
}

/** Age and privacy-notice confirmation shown before the sign-up form; recorded on the first profile sync. */
function SignupConsentStep({ onAccept }: { onAccept: () => void }) {
  const [checked, setChecked] = useState(false);
  return <form
    onSubmit={(e) => { e.preventDefault(); if (checked) { saveSignupConsent(); onAccept(); } }}
    className="mx-auto w-[440px] max-w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8"
  >
    <h2 className="font-serif text-xl font-bold text-slate-950">Before you create your account</h2>
    <p className="mt-2 text-sm leading-relaxed text-slate-600">Bookatlas accounts are for readers aged 16 or older. Marketing emails stay off unless you opt in later.</p>
    <label className="mt-5 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
      <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} required className="mt-0.5 h-5 w-5 shrink-0 accent-indigo-700" />
      <span>I am 16 or older and I have read the <a href={`${basePath}/privacy`} target="_blank" rel="noreferrer" className="font-semibold text-indigo-700 underline">Privacy Notice</a>.</span>
    </label>
    <button type="submit" disabled={!checked} className="mt-5 min-h-12 w-full rounded-xl bg-indigo-700 px-5 font-bold text-white disabled:opacity-50">Continue to sign up</button>
  </form>;
}

function AuthPage({ signup = false }: { signup?: boolean }) {
  const [consented, setConsented] = useState(() => !!readSignupConsent());
  const returnTo = safeReaderReturnPath(
    new URLSearchParams(window.location.search).get('returnTo'),
    window.location.origin,
    basePath,
  );
  const feature = new URLSearchParams(window.location.search).get('feature');
  const descriptions: Record<string, string> = {
    wishlist: 'Sign in to save your wishlist to your account.',
    library: 'Sign in to open your personal library.',
    progress: 'Sign in to keep your reading progress.',
    checkout: 'Sign in to continue to your saved cart. We will return you to review checkout; nothing will be purchased automatically.',
    membership: 'Sign in to manage your membership.',
    preferences: 'Sign in to manage your reading preferences.',
    ai: 'Sign in to continue to this AI service. Bookatlas Plus membership is also required for personalized AI features.',
    admin: 'Sign in with your administrator account. Reader accounts will be denied access to this private workspace.',
  };
  const destination = readerReturnUrl(returnTo, window.location.origin, basePath);
  const preservedIntent = `?${new URLSearchParams({ feature: feature || '', returnTo }).toString()}`;
  return <main className="min-h-[100dvh] bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 px-4 py-10">
    <div className="mx-auto mb-8 max-w-md text-center text-white">
      <Link href={returnTo} className="inline-flex min-h-11 items-center text-sm text-indigo-100 underline underline-offset-4">← Cancel and return to Bookatlas</Link>
      <h1 className="mt-7 font-serif text-3xl font-bold">{signup ? 'A bookshelf of your own.' : 'Continue with Bookatlas'}</h1>
      <p className="mt-3 text-sm leading-relaxed text-indigo-100">{feature && descriptions[feature] ? descriptions[feature] : signup ? 'Create your Bookatlas account to save your wishlist, build your library, and pick up where you left off.' : 'Sign in to continue. You can still browse the bookstore without an account.'}</p>
    </div>
    {signup && !consented ? <SignupConsentStep onAccept={() => setConsented(true)} /> : signup ? <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in${preservedIntent}`} forceRedirectUrl={destination} /> :
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up${preservedIntent}`} forceRedirectUrl={destination} />}
  </main>;
}

function ProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return <ClerkProvider
    publishableKey={clerkPubKey}
    proxyUrl={clerkProxyUrl}
    appearance={appearance}
    signInUrl={`${basePath}/sign-in`}
    signUpUrl={`${basePath}/sign-up`}
    signInFallbackRedirectUrl={`${basePath}/`}
    signUpFallbackRedirectUrl={`${basePath}/`}
    localization={{
      signIn: { start: { title: 'Welcome back to Bookatlas', subtitle: 'Sign in to access your bookshelf' } },
      signUp: { start: { title: 'Join Bookatlas', subtitle: 'Create your personal reading account' } },
    }}
    routerPush={(to) => setLocation(stripBase(to))}
    routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
  >
    <AccountProvider>
      <Switch>
        <Route path="/sign-in/*?"><AuthPage /></Route>
        <Route path="/sign-up/*?"><AuthPage signup /></Route>
        <Route path="/privacy"><PrivacyNotice /></Route>
        <Route path="/user-portal"><Store portal resumeCheckout={new URLSearchParams(window.location.search).get('resume') === 'checkout'} /></Route>
        <Route path="/checkout"><Store resumeCheckout /></Route>
        <Route path="/admin"><Store /></Route>
        <Route path="/"><Store /></Route>
        <Route><main className="p-10 text-center"><h1 className="text-2xl font-bold">Page not found</h1><Link href="/">Return to Bookatlas</Link></main></Route>
      </Switch>
    </AccountProvider>
  </ClerkProvider>;
}

export default function AuthApp() {
  return <WouterRouter base={basePath}><ProviderWithRoutes /></WouterRouter>;
}
