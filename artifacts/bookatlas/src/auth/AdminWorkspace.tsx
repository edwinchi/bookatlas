import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAccount } from './AuthContext';
import { ManagerPortal } from '../components/ManagerPortal';
import { EReaderModal } from '../components/EReaderModal';
import type { Book } from '../types';

function AdminSignIn() {
  return <main className="grid min-h-[100dvh] place-items-center bg-slate-950 p-6 text-center text-white">
    <section className="max-w-md space-y-4">
      <h1 className="text-3xl font-bold">Administrator sign-in</h1>
      <p className="text-slate-300">Sign in with your verified Bookatlas administrator account to open the private workspace.</p>
      <Link href="/sign-in?feature=admin&returnTo=%2Fadmin" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-indigo-600 px-5 font-bold text-white">Sign in as administrator</Link>
      <p><Link href="/" className="text-sm underline underline-offset-4">Return to the public bookstore</Link></p>
    </section>
  </main>;
}

export function AdminEntry() {
  const { account, loading, error, refresh } = useAccount();
  if (loading) return <main className="grid min-h-screen place-items-center text-slate-700" role="status">Verifying administrator access…</main>;
  if (!account) return error
    ? <main className="grid min-h-screen place-items-center p-6 text-center"><section className="space-y-4"><h1 className="text-2xl font-bold">Unable to verify administrator access</h1><p>{error}</p><button className="min-h-11 rounded-lg bg-indigo-700 px-4 text-white" onClick={refresh}>Try again</button></section></main>
    : <AdminSignIn />;
  if (account.role !== 'admin') return <main className="grid min-h-[100dvh] place-items-center bg-slate-950 p-6 text-center text-white">
    <section className="max-w-md space-y-4">
      <p className="text-sm font-bold uppercase tracking-wider text-amber-300">Access denied</p>
      <h1 className="text-3xl font-bold">Administrator access required</h1>
      <p className="text-slate-300">Your verified reader account does not have permission to access this private workspace.</p>
      <Link href="/" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-5 font-bold text-slate-950">Return to the bookstore</Link>
    </section>
  </main>;
  return <AdminPortal />;
}

function AdminPortal() {
  const [, navigate] = useLocation();
  const [books, setBooks] = useState<Book[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [previewBook, setPreviewBook] = useState<Book | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/books', { signal: controller.signal }).then(async response => {
      const result = await response.json();
      if (!response.ok || !Array.isArray(result.books)) throw new Error(result.error || 'The catalog could not be loaded.');
      setBooks(result.books);
    }).catch(cause => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'The catalog could not be loaded.');
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, []);

  const mutateBook = async (url: string, method: 'POST' | 'PUT' | 'DELETE', book?: Book) => {
    const response = await fetch(url, {
      method,
      ...(book ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(book) } : {}),
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || 'The book change was not saved.');
    return result;
  };
  const addBook = async (book: Book) => {
    try { const result = await mutateBook('/api/books', 'POST', book); setBooks(current => [result.book, ...current]); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'The book was not saved.'); }
  };
  const updateBook = async (book: Book) => {
    try { const result = await mutateBook(`/api/books/${encodeURIComponent(book.id)}`, 'PUT', book); setBooks(current => current.map(item => item.id === result.book.id ? result.book : item)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'The book was not saved.'); }
  };
  const deleteBook = async (id: string) => {
    try { await mutateBook(`/api/books/${encodeURIComponent(id)}`, 'DELETE'); setBooks(current => current.filter(item => item.id !== id)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'The book was not deleted.'); }
  };

  return <div className="min-h-[100dvh] bg-slate-950">
    <header className="sticky top-0 z-40 flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-indigo-900 bg-slate-950 px-4 py-2 text-white">
      <p className="text-sm font-bold"><span className="text-amber-300">Private workspace</span> · Bookatlas administration</p>
      <Link href="/" className="inline-flex min-h-11 items-center rounded-lg border border-slate-600 px-4 text-sm font-semibold hover:bg-slate-800">Return to public bookstore</Link>
    </header>
    <main className="mx-auto max-w-7xl px-3 py-5 sm:px-6 sm:py-8">
      {error && <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900"><span>{error}</span><button type="button" onClick={() => setError('')} className="min-h-11 px-3 font-semibold underline">Dismiss</button></div>}
      {loading ? <p className="p-8 text-center text-white" role="status">Loading administration workspace…</p> :
        <ManagerPortal books={books} onAddBook={addBook} onUpdateBook={updateBook} onDeleteBook={deleteBook} onPreviewBook={setPreviewBook} onReturnToStore={() => navigate('/')} />}
    </main>
    {previewBook && <EReaderModal
      book={previewBook}
      onClose={() => setPreviewBook(null)}
      onAddToCart={() => setError('Add the book from the public bookstore when you are reading as a customer.')}
      onSaveProgress={() => undefined}
      hasAiAccess={false}
      onRequireAiAccess={(title) => setError(`${title} requires an eligible reader account and membership.`)}
    />}
  </div>;
}
