import { useEffect, useState } from 'react';
import { UserCheck } from 'lucide-react';
import { useEbookApi } from './ebook/ebookApi';

type NewBook = { id: string; title: string; author: string; coverImage?: string; publishDate?: string; authorSlug: string };

const when = (d?: string) => {
  const t = Date.parse(d ?? '');
  return Number.isFinite(t) ? new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '';
};

/**
 * New from authors you follow (2026-11-28): the followed authors' books of the last months, on the home page, for a
 * signed-in reader. Hidden when they follow no one or nothing is new. The e-mail about a new book stays opt-in per author.
 */
export function FollowedShelf({ accountId, onOpen }: { accountId: string; onOpen: (bookId: string) => void | Promise<void> }) {
  const api = useEbookApi();
  const [books, setBooks] = useState<NewBook[]>([]);
  const [opening, setOpening] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    api.newFromFollowed().then((r) => { if (live) setBooks(r.books); }).catch(() => { if (live) setBooks([]); });
    return () => { live = false; };
  }, [accountId]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!books.length) return null;
  return (
    <section aria-labelledby="followed-title" data-testid="followed-shelf" className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4 sm:p-5">
      <h2 id="followed-title" className="flex items-center gap-2 text-lg font-bold text-slate-900"><UserCheck className="h-5 w-5 text-emerald-700" aria-hidden />New from authors you follow</h2>
      <p className="text-xs text-slate-600">Their latest books. Follow more authors from any author page.</p>
      <ul className="mt-3 flex gap-3 overflow-x-auto pb-1 scrollbar-none snap-x">
        {books.map((b) => (
          <li key={b.id} className="w-36 shrink-0 snap-start">
            <button type="button" data-testid="followed-book" disabled={opening === b.id}
              onClick={() => { setOpening(b.id); Promise.resolve(onOpen(b.id)).finally(() => setOpening(null)); }}
              className="group w-full cursor-pointer rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:opacity-60">
              {b.coverImage
                ? <img src={b.coverImage} alt="" loading="lazy" className="aspect-[2/3] w-full rounded-lg object-cover shadow-sm ring-1 ring-slate-200 group-hover:shadow-md" />
                : <div aria-hidden className="grid aspect-[2/3] w-full place-items-center rounded-lg bg-emerald-700 text-3xl font-bold text-white">{b.title.slice(0, 1)}</div>}
              <span className="mt-2 line-clamp-2 block text-sm font-semibold text-slate-900">{b.title}</span>
              <span className="block truncate text-xs text-slate-600">{b.author}{when(b.publishDate) ? ` · ${when(b.publishDate)}` : ''}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
