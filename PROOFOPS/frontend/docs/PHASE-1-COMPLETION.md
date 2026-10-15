# ProofOps Frontend — Phase 1: Design System & Application Foundation — Completion Report

**Phase:** 1 of 10
**Status:** Complete — verified. Stopping for approval before Phase 2.
**Location:** `PROOFOPS/frontend/`
**Decision implemented:** Option A — typed API contract + clearly-labelled simulated data source, switchable to a real backend via `VITE_DATA_SOURCE`.

---

## What was built

### 1. Scaffold & toolchain
Vite 7 + React 19 + TypeScript 5.9 (strict) + Tailwind CSS 4 (`@tailwindcss/vite`) + Vitest 5 (jsdom) + ESLint 9 flat config. `@` path alias. Manual vendor chunking (react / router / motion / query / charts) so no chunk warning and caching is sane. Scripts: `dev`, `build` (typecheck + build), `preview`, `typecheck`, `lint`, `test`.

### 2. Design tokens & base CSS (`src/index.css`)
The Wema-inspired palette as `@theme` tokens: brand `#990D81`, accent `#AE328E`, plum `#38203B`, canvas `#F5F4F7`, surfaces, ink/secondary text, lines, status colours (success `#287D61`, warning `#A66B16`, danger `#B42318`, info `#315E8A`) with soft-tint backgrounds, radii (8–12 px), motion durations (150–250 ms). Inter Variable for UI, JetBrains Mono for identifiers. Tabular numerals via `data-numeric`. Global `prefers-reduced-motion` handling and a visible focus ring.

### 3. Centralised libraries (`src/lib/`)
- **`status.ts`** — the status vocabulary as single source of truth: verification results (verified / mismatch / unverified / suspicious / unknown), check outcomes (passed / failed / indeterminate), transaction statuses, verification workflow statuses, webhook delivery statuses (delivered / pending / retrying / failed / dead-lettered), provider health, incident severity/status, discrepancy kinds/statuses, reconciliation statuses — each with label, tone and icon. Colour is never the only signal.
- **`format.ts`** — money (minor units + currency), compact money, percentages, dates, relative time, file sizes, middle truncation.
- **`permissions.ts`** — roles (owner / admin / analyst / developer / viewer) × capabilities (13) and section visibility.
- **`motion.ts`** — durations, easing, page/list/dialog variants, highlight keyframes; `prefersReducedMotion()`.
- **`chartPalette.ts`**, **`exportCsv.ts`** (RFC-safe escaping), **`utils.ts`** (cn, deterministic random for later simulated data).

### 4. Domain model (`src/types/domain.ts`)
Full entity set for all ten phases: Money, Page, session/organisation, Verification (checks, receipt, source record, reversal, duplicate), ProofRecord/ProofShare/ProofAccessEntry/PublicProofView, Discrepancy, Reconciliation (run, rows, candidates, column mapping), Infrastructure (services, deliveries, attempts, events, latency), Incidents (timeline, notes), AiInvestigation (confirmed facts vs possible causes vs sources), developer (keys, webhooks, request logs), notifications, audit, dashboard summary. Parallel status vocabularies are deliberately separate types.

### 5. API layer (`src/api/`)
- **`contract.ts`** — the auditable route table for every ProofOps capability (auth, overview, verifications, receipts, proofs + shares + public view, discrepancies, reconciliation, infrastructure, incidents, investigations, developer, notifications, settings), each route with a one-line backend obligation and public/private marking. `buildPath` / `withQuery` / `allRoutes` helpers.
- **`client.ts`** — typed `ApiClient` with every method; token kept in module scope via `setActiveToken`.
- **`errors.ts`** — `ApiError` with stable classification: `isNetworkError`, `isSessionExpired`, `isPermissionDenied`, `isUnavailable` (message states no outcome was recorded), `isNotImplemented`.
- **`backendTransport.ts`** — real fetch transport (30 s timeout, FormData support, bearer token), network failures normalise to status 0.
- **`simulated/`** — labelled simulated transport with a route registry, path-template matching, session gate for workspace routes (401 for public routes never), and a structured **501 `not_implemented`** for unbuilt routes so unfinished capabilities are honest, not fabricated.
- **`index.ts`** — source selection from env: `VITE_DATA_SOURCE`, `VITE_API_BASE_URL`, `VITE_AUTHORITATIVE_SOURCE_LABEL`, `VITE_APP_ENV`.

### 6. UI component library (`src/components/ui/`)
Button (variants, loading/aria-busy), Panel/PanelHeader/Body/Footer, Badge/Chip, Field/Input/Textarea/Select/Checkbox/Switch, DataTable (sortable headers with `aria-sort`, tabular numeric cells, skeleton loading, container-confined scroll, optional mobile record cards), Dialog (focus move-in, Escape, backdrop close, focus restore, scroll lock, Tab trap), Drawer, Tabs (roles + arrow keys), SegmentedControl (radiogroup), Tooltip (hover/focus/Escape), DropdownMenu (roles, arrows, outside-click), Pagination (range + edges), SearchInput (proper trailing debounce), Spinner/Skeleton/RouteProgress, States (Loading/Empty/Error-with-retry/Unavailable/NoticeBanner), Toaster (only-after-result, aria-live, auto-dismiss), CopyButton (clipboard + confirmation), CodeBlock (dependency-free JSON/shell highlighting + copy).

### 7. Layout shells (`src/components/layout/`)
- **Marketing** — sticky PublicHeader (anchors, environment chip, accessible mobile menu), PublicFooter (link columns, simulated-data notice).
- **Auth** — split panel with product proof points, brand panel, simulated-source notice.
- **Workspace** — AppShell with collapsible sidebar (active indicator, role-aware nav from `permissions.ts`, persisted collapse), Topbar with breadcrumbs and source chip, mobile off-canvas navigation, PageHeader.

### 8. Routes & catalogue (Phases 2+ land against these)
`/` (public notice until Phase 2), `/sign-in` (auth shell until Phase 3), `/design-system` (**live catalogue** driving a real source probe), `/app/*` workspace sections showing honest "arriving in Phase N" states, 404s in both layouts. Every control on every rendered route performs a real action — the catalogue's probe calls the actual typed client and renders the real error.

## Verification (all run, not assumed)

| Check | Result |
| --- | --- |
| `npm run typecheck` | **Pass** — 0 errors |
| `npm run lint` | **Pass** — 0 problems |
| `npm test` | **Pass** — **78 tests**, 8 files |
| `npm run build` | **Pass** — chunked, no size warnings |
| Browser (production preview, headless Chromium) | **Pass** — `/design-system`, `/app`, `/app/reconciliation`, `/sign-in`, 404s: **0 console errors, 0 failed requests** |
| Dialog behaviour in browser | **Pass** — opens with `aria-modal` + label, focus moves inside, Escape closes |
| Toast lifecycle in browser | **Pass** — raised after click, auto-dismissed |
| Tab switching in browser | **Pass** — `aria-selected` moves |
| Live source probe in browser | **Pass** — renders the real `not_implemented (HTTP 501)` from the simulated transport |
| Horizontal overflow | **Pass** — 0 px at 390 px and 768 px on `/`, `/sign-in`, `/app`, `/app/verification`, `/design-system` (iframe-probe measurement) |
| Screenshots inspected | **Pass** — workspace shell and catalogue match the Wema-inspired purple/white direction |

Test coverage this phase: formatting (money/compact/percent/relative/file-size), status vocabulary completeness and parallelism, permissions matrix + section visibility, Button, Badge, Dialog (open/Escape/backdrop/focus), Field (label-association, error alert, switch), Tabs (click + arrow keys), SegmentedControl, CopyButton (clipboard), DropdownMenu (open/select/close), toast push/dismiss, DataTable (render, `aria-sort` toggling, empty state, skeleton, mobile cards), Pagination edges, routing (all routes + notices + 404 + sidebar interactions), API contract (`buildPath`/`withQuery`/route catalogue), error classification, simulated transport (401/501/public gate), backend transport (network failure + token + JSON parse), and the catalogue (sections render, live probe, toasts).

## Deviations and notes

- `.env.example` / `.gitignore` could not be created (dotfile creation is blocked on this machine). The README documents the exact variables and the ignore list; `.env` is optional for the app to run.
- Workspace screens scheduled for later phases render an honest in-progress state that names the delivering phase — no placeholder screens, no fabricated values, no dead controls.
- The public homepage root shows a temporary notice until Phase 2 replaces it.

## Next

**Phase 2 — Public homepage:** navigation, hero (GSAP sequence), the interactive three-scenario verification demo, problem section, nine capabilities with real interface previews, dashboard preview (Overview/Verification/Infrastructure modes), how-it-works, AI Investigator evidence panel, developer integration, security & trust, and the responsive footer — with every link and demo control verified.
