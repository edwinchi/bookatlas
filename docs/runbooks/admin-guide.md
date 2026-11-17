# BooksAtlas administrator guide

How to run BooksAtlas day to day. Administrators see a short version of this guide on the **Publish** page ("Administrator guide").

## 1. Your daily check (5 minutes)

Open **Publish** while signed in as an administrator and work through it from top to bottom:

1. **All submissions:** open each new eBook and check its readiness report. Then press Publish, or send the author feedback.
2. **Natural audiobook orders:** approve paid orders, usually within 2 working days. An amber note means a narration is waiting for Google's free daily limit. It continues by itself.
3. **Reported reader notes and group posts:** three reports from different readers hide an item automatically. Restore it if it is fine, or keep it hidden.
4. **Store feedback:** what readers and authors told you.

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

## 7. Settings and secrets (Vercel)

These settings live in Vercel → bookatlas → Settings → Environment Variables (Production).
- After changing one, redeploy so production reads it.
- Never paste their values in chats, issues or code; the repository is public.

| Variable | What it does |
|---|---|
| `NARRATION_WORKER_TOKEN` | Lets your PC's narrator upload parts and samples. The same value must be in `.env.local`. |
| `CRON_SECRET` | Protects the daily narration schedule. |
| `GEMINI_API_KEY` | Cloud narration and AI features. It is on the free tier unless billing is turned on. |
| `STRIPE_*`, `CLERK_*`, `SUPABASE_*` | Payments, sign-in and the database. |
| `APP_URL`, `SESSION_SECRET`, `UNSUBSCRIBE_TOKEN_SECRET` | The site address and signing secrets. |

**Database changes:** some releases come with a SQL migration in `artifacts/api-server/src/bookatlas/db/`.
- Run it in the Supabase SQL editor before deploying that release.
- Migrations are safe to run twice.

## 8. House rules for the store

- **Reviews and ratings:** only real ones, from readers. Never write or import reviews (EU Omnibus rules).
- **Labels:** "Bestseller" and editorial-review labels are shown only when they are true and sourced.
- **AI content:** AI briefings and summaries are labelled as AI. If one fails, the page says so; it never shows made-up text.
- **Demo catalogue:** sample titles are marked "Sample title · not for sale". Their cart buttons explain that instead of selling.
- **Commission:** authors keep 67% of every sale after VAT; BooksAtlas keeps 33%.

## 9. Releases

- Each change is built and tested on the working branch first.
- It reaches booksatlas.app only after the owner says "deploy". Then the branch is pushed to `main` and Vercel publishes it in about a minute.
- **Rollback:** Vercel → Deployments → the previous one → Promote to Production.
