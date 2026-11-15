# TASK-0012: BooksAtlas Reader, Phase 1: cloud sync (cycle 7)

Source: `bookatlascode_ebook_reader.md` (owner, 2026-11-15), "Recommended MVP Components, Phase 1": reader progress, bookmarks, highlights, notes, search, sync, themes and font controls. Built on the existing reader (prepared EPUB to chapters and paragraphs), not EPUB.js: locations are chapter and paragraph indexes.

## What readers get

- **Highlights** in six colours (yellow, green, blue, pink, purple, orange); tap a highlighted paragraph again to remove it, or choose a new colour in the notebook.
- **Bookmarks** with the toolbar button (saved, not just a toggle), shown in the margin.
- **Notes** on the current paragraph, shown with a margin icon; notes can also be added to any highlight or bookmark.
- **Notebook** panel (toolbar): Highlights, Bookmarks, Notes and Stats tabs, search, jump to the place, edit, delete, export to Markdown.
- **Sync** when signed in: the place is saved 1.5 s after moving (and on close or tab switch), last write wins; on another device the reader offers "Continue there". Reader settings (theme, font, size, line height, margins) follow the account.
- **Reading statistics**: time spent actively reading (tab visible, activity in the last 2 minutes), words, average speed (capped at 1,500 wpm), streak, books started and finished, minutes per day for 30 days.
- Signed out or offline everything works on the device; nothing is sent.

## Server

`artifacts/api-server/src/bookatlas/reader/` (`service.ts`, `routes.ts`): `GET /api/reader/state/:bookId`, `PUT /api/reader/progress/:bookId`, `POST|GET /api/reader/annotations` (GET searches all books with `?q=`), `PATCH|DELETE /api/reader/annotations/:id`, `GET|PUT /api/reader/preferences`, `POST /api/reader/sessions`, `GET /api/reader/stats`. Signed-in readers only, own data only; up to 5,000 marks per book; notes up to 5,000 characters. Included in the data export and erased with the account.

Tables (migration `migrations-2026-11-15e-author-payouts.sql`, run by the owner 2026-11-15): `bookatlas_reader_progress`, `bookatlas_reader_annotations`, `bookatlas_reader_preferences`, `bookatlas_reading_sessions`.

## Not in this phase (later cycles from the spec)

PDF.js and MOBI/AZW3/CBZ/CBR rendering, paged/curl animations and manga/comic modes, dictionary and translation, AI chat with the book (RAG), flashcards and quizzes, shelves and collections, offline books via service worker, social reading, achievements and goals.

## Checks

`tests/e2e/reader-sync.test.ts` (sync API), browser run of the notebook signed out (highlight, bookmark, note, export, Escape, a space in a note does not turn the page, phone width).
