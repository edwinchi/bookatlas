# BooksAtlas Reading Intelligence: master build plan

Source of truth: the owner's specification "BooksAtlas Reading Intelligence.md" (2026-11-25), read with what is
already live on booksatlas.app. Milestones follow the specification's own order. Each milestone is marked when
it is built, tested and documented. Deploys still need the owner's "deploy".

## Stack decision

The specification names Next.js 15, NestJS, Prisma, Redis/BullMQ, Cloudflare R2, Meilisearch and OpenAI with
pgvector. BooksAtlas is already live on its own stack, and every module below exists or is being finished on it:

| Specification | BooksAtlas (kept) | Why |
|---|---|---|
| Next.js 15 + React 19 + shadcn/ui | Vite + React + Radix primitives + Tailwind | shadcn/ui *is* Radix + Tailwind; the owner's standing rule is Radix + Tailwind everywhere |
| NestJS + DTO validation | Express API, every route behind an access policy (`auth/policy.ts`, unknown routes fail closed), body cleaners per route | same guarantees without a rewrite of a live product |
| Prisma + PostgreSQL | Supabase PostgreSQL, SQL migrations in `artifacts/api-server/src/bookatlas/db/`, RLS on every table | the database is already PostgreSQL; migrations are run by the owner |
| Redis + BullMQ | the narration queue and daily Vercel crons | no background workers needed at current scale |
| Cloudflare R2 | Supabase storage and the Vercel CDN (`public/`) | already serving books, covers and audio |
| OpenAI + embeddings + pgvector | the AI router (Gemini) with BM25 retrieval over paragraphs, citations `[1]` | no per-token embedding cost; answers cite the book |
| Zustand stores | React state + small hooks; settings sync through `/api/reader/preferences` | fewer moving parts |
| PostHog / Sentry / OpenTelemetry | pino logs on Vercel, health check `/api/healthz/ready` | to add when traffic needs it |

Pricing (Free / Pro / Family) from the specification is **not** introduced: the owner keeps reading features
free and BooksAtlas earns its 19% commission on sales.

## Milestones (specification order)

| # | Specification section | Status | Where |
|---|---|---|---|
| M0 | Reader foundation: bookmarks, highlights, notes, progress autosave, themes, fonts, spacing, margins, goals; user-scoped data | ✅ done | `components/EReaderModal.tsx`, `reader/service.ts`, `auth/policy.ts` |
| M0 | Import engine: EPUB, PDF, DOCX, TXT, HTML | ✅ done | publishing import; "Your own text" (article, PDF, EPUB) |
| M0 | Mobile reader: drawers, bottom actions | ✅ done | reader toolbars and Radix dialogs |
| M1 | **SR-001/002 Fast Read v2: RSVP + Chunk Reader** — 100–1500 WPM, ORP fixation point, ±25-word jumps, keyboard, progress and time left, drift-corrected timing, session metrics, adaptive speed and chunk-size coach with confidence, reduced motion | ✅ done (this milestone) | `reader/fastRead.ts`, `reader/adaptiveCoach.ts`, `reader/FastReadPanel.tsx` |
| M2 | SR-003 Bionic strength levels (25–60%) | ✅ done: 25, 40 (default), 50 or 60% of each word, rounded up, at least one letter; under Aids in the reader with a live sample | `reader/fastRead.ts` `boldStartPieces`, `readerLayout.ts` `boldStrength`, `ReaderPreferences.tsx` |
| M3 | SR-004 Focus Reader modes: line, paragraph, spotlight, zen | ✅ done: one Focus choice (Off, Line = the guide band, Paragraph = the rest dimmed, Spotlight = the rest dimmed and blurred, no blur with reduced motion) and a Zen switch (text only; toolbars and reader notes hidden in page and scroll mode, a tap or Escape shows them) | `readerLayout.ts` (`focusModeOf`, `paragraphFocusClass`, `zenLayout`), `EReaderModal.tsx`, `ReaderPreferences.tsx` |
| M4 | SR-005 Comprehension checkpoints (every chapter, manual), scored excellent/good/fair/needs improvement, feeding the coach | ✅ done: offered at a chapter end (default), every 1,000 words or every 10 minutes of reading (reader's choice under Aids, or off), and by hand from the reading assistant; a gentle offer first, then four AI questions on the passage just read (multiple choice, true/false, fill the blank, key concept), the band and the speed advice (< 70 slower, > 90 faster); the score feeds the coach on the device and is kept in the reader's settings (`checkpoints`, no new table); average, band and trend on My progress | `api-server/.../reader/checkpoints.ts` (`POST /api/reader/ai/checkpoint`, `GET/POST /api/reader/checkpoints`), `reader/checkpoints.ts`, `reader/CheckpointDialog.tsx`, `EReaderModal.tsx`, `ReadingIntelligencePage.tsx` |
| M5 | AN-001/002 Unified analytics and heatmaps: day × hour heatmap, peak hour and day, consistency score, best/average/current WPM | ✅ done: a reading heatmap with two views (day of the week × hour, and the last 12 weeks day by day) on the reader's own clock, five shades of one colour, every cell a button (tooltip on hover or focus, Enter opens the details: minutes, words, sessions, words a minute) and a table for screen readers; peak hour, peak day, a consistency score (70 for days read in the last four weeks, 30 for how even the weeks are) and current, average and best words a minute | `api-server/.../reader/service.ts` (`activity`, `readingSpeeds`), `reading/heatmap.ts`, `reading/ReadingHeatmap.tsx`, `ReadingIntelligencePage.tsx` |
| M6 | AI-001 Summary engine (1-minute, 5-minute, full) | ✅ done | `reader/ai.ts` `studyChapter` |
| M7 | AI-002 Explain engine: child, student, professional, **expert** | ✅ done: four levels with distinct depth (a child; a student; a professional from outside the field: plain, practical, terms defined; an expert: method, assumptions, sources, debates, field terms), the sentences around the selection sent as context only (and only when they are from the book), the same passage and level answered from a cache (no second AI call) | `reader/ai.ts` (`EXPLAIN_LEVELS`, `explainPrompt`, `explainPassage`), `ReaderAssistant.tsx` |
| M8 | AI-004 Flashcards with spaced repetition (Again 1 day, Hard 3, Good 7, Easy 14) | ✅ done: a review deck per reader (in the reader's settings, at most 500 cards, no duplicates per book); cards saved from a chapter's flashcards or made by AI from a selection ("Flashcard" on the selection bar: 2 to 4 cards, no trivia); review shows the question, Reveal answer (Space), then Again, Hard, Good or Easy (keys 1 to 4) with the next review in 1, 3, 7 or 14 days, Again comes back in the same session; retention and next review date; in the reader (this book) and on My progress (all books) | `api-server/.../reader/flashcards.ts`, `reader/FlashcardReview.tsx`, `ReaderAssistant.tsx`, `EReaderModal.tsx` |
| M9 | AI-003 Book chat with citations and follow-up questions | ✅ done (BM25 retrieval) | `reader/ai.ts` `askBook` |
| M10 | AI-005 Knowledge maps (concept graph per chapter) | ☐ | — |
| M11 | Audiobooks: read, listen, read + listen, word highlighting, chapter sync | ✅ done | narration, `narrationSync.ts` |
| M12 | Accessibility center: dyslexia fonts and spacing, guide lines, paragraph chunking, large fonts, high contrast, read-aloud anything | ✅ done | reader Aids tab, Your own text |
| M13 | Family system: parent/adult/teen/child profiles, challenges, household analytics | ✅ done | `reader/family.ts`, `FamilySection.tsx` |
| M14 | Future modules (Baby, Kids, Teen readers, School mode, Teacher dashboard) | ✅ built ahead: Young readers, Schools and teams, reports | `reading/*` |

### Notes on the specification

- **Adaptive speed rules.** Implemented exactly: comprehension ≥ 90 → +100, ≥ 80 → +50, < 60 → −100; rewind rate
  > 0.15 → −75; pause rate > 0.20 → −50; completion rate ≥ 0.9 → +25; result kept between 100 and 1500. The
  specification's "heavy rewinds" test expects 625, which its own rules do not give (650 + 50 − 75 + 25 = 650);
  its worked examples (825 and 475) match the rules, so the rules win and the test says 650. Its "moderate" test
  (completion exactly 0.9 → 575) needs "≥ 0.9", which is used.
- **Bold strength.** The specification's formula says `floor(length × strength)` but its tests expect "reading" →
  "rea" at 40%, which needs rounding up; rounding up is used, so its tests pass.
- **Checkpoint storage.** The specification's `ComprehensionCheckpoint` table is kept as a list in the reader's
  settings (the last 200 results), so no migration is needed; it can move to its own table when analytics need it.
- **Flashcard storage.** The specification's `Flashcard` and `FlashcardReview` tables are kept as one deck in the
  reader's settings (each card holds its last grade, review count, lapses and due date), so no migration is needed.
- **Rates.** A rewind rate is rewinds per 100 words read and a pause rate is pauses per 100 words read (both capped
  at 1); the completion rate is the share of sessions read to the end. Comprehension is the average of the
  reader's last five quiz scores, or unknown.
