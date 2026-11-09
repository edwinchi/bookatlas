# BookAtlas Platform Blueprint

Nov 8, 2026 · @edski

## Executive Summary

**Recommendation: launch BookAtlas as a reader-first digital marketplace with strong author tools, not as a print company.** Lulu's strength is print infrastructure and integrations built over many years. BookAtlas can win sooner where readers discover, read and listen in one place.

The plan reaches a paid EU launch in 90 days, then adds print through an API partner once digital sales prove demand.

| Decision | Recommendation | Why |
| --- | --- | --- |
| Launch product | eBooks and audiobooks | No inventory, printers, shipping or returns |
| Print | Partner API after launch | Avoids capital cost and production risk |
| First market | Netherlands and EU, in EUR | Matches the current site setup |
| Payments | Stripe Connect and Stripe Tax | Already chosen; supports author payouts |
| Application | Next.js modular monolith with Postgres | One deployable app until load or team size justifies a split |
| Differentiator | In-browser reading and listening, plus an author brand hub | Readers and authors both gain from it |

**Three assumptions in the brief are worth changing:**

1. **NestJS is not needed for the MVP.** A separate backend adds deployment and contract work for a small team. Keep domain logic in modules so it can move out later.
2. **PayPal can wait.** Stripe already covers cards, wallets and common EU methods. Add PayPal if checkout data shows demand.
3. **AI cover generation is a risk before it is a feature.** Copyright status and retailer rules for AI-generated work need review. Start with metadata, keyword and proofreading help, where the author stays in control.

Cost and revenue figures in this document are planning assumptions, not market data.

## Site Audit (Phase 1)

**Lulu's public site mainly drives print orders and fulfilment volume; its storefront is a smaller part of the story.** Eleven public entry points were reviewed on November 8, 2026. Ten were readable, the bookstore URL failed, and the developer portal returned no content without JavaScript. Revenue objectives are inferred.

| Page | Purpose | Audience | Main CTA | Features promoted | Likely revenue objective |
| --- | --- | --- | --- | --- | --- |
| [Homepage](https://www.lulu.com/) | Route visitors by segment | Authors, brands, enterprise publishers | Choose an audience track | Publishing, direct sales, global fulfilment, personalised books | Qualify visitors into print and API volume |
| [Pricing](https://www.lulu.com/pricing) | Estimate cost and earnings | Authors, small businesses | Use the calculator | Product options, cover templates, volume quotes | Convert a quote into print orders |
| [Create](https://www.lulu.com/create) | Explain print-ready book setup | First-time publishers | Start a book, eBook or calendar | Cover designer, templates, creation guide | Reduce friction before a first order |
| [Products](https://www.lulu.com/products) | Catalogue specifications | Authors choosing specs | Calculator and templates | Sizes, bindings, paper, ink, finishes | Move buyers toward a configured product |
| [Sell](https://www.lulu.com/sell) | Sell through the seller's own channels | Brands, creators, authors | Direct connections, Buy Button, API | Shopify, Wix, WooCommerce, order import, white-label shipping | Earn printing and shipping fees per order |
| [Print API](https://www.lulu.com/sell/sell-on-your-site/print-api) | Automate print orders | Developers, enterprises | Documentation and knowledge base | REST API, webhooks, drop-shipping, personalised books | Win recurring programmatic volume |
| [Retail distribution](https://www.lulu.com/sell/retail-distribution) | Reach bookstores and libraries | Authors wanting wide reach | Start a project | Own bookstore, Amazon, Ingram network | Distribution fees and print orders |
| [Resources](https://www.lulu.com/resources) | Index education content | Self-publishers | Download guides, hire partners | Toolkit, videos, podcast, partner directory | Content-led acquisition and referrals |
| [Blog](https://www.lulu.com/blog) | How-to and industry posts | Authors | Read more | Publishing advice | Organic search traffic |
| [Help center](https://help.lulu.com/) | Self-service support | Customers | Search or contact support | Distribution, revenue, tax, shipping articles | Lower support cost, retain customers |
| [Developer portal](https://developers.lulu.com/) | API credentials and docs | Developers | Not retrievable | Sandbox and production access, per the Print API page | API adoption |

**Useful facts for planning:** Lulu states authors earn [80% of revenue on its bookstore](https://www.lulu.com/sell/retail-distribution), and that direct sellers [pay only for printing and shipping](https://www.lulu.com/sell). It lists [print facilities in six countries](https://www.lulu.com/sell/sell-on-your-site/print-api), and [retail review can take up to 12 weeks](https://www.lulu.com/sell/retail-distribution).

**Implication for BookAtlas:** the 70% placeholder royalty sits below Lulu's stated 80% bookstore share. Either raise it or justify it with reader reach.

## Sitemap (Phase 4)

**BookAtlas puts reading and buying first, with publishing one click away in the main navigation.** Lulu leads with solutions by customer type; a reader-first store should not.

&#91;embedded content: BookAtlas sitemap · six areas\]

Print formats and the developer API stay out of the navigation until those products exist.

## User Journeys (Phase 2)

**The full journey has seven hand-offs, and the riskiest are book approval and payout setup.** It is an original BookAtlas design, informed by functions visible on Lulu's public site and in your Lulu author account.

| Stage | Screens and steps | System action | Success signal |
| --- | --- | --- | --- |
| 1. Visitor to account | Home or book page, sign-up prompt at save or purchase, email or Google, confirm email | Create reader account; record consent | Verified account |
| 2. Account to author | Become an author, display name, country, author agreement | Add author role and profile | Author hub unlocked |
| 3. Author to book creation | Choose format, enter details, select category, upload file, add or design cover | Autosave draft; store private files; scan and validate | Draft passes file checks |
| 4. Creation to publishing | Set price, see royalty, preview, confirm rights, submit | Move to review; check duplicates and policy | Approved and live, or fix list sent |
| 5. Publishing to sales | Public book page, sample, cart, Stripe checkout, confirmation | Calculate VAT; create order; grant access | Book in reader's library |
| 6. Sales to royalties | Sales table, filters, statement, CSV export | Write ledger entry after VAT and fees | Author sees sale and earnings |
| 7. Royalties to payout | Stripe onboarding, identity check, payout status, statement | Transfer funds or hold until setup is complete | Money reaches author's bank |

**Failure paths to design from the start:**

- **File rejected:** show page-level or file-level fixes, and keep the draft.
- **Book rejected:** state the policy reason and allow one-click resubmission.
- **Payment failed:** return to the cart with items intact.
- **Refund:** remove access and reverse the royalty.
- **Payout setup incomplete:** hold earnings and prompt the author in the hub.
- **Takedown notice:** suspend sales, tell the author and open a case.

## Feature Matrix (Phase 3)

**Thirty-three features are needed for the full platform, and the first 90 days need only those marked D30 to D90.** The rest depend on sales evidence or a print partner.

| Area | Feature | Purpose | Inputs | Outputs | Dependencies | Phase |
| --- | --- | --- | --- | --- | --- | --- |
| Customer | Accounts and sign-in | Identify buyers | Email, Google | Session, profile | Auth provider | D30 |
| Customer | Search and browse | Find books | Query, filters | Ranked results | Catalogue, Postgres search | D30 |
| Customer | Book page and sample | Convert interest | Book ID | Details, sample | Files, reader | D30 |
| Customer | Reader and audio player | Consume purchases | Entitlement | Secure content stream | Storage, EPUB renderer | D60 |
| Customer | Library and orders | Reopen purchases | User ID | Books, receipts | Entitlements | D30 |
| Customer | Reviews and ratings | Build trust | Verified purchase, text | Rating, moderated review | Moderation | D90 |
| Author | Creation wizard | Publish a book | Metadata, files, price | Draft, submission | Storage | D30 |
| Author | Manuscript conversion | Produce reader files | DOCX, PDF, EPUB | Validated EPUB | Queue, converter | D60 |
| Author | Cover designer | Create a cover | Title, style, image | Cover image | Storage | Later |
| Author | Sales dashboard | Show performance | Ledger | Filters, CSV | Reporting queries | D60 |
| Author | Royalty statements | Explain earnings | Ledger, transfers | Statement | Stripe Connect | D60 |
| Author | Promotions | Run discounts | Book, discount, dates | Active price | Checkout | D90 |
| Author | Author page | Build a brand | Bio, links, books | Public page | Catalogue | D90 |
| Marketplace | Categories and merchandising | Organise supply | Genres, editor picks | Shelves | Admin | D30 |
| Marketplace | Recommendations | Increase discovery | Purchases, genres | Book list | Event data | Later |
| Marketplace | Affiliate and referral links | Add acquisition | Partner code | Attributed sale, commission | Ledger | Later |
| Marketplace | White-label author stores | Serve established authors | Domain, theme | Hosted store | Multi-tenant routing | Later |
| Printing | Product configurator | Define print specs | Size, binding, paper | Print SKU, price | Print partner | Print phase |
| Printing | PDF validation | Prevent bad jobs | Interior, cover PDFs | Pass or fix list | PDF tooling | Print phase |
| Printing | Cover template generator | Fit cover to spine | Trim, pages, paper | Template PDF | Spine rules | Print phase |
| Fulfilment | Print order routing | Send jobs to printers | Order, address | Partner job | Print API | Print phase |
| Fulfilment | Shipment tracking | Inform buyers | Partner webhook | Status, email | Notifications | Print phase |
| Distribution | External eBook distribution | Reach other stores | Metadata, EPUB | Listings, reports | Aggregator agreement | Later |
| Distribution | ISBN management | Identify editions | Author or purchased ISBN | Edition record | National agency | Print phase |
| Revenue | Checkout and VAT | Take payment | Cart, address | Paid order, invoice | Stripe, Stripe Tax | D30 |
| Revenue | Author payouts | Pay royalties | Ledger, connected account | Transfer | Stripe Connect | D30 |
| Revenue | Reader subscription | Recurring income | Plan, usage | Access, royalty pool | Usage metering | Later |
| Administration | Book review queue | Stop abuse | Submission | Approve or reject | Admin roles | D30 |
| Administration | Refunds and disputes | Resolve payment issues | Order, reason | Refund, reversal | Stripe | D60 |
| Administration | Notice and takedown | Meet legal duties | Notice, evidence | Decision, audit log | Case workflow | D60 |
| Administration | Support tickets | Handle requests | Message, account | Resolved case | Helpdesk tool | Later |
| Analytics | Funnel tracking | Find conversion loss | Page and order events | Funnel report | Consent-aware analytics | D60 |
| Analytics | Platform KPI dashboard | Run the business | Orders, ledger, events | Revenue and cohort views | Reporting views | Later |

## Database Schema (Phase 5)

**Use one Postgres database, with the ledger as the source of truth for money.** Customers are users with orders, so no separate customer table is needed. Inferred from observable features; Lulu's actual schema is unknown.

### Prisma schema

```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"  url = env("DATABASE_URL") }

enum Role { READER AUTHOR SUPPORT ADMIN }
enum Format { EBOOK AUDIOBOOK PAPERBACK HARDCOVER }
enum BookStatus { DRAFT IN_REVIEW LIVE REJECTED REMOVED }
enum FileKind { MANUSCRIPT EPUB AUDIO SAMPLE COVER PRINT_INTERIOR PRINT_COVER }
enum OrderStatus { PENDING PAID PARTIALLY_REFUNDED REFUNDED EXPIRED }
enum LedgerStatus { NONE PENDING TRANSFERRED REVERSED CANCELLED }
enum TicketStatus { OPEN WAITING RESOLVED }

model User {
  id String @id @default(cuid())
  email String @unique
  name String?
  roles Role[] @default([READER])
  createdAt DateTime @default(now())
  author Author?
  orders Order[]
  entitlements Entitlement[]
  reviews Review[]
  follows AuthorFollower[]
  notifications Notification[]
  tickets SupportTicket[]
  affiliate Affiliate?
  auditEvents AuditLog[]
}

model Author {
  id String @id @default(cuid())
  userId String @unique
  user User @relation(fields: [userId], references: [id])
  displayName String
  slug String @unique
  bio String?
  links Json?
  stripeAccountId String? @unique
  payoutsEnabled Boolean @default(false)
  books Book[]
  followers AuthorFollower[]
  royalties RoyaltyEntry[]
  payouts Payout[]
}

model AuthorFollower {
  userId String
  authorId String
  createdAt DateTime @default(now())
  user User @relation(fields: [userId], references: [id])
  author Author @relation(fields: [authorId], references: [id])
  @@id([userId, authorId])
  @@index([authorId])
}

model Category {
  id String @id @default(cuid())
  name String
  slug String @unique
  parentId String?
  parent Category? @relation("CategoryTree", fields: [parentId], references: [id])
  children Category[] @relation("CategoryTree")
  books Book[]
}

model Book {
  id String @id @default(cuid())
  authorId String
  author Author @relation(fields: [authorId], references: [id])
  categoryId String?
  category Category? @relation(fields: [categoryId], references: [id])
  title String
  subtitle String?
  description String
  language String @default("en")
  keywords String[]
  status BookStatus @default(DRAFT)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  editions Edition[]
  reviews Review[]
  @@index([status, categoryId])
  @@index([authorId, status])
}

model Edition {
  id String @id @default(cuid())
  bookId String
  book Book @relation(fields: [bookId], references: [id])
  format Format
  isbn String? @unique
  priceCents Int
  currency String @default("eur")
  printSpec Json?
  files BookFile[]
  orderItems OrderItem[]
  entitlements Entitlement[]
  promotions Promotion[]
  @@unique([bookId, format])
}

model BookFile {
  id String @id @default(cuid())
  editionId String
  edition Edition @relation(fields: [editionId], references: [id])
  kind FileKind
  storageKey String @unique
  sizeBytes BigInt
  sha256 String
  validation Json?
  createdAt DateTime @default(now())
  @@index([editionId, kind])
}

model Promotion {
  id String @id @default(cuid())
  editionId String
  edition Edition @relation(fields: [editionId], references: [id])
  discountBps Int
  startsAt DateTime
  endsAt DateTime
  @@index([editionId, startsAt, endsAt])
}

model Coupon {
  id String @id @default(cuid())
  code String @unique
  discountBps Int
  fundedBy String
  expiresAt DateTime?
  maxRedemptions Int?
  redemptions Int @default(0)
  orders Order[]
}

model Order {
  id String @id @default(cuid())
  buyerId String
  buyer User @relation(fields: [buyerId], references: [id])
  couponId String?
  coupon Coupon? @relation(fields: [couponId], references: [id])
  affiliateId String?
  affiliate Affiliate? @relation(fields: [affiliateId], references: [id])
  status OrderStatus @default(PENDING)
  totalCents Int?
  taxCents Int?
  buyerCountry String?
  termsAcceptedAt DateTime?
  createdAt DateTime @default(now())
  items OrderItem[]
  payments Payment[]
  @@index([buyerId, createdAt])
  @@index([status, createdAt])
}

model OrderItem {
  id String @id @default(cuid())
  orderId String
  order Order @relation(fields: [orderId], references: [id])
  editionId String
  edition Edition @relation(fields: [editionId], references: [id])
  listPriceCents Int
  unitPriceCents Int
  taxCents Int?
  royalty RoyaltyEntry?
  @@unique([orderId, editionId])
}

model Payment {
  id String @id @default(cuid())
  orderId String
  order Order @relation(fields: [orderId], references: [id])
  provider String
  sessionRef String? @unique
  chargeRef String? @unique
  amountCents Int
  refundedCents Int @default(0)
  createdAt DateTime @default(now())
}

model Entitlement {
  userId String
  editionId String
  createdAt DateTime @default(now())
  user User @relation(fields: [userId], references: [id])
  edition Edition @relation(fields: [editionId], references: [id])
  @@id([userId, editionId])
}

model RoyaltyEntry {
  id String @id @default(cuid())
  orderItemId String @unique
  orderItem OrderItem @relation(fields: [orderItemId], references: [id])
  authorId String
  author Author @relation(fields: [authorId], references: [id])
  payoutId String?
  payout Payout? @relation(fields: [payoutId], references: [id])
  amountCents Int
  currency String @default("eur")
  status LedgerStatus
  isSelfPurchase Boolean @default(false)
  channel String @default("bookatlas")
  region String?
  dateSold DateTime @default(now())
  dateReported DateTime @default(now())
  transferRef String? @unique
  @@index([authorId, status, dateSold])
}

model Payout {
  id String @id @default(cuid())
  authorId String
  author Author @relation(fields: [authorId], references: [id])
  amountCents Int
  providerRef String? @unique
  status String
  createdAt DateTime @default(now())
  entries RoyaltyEntry[]
}

model Review {
  id String @id @default(cuid())
  bookId String
  book Book @relation(fields: [bookId], references: [id])
  userId String
  user User @relation(fields: [userId], references: [id])
  rating Int
  body String?
  moderated Boolean @default(false)
  createdAt DateTime @default(now())
  @@unique([bookId, userId])
  @@index([bookId, moderated, createdAt])
}

model Affiliate {
  id String @id @default(cuid())
  userId String @unique
  user User @relation(fields: [userId], references: [id])
  code String @unique
  commissionBps Int
  orders Order[]
}

model Notification {
  id String @id @default(cuid())
  userId String
  user User @relation(fields: [userId], references: [id])
  type String
  payload Json
  readAt DateTime?
  createdAt DateTime @default(now())
  @@index([userId, readAt, createdAt])
}

model SupportTicket {
  id String @id @default(cuid())
  userId String
  user User @relation(fields: [userId], references: [id])
  subject String
  status TicketStatus @default(OPEN)
  createdAt DateTime @default(now())
  @@index([status, createdAt])
}

model AuditLog {
  id String @id @default(cuid())
  actorId String?
  actor User? @relation(fields: [actorId], references: [id])
  action String
  entityType String
  entityId String
  metadata Json?
  ip String?
  createdAt DateTime @default(now())
  @@index([entityType, entityId, createdAt])
  @@index([actorId, createdAt])
}
```

### PostgreSQL additions

Generate the full DDL with `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`. Add these rules by hand in a migration, because Prisma cannot express them:

```sql
ALTER TABLE "Review" ADD CONSTRAINT review_rating CHECK (rating BETWEEN 1 AND 5);
ALTER TABLE "Edition" ADD CONSTRAINT edition_price CHECK ("priceCents" >= 0);
ALTER TABLE "Promotion" ADD CONSTRAINT promo_dates CHECK ("endsAt" > "startsAt");
ALTER TABLE "Promotion" ADD CONSTRAINT promo_discount CHECK ("discountBps" BETWEEN 1 AND 9000);

CREATE EXTENSION IF NOT EXISTS pg_trgm;
ALTER TABLE "Book" ADD COLUMN search tsvector GENERATED ALWAYS AS
  (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(subtitle,'') || ' ' || coalesce(description,''))) STORED;
CREATE INDEX book_search ON "Book" USING GIN (search);
CREATE INDEX book_title_trgm ON "Book" USING GIN (title gin_trgm_ops);
CREATE INDEX book_live ON "Book" ("createdAt" DESC) WHERE status = 'LIVE';
CREATE INDEX royalty_held ON "RoyaltyEntry" ("authorId") WHERE status = 'PENDING';
```

### Index strategy

| Query | Index | Reason |
| --- | --- | --- |
| Storefront listing | Partial index on live books | Most reads target live titles |
| Text search | GIN on `search`, trigram on title | Handles relevance and typos until Meilisearch is needed |
| Author sales report | `authorId, status, dateSold` on royalties | Filters and date sorting |
| Held payouts | Partial index on pending royalties | Small, fast settlement scan |
| Access check | Composite primary key on entitlements | Runs on each content request |
| Audit lookup | `entityType, entityId, createdAt` | Supports case investigation |

## ER Diagram

**The royalty entry is the record that ties a sale to what an author is owed.** Arrows point from one record to the many records that depend on it.

&#91;embedded content: core entities and one-to-many links\]

Each royalty entry and payout also belongs to one author, and each entitlement also belongs to one user. Those links are omitted to keep the picture readable.

## API Specification (Phase 6)

**The API covers all requested groups, with two deliberate changes.** `POST /withdraw` is replaced by automatic Stripe transfers, because a balance held and withdrawn on request adds regulatory and reconciliation risk. `POST /paypal/webhook` is reserved until PayPal is added. All money values are integer cents.

```yaml
openapi: 3.1.0
info: { title: BookAtlas API, version: 1.0.0 }
servers: [{ url: https://bookatlas.example/api/v1 }]
security: [{ session: [] }]
components:
  securitySchemes:
    session: { type: apiKey, in: cookie, name: ba_session }
    stripeSignature: { type: apiKey, in: header, name: Stripe-Signature }
  parameters:
    Id: { name: id, in: path, required: true, schema: { type: string } }
    Cursor: { name: cursor, in: query, schema: { type: string } }
    Limit: { name: limit, in: query, schema: { type: integer, minimum: 1, maximum: 100, default: 24 } }
  responses:
    Error:
      description: Error
      content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
  schemas:
    Error:
      type: object
      required: [code, message]
      properties: { code: { type: string }, message: { type: string } }
    Credentials:
      type: object
      required: [email, password]
      properties: { email: { type: string, format: email }, password: { type: string, minLength: 12 } }
    Profile:
      type: object
      properties: { id: { type: string }, email: { type: string }, name: { type: string }, roles: { type: array, items: { type: string } } }
    BookInput:
      type: object
      required: [title, description, categoryId, language]
      properties:
        title: { type: string, maxLength: 200 }
        subtitle: { type: string, maxLength: 200 }
        description: { type: string, maxLength: 5000 }
        categoryId: { type: string }
        language: { type: string }
        keywords: { type: array, maxItems: 10, items: { type: string } }
    Book:
      allOf:
        - $ref: '#/components/schemas/BookInput'
        - type: object
          properties: { id: { type: string }, status: { type: string }, authorId: { type: string } }
    OrderItem:
      type: object
      properties: { editionId: { type: string }, unitPriceCents: { type: integer }, taxCents: { type: integer } }
    Order:
      type: object
      properties: { id: { type: string }, status: { type: string }, totalCents: { type: integer }, items: { type: array, items: { $ref: '#/components/schemas/OrderItem' } } }
    CartInput:
      type: object
      required: [editionIds]
      properties: { editionIds: { type: array, minItems: 1, maxItems: 50, items: { type: string } } }
    ReviewInput:
      type: object
      required: [bookId, rating]
      properties: { bookId: { type: string }, rating: { type: integer, minimum: 1, maximum: 5 }, body: { type: string, maxLength: 4000 } }
paths:
  /register:
    post:
      security: []
      requestBody: { required: true, content: { application/json: { schema: { $ref: '#/components/schemas/Credentials' } } } }
      responses: { '201': { description: Account created }, '409': { $ref: '#/components/responses/Error' } }
  /login:
    post:
      security: []
      requestBody: { required: true, content: { application/json: { schema: { $ref: '#/components/schemas/Credentials' } } } }
      responses: { '200': { description: Session created }, '401': { $ref: '#/components/responses/Error' }, '429': { $ref: '#/components/responses/Error' } }
  /logout:
    post: { responses: { '204': { description: Session ended } } }
  /profile:
    get:
      responses:
        '200': { description: Profile, content: { application/json: { schema: { $ref: '#/components/schemas/Profile' } } } }
        '401': { $ref: '#/components/responses/Error' }
  /books:
    get:
      description: Books owned by the signed-in author.
      parameters: [{ $ref: '#/components/parameters/Cursor' }, { $ref: '#/components/parameters/Limit' }]
      responses: { '200': { description: Book list } }
    post:
      requestBody: { required: true, content: { application/json: { schema: { $ref: '#/components/schemas/BookInput' } } } }
      responses: { '201': { description: Draft created }, '422': { $ref: '#/components/responses/Error' } }
  /books/{id}:
    parameters: [{ $ref: '#/components/parameters/Id' }]
    get:
      security: []
      responses: { '200': { description: Live book, or draft for its owner }, '404': { $ref: '#/components/responses/Error' } }
    put:
      requestBody: { required: true, content: { application/json: { schema: { $ref: '#/components/schemas/BookInput' } } } }
      responses: { '200': { description: Updated }, '403': { $ref: '#/components/responses/Error' } }
    delete:
      description: Removes from sale. Buyers keep access.
      responses: { '204': { description: Removed }, '403': { $ref: '#/components/responses/Error' } }
  /store:
    get: { security: [], parameters: [{ $ref: '#/components/parameters/Cursor' }, { $ref: '#/components/parameters/Limit' }], responses: { '200': { description: Storefront shelves } } }
  /categories:
    get: { security: [], responses: { '200': { description: Category tree } } }
  /search:
    get:
      security: []
      parameters:
        - { name: q, in: query, schema: { type: string, maxLength: 200 } }
        - { name: format, in: query, schema: { type: string } }
        - { name: category, in: query, schema: { type: string } }
        - { $ref: '#/components/parameters/Cursor' }
      responses: { '200': { description: Ranked results } }
  /orders:
    get: { parameters: [{ $ref: '#/components/parameters/Cursor' }], responses: { '200': { description: Buyer order history } } }
    post:
      description: Creates a pending order with server-side prices.
      requestBody: { required: true, content: { application/json: { schema: { $ref: '#/components/schemas/CartInput' } } } }
      responses: { '201': { description: Order, content: { application/json: { schema: { $ref: '#/components/schemas/Order' } } } }, '409': { $ref: '#/components/responses/Error' } }
  /reviews:
    get:
      security: []
      parameters: [{ name: bookId, in: query, required: true, schema: { type: string } }, { $ref: '#/components/parameters/Cursor' }]
      responses: { '200': { description: Published reviews } }
    post:
      description: Verified buyers only, one per book.
      requestBody: { required: true, content: { application/json: { schema: { $ref: '#/components/schemas/ReviewInput' } } } }
      responses: { '201': { description: Submitted }, '403': { $ref: '#/components/responses/Error' }, '409': { $ref: '#/components/responses/Error' } }
  /checkout:
    post:
      requestBody: { required: true, content: { application/json: { schema: { $ref: '#/components/schemas/CartInput' } } } }
      responses: { '200': { description: Hosted checkout URL }, '409': { $ref: '#/components/responses/Error' } }
  /stripe/webhook:
    post:
      security: [{ stripeSignature: [] }]
      responses: { '200': { description: Processed }, '400': { $ref: '#/components/responses/Error' }, '500': { description: Retry requested } }
  /royalties:
    get:
      description: Author ledger with filters and CSV via Accept header.
      parameters:
        - { name: status, in: query, schema: { type: string } }
        - { name: from, in: query, schema: { type: string, format: date } }
        - { name: to, in: query, schema: { type: string, format: date } }
      responses: { '200': { description: Royalty entries }, '403': { $ref: '#/components/responses/Error' } }
  /admin/dashboard:
    get: { responses: { '200': { description: KPIs }, '403': { $ref: '#/components/responses/Error' } } }
  /admin/users:
    get: { parameters: [{ $ref: '#/components/parameters/Cursor' }], responses: { '200': { description: Users }, '403': { $ref: '#/components/responses/Error' } } }
  /admin/books:
    get: { parameters: [{ name: status, in: query, schema: { type: string } }], responses: { '200': { description: Review queue }, '403': { $ref: '#/components/responses/Error' } } }
  /admin/orders:
    get: { parameters: [{ $ref: '#/components/parameters/Cursor' }], responses: { '200': { description: Orders }, '403': { $ref: '#/components/responses/Error' } } }
```

## Architecture Diagram (Phase 9)

**Launch with one application and split services only when load or team size proves the need.** The requested stack is kept, except that NestJS moves to a later option and Meilisearch waits for real search limits.

&#91;embedded content: application architecture · launch shape\]

| Requested | Decision | Trigger to change |
| --- | --- | --- |
| Next.js, React, TypeScript, Tailwind | Keep | None |
| NestJS | Defer; use modules inside Next.js | Several backend teams, or a public API with its own release cycle |
| PostgreSQL and Prisma | Keep | Add read replicas when reports slow transactions |
| Meilisearch | Defer | Search relevance or latency misses target on a large catalogue |
| Cloudflare R2 | Keep | None; test large audio delivery early |
| Resend | Keep | None |
| Stripe | Keep | None |
| PayPal | Defer | Checkout data shows meaningful demand |
| Vercel, Railway, Cloudflare | Keep | Reassess if bandwidth or worker costs climb |

## Infrastructure Diagram

**Managed services keep operations light enough for a small team.** Separate preview, staging and production environments, each with its own keys and database.

&#91;embedded content: production infrastructure · launch shape\]

Confirm each provider's EU region and data-processing terms before storing customer data.

## Security Plan

**The highest risks are stolen books, payout fraud and account takeover, so controls start there.** Stripe's hosted checkout keeps card data off BookAtlas servers, which limits PCI scope. Confirm the applicable PCI self-assessment with Stripe.

| Risk | Control | Phase |
| --- | --- | --- |
| Account takeover | Passwordless or strong passwords, breached-password check, rate limits | D30 |
| Admin or author takeover | Mandatory MFA for staff, MFA before payout changes | D30 |
| Unauthorised book access | Private storage, entitlement check per request, short-lived signed URLs | D30 |
| Payment tampering | Server-side prices, verified webhook signatures, idempotent handlers | D30 |
| Payout fraud | Stripe identity checks, delayed first payout, self-purchase and velocity flags | D60 |
| Malicious uploads | Type and size checks, malware scan, conversion in an isolated worker | D60 |
| Injection and XSS | Parameterised queries, schema validation, sanitised descriptions, strict CSP | D30 |
| Broken access control | Central role and ownership checks, automated tests per route | D30 |
| Copyright abuse | Rights declaration, duplicate file hashes, review queue, takedown workflow | D30 to D60 |
| Secret exposure | Secrets in platform vault, rotation, repository scanning | D30 |
| Dependency attacks | Pinned versions, automated audit in CI | D30 |
| Data loss | Encrypted backups, tested point-in-time restore | D30 |

**Privacy and platform duties for the EU:** GDPR processor agreements, data export and deletion, consent-aware analytics, and retention limits that respect tax records. Digital Services Act notice-and-action, statements of reasons and trader traceability need legal review before launch. The European Accessibility Act also applies to many e-commerce services and eBooks, so build to WCAG 2.2 AA.

**Audit logging:** record admin actions, payout changes, book decisions, refunds and takedowns in the append-only audit table.

**Before launch:** run an external penetration test on authentication, entitlement and payout flows.

## Print Workflow (Phase 7)

**Treat print as a partner-integrated add-on: BookAtlas validates and sells, while the partner produces and ships.** Rules below must be replaced with the chosen partner's published specifications.

### Book creation

1. **Metadata:** title, contributors, language, category, description and ISBN.
2. **Specification:** trim size, binding, paper, ink, finish and page count.
3. **Interior:** upload a PDF, then run automated checks.
4. **Cover:** upload a full spread or build one from a generated template.
5. **Pricing:** calculate print cost, VAT, partner shipping and author margin.
6. **Proof:** show a preview and offer a paid physical proof.
7. **Publishing:** approve, list for sale and lock print files to a version.

### File processing

| Check | Rule | On failure |
| --- | --- | --- |
| PDF integrity | Opens, not encrypted, page count within binding limits | Block with a plain-language fix |
| Page size and trim | Every page matches trim plus bleed | Block; offer template |
| Bleed | Artwork extends through the partner's required bleed | Block for image pages |
| Safe margin | Text stays inside the safe zone | Warn with page numbers |
| Fonts | All fonts embedded | Block; explain how to re-export |
| Image resolution | Target about [300 DPI](https://www.lulu.com/blog) | Warn with page numbers |
| Colour | Colour mode matches partner rules | Warn or convert with consent |
| Spine | Calculated from pages and paper | Regenerate cover template |
| Preview | Page thumbnails and flipbook | Retry job, then alert support |

**Spine calculation** is partner-specific. As a public reference, [Lulu's paperback formula](https://www.lulu.com/create) is:

```latex
\text{spine width (in)} = \frac{\text{pages}}{444} + 0.06
```

Store a separate rule per partner, binding and paper rather than one global formula.

### Fulfilment

1. **Order:** payment is confirmed and the file version is frozen.
2. **Routing:** choose a partner and site by destination, cost and delivery estimate.
3. **Production:** submit the job and record the partner's job ID.
4. **Shipping:** receive carrier and tracking data by webhook.
5. **Tracking:** update the buyer and order record.
6. **Delivery:** close the order and start the claim window.
7. **Exceptions:** handle rejected files, damaged copies, lost parcels and reprints with a support case.

Take the author's royalty only after print, shipping and VAT are deducted, and hold it until the partner accepts the job.

## 90-Day Build Plan (Phase 11)

**Each 30-day stage ends with something real: a first paid sale, a complete reading product, then a public launch.** The plan assumes one founder and 100% owner working full-time and the existing payment core and prototype as a starting point. Scope is reduced for one person, and 90 days remains tight, so allow 120 to 150 days as a realistic range.

| Stage | Features | Database tables | APIs | UI screens | Cost (EUR) |
| --- | --- | --- | --- | --- | --- |
| **30-day: first paid sale** | Sign-in, catalogue, search, EPUB and audio upload, wizard, review queue, checkout, VAT, payouts, library | User, Author, Category, Book, Edition, BookFile, Order, OrderItem, Payment, Entitlement, RoyaltyEntry, AuditLog | Auth, books, store, categories, search, orders, checkout, Stripe webhook | Home, browse, book, cart, library, sign-in, wizard, author home, admin review | 3,150 |
| **60-day: complete product** | Reader, audio streaming, conversion, sales dashboard, statements, refunds, takedowns, malware scan, funnel tracking | Adds Payout, Notification | Adds royalties, content access, refunds, admin books and orders | Reader, player, sales, statements, admin orders, cases | 3,300 |
| **90-day: public launch** | Reviews, promotions, author pages, accessibility fixes, penetration test | Adds Review, Promotion | Adds reviews, promotions, author pages and admin users | Reviews, promotion setup, author page, help page | 8,500 |

**Exit criteria**

- [ ] **Day 30:** five test authors publish and one real card payment reaches an author's connected account.
- [ ] **Day 60:** a buyer can read and listen on phone and desktop, and a full refund reverses the royalty.
- [ ] **Day 90:** penetration test findings are closed, legal documents are approved and 100 titles are live.

**Cut first if time slips:** promotions, author pages and audiobook streaming. Do not cut VAT, access control, refunds or takedowns.

## Cost Estimate

**The 90-day build is estimated at about EUR 17,200 in cash including contingency, excluding any founder salary.** All inputs are planning assumptions, so replace them with real quotes. For comparison, paying 2.5 people would add EUR 60,000 before contingency.

| Item | Assumption | Day 1-30 (EUR) | Day 31-60 (EUR) | Day 61-90 (EUR) | Total (EUR) |
| --- | --- | --- | --- | --- | --- |
| Founder time | Solo founder, unpaid during the build | 0 | 0 | 0 | 0 |
| Infrastructure and tools | Hosting, database, storage, email, monitoring | 150 | 300 | 500 | 950 |
| Legal and accounting | Terms, privacy, VAT setup | 3,000 | 3,000 | 2,000 | 8,000 |
| Penetration test | One external test | 0 | 0 | 6,000 | 6,000 |
| **Subtotal** |  | **3,150** | **3,300** | **8,500** | **14,950** |
| Contingency | 15% of subtotal, rounded |  |  |  | 2,250 |
| **Total** |  |  |  |  | **17,200** |

After launch, assume about EUR 5,000 a month for infrastructure, tools, freelance support and marketing, excluding any founder salary. That figure drives the break-even estimate in the next section.

## Revenue Model and Competitive Advantages (Phases 8 and 10)

**At an 80% author share, BookAtlas needs about 4,200 sales a month to cover the assumed EUR 5,000 monthly cost, before paying the founder.** Matching Lulu's stated bookstore share raises break-even by about 58% versus a 70% share, so reader demand is the main business risk.

### Lulu's likely revenue streams

Lulu's public pages do not give enough data to calculate income from each stream, so this table ranks opportunity instead of inventing figures.

| Stream | Evidence | BookAtlas opportunity |
| --- | --- | --- |
| Print profit | Calculator and print-led site | Partner markup after digital traction |
| Marketplace commission | Stated 80% author share on its bookstore | Core launch revenue |
| Distribution fees | One-time retail distribution fee stated | Later, through an aggregator |
| Premium services | Bulk and enterprise contact routes | Paid promotion tools after audience growth |
| Author services | Partner directory | Referral commission from vetted editors and designers |
| ISBN sales | ISBN support for retail distribution | Low priority; digital store sales may not need one |
| API and fulfilment | Print API and ecommerce apps | Avoid until print volume exists |

### Unit economics

Assumes an average price after VAT of EUR 7.00, a EUR 0.15 fee charged to authors, and EUR 0.35 processing cost per sale.

| Measure | 70% author share | 80% author share |
| --- | --- | --- |
| Author receives | EUR 4.75 | EUR 5.45 |
| BookAtlas gross margin | EUR 2.25 | EUR 1.55 |
| Contribution after processing | EUR 1.90 | EUR 1.20 |
| Sales to break even each month | 2,632 | 4,167 |
| Monthly contribution at 10,000 sales | EUR 19,000 | EUR 12,000 |
| Monthly contribution at 50,000 sales | EUR 95,000 | EUR 60,000 |

**Recommendation:** launch at 80% for founding authors for 12 months, then test a lower standard rate paired with promotion and audience tools.

### Weaknesses to target

| Lulu observation | BookAtlas response | Priority |
| --- | --- | --- |
| Print-led experience with several separate channels | One simple path for digital authors | Launch |
| Retail review can take up to 12 weeks | Fast review for the BookAtlas store, with a published service target | Launch |
| Metadata locks after retail publication | Versioned metadata for the BookAtlas store | Launch |
| Separate products for selling and fulfilment | One dashboard for books, sales and audience | Launch |
| Limited reader-side differentiation visible | Unified reading and listening | Launch |

### Better features, ranked

| Feature | Decision | Reason |
| --- | --- | --- |
| AI metadata and SEO generator | Build first | Low risk; author reviews every suggestion |
| AI proofreading coach | Build next | Clear value; never publish changes automatically |
| AI pricing suggestions | After sales data exists | Needs real conversion data |
| Smart recommendations | After enough purchase data | Weak with a small catalogue |
| Author brand hub | Launch version at day 90 | Gives authors a reason to send readers |
| Referral and affiliate program | After fraud controls | Prone to abuse |
| Team collaboration | Later | Useful for small presses, not first authors |
| White-label stores | Later paid tier | Requires tenant, domain and tax work |
| AI cover designer | Hold pending legal review | Rights and store-policy questions |

## Launch Roadmap

**Supply comes first: recruit 100 quality titles before spending on reader acquisition.** Each gate must pass before the next phase starts.

&#91;embedded content: launch roadmap · five phases and four gates, not to scale\]

**Assumptions to validate**

- Authors will move or add titles for a founding 80% share.
- Readers value combined reading and listening enough to try a new store.
- BookAtlas is treated as the seller for EU VAT; an accountant must confirm.
- Stripe's marketplace and tax setup is approved for this business model.
- Rights to all sample and seeded titles are documented.

**Open decisions**

- [ ] Final launch royalty and the length of the founding offer
- [ ] Registered company name, VAT registration and terms owner
- [ ] First print partner, once the print gate passes
- [ ] Funding for the assumed EUR 17,200 build and the first freelance hires

**Sources:** [Lulu homepage](https://www.lulu.com/), [Pricing](https://www.lulu.com/pricing), [Create](https://www.lulu.com/create), [Products](https://www.lulu.com/products), [Sell](https://www.lulu.com/sell), [Print API](https://www.lulu.com/sell/sell-on-your-site/print-api), [Retail distribution](https://www.lulu.com/sell/retail-distribution), [Resources](https://www.lulu.com/resources), [Blog](https://www.lulu.com/blog), [Help center](https://help.lulu.com/). Read on November 8, 2026. Claims about regulation are planning notes, not legal or tax advice.
