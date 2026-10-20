import { ClerkProvider, SignIn, SignUp, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Router as WouterRouter, Switch, Route, Redirect, Link, useLocation } from 'wouter';
import App from '../App';
import { AccountProvider, useAccount } from './AuthContext';

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
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

function SessionBar() {
  const { account, signOut } = useAccount();
  return <div className="border-b border-indigo-100 bg-indigo-50 px-4 py-2">
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 text-xs text-indigo-950">
      <span>{account ? `Signed in as ${account.email}${account.role === 'admin' ? ' · Administrator' : ''}` : 'Your next chapter starts here. Browse freely, or sign in to build your bookshelf.'}</span>
      <div className="flex items-center gap-4">
        {account ? <button onClick={signOut} className="font-bold underline underline-offset-4">Sign out</button> :
          <><Link href="/sign-in" className="font-bold">Sign in</Link><Link href="/sign-up" className="rounded-lg bg-indigo-700 px-3 py-1.5 font-bold text-white">Create account</Link></>}
      </div>
    </div>
  </div>;
}

function Store({ portal = false }: { portal?: boolean }) {
  const { isLoaded, isSignedIn } = useUser();
  const { account, loading, error, refresh, signOut } = useAccount();
  if (!isLoaded || (isSignedIn && loading)) return <div className="flex min-h-screen items-center justify-center text-indigo-950" role="status">Loading your Bookatlas account…</div>;
  if (portal && !isSignedIn) return <Redirect to="/" />;
  if (isSignedIn && (!account || error)) return <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-5 p-6 text-center">
    <img src={`${basePath}/logo.svg`} alt="Bookatlas" className="h-12" />
    <h1 className="text-2xl font-bold">We couldn’t verify your account</h1>
    <p className="text-slate-600">{error || 'Please finish verifying your email address, then try again.'}</p>
    <button onClick={refresh} className="rounded-xl bg-indigo-700 px-5 py-3 font-bold text-white">Try again</button>
    <button onClick={signOut} className="text-indigo-700 underline">Sign out</button>
  </main>;
  if (!portal && isSignedIn) return <Redirect to={`/user-portal${window.location.search}`} />;
  return <><SessionBar /><App key={account?.id || 'guest'} /></>;
}

function AuthPage({ signup = false }: { signup?: boolean }) {
  return <main className="min-h-[100dvh] bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 px-4 py-10">
    <div className="mx-auto mb-8 max-w-md text-center text-white">
      <Link href="/" className="text-sm text-indigo-100 underline underline-offset-4">← Back to the bookshop</Link>
      <h1 className="mt-7 font-serif text-3xl font-bold">{signup ? 'A bookshelf of your own.' : 'Your next chapter awaits.'}</h1>
      <p className="mt-3 text-sm leading-relaxed text-indigo-100">{signup ? 'Create your Bookatlas account to save your wishlist, build your library, and pick up where you left off.' : 'Welcome back to Bookatlas. Sign in to return to your books and reading progress.'}</p>
    </div>
    {signup ? <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /> :
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />}
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
    signInFallbackRedirectUrl={`${basePath}/user-portal`}
    signUpFallbackRedirectUrl={`${basePath}/user-portal`}
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
        <Route path="/user-portal"><Store portal /></Route>
        <Route path="/"><Store /></Route>
        <Route><main className="p-10 text-center"><h1 className="text-2xl font-bold">Page not found</h1><Link href="/">Return to Bookatlas</Link></main></Route>
      </Switch>
    </AccountProvider>
  </ClerkProvider>;
}

export default function AuthApp() {
  return <WouterRouter base={basePath}><ProviderWithRoutes /></WouterRouter>;
}
