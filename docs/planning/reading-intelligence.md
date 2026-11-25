# Reading Intelligence

Owner request, 2026-11-25: plan and build "Reading Intelligence" in BooksAtlas from the owner's brief. The brief
named a stack (Next.js, NestJS, Prisma, OpenAI). BooksAtlas keeps its own stack instead: Vite + React with Radix
and Tailwind, the Express API, Supabase and the existing AI router. Everything is free for readers. AI features use
the existing daily allowance.

Site menu: **Read smarter**. Page: `/reading-intelligence`.

## Phase 1: built (2026-11-25)

| Brief | Where it lives | Status |
|---|---|---|
| Reader (fonts, dark mode, notes, highlights, bookmarks) | `EReaderModal`, `ReaderPreferences`, `ReaderNotebook` | Already built |
| Fast Read: one word at a time (100–1,000 words a minute) | `reader/FastReadPanel.tsx`, `reader/fastRead.ts` | **New** |
| Fast Read: word groups (2–8 words) | same | **New** |
| Bold word starts | `reader/readingAids.tsx` (`BoldStarts`), Aa → Aids | **New** |
| Focus mode (one paragraph, reading guide) | Aa → Aids | **New** |
| Read + listen with word highlighting | `useDeviceVoice` `onSpoken` + CSS Custom Highlight API | **New** (sentence and word; paragraph where the browser has no highlight API) |
| Playback speed 0.5×–3×, voice choice, 40 languages | `ListenPlayer`, `listening.ts` | Already built |
| AI narration of uploaded books | Narration service (`docs/bookatlas-narration.md`) | Already built |
| Summaries: 1 minute, 5 minutes, complete | `reader/ai.ts` `summary_short` / `summary` / `summary_full` | **New** lengths |
| Explain: child, student, professional | `reader/ai.ts` `EXPLAIN_LEVELS` | **New** levels |
| Quizzes, flashcards, key concepts | `ReaderAssistant` Study tab | Already built |
| Book chat with citations | `ReaderAssistant` Ask tab | Already built |
| Reading speed check, latest, average and best words per minute, plan to a goal | `SpeedCheck`, `useSpeedTests`; saved in reader settings (`speedTests`) | **New** |
| Progress: minutes, streaks, books finished, words per minute, 30 days | `/api/reader/stats`, page "My progress" | Already built, now on the page |
| Reading heatmap (hours of the day) | `byHourUtc` in `/api/reader/stats` | **New** |
| Dyslexia-friendly font, clear font, text up to 34 px | Aa → Aids (Lexend, Atkinson Hyperlegible; loaded only when picked) | **New** |
| Achievements and daily goal | `ReaderAchievements` | Already built |

No database change was needed: speed checks are stored with the reader settings.

## Phase 2: built (2026-11-25)

| Brief | Where it lives |
|---|---|
| Family profiles: up to 6 readers per account, "who is reading" per device | `reading/FamilySection.tsx`, `reading/family.ts`; server `reader/family.ts`, `GET/PUT /api/reader/family`, `POST /api/reader/family/activity` |
| Per-profile reading time, books, quiz scores, stars, streaks, last 14 days | Reader sessions and quizzes go to the active profile (`useReaderSync`, `ReaderAssistant` quiz) |
| Family challenge (weekly minutes) and this week's ranking | Family section on `/reading-intelligence` |
| Young readers (about 4–12), three reading levels | `/reading-intelligence/young-readers` (`YoungReadersPage.tsx`, `youngReaders.ts`) |
| Stories read aloud with words lit up, tap a word to hear it, questions after each story | Six original stories, three questions each |
| Letter sounds | 26 letters, 8 letter pairs, 8 long sounds, each with a word and a picture |
| Word games | Find the picture, Build the word, Spell it; stars for each right answer |
| Adaptive coach | `reading/coach.ts`: Fast Read speed up 10% only with quiz scores of 80% or more; quiz depth and explain level follow the scores; a plan for today |
| Import your own text | `reading/ownText.ts`, `OwnTextPanel.tsx`: paste, TXT, Markdown, HTML, EPUB, Word, PDF; read in the browser, never uploaded |
| Defaults by reader | Fast Read starts at 150 words a minute for a child (100 for first words); explanations default to the child level |

Family data is kept in the account's reader settings (`settings.family`), so there's still no database change.
Removing a profile removes its reading.

## Phase 3: later

- First words (0–4): picture books read aloud, words lit up, a word spoken when a picture is tapped.
- Schools and teams: reading lists, class progress, teacher view.
- Synced natural-voice narration with word timings (needs timings from the narration worker).
- Multi-voice narration (a voice per character).

## Choices and limits

- We say "Bold word starts", not the name of any trademarked method, and we don't name competitors on the site.
- Word highlighting depends on the browser reporting word boundaries. Chrome on Android often doesn't report
  them for Google voices: the sentence still lights up.
- The speed check measures speed only. Understanding is checked with the chapter quiz.
- Pricing stays as it is. The brief's Pro and Family plans are not introduced.
