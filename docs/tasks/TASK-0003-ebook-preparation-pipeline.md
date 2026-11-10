# TASK-0003: eBook preparation pipeline and print checklist

| Field | Value |
|---|---|
| Objective | Authors upload a finished EPUB on booksatlas.app. BookAtlas asks for everything a complete eBook and print edition need, fixes what it can automatically, validates the result, and an admin publishes it to the store and reader |
| Source brief | Owner, 2026-11-09: "prepare the steps you used above and apply that to any books that the customer will upload as epub … request all that is needed … for a hardcopy or print version as well … carry out a recursive self improvement … publish this epub to booksatlas … in the right category, if category missing create it" |
| Priority | High |
| Approval level | **2** (schema, storage, retention, permissions), approved 2026-11-09. Production deploy and the production data write for the first book are **3** |
| Status | ✅ Live: *The Awakened Codex* published (new version at €9.36). Open: EPUBCheck worker hosting |
| Builds on | [TASK-0002](TASK-0002-self-publishing-platform.md) (Discovery K: EPUB for sale, print-ready packages for KDP and Lulu) |
| Last updated | 2026-11-10 |

## Owner decisions (2026-11-09)

| # | Question | Decision |
|---|---|---|
| D1 | Who reads a published book in full | **Signed-in readers, free.** Visitors see cover, details and the first chapter |
| D2 | Fonts whose licence forbids embedding (for example Microsoft Aptos, Calibri, Segoe UI) | **Remove automatically**; text falls back to the e-reader's fonts |
| D3 | Category for *The Awakened Codex* | **New "Spiritual Healing & Alignment"** as primary; also listed in *Mind Mastery & Quantum Awakening* and *Consciousness & Ancient Wisdom* |
| D4 | Storage, worker, retention | **Approved:** private Supabase Storage bucket, container worker runs the official EPUBCheck, raw uploads deleted 90 days after a submission is published or rejected; the prepared eBook is kept while on sale |
| D5 | Paid books (2026-11-10, owner priced *The Awakened Codex* at $9.99) | **Buyers only, preview for everyone.** Everyone, signed in or not, reads and listens to the book up to and including its introduction (or up to the first full chapter). The whole book opens for signed-in readers of free books, admins, the book's author, and, once real payments record purchases, buyers. Until payments exist no reader can unlock a paid book. Supersedes D1 for priced books |

## Origin: the manual run on *The Awakened Codex* (2026-11-09)

Lulu rejected `AWAKENED_CODEX_edited_v1.epub` with two messages. The manual fix became the first rules:

| Lulu message | Cause found | Fix applied | Rule |
|---|---|---|---|
| Copyright year mismatch | Interior says "Copyright © 2026"; the package had no `dc:rights`/`dc:date`, and the Lulu form year differed | Added 2026 to the package; owner sets 2026 on the Lulu form | `copyright-year` |
| Ebook – Back Cover | Cover image was the full print wrap (back + spine + front, 3656 × 2250) | Cropped the front panel (1480 × 1984) by trimming the background | `cover-front-only` |
| (not flagged) EPUBCheck: 135 × RSC-005 `li value` | EPUB 2 (XHTML 1.1) forbids `value` on `li` | Upgraded the package to EPUB 3 without touching content pages; 0 errors | `epub3-package` |

## Design

### Flow

1. **Intake** (author, signed in): the form asks for every field in the requirements below. The author uploads the EPUB in 4 MB parts through the API (Vercel caps requests at 4.5 MB; no CSP change and no Supabase URL in the browser).
2. **Prepare** (API): unpack → run every rule → apply automatic fixes → re-run → repeat until no fixable finding is left or nothing changes (at most 5 rounds). Output: prepared EPUB, front-cover JPEG, report.
3. **Validate** (worker): the container worker claims the submission, runs EPUBCheck 5 on the prepared EPUB and posts the messages back. If a message maps to a fixable rule, the API runs another prepare round and re-queues validation (at most 3 rounds).
4. **Review and publish** (admin): the admin sees the report, records any store rejection messages, and publishes. Publishing creates the catalog entry, creates missing categories, and stores reader content (chapters, headings, images).
5. **Read** (signed-in reader): the reader loads full chapters from `/api/reader/catalog/:id/content` and images from `/api/reader/catalog/:id/images/:name`. The public catalog carries only the first chapter.

### "Recursive self-improvement", stated precisely

The pipeline improves in two loops. Neither lets code rewrite itself in production.

- **Per book (automatic):** check → fix → re-check runs to a fixpoint, then EPUBCheck feedback re-enters the loop. Every round is logged in the report.
- **Across books (learning from outcomes):** an admin pastes a store's rejection message (Lulu, KDP, Apple). If it matches a rule's known store messages, that rule's count rises and it becomes **blocking** for future submissions. If no rule matches, the message is queued under **"Needs a new rule"** with the submission attached. A developer then writes the detector and fixer, adds the book's case as a regression test, and the rule ships. That is how the first three rules were made.

### Data (Level 2, approved D4)

- Table `bookatlas_ebook_submissions`: id, owner_id, status (`uploading`, `preparing`, `checking`, `ready`, `needs_author`, `published`, `rejected`), intake jsonb, report jsonb, files jsonb (storage keys, sizes, hashes), book_id, purge_after, timestamps. RLS on, service role only.
- Table `bookatlas_prep_feedback`: id, submission_id, store, message, matched_rule, created_at.
- Bucket `bookatlas-ebooks` (private). Keys: `submissions/<id>/upload/part-NNNN`, `submissions/<id>/prepared/…`, `books/<bookId>/content.json`, `books/<bookId>/images/<name>`. Objects are stored in parts of 4 MB at most.
- Without Supabase (local stack), the same interface runs in memory.

### Threat model (summary)

| Threat | Control |
|---|---|
| Zip bomb or path traversal in an uploaded EPUB | Unpacked size capped at 400 MB, 5,000 entries; entry names normalised and rejected if absolute or containing `..` |
| Script or active content shipped to readers | Reader content is converted to plain paragraphs, headings and images; no HTML from the EPUB is rendered |
| Reading another author's submission | Every submission route checks `owner_id` or admin role |
| Full text scraped by visitors | Full content only through reader-authenticated routes (D1); public catalog keeps one chapter |
| Worker endpoint abuse | Separate bearer token (`EBOOK_WORKER_TOKEN`, 32+ chars), compared in constant time; fails closed when unset |
| Storage growth | Upload capped at 150 MB; raw parts purged 90 days after publish or reject (sweep on admin list and worker poll) |

## Requirements catalogue

The source of truth is `lib/bookatlas-catalog/src/publishing/requirements.ts`. The intake form and the checklist render from it. Summary:

**eBook:** title and subtitle exactly as on the cover; author name; language; description (150–4,000 characters); 1–3 categories; up to 7 keywords; copyright holder and year (must match the copyright page); eBook ISBN (optional; must differ from print ISBNs); front cover only (portrait, at least 1600 × 2560 recommended, no back cover, spine or barcode); EPUB 3 that passes EPUBCheck; table of contents; no fonts that forbid embedding; no print barcode inside the eBook; rights confirmation; AI-content disclosure.

**Print (paperback or hardcover):** trim size; paper (white or cream) and ink; binding; page count after layout (KDP 24–828 white, 24–776 cream; KDP hardcover 75–550; Lulu up to 800); print ISBN (different from the eBook's); interior PDF at trim size (plus 0.125 in bleed if images reach the edge), fonts embedded, gutter by page count; full-wrap cover PDF: back + spine + front with 0.125 in bleed on all sides, spine width from page count and paper, spine text only from 80 pages, barcode area 2 × 1.2 in on the back, lower right; back-cover blurb and author bio.

## Progress

| Step | Status |
|---|---|
| Requirements catalogue and print calculator (`lib/bookatlas-catalog/src/publishing/requirements.ts`) | ✅ |
| Preparation engine and 12 rules (`artifacts/api-server/src/bookatlas/ebookPrep/`) | ✅ On the original Lulu-rejected file: 1 round, 8 s, EPUBCheck 0 errors / 0 warnings, 57 → 37 MB; second run makes no changes |
| Submission API, storage in 4 MB parts, retention sweep | ✅ |
| EPUBCheck worker (`artifacts/epubcheck-worker/`, compose service `epubcheck`) | ✅ Built; **not hosted** yet. Without `EBOOK_WORKER_TOKEN`, submissions go to admin review unchecked |
| Intake page ("Upload your eBook"), report, admin queue, store-feedback panel | ✅ |
| Reader: full content, headings and images for signed-in readers; book page without invented ratings | ✅ |
| Production tables `bookatlas_ebook_submissions`, `bookatlas_prep_feedback` | ✅ 2026-11-10 created by the owner in the Supabase SQL editor; verified through the REST API (bucket `bookatlas-ebooks` private) |
| Owner admin role | ✅ 2026-11-10 (owner approval, Level 2 permissions): production has no `BOOKATLAS_OWNER_EMAIL`, so the owner's Clerk account had the reader role and could not publish. Set `publicMetadata.role = admin` on that account through the Clerk API. Rollback: remove the role in the Clerk dashboard |
| Production deploy | ✅ 2026-11-09 `bookatlas-h4c2hkxhw` (`68fb31f`, owner sign-off "publish to live site") on booksatlas.app. Verified: security 5/5, browser 12/12, sweep 48/48 with no page errors, account journey 7/7; new routes answer 401 without sign-in, worker claim 401 without token |
| Cover fixes on the submission card (owner request 2026-11-10) | ✅ Deployed 2026-11-10 `bookatlas-hvbiwontr` (`c4d5cec`, owner sign-off "Deploy to production"); live: cover routes 401 without sign-in, security 5/5, browser 12/12. Under a cover finding the card explains the fix and offers **Upload a larger cover** (JPEG/PNG, front only, portrait, at least 1000 px tall; the browser re-encodes files over 4 MB as JPEG) and, for covers below 1600 × 2560, **Enlarge to 2560 px tall** (bilinear, proportions kept, stated plainly that it adds no detail). **Use the original cover** undoes either. The choice is stored in `data.coverFix` (the uploaded image under `submissions/<id>/cover-upload`, purged with the raw upload) and applied by the `cover-size` rule on every preparation from the original upload. On *The Awakened Codex*: enlarge gives 1910 × 2560, 0 errors, 0 warnings, EPUBCheck 0/0, 12 s |
| Preview and paid access (D5) | ✅ Deployed 2026-11-10 `bookatlas-3nmipg8tf` (`e5cdcd7`, owner sign-off); live: visitors get `preview` (title pages + Introduction), preview images 200, other images 403, security 5/5. `/api/reader/catalog/:id/content` and `/images/:name` are self-service: the route answers `{ access: 'full' \| 'preview', chapters }`, decided on the server (`readerAccess`); preview images only for figures inside the preview. The reader shows "Free preview for everyone" with **Listen to this chapter** (device read-aloud), and at the end of the preview a Buy banner for paid books or the sign-in banner for free ones. Studio narration (Gemini) stays off: no `GEMINI_API_KEY` in production |
| Replace the EPUB from the edit form (owner request 2026-11-10) | ✅ Built and tested; not deployed. "Edit details or replace EPUB" takes an optional corrected file; `POST /api/ebook-submissions/:id/reupload` (author or admin, any status before `published`) keeps the details and cover choice, deletes the old upload and prepares the new file like a first upload. An unfinished upload shows "Upload again". Published books cannot be swapped (409) |
| Change price on published books; first new version of *The Awakened Codex* (owner request 2026-11-10) | ✅ "Change price" deployed `bookatlas-9cwpfz7po` (`0b3a006`). New version `54a56b4a` created as the author from v3 (the owner asked to simulate with v3): price €9.36, cover enlarged to 1910 × 2560, 0 errors, 0 warnings, Ready for review. Published 2026-11-10 at the owner's request ("publish now") over `atlas-ebook-9893222e`: live price €9.36, first publication date kept, cover 1910 × 2560, visitor preview unchanged |
| KDP and Lulu publication readiness package (owner request 2026-11-10; guide: the owner's "Revelation Protocol" audit package) | ✅ Deployed `bookatlas-cwcmrz2ln` (`c2553ce`). `ebookPrep/readiness.ts`, `GET /api/ebook-submissions/:id/readiness`, "Open readiness report" on every prepared submission, download as Markdown. Score and verdict, major issues, correction checklist, chapter audit (placeholders, doubled words, long paragraphs, repeated passages, image descriptions, dates/figures/claims to verify), KDP eBook, KDP print and Lulu checklists, metadata package with suggested store categories, description, copyright page. On *The Awakened Codex*: 66/100; finds "the The architect" in 10 chapters and repeated passages in chapters 4, 5, 7 and 10. Fact-checking stays manual |
| Publish *The Awakened Codex* (owner sign-off 2026-11-09, "go, deploy all") | ✅ 2026-11-10 published by the owner as `atlas-ebook-9893222e` after enlarging the cover (1910 × 2560, 0 errors, 0 warnings). Live: primary category Spiritual Healing & Alignment (created on publish), also in Mind Mastery & Quantum Awakening and Consciousness & Ancient Wisdom; 15 chapters and 113 images stored; price $9.99 |

## Verification (2026-11-09)

`pnpm run typecheck` clean; `pnpm test:unit` 106/106; `pnpm test:e2e` 188/188 (2026-11-10, with cover fixes, paid access, payments and EPUB replacement) (includes `tests/e2e/ebook-submissions.test.ts`: upload → prepare → worker check → publish into a new category → signed-in reading → public cover → store feedback); `pnpm test:catalog` 3/3; `pnpm audit --prod` clean. The schema-count tests now expect 10 tables.

## Follow-ups

- Host the EPUBCheck worker and set `EBOOK_WORKER_TOKEN` on Vercel and the worker (Level 1 infrastructure, Level 3 credential).
- ~~Add the submission routes to `lib/api-spec/openapi.yaml` and regenerate the client.~~ ✅ 2026-11-10: catalogue, reader, payments, submissions (upload, prepare, reupload, new version, cover, price, print links, readiness, files, publish, reject), store feedback and feed import are in the spec; client and zod schemas regenerated.
- Covers below 1600 × 2560 get a warning; the author can now upload a larger cover or enlarge it from the card.
- ~~Book images larger than 4.5 MB cannot be served through Vercel; the engine should downscale them.~~ ✅ 2026-11-10: rule `image-weight` reduces book images over 4 MB in their own format (at most 2,400 px); the reader keeps web copies of images over 600 KB (at most 1,600 px, JPEG unless transparent). On *The Awakened Codex* the title-page image drops from 6 MB to 418 KB. The live book gets this when its reader content is regenerated (production data write, needs the owner's yes).
