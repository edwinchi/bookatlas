# TASK-0013: BooksAtlas Reader, Phase 2: AI reading assistant (cycle 8)

Source: `bookatlascode_ebook_reader.md` Phase 2 (AI chat with book, flashcards, translation; TTS and reading analytics already exist).

## What readers get (toolbar: graduation cap; or select text)

- **Ask the book**: questions answered only from excerpts of the text the reader may read (preview, or the whole book once bought). Answers cite excerpts as [1], [2]; tapping one jumps to the paragraph. Follow-up questions keep the last 6 turns. No spoilers beyond the reader's chapter unless asked.
- **Study** a chapter: summary with takeaways, key concepts, flashcards (flip, "I know it"), multiple-choice quiz with score. Cached per book, chapter and access, so the second reader costs nothing.
- **Selection toolbar**: Define (word or short phrase: pronunciation, part of speech, definitions, synonyms, example, origin; spoken with the device voice), Explain, Simplify, Translate (41 languages incl. Dutch, Yoruba, Igbo, Hausa, Swahili, Nigerian Pidgin).
- Labelled "Made by AI; it can make mistakes".

## Rules

- Signed-in readers only; `DAILY_AI_LIMIT` = 40 requests per reader per UTC day (failed requests do not count), plus 30 requests a minute per IP. The counter is per server instance (resets on cold start); move it to the database if abuse appears.
- Explain, translate and define only accept text found in the reader's readable chapters (no free translation service, no leaking of paid chapters).
- Retrieval: BM25 over 3-paragraph windows (no embeddings service, no extra cost).
- Uses the app's existing OpenRouter, then Gemini (`GEMINI_API_KEY`) text generation.
- Honesty fix: the old "AI Co-Pilot" returned invented analysis when the AI failed (server and browser). It now says the assistant is unavailable.

## Checks

`tests/e2e/reader-ai.test.ts` (fake AI): sources and citations, the model only sees excerpts, study JSON validation and cache, text-from-the-book check, define, translate, honest error without an answer, the daily limit. `tier1-features` F8-2..F8-4 now assert no invented analysis. Browser: selection toolbar, assistant, Escape, phone width.
