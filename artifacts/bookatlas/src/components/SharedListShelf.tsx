import { coverProps } from '../utils/coverImage';
import { useEffect, useState } from 'react';
import { Gift, X } from 'lucide-react';
import { fetchFullBook } from '../hooks/useCatalog';
import { parseSharedList } from './share/shareLinks';
import type { Book } from '../types';

/**
 * A wishlist someone shared (2026-11-28): /?list=<ids>&from=<first name> shows those books at the top of the store,
 * for anyone, without an account. The books are read from the catalogue; ones no longer in the store are left out.
 */
export function SharedListShelf({ onOpen, wishlistIds, onToggleWishlist }: { onOpen: (b: Book) => void; wishlistIds: string[]; onToggleWishlist: (b: Book) => void }) {
  const [shared] = useState(() => (typeof window === 'undefined' ? null : parseSharedList(window.location.search)));
  const [books, setBooks] = useState<Book[] | null>(null);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (!shared) return;
    let live = true;
    Promise.all(shared.ids.map((id) => fetchFullBook(id).catch(() => null))).then((list) => { if (live) setBooks(list.filter((b): b is Book => !!b)); });
    return () => { live = false; };
  }, [shared]);
  if (!shared || hidden || !books?.length) return null;
  const close = () => {
    setHidden(true);
    const p = new URLSearchParams(window.location.search); p.delete('list'); p.delete('from');
    window.history.replaceState(null, '', `${window.location.pathname}${p.size ? `?${p}` : ''}${window.location.hash}`);
  };
  return (
    <section aria-labelledby="shared-list-title" data-testid="shared-list" className="relative rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 to-white p-4 sm:p-5">
      <button type="button" onClick={close} aria-label="Hide this list" className="absolute right-2 top-2 grid h-9 w-9 cursor-pointer place-items-center rounded-full text-slate-600 hover:bg-white"><X className="h-4 w-4" aria-hidden /></button>
      <h2 id="shared-list-title" className="flex items-center gap-2 pr-10 text-lg font-bold text-slate-900"><Gift className="h-5 w-5 text-rose-600" aria-hidden />{shared.from ? `${shared.from}'s wishlist` : 'A wishlist shared with you'}</h2>
      <p className="text-xs text-slate-600">{books.length} book{books.length === 1 ? '' : 's'} {shared.from ? `${shared.from} would like to read` : 'someone would like to read'}. A thoughtful gift, or ideas for your own list.</p>
      <ul className="mt-3 flex gap-3 overflow-x-auto pb-1 scrollbar-none snap-x">
        {books.map((b) => (
          <li key={b.id} className="w-36 shrink-0 snap-start">
            <button type="button" data-testid="shared-book" onClick={() => onOpen(b)}
              className="group w-full cursor-pointer rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-rose-600">
              {b.coverImage
                ? <img {...coverProps(b.coverImage, 144)} alt="" loading="lazy" className="aspect-[2/3] w-full rounded-lg object-cover shadow-sm ring-1 ring-slate-200 group-hover:shadow-md" />
                : <div aria-hidden className="grid aspect-[2/3] w-full place-items-center rounded-lg bg-rose-700 text-3xl font-bold text-white">{b.title.slice(0, 1)}</div>}
              <span className="mt-2 line-clamp-2 block text-sm font-semibold text-slate-900">{b.title}</span>
              <span className="block truncate text-xs text-slate-600">{b.author}</span>
            </button>
            <button type="button" onClick={() => onToggleWishlist(b)} aria-pressed={wishlistIds.includes(b.id)}
              className="mt-1 cursor-pointer text-[11px] font-semibold text-rose-700 hover:underline">
              {wishlistIds.includes(b.id) ? 'On your wishlist' : 'Add to my wishlist'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
