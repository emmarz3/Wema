# ProofBank Frontend — Phase 1: Design System and Application Shell — Completion Report

**Phase:** 1 of 9
**Status:** Complete — verified. Stopping for approval before Phase 2.
**Location:** `PROOFBANK/frontend/`

## What was built

1. **Project scaffold** — Vite 7 + React 19 + TypeScript (strict) in `frontend/`, matching the approved stack: Tailwind CSS v4, Motion for React (motion 12), React Router 7, TanStack Query 5, React Hook Form + Zod, Lucide icons, Recharts installed for later phases. ESLint flat config (typescript-eslint + react-hooks). Vitest 5 + React Testing Library. Inter and JetBrains Mono Variable bundled locally via Fontsource (works offline).

2. **Design token system** (`src/index.css`) — the full Wema-inspired palette as CSS custom properties: primary purple `#990D81`, secondary purple `#AE328E`, deep plum `#38203B`, white, page background `#F5F4F7`, secondary surface `#F0EDF2`, main text `#26212B`, secondary text `#6D6673`, borders `#E4DEE7`, success `#287D61`, warning `#A66B16`, error `#B42318`, informational `#315E8A`, plus derived hover/tint variants and readable status tints. Radii constrained to 8–12px. Motion durations 150/200/250 ms. Global reduced-motion handling.

3. **Centralised status vocabulary** (`src/lib/status.ts`) — every transaction status, transaction type, simulation state/mode, delivery status and ledger direction carries a **label, a tone, an icon and a plain-language explanation**, so state is never communicated by colour alone.

4. **Reusable UI components** — Button (4 variants, loading state), Input/Select/Field (label + hint + error with full aria wiring), Badge and StatusBadge, Panel and Stat, Table parts with sortable headers, accessible Dialog (labelled, Escape, focus move), Loading/Spinner/Skeleton, EmptyState, ErrorState (turns an `ApiError` into a what-happened-plus-what-to-do message).

5. **Application shell** — 11-section sidebar (Overview, Customers, Accounts, Transactions, Ledger, Simulation Control, Scenarios, Infrastructure, Event Delivery, Audit Logs, Settings) filtered by role; top bar with the persistent environment indicator **PROOFBANK — SIMULATED BANKING ENVIRONMENT**, live simulation state, mode, configured cadence, a relative "Updated …" refresh indicator, and a user menu with role and working sign-out; mobile drawer navigation; breadcrumbs and page headers; role-restricted pages; reduced-motion-safe page transitions.

6. **Authentication shell** — split-layout sign-in page with the simulated-environment disclaimer, React Hook Form + Zod validation (email format, password length, role), a demonstration-role selector, per-field and form-level error states, and a list of demonstration operators. Session bootstrap restores an existing session; sign-out clears it. All routes are permission-aware (`RequireAuth`, section guards).

7. **Typed API layer** — `ApiClient` over a single transport seam. `routes.ts` is the only place URLs are defined. Two transports: the labelled simulated data source (auth, session, simulation status) and a fetch-based backend transport activated with `VITE_DATA_SOURCE=backend`. Errors normalise into `ApiError` with a code, validation fields and user guidance. The simulated source owns its own 15-second simulation clock — the UI only reads heartbeat, mode and cadence from it.

## Verification (all run, not assumed)

| Check | Result |
| --- | --- |
| `npm run typecheck` (tsc --noEmit, strict) | **Pass** — 0 errors |
| `npm run lint` | **Pass** — 0 problems |
| `npm test` (Vitest) | **Pass** — 40 tests, 5 files |
| `npm run build` | **Pass** — built in ~10s |
| Browser verification (headless Chromium) | **Pass** — see below |

Test coverage delivered this phase: money/date/identifier formatting; role capability matrix and section visibility; Button (incl. loading/disabled); invalid-input aria state; every status badge label/tone distinctness; Dialog open/close/Escape; API error state with retry; empty state; auth bootstrap, sign-in, sign-out with the simulated source; unauthenticated redirect; session restore; top-bar simulation status rendered from the data source; a click-through that opens **all 11 sections** as a supervisor; viewer navigation hiding + restricted-section message; full form sign-in flow; invalid submission rejected before contacting the source; reduced-motion usability.

Browser verification (production preview): page title and environment identity render; **0 console errors and 0 failed network requests**; environment badge, wordmark, `Running`, `Live simulation` and `15s cadence` all render in the top bar; every one of the 11 sections opens with its correct heading; user menu shows the role and `Sign out` works (session cleared, returns to sign-in); mobile viewport renders the hamburger navigation. Screenshots were inspected for the sign-in page, desktop workspace and 390 px mobile layout — professional purple/white design confirmed, no overflow.

## Deviations and notes

- No backend exists, so the simulated data source stands in for it, per the approved Phase 0 decision. Every value it returns is labelled SIMULATED in the interface, and screens are already written against the same client contract a real backend will satisfy.
- Sign-in accepts demonstration credentials because authentication is simulated; this is stated in the UI rather than implied.
- The remaining workspace screens render an honest "Delivered in Phase N" panel naming their phase — no dead controls and no fabricated data. They are scheduled exactly as the approved plan defines.
- `.env.example` could not be written to disk (file-type restriction in this environment); its full contents are documented in `README.md`.

## Next

Phase 2 — Overview dashboard: operational metrics, charts, recent activity, simulation state and quick actions, all driven by the data source. Awaiting approval before starting.
