# TASK-0009: Reader reviews, ratings and author pages

| Field | Value |
|---|---|
| Objective | Real reader reviews and star ratings on BooksAtlas books, and a public page per author, both visible to search engines and AI assistants |
| Source brief | Owner, 2026-11-14 (priority list, cycle 4: "Reviews, ratings, author pages"); master.md MVP: ratings, author profile, Author Brand Hub |
| Approval level | 2 (new table, public content); production deploy 3 |
| Status | ✅ Built and tested; needs `migrations-2026-11-15b-reviews.sql` and the owner's deploy sign-off |

## Rules

- **Only real reviews.** The book page showed a made-up review ("Hannah Vance") and an invented 86% five-star breakdown when a book had no reviews. Fake reviews presented as genuine are banned under EU consumer law (Omnibus Directive 2019/2161); both are removed.
- **Who may review:** signed-in readers. Paid books: buyers only (marked "Verified purchase"). Free books: any signed-in reader. Authors cannot review their own books. One review per reader per book; it can be edited or deleted.
- **Content:** 1–5 stars, an optional title (up to 120 characters) and a text of 20–2,000 characters; plain text only. Administrators can hide a review.
- **Ratings** shown on cards and in search are the average of visible reviews; the schema.org `aggregateRating` appears only when real reviews exist.

## Author pages

- `booksatlas.app/author/<name>` lists the author's real books, their bio (from the author's book details) and average rating.
- Served with its own title, description, Person structured data and a no-JavaScript summary; listed in the sitemap.
- Book pages link the author's name to the page.
- Sample (demo) titles show "Sample title" and never a rating; the invented "verified readers" counts are gone.

## Progress (resume here)

| Step | Status |
|---|---|
| Table `bookatlas_reviews`, migration `db/migrations-2026-11-15b-reviews.sql`, schema, test counts | ✅ |
| `reviews/service.ts`: eligibility (buyers of paid books, signed-in readers of free books, never the author), save/edit/delete, admin hide/show, rating recalculated into the catalogue, export/erase helpers | ✅ |
| `reviews/routes.ts`: public reviews and author profile, reader mine/put/delete, admin moderation; access rules | ✅ |
| Wire `reviewsOf` / `eraseReviewsOf` into account export and erasure (`server.ts` mountAccountRoutes) | ✅ |
| Remove the made-up review and 86% breakdown from `BookDetailModal.tsx`; show real reviews, breakdown and a review form (Radix) | ✅ |
| Author page `/author/<slug>` (frontend route + `AuthorPage`), author name links on book pages and cards | ✅ |
| SEO: server-rendered `/author/<slug>` head (Person JSON-LD) + noscript, `vercel.json` rewrite, `sitemaps/authors.xml` | ✅ |
| e2e tests (eligibility, edit, delete, hide, rating on cards, author page), browser check, deploy | ✅ |
