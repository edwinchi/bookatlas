/**
 * New from authors you follow (2026-11-28, master.md "Reader Community": follow authors, hear about launches). The
 * e-mail tells followers when a book comes out; this list shows the same books on the home page, so following
 * works even where e-mail is not set up. Tested in newBooks.test.ts.
 */
export interface FollowedBook { id: string; title: string; author: string; coverImage?: string; publishDate?: string; isSample?: boolean; price?: number }

/** How far back a book still counts as new. */
export const NEW_DAYS = 120;

/** Each followed author's books of the last NEW_DAYS (or published since the follow), newest first, one list, no repeats. */
export function newFromFollowed(lists: { slug: string; followedAt?: string; books: FollowedBook[] }[], now = new Date(), max = 12) {
  const since = now.getTime() - NEW_DAYS * 86_400_000;
  const seen = new Set<string>();
  const out: (FollowedBook & { authorSlug: string })[] = [];
  for (const l of lists) {
    const followed = Date.parse(l.followedAt ?? '') || Infinity;
    for (const b of l.books) {
      const t = Date.parse(b.publishDate ?? '');
      if (b.isSample || !Number.isFinite(t) || t > now.getTime() || (t < since && t < followed) || seen.has(b.id)) continue;
      seen.add(b.id);
      out.push({ id: b.id, title: b.title, author: b.author, coverImage: b.coverImage, publishDate: b.publishDate, price: b.price, authorSlug: l.slug });
    }
  }
  return out.sort((a, b) => Date.parse(b.publishDate!) - Date.parse(a.publishDate!)).slice(0, max);
}
