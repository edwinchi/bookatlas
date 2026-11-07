# E2E Test Infra: BookAtlas

## Test Philosophy
- Opaque-box, requirement-driven. Derived from user requirements in `ORIGINAL_REQUEST.md` and feature capabilities in `PROJECT.md`.
- No dependency on implementation internals.
- Verification mechanism uses simplest available interface (HTTP endpoints, catalog filters, CLI commands, format validators).
- Methodology: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Combinatorial Testing + Real-World Workload Testing.

## Feature Inventory & Test Coverage Matrix
| # | Feature | Source | Tier 1 (>=5) | Tier 2 (>=5) | Tier 3 (Pairwise) | Tier 4 (Workload) |
|---|---------|--------|:------------:|:------------:|:-----------------:|:-----------------:|
| 1 | Storefront & Catalog Search | ORIGINAL_REQUEST / PROJECT.md | 5 | 5 | ✓ | ✓ |
| 2 | Authentication & RBAC | ORIGINAL_REQUEST / PROJECT.md | 5 | 5 | ✓ | ✓ |
| 3 | In-Browser eReader | ORIGINAL_REQUEST / PROJECT.md | 5 | 5 | ✓ | ✓ |
| 4 | Audiobook Playback Dock | ORIGINAL_REQUEST / PROJECT.md | 5 | 5 | ✓ | ✓ |
| 5 | Personal Bookshelf & Stats | ORIGINAL_REQUEST / PROJECT.md | 5 | 5 | ✓ | ✓ |
| 6 | Cart & Checkout | ORIGINAL_REQUEST / PROJECT.md | 5 | 5 | ✓ | ✓ |
| 7 | Mobile & PWA Navigation | ORIGINAL_REQUEST / PROJECT.md | 5 | 5 | ✓ | ✓ |
| 8 | Reader AI Copilot & Matchmaker | ORIGINAL_REQUEST / PROJECT.md | 5 | 5 | ✓ | ✓ |
| 9 | Gemini Multimodal AI Hub | ORIGINAL_REQUEST / PROJECT.md | 5 | 5 | ✓ | ✓ |
| 10 | Studio Voice Narration | ORIGINAL_REQUEST / PROJECT.md | 5 | 5 | ✓ | ✓ |
| 11 | Durable Publishing Pipeline | ORIGINAL_REQUEST / PROJECT.md | 5 | 5 | ✓ | ✓ |
| 12 | Subscriber CRM (100k) | ORIGINAL_REQUEST / PROJECT.md | 5 | 5 | ✓ | ✓ |
| 13 | Email Campaigns & Unsubscribe | ORIGINAL_REQUEST / PROJECT.md | 5 | 5 | ✓ | ✓ |
| 14 | AI Team Workforce | ORIGINAL_REQUEST / PROJECT.md | 5 | 5 | ✓ | ✓ |
| 15 | Admin Management Portal | ORIGINAL_REQUEST / PROJECT.md | 5 | 5 | ✓ | ✓ |
| 16 | Database Isolation & Supabase | ORIGINAL_REQUEST / PROJECT.md | 5 | 5 | ✓ | ✓ |

## Test Architecture
- **Test Runner**: Node native test runner (`node:test`, `node:assert/strict`) loaded with `tsx`.
- **Test Case Format**: ESM / TypeScript test suites with structured descriptive subtests.
- **Directory Layout**: `tests/e2e/` (or `scripts/src/e2e/`).
- **Pass/Fail Semantics**: Process exits with code 0 on all tests passing, non-zero on failure.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Complete Reader Journey (Discover, Search, Read, TTS Audio) | F1, F3, F4, F5, F10 | High |
| 2 | Multimodal Publishing Lifecycle (Upload, Chapter Outline, EPUB Compile, WAV Generation) | F10, F11, F16 | High |
| 3 | 100k Subscriber CRM Benchmark & Campaign Dispatch | F12, F13 | High |
| 4 | Autonomous Workforce Delegation & Role Escalation | F14, F15 | High |
| 5 | RBAC & Security Boundary Enforcement (Reader vs Admin vs Unauthenticated) | F2, F15, F16 | Medium |
| 6 | Offline Storefront & PWA Cart Simulation | F1, F6, F7 | Medium |

## Coverage Thresholds
- Tier 1: ≥5 test cases per feature (16 × 5 = 80 test cases)
- Tier 2: ≥5 boundary/corner test cases per feature (16 × 5 = 80 test cases)
- Tier 3: Pairwise cross-feature interaction test cases (≥16 test cases)
- Tier 4: Real-world application scenarios (≥6 test cases)
- Total E2E Target: ≥182 test cases
