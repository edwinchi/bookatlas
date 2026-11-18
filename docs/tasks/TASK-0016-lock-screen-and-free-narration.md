# TASK-0016: Audiobook lock-screen controls, why the natural voice, and free-tier narration that continues by itself

**Date:** 2026-11-16 · **Status:** built, tested

## Lock-screen and headphone controls (reader)

- `reader/mediaSession.ts` sets the Media Session for the natural audiobook:
  - chapter title, author, book and cover;
  - play, pause, stop, next and previous chapter, and skip back 10 s / forward 30 s.
- The reader now has **Pause / Resume listening** and **Stop** for the natural voice. A pause from the lock screen or headphones keeps the position.
- The next **two** parts are downloaded ahead, so the switch to the next part needs no network.
- Fixed a bug: a pause in the instant a part was starting stopped listening altogether (play() aborted). Only a real failure stops it now.

### What was tested and what was not

- `tests/browser/narration-background.test.mjs` (mocked book and audio, no account) checks that:
  - parts play one after another without input, and still play with the browser offline once the next parts are loaded;
  - the lock-screen title follows the chapter;
  - pause and resume keep the position;
  - next chapter and stop work.
- Playwright reports every tab as visible, so a **locked phone cannot be tested here**.
- Check on a real phone before using "keeps playing with your screen off" in ads:
  1. Open a narrated book on booksatlas.app in Safari (iPhone) or Chrome (Android).
  2. Tap Listen, then lock the phone. It should keep playing past the end of a part (about 80 s) into the next one.
  3. The lock screen should show the chapter, the cover and the buttons. Try pause, play and next.
  4. Repeat with another app in front.

## Why the natural voice (readers) and price advice (authors)

- `ebook/NaturalVoiceInfo.tsx` ("Why the natural voice?") is shown with the audiobook add-on in the store and in the reader. It gives three reasons, each one the reader can check:
  - it keeps playing with the screen off, with lock-screen controls;
  - it is the same voice on every device, chosen by the author;
  - the reader can hear the preview first.
- The device voice is never blocked. It stays free on every book the reader can read, and the panel says so, because it is also an accessibility feature.
- The reader's upsell reads "Whole audiobook in a natural voice: €X · keeps playing with your screen off".
- Authors (`AudiobookSale.tsx`) see the suggestion **€2–5**, with the reason. "Include it with the eBook" says that including it gives readers one more reason to buy.

## Free-tier narration that continues by itself (owner request)

- Before this, a Gemini quota error (free tier: about 10 requests a day) set the narration to *failed*, and someone had to press Resume.
- Now:
  - **Waiting:** the narration stays *running* and holds its lease until Google's limit resets. It uses Google's own "retry in 17h58m…" plus a margin; without that, 1 minute (per-minute limit) or 08:10 UTC (daily limit; Gemini resets at midnight Pacific).
  - **Per-minute limits:** the step route waits up to 45 s and continues. After 5 per-minute hits on one part it waits for the daily reset.
  - **Daily limits:** Vercel Cron (`vercel.json`, 08:15 UTC daily) calls `GET /api/internal/narration/cron`. That restarts every narration whose wait is over, plus older quota pauses from before this change.
  - **Messages:** authors and administrators see an amber "continues by itself at about … UTC" note instead of an error.
- **The cron secret:**
  - When `CRON_SECRET` is set, it is required (Vercel then sends it as a bearer token).
  - Without it, the endpoint is open, rate-limited to 5 calls a minute. It only starts narrations that are due, never spends beyond an approved budget, and is safe to call.
- Test: `tests/e2e/narration.test.ts` (wait, no early requests, cron, the old-style pause, finishing).

### Narrating without paying for tokens

| Option | Cost | Speed | What it needs |
|---|---|---|---|
| Gemini free tier (now automatic) | €0 | about 10 parts (about 12,000 characters, about 2,000 words) a day, so a 60,000-word book takes about a month | nothing more |
| Google Cloud Text-to-Speech, Chirp 3 HD (already built in: `GOOGLE_TTS_API_KEY`) | €0 up to 1,000,000 characters a month; the code stops at 950,000 | a whole book in a few hours, with the same Sulafat and Charon voices | a Google Cloud project with a billing account attached (free-tier use is not charged) and the Text-to-Speech API key in Vercel |
| Open-source voice (e.g. Kokoro, Piper) run on the owner's computer | €0, no account | depends on the computer | a local script that uploads the parts; different voices; built, see below |

## Built after that: the local Kokoro narrator (owner request 2026-11-16)

**What it is:**
- `tools/local-narrator` is a standalone tool, deliberately not part of the pnpm workspace, so Vercel never installs it. See its README.
- It records each part on the owner's computer with Kokoro-82M (Apache-2.0) and uploads it to production through `/api/internal/narration/local` (`narration/local.ts`).
- The API uses the `NARRATION_WORKER_TOKEN` bearer token, and it is rate-limited.

**One voice per book:**
- While the computer holds the narration (a `local:` lease) or any part is Kokoro, cloud steps and the daily schedule skip the book.
- Continuing over parts recorded in another voice needs `--from-start`.
- Readers and the store see the Kokoro voice name, for example "Heart (BooksAtlas natural voice)".

**Measured:** on an 8-core PC, 53 s of audio took 85 s to record.

**Test:** `tests/e2e/narration.test.ts` ("the free local Kokoro narrator").

**Not usable here:** Google Cloud's free Chirp voices refuse the AI Studio Gemini key ("API keys are not supported by this API"). They would need a Google Cloud service account.
