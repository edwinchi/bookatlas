# BooksAtlas administrator guide

How to run BooksAtlas day to day. Administrators see a short version of this guide on the **Publish** page ("Administrator guide").

## 1. Your daily check (5 minutes)

Open **Publish** while signed in as an administrator and work through it from top to bottom:

1. **All submissions:** open each new eBook and check its readiness report. Then press Publish, or send the author feedback.
2. **Natural audiobook orders:** approve paid orders, usually within 2 working days. An amber note means a narration is waiting for Google's free daily limit. It continues by itself.
3. **Reported reader notes and group posts:** three reports from different readers hide an item automatically. Restore it if it is fine, or keep it hidden.
4. **Store feedback:** what readers and authors told you.
5. **Book enquiries** (top of the Publish page): messages from “Start my book” and the contact buttons. Reply by email (the button fills in the subject), then press *Mark answered*. Enquiries are deleted after 12 months. A link to `booksatlas.app/#start-book` opens the form directly, for adverts and emails.

## 2. Narrate a book for free on your computer (Kokoro)

Kokoro-82M is a free, open-source voice (Apache-2.0) that runs on your own PC.

- No tokens, no Google account, no cost.
- Each part is uploaded as soon as it is recorded, and the audiobook goes live when the last part arrives.
- It reads English only. Other languages use the cloud narrator.

**Once per book:**

1. Order the narration in **Publish → Natural audiobook**. It is free for administrators.
2. In Git Bash:

   ```bash
   cd /c/projects/bookatlas/tools/local-narrator
   npm run list                                              # shows the narration id
   npm run narrate -- --narration <id> --voice af_heart      # start or continue
   ```

3. If some parts were already recorded in another voice (for example by the cloud narrator), add `--from-start` so the whole book has one voice.

**Stopping and continuing:**
- Ctrl+C stops after the current part. Run the same command again to continue.
- After a PC restart, just run it again.
- While your PC holds the book, the cloud narrator and the daily schedule leave it alone, so a book never gets two voices.

**Running it in the background,** so you can close the window:

```powershell
$dir = "C:\projects\bookatlas\tools\local-narrator"
Start-Process "C:\Program Files\nodejs\node.exe" -ArgumentList "narrate.mjs","--narration","<id>","--voice","af_heart" -WorkingDirectory $dir -RedirectStandardOutput "$dir\narration.log" -RedirectStandardError "$dir\narration-errors.log" -WindowStyle Hidden
```

Progress is written to `tools/local-narrator/narration.log`.

**Speed:** about 2.5 seconds of work per second of audio, measured on SCROLL OF SOVEREIGNTY. A 60,000-word book takes about 12–15 hours, and a 270,000-word book about 2½ days. Leave the PC on and plugged in.

**Voices:**

| Voice | Description |
|---|---|
| `af_heart` | American, female (the best) |
| `af_bella`, `af_nicole` | American, female |
| `am_michael`, `am_fenrir`, `am_puck` | American, male |
| `bf_emma`, `bf_isabella` | British, female |
| `bm_george`, `bm_fable`, `bm_lewis` | British, male |

To hear a voice first, run `npm run sample -- --voice bm_george`. It writes `sample-bm_george.mp3`.

**First-time setup (already done on this PC):**
1. In `tools/local-narrator`, run `npm install`.
2. Put `NARRATION_WORKER_TOKEN` in `.env.local` and in Vercel, with the same value (see section 7).
3. The first run downloads the voice model, about 90 MB.

## 3. Audio samples for every book

Every book has a **Listen to Audio Sample** button for everyone, signed in or not.
- It plays the opening of the book, about 45 seconds.
- Narrated books use their own first recorded part.
- Sample titles in the demo catalogue use their sample chapter.

**After publishing new books,** record their samples for free:

```bash
cd /c/projects/bookatlas/tools/local-narrator
npm run samples
```

A book nobody has recorded yet is recorded with the cloud voice the first time someone listens, as long as Google's free quota lasts. When the quota is used up, the player says "being prepared". Running `npm run samples` fixes that.

## 4. Cloud narration (Gemini) and the daily schedule

Paid author orders are narrated in the cloud with the **Sulafat** or **Charon** voice.

On Google's free tier (10 requests a day), a narration waits for the limit to reset and then continues by itself:
- **Per-minute limit:** it continues within the minute.
- **Daily limit:** it continues the next day. The daily schedule runs at 08:15 UTC (Vercel Cron, protected by `CRON_SECRET`).

What you do:
- **Usually nothing.** The amber note shows when it continues.
- **To finish faster,** turn on billing for the Gemini key: aistudio.google.com → API keys → Set up billing. Every part is then charged. The Gemini key in `.env.local` is also on the free tier (checked 2026-11-17).
- **A narration that stopped for another reason** shows **Resume narration**. Press it once the cause is fixed.

Google Cloud's free Chirp voices do not accept the AI Studio key. They would need a Google Cloud service account.

## 5. Selling the audiobook

When a narration is done, the author chooses in **Publish → Natural audiobook**:
- **Include it with the eBook:** every eBook buyer can listen to the whole audiobook. This gives readers one more reason to buy.
- **Sell it as an add-on:** readers buy the eBook, then add the audiobook. Everyone hears a free narrated preview. Readers who bought the eBook before the add-on price was set keep the whole audiobook.

Advice for authors:
- **Price:** suggest €2–5. Readers know it is an AI voice, so a small add-on sells better than studio prices.
- **Device voice:** reading along with the device's own voice always stays free. It is an accessibility feature (low vision, dyslexia).
- **Phone check before advertising.** Do this before using "keeps playing with your screen off" in ads:
  1. Open a narrated book on a phone (Safari on iPhone, Chrome on Android).
  2. Tap Listen, then lock the phone.
  3. After about 2 minutes it should still be playing, now in the next part.
  4. On the lock screen, try pause, play and next.

The lock-screen controls themselves are tested in a desktop browser (`tests/browser/narration-background.test.mjs`).

## 6. The reader and the listening player

What readers get, so you can answer their questions:

- **Pages or scroll:** the reader shows real pages, two side by side on wide screens. Readers turn them with a swipe, a tap at the side or the arrow keys. A tap in the middle hides the toolbars.
- **Reading preferences** (the **T** button):
  - **Text:** font, size, line spacing, margins, left or justified.
  - **Page:** pages or scroll, two pages, the tap setting, brightness.
  - **Colours:** five themes, or any background and text colour.
- **Contents** lists every chapter with its reading time. **Go to** (the page number at the bottom left) opens a page or any place in the book.
- **Listening** (the headphones button or *Listen to the book*) opens a pop-up player:
  - play and pause, stop;
  - back and forward (15 seconds for a narration, a paragraph for the device voice);
  - previous and next chapter;
  - speed from 0.5x to 3x;
  - **Voice & language**, where each language card plays a sample.
- **Other languages:**
  - The device voice can read the book in another language, translating each paragraph first.
  - Chrome on a computer translates on the device for free. Elsewhere BooksAtlas's AI translator is used: the reader must be signed in, and it counts towards their 40 AI requests a day.
  - Only languages the device has a voice for are offered.
- A recorded natural narration always plays in the book's own language. Choosing another language switches to the device voice.
- **Emotion:** the cloud studio voices (Sulafat, Charon) are told to let the emotion of each passage colour the delivery. Kokoro recordings made on your PC read evenly and do not follow that instruction.

## 7. Read smarter (Reading Intelligence)

**Read smarter** in the site menu opens `/reading-intelligence`. Everything there is free for readers. The plan and the
file for each feature are in `docs/planning/reading-intelligence.md`.

**What readers get:**
- **Fast Read and the speed check:** one word at a time at a chosen speed, and a 1-minute test of words per minute.
- **Reading aids** (in the reader's **T** button → Aids): bold word starts, a reading guide, one paragraph in focus, the spoken word lit up, and fonts for dyslexia.
- **AI help:** summaries in three lengths, and "explain this" for a child, a student or a professional. These count towards the 40 AI requests a day.
- **Your own text:** paste an article or open a PDF or EPUB to Fast Read it.
- **My progress:** reading time, streak, daily goal, the week against the goal, books finished, speed and favourite reading hours.
- **Family reading:** up to 6 profiles. The reader picks who is reading, and each profile has its own minutes, streak, stars and quizzes.
- **Comprehension checkpoints** (in the reader, signed-in readers of the full book): four quick questions at a chapter end, every 1,000 words or every 10 minutes (the reader chooses in the reader settings (the T button) → Aids, or turns them off) and from the reading assistant's Study tab. Each one uses one AI request of the reader's daily 40. Scores show under My progress as an average with a band (excellent 90+, good 75+, fair 60+, needs improvement).
- **Young readers** (`/reading-intelligence/young-readers`):
  - First words (with a Shapes group drawn as geometry symbols), picture books, 99 stories with questions (33 at each of the three levels: everyday, bedtime, maths and science; a filter picks the kind; maths and science stories show their shapes and symbols), a tick on each one a child finished, letter sounds and word games.
  - Available in English, French, Spanish, Portuguese and Dutch, each with a recorded natural voice and every word lit up.
  - No account needed.
- **Schools and teams:**
  - A teacher or team lead makes a class, shares the 8-letter invite code and sets the reading list with due dates.
  - They set quizzes made from a chapter, and see each member's progress, minutes this week and quiz scores.
  - **Report** downloads a CSV or PDF covering up to 26 weeks.
  - The reading list can also hold **children's stories** (the picker's Children's stories tab). A child who answers a story's questions while signed in shows ✓ and the score.
  - When you add a story to Young readers, also add it to `artifacts/api-server/src/bookatlas/reader/youngStories.ts`. A test checks that both lists match.

**Database (once):** schools and teams need two SQL files, run in this order in the Supabase SQL editor:
1. `artifacts/api-server/src/bookatlas/db/migrations-2026-11-25-reading-classes.sql` (the classes)
2. `artifacts/api-server/src/bookatlas/db/migrations-2026-11-25-class-assignments.sql` (due dates and quizzes)

Until they have run, schools and teams say "not available right now" or "not switched on yet". Everything else works.

**Reading e-mails:**
- Readers can switch on a **weekly summary** (Sundays) and a **streak reminder** (an evening when a streak of 2+ days would break) under My progress. Both are off by default.
- A daily Vercel cron at 17:00 UTC sends them (`/api/internal/reader/digest`, protected by `CRON_SECRET`).
- They need `RESEND_API_KEY` and `EMAIL_FROM` in Vercel (section 8). Until then, the reader's choice is saved and nothing is sent.
- Every e-mail has a one-click link that stops both.

**Schools and privacy:**
- Members are told when they join that the teacher sees their progress on the class books and their reading time.
- Names show as first name and initial.
- A member can leave at any time. When the teacher closes the class, its list, quizzes and scores are deleted.
- Class quizzes are written by the AI from the chapter, and the teacher chooses which questions to keep. It uses one of the teacher's 40 AI requests.

**Re-recording the children's voices** after a text in `artifacts/bookatlas/src/components/reading/` changes. Only new or changed texts are recorded:

```bash
cd /c/projects/bookatlas/tools/local-narrator
npm run young                  # English (Kokoro), about 35 minutes for everything
npm run young -- --lang fr     # French (Piper); also es, pt, nl. About 2 minutes each
```

Then deploy, so the new clips in `artifacts/bookatlas/public/audio/young/` go live.
- English uses Kokoro (`af_heart`).
- The other languages use Piper: `fr_FR-siwis`, `es_ES-davefx`, `pt_PT-tugão` and `nl_BE-nathalie`.
- Piper's program and voices are in `tools/local-narrator/piper/` on this PC and are not in the repository. To set it up on another PC, follow `tools/local-narrator/README.md`.

**Questions readers may ask:**
- *"The words do not light up when the device reads."* Chrome on Android often does not report word positions for Google voices, so only the sentence lights up. The recorded voices (audiobooks and Young readers) always light up each word.
- *"The class says not available."* Run the two SQL files above.
- *"I get no e-mails."* Check that the switches are on under My progress and that Resend is set up. The weekly summary only comes on Sundays.

## 8. Settings and secrets (Vercel)

These settings live in Vercel → bookatlas → Settings → Environment Variables (Production).
- After changing one, redeploy so production reads it.
- Never paste their values in chats, issues or code; the repository is public.

| Variable | What it does |
|---|---|
| `NARRATION_WORKER_TOKEN` | Lets your PC's narrator upload parts and samples. The same value must be in `.env.local`. |
| `CRON_SECRET` | Protects the daily schedules: narration (08:15 UTC) and reading e-mails (17:00 UTC). |
| `GEMINI_API_KEY` | Cloud narration and AI features. It is on the free tier unless billing is turned on. |
| `STRIPE_*`, `CLERK_*`, `SUPABASE_*` | Payments, sign-in and the database. |
| `APP_URL`, `SESSION_SECRET`, `UNSUBSCRIBE_TOKEN_SECRET` | The site address and signing secrets. |
| `RESEND_API_KEY`, `EMAIL_FROM` | Sending e-mail: reading e-mails, new-book e-mails to followers, enquiry notices. Without them nothing is sent. |

**Database changes:** some releases come with a SQL migration in `artifacts/api-server/src/bookatlas/db/`.
- Run it in the Supabase SQL editor before deploying that release.
- Migrations are safe to run twice.

## 9. House rules for the store

- **Reviews and ratings:** only real ones, from readers. Never write or import reviews (EU Omnibus rules).
- **Labels:** "Bestseller" and editorial-review labels are shown only when they are true and sourced.
- **AI content:** AI briefings and summaries are labelled as AI. If one fails, the page says so; it never shows made-up text.
- **Demo catalogue:** sample titles are marked "Sample title · not for sale". Their cart buttons explain that instead of selling.
- **Commission:** authors keep 81% of every sale after VAT; BooksAtlas keeps 19% (since 2026-11-23; sales before then keep 67%/33%). Author Pro: 91%/9%.

## 10. Releases

- Each change is built and tested on the working branch first.
- It reaches booksatlas.app only after the owner says "deploy". Then the branch is pushed to `main` and Vercel publishes it in about a minute.
- **Rollback:** Vercel → Deployments → the previous one → Promote to Production.
