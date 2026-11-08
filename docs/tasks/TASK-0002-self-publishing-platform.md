# TASK-0002: Self-publishing and print-on-demand platform (MVP in 90 days)

| Field | Value |
|---|---|
| Objective | Let independent authors, coaches, educators and small publishers create, publish, sell and distribute printed books and digital products |
| Source brief | "Build a legally distinct self-publishing platform", master prompt v1.0 (pasted 2026-11-08) |
| Priority | High |
| Approval level | **2** (architecture, schema, auth/permissions, payments). Payments go-live and production deploys are **3** |
| Status | **Phase 1: discovery.** Waiting for the owner's answers. No architecture or code until they are in |
| Last updated | 2026-11-08 |

Governance: [agent-governance.md](../governance/agent-governance.md). Builds on [TASK-0001](TASK-0001-user-registration.md) (accounts, consent, data rights, abuse controls).

## Progress

Each section is marked ✅ when complete. ⏳ means in progress, ⬜ not started, ⛔ blocked.

| Phase | Section | Status |
|---|---|---|
| 0 | Codebase baseline and CTO challenges | ✅ Complete (2026-11-08) |
| 1 | Discovery: A Business foundation | ⏳ Tagline and problem accepted. **Open:** domain, mission, vision, customer ranking |
| 1 | Discovery: B Revenue model | ⏳ Agent proposal below (R1–R6). **Owner must confirm or change prices** |
| 1 | Discovery: C MVP scope | ✅ Complete: **Option C**, publishing, marketplace and AI |
| 1 | Discovery: D Products | ✅ Complete: paperback, eBook, one journal format, workbooks; rest future |
| 1 | Discovery: E Countries | ✅ Complete: print to **NL and the EU** at launch; digital worldwide |
| 1 | Discovery: F Printing model | ⏳ API model decided; comparison done (below). **Owner:** open Lulu and Peecho accounts for quotes, then pick |
| 1 | Discovery: G Marketplace | ✅ Complete: author profiles and storefront pages, verified-purchase reviews and ratings, wishlists, reader accounts |
| 1 | Discovery: H Author portal | ✅ Complete: dashboard, sales and royalty reports, basic analytics, AI assistant; affiliates future |
| 1 | Discovery: I AI features | ✅ Complete: five MVP helpers, then cover generator, formatter, proofreader (last); content editor future |
| 1 | Discovery: J Payments | ✅ Complete: Stripe (cards, iDEAL, Apple Pay, Google Pay, Klarna), Stripe Connect payouts, Stripe Tax; PayPal future. **Blocker:** Stripe account for the company |
| 1 | Discovery: K Files | ✅ Complete: print-ready PDF and EPUB with validation and previews; DOCX conversion future |
| 1 | Discovery: L Branding | ✅ Complete: author-first and premium; existing logo, navy `#0B3A9E`, Plus Jakarta Sans, Literata |
| 1 | Discovery: M Compliance | ✅ Complete: GDPR, EU OSS VAT, DSA notice and takedown, WCAG 2.2 AA (EAA), cookie consent only if tracking is added. **Blockers:** VAT number; counsel for author terms |
| 2 | Product requirements document | ⬜ Not started (needs phase 1) |
| 3 | MVP landing page copy | ⬜ Not started |
| 4 | Technical architecture | ⬜ Not started. Build path approved: **extend BookAtlas** |
| 5 | Database design (ERD, schema, migrations, indexes) | ⬜ Not started (Level 2 approval) |
| 6 | API design (OpenAPI) | ⬜ Not started |
| 7 | Security | ⬜ Not started |
| 8 | 90-day build plan | ⬜ Not started |
| 9 | MVP success metrics | ⬜ Not started (targets given in the brief: 100 books, 25 authors, 100 orders, €1,000, 5%+ repeat) |
| 10 | Code generation (database → … → deployment) | ⬜ Not started |

**Legal distinctness.** The brief is inspired by existing self-publishing businesses (the owner earlier pointed to lulu.com). We take general market patterns only: upload, then preview, then price, then publish. No branding, UI, copy, documentation, code or proprietary workflows are copied. Every screen and text is designed fresh in the BookAtlas design system.

---

## Where we start (from the codebase)

| Area | Today | Gap for this brief |
|---|---|---|
| Storefront | Reader store for eBooks and audiobooks, search, categories, wishlist, cart, in-browser reader, PWA | Products are seed or AI-generated; there are no author-owned listings |
| Accounts | Clerk, with reader and admin roles, consent, export and delete (TASK-0001) | No **author** role, author profiles or author portal |
| Publishing | Admin-only "Single Manager Studio" (AI-generated books, publishing jobs) | No author upload of DOCX, PDF or EPUB, no validation, no previews |
| Commerce | Checkout is **simulated** ("checkout is simulated", `server.ts`) | No payments, tax, orders, fulfilment or refunds |
| Print | None | No print-on-demand integration, print specs or shipping |
| Money out | None | No royalty ledger or author payouts |
| Data | Supabase Postgres (`bookatlas_*` tables) via the REST client; `lib/db` Drizzle scaffold unused | Needs a relational commerce schema with migrations |
| Ops | Vercel, Docker, CSP, rate limits, monitoring events, governance | Reusable as is |
| Brand | New logo (B-book and Eye of Horus, navy `#0B3A9E`), Plus Jakarta Sans, Literata and Source Serif | Reusable as is |
| Company | Atlantean Globals Services, KvK 89423496, 8031 DJ Zwolle, NL | Street address and VAT number still missing (needed for invoices) |

## CTO challenges to the brief

1. **Don't rewrite the stack in a 90-day MVP.** The brief names Next.js, NestJS, Prisma, Auth.js, Cloudflare R2, Meilisearch and Railway. BookAtlas already runs React/Vite, Express, Clerk, Supabase Postgres and Vercel, with the security work from TASK-0001 done. A rewrite costs about 4–5 of the 13 weeks before any revenue feature exists. **Recommendation:** extend BookAtlas. Add a migrated relational schema in Supabase Postgres. Use Supabase Storage for files, swappable to R2 later. Use Postgres full-text search until the catalogue passes about 50k titles, then move to Meilisearch. Keep Clerk instead of Auth.js; it already provides MFA and lockout, and its keys are still owed (TASK-0001, F9).
2. **One payment provider at launch.** The company is Dutch, so iDEAL is essential. Stripe covers cards, iDEAL, Apple Pay, Google Pay, Klarna and Bancontact from one integration and one webhook. **Stripe Connect** handles author KYC and payouts, so we never hold authors' money ourselves. **Stripe Tax** handles EU OSS VAT. Add PayPal after launch if buyers ask for it.
3. **Print through an API, not by hand.** Manual fulfilment doesn't scale past about 20 orders a week. Shortlist book-specific print APIs. Check each for formats, unit cost, shipping times and an EU plant:
   - Gelato (named in the brief)
   - Peecho (Amsterdam)
   - Lulu Print API (a supplier relationship, not copying)
   - Bookvault

   Printify is mainly merchandise. IngramSpark is retail distribution, not on-demand per order.
4. **Fewer launch countries.** Each country adds tax, shipping and consumer-law work. **Recommendation:** NL and the EU at launch via OSS, with the UK and US in month 4. Digital products can sell worldwide from day one.
5. **Fewer formats at launch.** Paperback, eBook and one notebook/journal format cover most of the target users (authors, coaches, workbook and journal creators). Hardcover, coil-bound and calendars come after the first 100 orders.
6. **AI is a differentiator, not the MVP.** BookAtlas already has OpenRouter and Gemini wired in. Description, metadata, category and price suggestions are cheap to add. A Launch Readiness Score is a strong onboarding hook. Cover generation and interior formatting are large projects; they come later.
7. **No password column.** With managed identity (Clerk), the database stores a provider user ID, never passwords. The brief's `Users.password` field is dropped by design.
8. **Revenue goal check.** 100 orders bringing in €1,000 means about €10 margin per order. Print markup on a €15 paperback is about €3–5, so the goal also needs paid services (formatting, cover design, ISBN) or a subscription. Section B decides this.

---

## Decisions

| # | Decision | Answer | Date |
|---|---|---|---|
| P1 | Build path | **Extend BookAtlas** (no stack rewrite; R2 and Meilisearch can be swapped in later) | 2026-11-08 |
| P2 | MVP scope | **C**: publishing, marketplace and AI. Heavier AI (cover generator, interior formatter, proofreader) is in scope. **Risk:** these are the largest items. They get scheduled last in the 90 days and can slip to day 91+ without blocking revenue | 2026-11-08 |
| P3 | Printing | **Third-party print API.** Provider chosen after the agent's comparison (Gelato, Peecho, Lulu Print API, Bookvault) | 2026-11-08 |
| P5 | All other recommendations (D, G–M, tagline, problem statement) | **Accepted** ("yes") | 2026-11-08 |
| P4 | Launch markets | **NL and the EU** for print (EU OSS VAT); UK and US in month 4; digital worldwide | 2026-11-08 |

## Print provider comparison (2026-11-08, desk research)

Prices come from public pages and third-party reviews. They are **indicative only**: exact quotes need an account with each provider.

| | Lulu Print API | Peecho (Prodigi group) | Gelato | Bookvault |
|---|---|---|---|---|
| Book focus | Trade books: paperback, hardcover, coil, B&W and colour interiors | Photo-quality books (HP Indigo, colour); softcover A5 and A4, 20–300 pages, PUR binding | Photo books, children's books, notebooks and calendars; no trade paperback found | Trade books, offset-quality print on demand |
| EU print site | France (also UK, US, CA, AU, IN) | Network in 30+ countries; Western Europe delivery in 2–7 working days | 250+ partners in 32 countries | UK and US. EU orders cross a customs border since Brexit |
| API cost | No subscription or setup fee; per job: print, shipping, fulfilment fee (about $1.75 reported), tax | "Free Peecho API"; pay per printed product | Free base plan; per product | Monthly plans (£24.95 / £89.95 reported) plus title setup fees |
| Indicative unit cost | About $5.54 for 200 pp, 6×9 in, B&W, US paperback | Softcover not shown; hardcover from €5.20 | n/a for trade books | About $4.01 for 200 pp, 6×9 in (US) |
| Developer fit | Public sandbox and documented print-job API | REST orders, pricing and status; sub-account per creator; some features "early access" | White-label REST API | API for titles, orders and sales |
| Fit for this brief | **Best match** for novels, workbooks and journals in the EU | Good EU-local option for **colour** books (photo, colouring, children's) | Later: calendars and planners | Not for an EU-first launch |

**Recommendation:** build a provider-neutral print adapter (one interface: quote, submit, status, cancel). Start with **Lulu Print API** for B&W and trade formats, and evaluate **Peecho** for colour books. Note: Lulu also sells directly to authors. Using its print API is an ordinary supplier relationship and copies nothing, but it is a dependency on a competitor, so the adapter keeps switching cheap. Opening provider accounts is a credentialed external integration (**Level 3**): the owner opens them.

Sources: [Lulu API fees](https://help.api.lulu.com/en/support/solutions/articles/64000254631-are-there-fees-to-use-lulu-s-print-api-), [Lulu pricing breakdown](https://podvector.ai/articles/print-on-demand/costs-and-suppliers/lulu-print-on-demand-pricing), [Lulu print sites](https://assets.lulu.com/media/guides/en/lulu-scaling-your-business-with-print-api-guide.pdf), [Peecho softcover](https://www.peecho.com/products/books/softcover), [Peecho print API](https://www.peecho.com/solutions/print-api), [Gelato photo books](https://www.gelato.com/products/photo-books), [Gelato Europe](https://www.gelato.com/print-on-demand/europe), [Bookvault fees](https://bookvault.app/special-edition-book-printing/), [Bookvault costs](https://selfpublishingdirectory.com/print-on-demand/bookvault).

## Revenue proposal (Section B, awaiting owner confirmation)

| # | Stream | Proposed price | Cost to us | Target margin |
|---|---|---|---|---|
| R1 | Print sales commission | Author sets the retail price; we keep **15%** of (retail − print − shipping − fees) | Payment fees about 1.5–3% | About 12% of the author's margin |
| R2 | Digital (eBook) commission | **20%** of the net eBook price | Payment fees, file hosting | About 15% |
| R3 | Author Pro subscription | **€9.99/month**: commission falls to 5%, unlimited AI helpers, priority previews | AI API cost (cap per account) | ≥ 70% |
| R4 | Book formatting service | **€149** per title | Freelancer about €60–80 | About 50% |
| R5 | Cover design service | **€199** per cover | Freelancer about €80–100 | About 50% |
| R6 | ISBN | Future: Dutch ISBNs come from the national agency; author-supplied at launch | n/a | n/a |

**Check against the €1,000 goal.** 100 paperback orders at about €18 earn roughly €150–250 in commission (R1). The rest has to come from about 25 Pro subscribers (about €250 a month) and a handful of services (R4 and R5). The plan therefore puts the Pro plan and the services on the launch page, not just the commission.

## Phase 1 questionnaire

Fill in or confirm. **Known** means taken from the codebase or earlier decisions. **Rec.** means a recommendation awaiting confirmation. **?** means the owner must decide.

### A. Business foundation

| Question | Answer |
|---|---|
| Platform name | **Known:** Bookatlas. Confirm it covers the author side too, or name a sub-brand (e.g. "Bookatlas Publish") |
| Domain | **?** Currently `bookatlas-station9x.vercel.app`. A custom domain is required for Clerk production, payments and email reputation |
| Tagline | **?** (Rec. draft: "Write it. Print it. Sell it everywhere.") |
| Mission | **?** |
| Vision | **?** |
| Problem solved | **?** (Rec. draft: creators who want printed books and workbooks without inventory, upfront print runs or technical setup) |
| Primary customer (rank: authors, coaches, businesses, educators, publishers) | **?** |

### B. Revenue model

For each stream you choose: price, cost, target margin.

| Stream | Use? | Price | Cost | Target margin |
|---|---|---|---|---|
| Publishing fee | ? | | | |
| Print markup | Rec. yes | | Printer unit cost plus shipping | |
| Sales commission (digital) | Rec. yes | | Payment fees about 1.5–3% | |
| Subscription (author plan) | ? | | | |
| AI services | ? | | Model API cost | |
| Book formatting service | ? | | | |
| Cover design service | ? | | | |
| ISBN sales | ? | | Dutch ISBNs are issued by the national ISBN agency; check reseller terms | |
| Premium support | ? | | | |

### C. MVP scope

- **A** Publishing platform only
- **B** Publishing and marketplace
- **C** Publishing, marketplace and AI ✅ **Chosen (P2)**
- **D** Full ecosystem

### D. Products (Required / Future)

| Product | Rec. |
|---|---|
| Paperback | Required |
| eBook | Required (store and reader already exist) |
| Journals / notebooks | Required (one format) |
| Workbooks | Required (same as paperback, with a lay-flat option later) |
| Hardcover | Future |
| Coil-bound | Future |
| Planners | Future |
| Colouring books | Future (same as paperback, with a different paper spec) |
| Calendars | Future |
| Audiobooks | Future for author uploads (player already exists) |

### E. Launch countries

✅ **Decided (P4):** physical books to NL and the EU at launch; UK and US in month 4. Digital products worldwide.

### F. Printing model

✅ **B, third-party API (P3).** Preferred provider: pending the agent's comparison (see challenge 3).

### G. Marketplace (Yes/No)

| Feature | Rec. |
|---|---|
| Public author profiles | Yes |
| Public storefronts per author | Yes (lightweight: a profile page with their books) |
| Reader reviews | Yes, from verified purchasers only, with moderation |
| Ratings | Yes |
| Wishlists | **Known:** yes (exists) |
| Reader accounts | **Known:** yes (TASK-0001) |

### H. Author portal

Dashboard, revenue reports, royalty reports, sales reports: **Rec. yes** (one sales and royalties view). Analytics: Rec. basic (views and sales). Affiliate tracking: Rec. future. AI assistant: Rec. yes (Section I MVP list).

### I. AI features

MVP: description generator, metadata generator, category suggestions, price suggestions, Launch Readiness Score (**Rec.: all five**). With scope C (P2), cover generator, interior formatter and proofreader also move into the 90 days, scheduled last. Content editor: **?**

### J. Payments

Stripe (Rec. required), PayPal (Rec. future), Apple Pay and Google Pay (via Stripe), Klarna (via Stripe, optional), **iDEAL (Rec. required, NL)**. Do you already have a Stripe account for Atlantean Globals Services?

### K. Files

Accept DOCX, PDF and EPUB. Rec.: print interiors **PDF only** at MVP, validated for trim size, bleed, embedded fonts and page count. eBooks as **EPUB**, validated. DOCX conversion later. It is the hardest part to get right, and print-ready PDF covers most serious authors. Preview generation: Rec. yes (first pages).

### L. Branding

**Known:** new BookAtlas logo, navy `#0B3A9E`, Plus Jakarta Sans for UI, Literata and Source Serif for reading. Brand personality (corporate, premium, author-first, creative, minimalist): **?** (Rec.: author-first and premium).

### M. Compliance

| Item | Rec. |
|---|---|
| GDPR | Yes. Extend TASK-0001: author data, payout and KYC data via Stripe |
| VAT | Yes. EU OSS via Stripe Tax; needs the company VAT number |
| Cookie consent | Needed only if analytics or marketing cookies are added. Today none are used |
| DMCA / EU DSA notice and action | Yes: copyright takedown form, repeat-infringer policy. As an EU hosting service we fall under the Digital Services Act |
| Accessibility | Yes: WCAG 2.2 AA. The European Accessibility Act applies to e-commerce and e-books since June 2025 |
| Copyright takedown system | Yes (same as DSA notice and action) |
| Author terms / publishing agreement | Yes: needs counsel (rights, royalties, content rules) |

---

## Next phases (after discovery is answered)

Phase 2 PRD, phase 3 landing copy, phases 4–7 architecture, schema, API and security (Level 2 approval), phase 8 90-day plan, phase 10 code in the brief's order. Each phase is recorded here or in a linked document.
