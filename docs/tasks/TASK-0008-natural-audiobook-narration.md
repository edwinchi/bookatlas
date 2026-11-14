# TASK-0008: Natural audiobook narration (Gemini) as an author add-on

| Field | Value |
|---|---|
| Objective | Replace the robotic device voice with a natural Gemini narration that authors add to their published eBook, generated once per book and streamed to every reader |
| Source brief | Owner, 2026-11-14: "use gemini for audio book, the current one sounds like a robot voice"; "provide a description of these services as well, use tailwind and radix for GUI" |
| Approval level | Spending and payments: owner decisions below. Production deploys: owner sign-off per release |
| Status | ⏳ Built and tested on the working branch; needs `migrations-2026-11-15-narrations.sql`, `GEMINI_API_KEY` in Vercel and the owner's deploy sign-off |

## Owner decisions (2026-11-14)

| # | Question | Decision |
|---|---|---|
| N1 | Generate once vs browser speech | **Generate once with Gemini TTS**; the device voice stays only as a labelled free fallback for books without narration |
| N2 | Who pays | **Author add-on**: the author orders and pays; an administrator approves before any Gemini spending |
| N3 | Voice | **Author chooses per book** after hearing a short sample: Sulafat (warm, female) or Charon (informative, male) |
| N4 | Price | Revised 2026-11-14 to **length-based**: €24.99 incl. 21% VAT up to 60,000 narrated words (about 220 pages), +€3.99 per extra 10,000 (80,000 words €32.97, 96,000 €40.95, 110,000 €44.94). Narration is a service: Dutch VAT 21%, not the 9% e-book rate. Margin after VAT, Stripe and Gemini: about €13–18 for 80,000–110,000 words |
| N7 | Free tiers | Owner 2026-11-15: **Google Cloud TTS Chirp 3 HD free tier first** (1,000,000 characters a month; BooksAtlas uses up to 950,000), same Sulafat/Charon voices, English, Dutch, French, German, Spanish and Portuguese; then paid Gemini. Gemini TTS has no free tier. Free segments cost nothing against the approved budget. Needs `GOOGLE_TTS_API_KEY` (Cloud Text-to-Speech API enabled on a project with billing) |
| N6 | Code and tables | **Not read aloud**: one spoken cue per code listing or table run; their words are not charged. Diagrams and screenshots are not narrated |
| N5 | Order | Narration first, then reader reviews, ratings and author pages |

## Cost

Gemini TTS is budgeted in the code at US$18 per million audio output tokens (25 tokens per second of audio) plus US$1 per million input tokens, with a 50% safety margin for reservations. A 55,000-word book is about 6 hours of audio: about 540,000 audio tokens, about US$10. The free Gemini tier is too small for whole books.

## Design (serverless-safe)

booksatlas.app runs on Vercel functions (60 s per request, nothing runs between requests), so narration is processed in **small steps**:

- The book is split into **segments** of whole paragraphs from one chapter, about 1,200 characters (about 80 s of audio) each. Each step narrates one segment within its reserved budget, encodes it to MP3 (64 kbps mono, about 0.6 MB per segment; a 6-hour book is about 170 MB instead of about 1 GB of WAV) and stores it in Supabase Storage.
- Steps chain themselves: after a step finishes, the function triggers the next one (kept alive with Vercel `waitUntil`). A lease prevents two steps running for the same book. If the chain stops, the author's or administrator's status view resumes it (expired lease) and an administrator can press Resume.
- Every segment records its paragraphs, so the reader highlights exactly the paragraph being heard.
- Voice samples: one fixed sample text per voice, generated once on first request and cached (two tiny requests in total).

## Flow

1. Author (published book) opens "Add a natural audiobook": description, length and price estimate, voice samples, choice.
2. Payment through Stripe Checkout (service, 21% VAT) and an invoice.
3. Administrator sees the paid order with the Gemini cost estimate and approves; nothing is spent before approval.
4. Narration runs segment by segment; progress is visible to the author and administrator.
5. When complete, the book's page says "Natural audiobook"; "Listen to the book" plays the narration, chapter by chapter, with paragraph highlighting. Buyers of the eBook hear the whole book; everyone hears the preview part.

## Progress

| Step | Status |
|---|---|
| Services descriptions on the publishing page (Tailwind, Radix) | ✅ `ServicesOverview` (Radix Accordion) |
| Voice samples | ✅ cached per voice in storage (`narrations/samples/`) |
| Order, payment, invoice | ✅ Stripe Checkout `kind: narration`, invoice scheme `nl-service` (21%) |
| Admin approval | ✅ `NarrationQueue`: approve (shows estimate), decline with full refund, resume |
| Segmented narration with self-chaining steps | ✅ `narration/service.ts` step + lease, `waitUntil` chain, stalled-chain recovery, 3 attempts per segment, budget cap 1.5 × estimate |
| Reader playback with paragraph highlighting | ✅ `EReaderModal` plays MP3 segments, highlights by paragraph length; device voice labelled |
