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

## Phase 3: built (2026-11-25)

| Brief | Where it lives |
|---|---|
| First words (0–4): animals, colours, food, family, nature, vehicles | Young readers → First words (`FirstWordsPanel.tsx`, `firstWords.ts`): tap a picture to hear its word |
| Picture books read aloud with each word lit up | Three original picture books, page by page |
| Object recognition | "Find it": the word is said, and the child taps the right one of four pictures |
| Progress for the youngest | Words heard, right pictures, listening time (per reader, on the device) |
| Narration that lights up each word | `reader/narrationSync.ts`: word timings worked out from the text, the narrator's pauses and the audio length; works on every recorded audiobook |
| A voice for every character | `tools/local-narrator/voices.mjs`: `--dialogue-voice` and `--cast "Name=voice"` (see the narrator README) |
| Schools and teams: reading lists, class progress, teacher view | `reader/classes.ts`, `/api/reader/classes…`, `SchoolsSection.tsx` |

**Database:** schools and teams need two new tables. Run
`artifacts/api-server/src/bookatlas/db/migrations-2026-11-25-reading-classes.sql` once in the Supabase SQL editor.
Until then, the schools section says it is not available, and everything else works.

## Phase 4: built (2026-11-25)

| Brief | Where it lives |
|---|---|
| Natural voice for children's stories and picture books | `tools/local-narrator` `npm run young` records every Young readers text with Kokoro into `public/audio/young` (`clips.json` holds the word timings); `useSpeaker.ts` plays the recording with each word lit up and falls back to the device voice |
| Assignments with due dates | Each book on a class reading list can have a due date; members see "due Fri 5 Dec" or "2 days late", the teacher sees how many have not finished (`classDates.ts`) |
| Class quizzes | The teacher picks a chapter, the AI writes questions, the teacher keeps the good ones and sets a date (`ClassQuizzes.tsx`). Members answer once, without seeing the answers first; the server scores it; the teacher sees every score and the average |

**Database:** due dates and quizzes need three new columns. Run
`artifacts/api-server/src/bookatlas/db/migrations-2026-11-25-class-assignments.sql` once in the Supabase SQL editor,
after the phase 3 file. Until then, reading lists still work and due dates and quizzes say they are not switched on.

## Phase 5: built (2026-11-25)

| Owner request | Where it lives |
|---|---|
| Teacher reports | Schools and teams → a class → Report: reading minutes per week (4 to 26 weeks), progress and quiz scores per member, as CSV or PDF (`/api/reader/classes/:id/report`, `classReport.ts`, `ClassReportDialog.tsx`) |
| Reading goals and streaks | Read smarter → My progress: the week against the daily goal (`GoalsPanel.tsx`) |
| Weekly progress and streak e-mails | Opt-in switches under My progress. A daily Vercel cron (`/api/internal/reader/digest`, 17:00 UTC) sends a streak reminder when a 2+ day streak would break and, on Sunday, the weekly summary with each family profile's week (`reader/digest.ts`). Every e-mail has a one-click unsubscribe link. Needs `RESEND_API_KEY` and `EMAIL_FROM`; without them the choice is saved and nothing is sent |
| Young readers in more languages | French, Spanish, Portuguese and Dutch stories, picture books, first words and game words (`reading/young/*.ts`, `youngLang.ts`), read by the device voice in that language. English keeps the recorded Kokoro voice. Letter sounds stay English phonics |

No database change in phase 5: the e-mail choices live in the reader settings.

## Phase 6: built (2026-11-25)

| Owner request | Where it lives |
|---|---|
| Natural voice in French, Spanish, Portuguese and Dutch | Recorded once with Piper (owner's choice: MIT, open source) on the owner's computer, `npm run young -- --lang fr` (`tools/local-narrator/piper.mjs`), into `public/audio/young/<lang>`. Voices: fr_FR-siwis, es_ES-davefx, pt_PT-tugão, nl_BE-nathalie. `useSpeaker.ts` plays them with each word lit up, like English |
| Letter sounds in each language | `sounds` in `reading/young/*.ts` (letters with a word and a picture, letters that work together, vowel sounds), recorded with the rest |

## Phase 7: built (2026-11-25)

| Owner request | Where it lives |
|---|---|
| More stories per level | Six new stories, two per level (The Little Boat, Market Day, The Brave Little Hen, The Rainy Picnic, The New Girl, Grandma’s Old Clock), in all five languages with recorded voices (`youngReaders.ts`, `reading/young/*.ts`) |
| Story progress | A tick on each story a reader finished and "2 of 4 stories read at this level", kept on the device for each family profile (best score kept) |

The planned phases are complete. Ideas beyond this list come from the owner.

## Choices and limits

- We say "Bold word starts", not the name of any trademarked method, and we don't name competitors on the site.
- Word highlighting depends on the browser reporting word boundaries. Chrome on Android often doesn't report
  them for Google voices: the sentence still lights up.
- The speed check measures speed only. Understanding is checked with the chapter quiz.
- Pricing stays as it is. The brief's Pro and Family plans are not introduced.
