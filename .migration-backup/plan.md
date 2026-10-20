# Bookatlas — Live Deployment Test Plan

Checklist for verifying a deployed instance of Bookatlas actually works end to end. Run section 1 first — most later failures trace back to a missing/misconfigured env var. Re-run the whole plan after any change to `server.ts`, `db/`, or `ai/`.

---

## 1. Pre-Deployment Environment Checklist

- [ ] `npm run lint` passes with 0 errors
- [ ] `npm run build` succeeds (produces `dist/` and `dist/server.cjs`)
- [ ] On the hosting platform (Vercel), these env vars are set:
  - [ ] `OPENROUTER_API_KEY` — primary AI provider
  - [ ] `OPENROUTER_MODEL` — defaults to a free-tier model if unset; confirm it's still listed at [openrouter.ai/models](https://openrouter.ai/models) (free models get retired without notice)
  - [ ] `GEMINI_API_KEY` — optional; only needed for video generation, Google Search grounding, TTS, and multimodal image analysis (OpenRouter can't do these)
  - [ ] `APP_URL` — **must equal the real deployed domain.** Campaign CTA links and 1-click unsubscribe links are built from this; wrong value = broken links in every email
  - [ ] `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — optional; app runs fully in-memory without them
  - [ ] `UNSUBSCRIBE_TOKEN_SECRET` — **set a real random value in production.** The default in `.env.example` is public (it's committed to the repo)
- [ ] `.env` is not committed to git (`git ls-files | grep -x .env` returns nothing)
- [ ] If Supabase is in use: `db/schema.sql` has been run in the Supabase SQL Editor for this project — confirm the `books`, `categories`, `subscribers`, `campaigns`, `registered_users` tables exist (Table Editor in the dashboard)

---

## 2. Build & Deploy Sanity

- [ ] Vercel deployment completes without errors
- [ ] Deployed homepage returns 200 with no browser console errors
- [ ] All static assets load (no 404s in Network tab)
- [ ] `/api/health` (or any `/api/*` route) responds — confirms the serverless function is wired, not just the static frontend
- [ ] Cold-start latency after a period of inactivity is acceptable (first request post-idle)
- [ ] Check deploy logs for the two startup diagnostic lines this app prints — confirm they say what you expect:
  - `[db] Supabase persistence enabled` or `[db] Supabase not configured — running in-memory only`
  - `[ai] OpenRouter enabled (model: ...)` or `[ai] OpenRouter not configured — ...`

---

## 3. Storefront & Catalog

- [ ] Homepage hero carousel and featured books render
- [ ] Catalog grid shows correct pricing, ratings, cover images for all books
- [ ] Filter sidebar: genre, format, price bracket, minimum rating, Bookatlas Plus — each filters correctly
- [ ] Search returns relevant results
- [ ] Book detail modal: synopsis, reviews, sample chapters, AI summary tab all open
- [ ] Add to cart, cart drawer, quantity/format toggle all work
- [ ] Promo code `BOOKATLAS20` (or `READMORE`) applies a 20% discount
- [ ] Checkout simulation completes without error

## 4. eReader

- [ ] Sample chapters open and render
- [ ] Font size, font family, and theme (day/sepia/night/mint/black OLED) all change and persist across a reload
- [ ] Text highlighting and margin notes save correctly
- [ ] Reading progress % updates and appears in My Library

## 5. Audiobook Player

- [ ] Dock appears and plays audio samples
- [ ] Speed controls (0.75×–2.0×) work
- [ ] Sleep timer functions
- [ ] Chapter skip/scrub works

## 6. Subscriber & Campaign Engine

- [ ] CSV validate-csv: upload a sample file, confirm valid/invalid/duplicate counts in the preview are correct
- [ ] CSV upload also accepts `.txt` files, not just `.csv`
- [ ] CSV upload-csv: commit an import, confirm new/updated/preserved-unsubscribed counts match reality
- [ ] Benchmark generator: both the 10k and 100k one-click buttons complete quickly (well under the 2000ms-per-100k budget from `AGENTS.md`) and the audience total updates
- [ ] Audience Directory: search, status filter (subscribed/unsubscribed), and tag filter all narrow results correctly
- [ ] Single subscriber add and status toggle work
- [ ] "Export CSV" downloads a valid, correctly-formatted file
- [ ] List hygiene engine: run with each checkbox combination (bounced/unsubscribed/inactive-90-day/syntax-fix), confirm the report's pruned counts add up to the actual audience delta
- [ ] Visual Template Designer: all 5 presets load; clicking a placeholder copies it; desktop/mobile preview toggle changes the render
- [ ] Campaign composer: subject, preheader, sender name, CTA text/link, book selector all editable
- [ ] "Gemini AI Polish" button populates subject/preview/body from a real call — check the Network tab response for `"aiGenerated": true` when a provider key is configured, and confirm it degrades to pre-written copy (`"aiGenerated": false`) with no key
- [ ] A/B test toggle: split-percentage slider works; both variant subject/preheader fields are independently editable
- [ ] Send campaign: recipient count matches the chosen target filter (all/VIP/members/free/custom tag); response includes per-variant analytics when A/B is on
- [ ] Campaign Analytics dashboard: KPI strip, A/B winner comparison, device breakdown, and hourly timeline all render for a real sent campaign
- [ ] Campaign history table lists past campaigns with correct recipient counts and open/click rates

## 7. Unsubscribe / Compliance

- [ ] A real campaign's `{{1_click_unsubscribe_url}}` resolves to an **absolute** URL (`https://your-domain/...`, not a bare `/?action=...` path) — this depends entirely on `APP_URL` being set correctly (section 1)
- [ ] Clicking that link with the correct token successfully unsubscribes
- [ ] Same request with a wrong/tampered token is rejected with 403
- [ ] Manual unsubscribe (typing an email into the Preference Center with no token) still works — this is intentional self-service, not a bug
- [ ] Resubscribe flow works
- [ ] Language toggle renders correct English/Dutch copy
- [ ] After unsubscribing, re-run a campaign send targeting "all active" and confirm that email is excluded from the recipient count

## 8. AI Features

Run this whole block three times — once with `OPENROUTER_API_KEY` set, once with only `GEMINI_API_KEY` set (unset OpenRouter), and once with neither set — to confirm the fallback chain at every level.

- [ ] AI Matchmaker returns relevant, on-topic recommendations (check Network tab: `source: "ai"` vs `"local_heuristic"`)
- [ ] Reader Copilot: explain / summarize / character-intent / vocab-etymology / thematic-analysis actions all produce distinct, relevant output
- [ ] Book Summary (Executive Briefing) generates all fields (takeaways, philosophical question, quotes, similar titles)
- [ ] Deep Dive glossary generates for an arbitrary term
- [ ] Mind Map generates 4 nodes + takeaways
- [ ] Pronunciation guide generates phonetic + IPA output
- [ ] Interactive Literary Assistant chat holds a coherent multi-turn conversation
- [ ] Live Voice Companion responds with spoken text (browser TTS should speak the returned text)
- [ ] Marketing Kit generator produces newsletter/social thread/discussion questions for a selected book
- [ ] Book translation produces translated title/synopsis/chapters in the target language
- [ ] **No AI endpoint ever returns a raw 500 or crashes** when keys are missing/invalid — every one degrades to a clean, usable fallback response
- [ ] Repeating an identical AI request within ~15 minutes returns near-instantly (cache hit — compare response time to the first call)

Gemini-exclusive features (no OpenRouter equivalent — verify these specifically degrade gracefully without a Gemini key, since they can't fall through to OpenRouter):
- [ ] Market Radar (uses Google Search grounding)
- [ ] Multimodal Publishing Studio (image/document OCR analysis)
- [ ] TTS narration
- [ ] Veo Video Animator

## 9. Manager Portal

- [ ] Admin PIN/password gate blocks entry without credentials
- [ ] Inventory manager: add/edit/delete a book, confirm it reflects immediately in the public storefront
- [ ] Category create/delete works, including auto-registration of new AI-generated genres
- [ ] Price updates and the Bookatlas Plus toggle work
- [ ] Autopilot toggle flips correctly; simulated stats change over time
- [ ] Audit log shows recent actions with correct timestamps
- [ ] AI book generation creates a real book when a key is configured, falls back to procedural generation without one
- [ ] Batch-generate fills any catalog category that has fewer than 2 titles

## 10. Database Persistence (Supabase)

Only relevant if `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` are configured.

- [ ] Create a book via Manager Portal, restart the server process (or trigger a new Vercel deployment), confirm the book is still there — not reset to the default 24-book seed
- [ ] Same restart-survives check for: a custom category, a manually-added subscriber, a sent campaign
- [ ] Supabase Table Editor: spot-check a few rows in each table for sane data (no null titles/emails, JSONB `data` column parses)
- [ ] Temporarily unset the Supabase env vars and confirm the app still runs fully in-memory with zero errors (this is the documented fallback — re-verify it against the actual deployed environment, not just local dev)

## 11. Security

- [ ] Search the deployed frontend's JS bundle (View Source / Network tab, not just grep locally) for `OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — none should ever appear client-side
- [ ] `https://your-domain/.env` returns 404, not file contents
- [ ] Unsubscribe token forgery is rejected in production (re-verify section 7's 403 test against the live URL, not just localhost)
- [ ] Manager Portal routes require the PIN gate even when navigated to directly by URL
- [ ] Rotate `UNSUBSCRIBE_TOKEN_SECRET` away from the public default before handling any real subscriber data

## 12. Performance

- [ ] 100k subscriber benchmark generation completes in well under 2 seconds server-side (check the `processingTimeMs` field in the response)
- [ ] Uploading a large CSV (10k+ rows) completes within Vercel's function duration limit (`vercel.json` currently sets `maxDuration: 60`)
- [ ] Note the main JS bundle is ~1.5MB — acceptable for a demo, but worth revisiting with code-splitting if real-world load time becomes a concern

## 13. Cross-Browser / Responsive

- [ ] Spot-check core flows (browse → cart → checkout, eReader) in Chrome, Firefox, Safari, and Edge
- [ ] Mobile viewport: header collapses to the mobile menu; cart drawer, modals, and the audiobook dock remain usable
- [ ] eReader and audiobook dock don't break at narrow viewport widths

## 14. Rollback & Monitoring

- [ ] Know how to roll back a bad deploy (Vercel: promote the previous deployment)
- [ ] Know where to find server logs post-deploy (Vercel → Project → Deployments → Function Logs) to see the `[db]`/`[ai]` startup lines and any `console.error` output from failed AI/DB calls
- [ ] Periodically check OpenRouter's usage dashboard — free-tier models can be rate-limited, and it's worth confirming actual spend is $0 as intended
- [ ] If `OPENROUTER_MODEL`'s free tier gets retired, the app keeps running (falls to Gemini or local heuristics) but AI quality degrades silently — worth an occasional manual check that `source: "ai"` still appears in AI responses, not just `"fallback"`
