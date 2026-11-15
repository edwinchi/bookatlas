import React, { useEffect, useState } from 'react';
import { BookOpen, Loader2 } from 'lucide-react';
import type { Book } from '../types';
import { AppModal } from './ui/app-modal';
import { Stars } from './ebook/ReviewsPanel';
import { coverProps } from '../utils/coverImage';

interface AuthorProfile { slug: string; name: string; bio: string | null; books: Book[]; rating: number; reviews: number }

/** "Apehgong Edwin Chi" -> "apehgong-edwin-chi", the same address the server uses (reviews/routes.ts). */
export const authorSlug = (name: string) => name.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
export const authorPath = (name: string) => `${import.meta.env.BASE_URL}author/${authorSlug(name)}`;

/**
 * An author's page (TASK-0009, the "Author Brand Hub"): bio, their real books and the average of real reader
 * reviews. Opened at /author/<name>; search engines get the same facts from the server.
 */
export function AuthorProfileModal({ slug, onClose, onOpenBook }: { slug: string; onClose: () => void; onOpenBook: (book: Book) => void }) {
  const [profile, setProfile] = useState<AuthorProfile | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/catalog/authors/${encodeURIComponent(slug)}`)
      .then(async (r) => { if (!r.ok) throw new Error(r.status === 404 ? 'This author has no books on BooksAtlas yet.' : 'The author page could not be loaded.'); return r.json(); })
      .then((p) => { if (!cancelled) setProfile(p); })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [slug]);
  useEffect(() => {
    if (!profile) return;
    const before = document.title;
    document.title = `${profile.name}: books and audiobooks | BooksAtlas`;
    return () => { document.title = before; };
  }, [profile?.name]);

  return (
    <AppModal onClose={onClose} label={profile ? `${profile.name}, author on BooksAtlas` : 'Author'} overlayClassName="z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-start justify-center p-3 sm:p-8">
      <div className="relative my-auto w-full max-w-3xl space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 cursor-pointer">Close</button>
        {!profile && !error && <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />Loading…</p>}
        {error && <p role="alert" className="text-sm text-slate-600">{error}</p>}
        {profile && <>
          <header className="space-y-2 pr-16">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-600">Author</p>
            <h1 className="font-serif text-3xl font-bold text-slate-950">{profile.name}</h1>
            <p className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" aria-hidden />{profile.books.length} book{profile.books.length === 1 ? '' : 's'} on BooksAtlas</span>
              {profile.reviews > 0
                ? <span className="inline-flex items-center gap-1.5"><Stars value={profile.rating} size="h-3.5 w-3.5" />{profile.rating.toFixed(1)} from {profile.reviews} reader review{profile.reviews === 1 ? '' : 's'}</span>
                : <span>No reader reviews yet</span>}
            </p>
          </header>
          {profile.bio && <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{profile.bio}</p>}
          <section aria-labelledby="author-books" className="space-y-3">
            <h2 id="author-books" className="font-serif text-lg font-bold text-slate-900">Books by {profile.name}</h2>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {profile.books.map((b) => (
                <li key={b.id}>
                  <button type="button" onClick={() => onOpenBook(b)} className="group w-full text-left cursor-pointer">
                    <img {...coverProps(b.coverImage, 200)} alt={`Cover of ${b.title}`} loading="lazy" decoding="async" className="aspect-[2/3] w-full rounded-xl object-cover shadow-sm ring-1 ring-slate-200 transition-shadow group-hover:shadow-md" />
                    <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-indigo-700">{b.title}</p>
                    <p className="text-xs text-slate-500">{b.price > 0 ? `€${b.price.toFixed(2)}` : 'Free'}{b.reviewCount ? ` · ${b.rating.toFixed(1)}★` : ''}</p>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>}
      </div>
    </AppModal>
  );
}
