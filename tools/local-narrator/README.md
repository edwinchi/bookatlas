# BooksAtlas local narrator (free Kokoro voice)

Records a BooksAtlas audiobook on your own computer with [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) (open source, Apache-2.0).

- No tokens, no Google account, no cost.
- Each recorded part is uploaded to booksatlas.app.
- When the last part is uploaded, the audiobook goes live as usual.

## One-time setup

1. Create one random token and put the same value in two places:
   - `.env.local` at the repository root, as a line `NARRATION_WORKER_TOKEN=<token>`;
   - Vercel → bookatlas → Settings → Environment Variables → `NARRATION_WORKER_TOKEN` (Production).
2. Redeploy, so production reads the new variable.
3. In this folder, run `npm install`.
4. Run `npm run sample -- --voice af_heart` and listen to `sample-af_heart.mp3`. The first run downloads the voice model (about 90 MB).

## Narrate a book

1. Order the narration for the book in Publish → Natural audiobook, as an administrator (free).
2. Run `npm run list` to see the narration id.
3. Run `npm run narrate -- --narration <id> --voice af_heart`.
   - Add `--from-start` if some parts were already recorded in another voice, so the whole book is in one voice.
   - `--parts 20` records only 20 parts this run.

Stopping:
- Ctrl+C stops after the current part.
- Run the same command again to continue.
- While this computer holds the narration, the cloud narrator leaves it alone, so the book never gets a second voice.

**Speed:** about 2.5 seconds of work per second of audio while narrating a whole book (a 60,000-word book: about 12–15 hours).

## Audio samples for every book

Run `npm run samples` to record a real audio sample with Kokoro for every English book in the store that doesn't have one yet.

- A sample is the opening of the book, about 45 seconds.
- It is played by the store's "Listen to Audio Sample" button, for everyone.
- Run it again after new books are published.
- A book nobody has recorded is recorded with the cloud voice the first time someone listens, if the Gemini quota allows.

## Voices

| Voice | Description |
|---|---|
| `af_heart` | American, female (the best) |
| `af_bella`, `af_nicole` | American, female |
| `am_michael`, `am_fenrir`, `am_puck` | American, male |
| `bf_emma`, `bf_isabella` | British, female |
| `bm_george`, `bm_fable`, `bm_lewis` | British, male |

Kokoro reads English only. For other languages, use the cloud narrator.

## A voice for every character

Speech in quotes can be read in its own voice, and each named character can have their own.

- `--dialogue-voice bf_emma`: all speech in quotes in this voice. Everything else stays in `--voice`.
- `--cast "Kofi=am_michael,Lina=bf_isabella"`: a line goes to its speaker when the text names them next to the quote, as in “…,” said Kofi or Lina asked, “…”. Lines with no named speaker use the dialogue voice, or the narrator's voice if there is none.

Example:

```
npm run narrate -- --narration <id> --voice af_heart --dialogue-voice bf_emma --cast "Kofi=am_michael,Lina=bf_isabella" --from-start
```

- **Try it first:** run `npm run sample` with the same `--voice`, `--dialogue-voice` and `--cast` options, plus `--text "“Look!” said Kofi. Lina laughed."`, and listen to the sample.
- **Pauses:** these stay as before, so the reader still lights up the words in time with the narration.
