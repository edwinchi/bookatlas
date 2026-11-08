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
| 1 | Discovery: A Business foundation | ⏳ Waiting for answers |
| 1 | Discovery: B Revenue model | ⏳ Waiting for answers |
| 1 | Discovery: C MVP scope | ⏳ Waiting for answers |
| 1 | Discovery: D Products | ⏳ Waiting for answers |
| 1 | Discovery: E Countries | ⏳ Waiting for answers |
| 1 | Discovery: F Printing model | ⏳ Waiting for answers |
| 1 | Discovery: G Marketplace | ⏳ Waiting for answers |
| 1 | Discovery: H Author portal | ⏳ Waiting for answers |
| 1 | Discovery: I AI features | ⏳ Waiting for answers |
| 1 | Discovery: J Payments | ⏳ Waiting for answers |
| 1 | Discovery: K Files | ⏳ Waiting for answers |
| 1 | Discovery: L Branding | ⏳ Waiting for answers (logo, colours, type known) |
| 1 | Discovery: M Compliance | ⏳ Waiting for answers |
| 2 | Product requirements document | ⬜ Not started (needs phase 1) |
| 3 | MVP landing page copy | ⬜ Not started |
| 4 | Technical architecture | ⬜ Not started (Level 2 approval) |
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
- **B** Publishing and marketplace (**Rec.**: BookAtlas already has the marketplace half)
- **C** Publishing, marketplace and AI
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

USA, Canada, UK, Netherlands, Germany, France, Australia, others? **Rec.:** physical books to NL and the EU at launch; UK and US in month 4. Digital products worldwide.

### F. Printing model

**A** manual, **B** third-party API (**Rec.**), or **C** own facilities. Preferred provider: **?** (see challenge 3).

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

MVP: description generator, metadata generator, category suggestions, price suggestions, Launch Readiness Score (**Rec.: all five**). Future: cover generator, content editor, interior formatter, proofreader.

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
