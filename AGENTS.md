# AGENTS.md — Bookatlas Amsterdam: Engineering & Development Guide

> **Target Audience**: AI Coding Agents (Claude Code, Antigravity, Cursor, Gemini), Full-Stack Developers, and System Architects.
> **Project Identity**: *Bookatlas* — A premier European & African literary bookstore, eReader web application, AI-powered publishing studio, and enterprise-grade 100,000+ subscriber dispatch engine.

---

## 1. Executive Project Overview

Bookatlas is a full-stack, single-tenant literary application designed to emulate the depth and tactile polish of high-end European publishers (such as Amsterdam digital archives) combined with contemporary AI publishing intelligence.

### Core Capabilities:
1. **Digital Bookstore & Catalog**:
   - Filterable book catalog with multi-genre taxonomy (African Philosophy, Quantum Metaphysics, Dutch Heritage, Afrofuturism, Sacred Geometry).
   - In-browser reading samples, audio player docks, and SuperPoints reward system.
   - Shopping cart with checkout simulation, discount privilege validation, and local library persistence.
2. **Tactile In-Browser DRM-Free eReader**:
   - Custom typographic engines (Literata, Sans-Serif, Monospace).
   - Theme palettes (Day, Sepia, Night, Mint, Pure Black OLED).
   - Chapter navigation, font scaling, margin controls, text highlighting, and margin notes.
3. **Studio Audiobook Player Dock**:
   - Floating persistent audio player dock with chapter scrubbers, speed controls (0.75x to 2.0x), and sleep timer.
4. **Subscriber Audience & Campaign Studio (100,000+ Scalability)**:
   - **Pre-Ingest CSV Validation**: Strict RFC-5322 syntax validation, duplicate deduplication, delimiter auto-detection, and column mapping UI.
   - **100k Benchmark Generator**: 1-click generation of 1,000 to 100,000 synthetic reader profiles.
   - **Visual Template Designer**: Dynamic placeholders (`{{subscriber_name}}`, `{{book_cover_url}}`, `{{user_discount_code}}`, `{{tier_badge}}`, `{{1_click_unsubscribe_url}}`), tier previews, and responsive viewport simulator.
   - **A/B Split Testing Campaign Dispatcher**: Subject line & preheader split testing with delivery velocity tracking and analytics.
   - **Automated List Hygiene Engine**: Automated scan to purge hard bounces, dormant contacts (0 opens in 90+ days), and opt-out suppression records.
   - **Tier Access Gates**: Segmented access levels (`free_reader`, `member_subscriber`, `vip_patron` 40% discount).
5. **AI Publishing Suite (Powered by Google Gemini SDK `@google/genai`)**:
   - **AI Matchmaker**: Personalized reading recommendations with match scoring and reader vibes.
   - **AI Executive Book Summarizer**: Philosophical question generator, key quotes, and core takeaways.
   - **Interactive Literary Assistant**: Persona-driven chat with model selection (`gemini-3.1-pro-preview`, `gemini-3.5-flash`, `gemini-3.1-flash-lite`).
   - **Google Search Grounding**: Live citations and search grounding for real-time literary research.
   - **Veo Video Animator**: Cinematic book trailers with aspect ratios (16:9, 9:16) and atmospheric motion styles.
   - **Multimodal Publishing Studio**: Visual cover analysis and OCR manuscript inspection.
   - **Live Voice Companion**: Real-time conversational audio companion.
   - **Automated Marketing Kit**: Press releases, social threads, and discussion guides.
6. **Manager Command Portal**:
   - Inventory manager, catalog CRUD, custom category registry, super admin session lock, and live automation logs.

---

## 2. Technical Stack & Environment

| Layer | Technology | Key Packages / Specifications |
|---|---|---|
| **Runtime** | Node.js (ESM) | TypeScript `~5.8.2`, `tsx` for dev runtime |
| **Backend Server** | Express v4 | `express` `^4.21.2`, bundled via `esbuild` to `dist/server.cjs` |
| **Frontend Framework** | React 19 + Vite 6 | `react` `^19.0.1`, `react-dom` `^19.0.1`, `vite` `^6.2.3` |
| **Styling & UI** | Tailwind CSS v4 | `@tailwindcss/vite` `^4.1.14`, `lucide-react` `^0.546.0`, `motion` |
| **AI Integration** | Google GenAI SDK | `@google/genai` `^2.4.0` (Server-side proxy only) |
| **Document Export** | Client & Server Export | `jspdf` `^4.2.1`, `docx` `^9.7.1`, `canvas-confetti` `^1.9.4` |
| **Port Configuration** | Port 3000 (Mandatory) | Host: `0.0.0.0`, Port: `3000` (Behind reverse proxy) |

---

## 3. Directory Structure & Architecture

```
├── .env.example                # Environment variable declarations (GEMINI_API_KEY, APP_URL)
├── index.html                  # HTML entry point with web font imports
├── metadata.json               # Platform permissions and capabilities
├── package.json                # Dependencies, build & run scripts
├── server.ts                   # Express backend: APIs, Gemini proxy, in-memory DBs, Vite middleware
├── tsconfig.json               # TypeScript strict compilation configuration
├── vite.config.ts              # Vite configuration with Tailwind CSS v4 plugin
└── src/
    ├── main.tsx                # Client React DOM entry point
    ├── App.tsx                 # Root UI controller, routing states, modals, cart & library state
    ├── index.css               # Global Tailwind CSS entry (@import "tailwindcss";)
    ├── types.ts                # Master TypeScript interfaces, enums, models
    ├── data/
    │   └── booksData.ts        # Seed books, chapters, editorial reviews, audio clips
    ├── components/
    │   ├── Header.tsx                   # Main navigation bar, search, cart trigger, tier badge
    │   ├── HeroCarousel.tsx             # Featured book editorial carousel with spotlight actions
    │   ├── BookCard.tsx                 # Tactile book card with format toggles, rating, SuperPoints
    │   ├── HorizontalProductCarousel.tsx # Curated recommendation carousels
    │   ├── FilterSidebar.tsx            # Multi-facet genre, format, price, and tier filters
    │   ├── CartDrawer.tsx               # Interactive sliding checkout drawer with discount codes
    │   ├── BookDetailModal.tsx          # Deep book profile: synopsis, reviews, AI summary, chapters
    │   ├── EReaderModal.tsx             # Fullscreen DRM-free reader with font, theme & notes engine
    │   ├── AudiobookPlayerDock.tsx      # Persistent bottom audio dock with chapter navigation
    │   ├── MyLibraryView.tsx            # Reader library, reading progress %, bookmarks, highlights
    │   ├── SubscriberManagerHub.tsx     # Master 100k audience & email campaign control center
    │   ├── ManagerPortal.tsx            # Inventory manager, price updater, categories, audit logs
    │   ├── AdminAuthModal.tsx           # PIN/Password protected manager unlock gate
    │   ├── UserRegistrationGateModal.tsx # Reader 1-click access gate
    │   ├── UnsubscribePageModal.tsx     # CAN-SPAM compliant 1-click subscriber opt-out portal
    │   ├── AIMatchmakerModal.tsx        # Gemini-powered conversational book finder
    │   ├── GeminiChatbotModal.tsx       # Persona-based literary assistant
    │   ├── GoogleSearchGroundingModal.tsx # Grounded research modal with web sources
    │   ├── VeoVideoAnimatorModal.tsx    # Cinematic book trailer generation modal
    │   ├── MultimodalPublishingStudio.tsx # Image/Cover analysis & AI book compiler
    │   ├── LiveVoiceCompanionModal.tsx  # Interactive voice reader
    │   ├── ExportDocsModal.tsx          # PDF & DOCX export generator
    │   ├── ArchitectureGuideModal.tsx   # System blueprint documentation viewer
    │   ├── EditorialBlock.tsx           # Editorial magazine feature blocks
    │   └── subscriber/
    │       ├── CSVValidationModal.tsx       # Pre-ingest RFC validation & column mapper
    │       ├── VisualTemplateDesigner.tsx   # Visual template builder with placeholder system
    │       ├── EmailAnalyticsDashboard.tsx  # Open rates, A/B winner stats, device distribution
    │       ├── SubscriberCleanupModal.tsx   # Automated list hygiene and purge engine
    │       └── TierAccessGate.tsx           # Tier privilege verification & upgrade banner
    └── utils/
        └── (Export, formatters, audio synthesis utilities)
```

---

## 4. Environment Setup & Configuration

### Prerequisites
- Node.js 20+ (or Node.js 22 LTS)
- npm or bun

### Environment Variables
Create a `.env` file at the root based on `.env.example`:
```env
# Gemini API Key for server-side AI endpoints
GEMINI_API_KEY=your_actual_gemini_api_key_here

# App URL for absolute links, discount redirects, and 1-click unsubscribe tokens
APP_URL=http://localhost:3000
```

### Installation & Execution
```bash
# 1. Install dependencies
npm install

# 2. Run in Development Mode (Vite + Express on Port 3000)
npm run dev

# 3. Type Checking & Linter
npm run lint

# 4. Production Build (Vite client build + esbuild backend bundling)
npm run build

# 5. Production Launch
npm run start
```

---

## 5. Backend Server Architecture (`server.ts`)

All API routes run strictly on the server-side (`/api/*`). The server also mounts Vite middleware during development and serves `dist/` in production.

### Core API Endpoints

#### 1. Books & Catalog
- `GET /api/books` — Returns all catalog items with formats, sample chapters, audio samples, and SuperPoints.
- `POST /api/books` — Creates a new book entry (supports AI-generated books).
- `PUT /api/books/:id` — Updates pricing, metadata, deals, or chapters.
- `DELETE /api/books/:id` — Deletes or archives a catalog title.
- `GET /api/categories` — Retrieves all standard and custom publisher categories.
- `POST /api/categories` — Registers a new custom category.
- `DELETE /api/categories/:name` — Removes a custom category.

#### 2. 100k Subscriber & Email Campaign Engine
- `GET /api/subscribers` — Paginated subscriber list with tier, tag, search, and status filters.
- `POST /api/subscribers/validate-csv` — Pre-validates CSV contents against RFC-5322, checks duplicates and previously unsubscribed emails, and proposes column mappings.
- `POST /api/subscribers/upload-csv` — Ingests up to 150,000 subscriber records with custom tags, tier assignment, and deduplication.
- `POST /api/subscribers/generate-benchmark` — Instantly generates 1,000 to 100,000 synthetic European and global reader profiles.
- `POST /api/subscribers/send-campaign` — Dispatches newsletters with visual templates, placeholder interpolation, and A/B split testing.
- `GET /api/subscribers/campaigns` — Returns history of dispatched broadcasts with analytics.
- `POST /api/subscribers/unsubscribe` — CAN-SPAM compliant 1-click opt-out and resubscribe handler.
- `POST /api/subscribers/cleanup` — Automated hygiene cleanse to prune bounces, dormant 90-day inactives, and invalid entries.
- `GET /api/subscribers/export` — Exports subscribers to CSV.

#### 3. Gemini AI Suite (`@google/genai`)
- `POST /api/ai/match` — Matches user literary taste to books using `gemini-2.5-flash` with JSON output.
- `POST /api/ai/summary` — Generates executive book summaries, philosophical questions, and takeaways.
- `POST /api/ai/chat` — Multi-turn chat using specified models (`gemini-3.1-pro-preview`, `gemini-3.5-flash`, etc.).
- `POST /api/ai/grounded-search` — Queries Gemini with `tools: [{ googleSearch: {} }]` for live citations.
- `POST /api/ai/generate-video` — Generates cinematic book trailers with prompt interpolation and motion styles.
- `POST /api/ai/multimodal-analyze` — Accepts base64 images and manuscripts for OCR, visual analysis, and blurb generation.
- `POST /api/ai/marketing-kit` — Synthesizes press releases, email copy, and discussion questions.
- `POST /api/ai/compose-campaign` — Generates targeted email subject lines and copy for newsletter broadcasts.

#### 4. Manager & Automation
- `GET /api/manager/stats` — Returns store revenue, reader counts, SuperPoints, and autopilot state.
- `POST /api/manager/toggle-autopilot` — Toggles background simulation of reader pages and deal rotation.
- `GET /api/manager/logs` — Returns system automation audit logs.

---

## 6. Frontend Key Modules & State Management

### 1. Root Controller (`src/App.tsx`)
- Manages global views: `store`, `library`, `subscriber-hub`, `manager-portal`, `ai-studio`.
- Controls modal overlays: Reader, Audiobook Dock, Matchmaker, Chatbot, Video Studio, Cart Drawer, and Unsubscribe portal.
- Persists user library, bookmarks, reading streaks, and cart items in `localStorage`.

### 2. Typographic eReader (`src/components/EReaderModal.tsx`)
- Renders full sample chapters with smooth scrolling or page flip modes.
- Text selection toolbar enables instant highlighting (yellow, green, blue, pink) and note attachment.
- Customizable theme engine (`day`, `sepia`, `night`, `mint`, `black`).

### 3. Persistent Audio Player Dock (`src/components/AudiobookPlayerDock.tsx`)
- Renders mini or expanded dock at the bottom of the screen.
- Supports audio scrubbers, speed adjustments (`0.75x`, `1.0x`, `1.25x`, `1.5x`, `2.0x`), chapter skips, and sleep timers.

### 4. Subscriber Management & Campaign Studio (`src/components/SubscriberManagerHub.tsx`)
- **CSV Ingest Tab**: Drag-and-drop file upload triggering `CSVValidationModal`.
- **Visual Template Designer Tab**: Interactive block editor with dynamic placeholders and live preview.
- **Campaign Dispatcher Tab**: Form for subject lines, A/B split tests, cohort selection, and preview devices.
- **Analytics Dashboard Tab**: Delivery stats, open rates, A/B winner comparison, and timeline graphs.
- **List Hygiene Tab**: Automated cleanup modal with deliverability score boost calculation.
- **Audience Directory Tab**: Paginated directory with search, status toggling, and tier filters.

---

## 7. Development Guidelines & Best Practices

### 1. API Key Security
- **Never expose `GEMINI_API_KEY` to client-side code.** All Gemini API calls MUST be proxied through `/api/*` endpoints in `server.ts`.
- Client components MUST make standard `fetch('/api/...')` requests with JSON payloads.

### 2. Styling Standards
- Default to **Tailwind CSS v4** utility classes.
- Use high-contrast, accessible palettes (WCAG AA compliant).
- Use icons exclusively from `lucide-react`. Do not write raw SVG icons.
- Use `motion` (imported from `motion/react`) for smooth animations and transitions.

### 3. High-Volume Subscriber Engine Performance
- Use in-memory `Map` structures on the backend for fast O(1) email lookups.
- Chunk large CSV parsing and synthetic data generation to prevent event-loop starvation.
- Always validate email syntax using RFC-5322 regex before committing records.

### 4. Port & Deployment Rules
- The application MUST bind to `0.0.0.0:3000`.
- The build script compiles both frontend assets into `dist/` and the backend server into `dist/server.cjs` via `esbuild`.
- Run `npm run lint` (`tsc --noEmit`) before committing to verify full type safety.

---

## 8. Verification & QA Checklist

When developing or modifying Bookatlas, ensure the following checklist passes:
- [ ] `npm run lint` completes with `0` errors.
- [ ] `npm run build` succeeds, generating `dist/` and `dist/server.cjs`.
- [ ] CSV Upload validates sample data and correctly matches column headers.
- [ ] 100k Benchmark generation executes smoothly within <2000ms.
- [ ] A/B Testing campaign dispatches with Variant A & B metrics.
- [ ] eReader opens chapters, scales fonts, and changes themes without re-render glitches.
- [ ] Gemini API routes handle missing keys gracefully without crashing the server.

---
*Created for Bookatlas Publishing Group — Amsterdam & Global Literary Archives.*
