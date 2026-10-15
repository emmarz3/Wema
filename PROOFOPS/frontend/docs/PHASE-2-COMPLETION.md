# ProofOps Frontend — Phase 2: Public Homepage — Completion Report

**Phase:** 2 of 10
**Status:** Complete — verified. Stopping for approval before Phase 3.
**Location:** `PROOFOPS/frontend/`
**Decision implemented:** Option A — typed API contract + clearly-labelled simulated data source, switchable to a real backend via `VITE_DATA_SOURCE`.

---

## What was built

### Section 1 — Navigation (`components/layout/PublicHeader.tsx`)
ProofOps wordmark + shield/check icon, the four section links (Platform, How it works, Developers, Security), Sign in, and the primary “Open demo” action. Sticky white header with a subtle border that appears on scroll, a sandbox/environment chip, and an accessible mobile menu. Section links are `AnchorLink`s: a plain in-page anchor on the homepage (no reload), a router link home + hash from any other public page.

### Section 2 — Hero (`marketing/Hero.tsx`, `marketing/HeroVerificationPreview.tsx`)
Headline **“Know what happened to every transaction.”** with the specified supporting copy, primary CTA “Explore the demo”, secondary “How it works”, a “Wema Hackathon Edition” label, and a realistic verification interface on desktop (stacked on mobile): proof ID, receipt vs source amounts, verification result badge, four checks, and an outcome strip. The entrance is a **GSAP timeline** (badge → headline lines → copy → CTAs → trust points → preview panel), skipped entirely under `prefers-reduced-motion`. Every value on the panel is badged **Sample** and labelled as simulated.

### Section 3 — Interactive verification demonstration (`marketing/VerificationDemo.tsx`)
Three scenarios, selectable and independently runnable:
- **A — Successful verification:** source and receipt agree at ₦500,000.00; five checks, all passed; outcome *Verified*.
- **B — Amount mismatch:** receipt claims **₦500,000.00**, the authoritative source says **₦250,000.00**; the amount check fails with both values shown; outcome *Mismatch*.
- **C — Payment succeeded, webhook delivery failed:** payment *Successful* and delivery *Failed after 3 attempts* are reported as **separate facts** with an explicit note and per-attempt history (timeout / 502 / 503); outcome *Verified payment — with a failed delivery*.

Controls: **Run demonstration** (autoplay with progress rail), **Step through** (manual), **Run to end**, **Restart**. Checks reveal as the script reaches them with restrained motion; the step region is an `aria-live` announcement; scenario tabs are a proper tablist/tabpanel (`aria-controls`, roving tabindex). Timing is explicitly labelled illustrative — nothing pretends to be a real bank verification and no request leaves the browser. A standing note states a receipt alone is never authoritative proof of payment.

### Section 4 — The problem (`marketing/ProblemSection.tsx`)
Editorial two-column layout, sticky heading, seven practical challenges (unverified receipts, mismatched amounts/references, missing/duplicate records, failed or delayed webhooks, payment-status vs notification-status confusion, slow investigations, disconnected evidence) each with a small purposeful SVG diagram. Staggered scroll reveal; no fear-based messaging, no fraud claims.

### Section 5 — Core capabilities (`marketing/CapabilitiesSection.tsx`)
All nine capabilities as alternating articles, each pairing a concise explanation with a **real interface preview** built from the design system: verification detail with comparison tiles and check list; extracted receipt fields with confidence badges; proof record with field allow-list/expiry/revocation; reconciliation results (matched/unmatched/duplicate with notes); provider health with a latency percentile chart (Recharts); webhook delivery attempt history; incident timeline; developer code examples; and the structured AI investigation panel.

### Section 6 — Dashboard preview (`marketing/DashboardPreview.tsx`)
Responsive preview of the actual workspace with a **Overview / Verification / Infrastructure** segmented control: KPI tiles (24h volume, verified rate, open discrepancies, open incidents), result-mix bar chart with per-outcome colours, discrepancy summary, recent verification activity (sortable DataTable with mobile cards), provider status, incident activity, latency percentiles chart, delivery-outcome chart, provider health table. A standing banner labels all figures as simulated samples that do not represent any real provider or institution.

### Section 7 — How ProofOps works (`marketing/HowItWorks.tsx`)
The four-step flow (receive evidence → verify against the authoritative source → investigate → record and share) with a connector rail and `useInView` staggered reveal; reduced-motion renders at rest.

### Section 8 — AI Investigator (`marketing/InvestigatorSection.tsx`)
Heading **“Investigate with evidence”** with a conventional evidence panel: **Confirmed facts**, **Possible causes** (explicitly labelled hypotheses), **Relevant events**, **Recommended next checks**, and **Source references** — visually and semantically separated, with a footer noting the AI never verifies or mutates records. The AI feature is one section of the page, not its centrepiece.

### Section 9 — Developer integration (`marketing/DeveloperSection.tsx`)
A cURL verification request, the JSON response, and a signed webhook event example — **all mirroring the implemented contract** in `src/api/contract.ts` (idempotency key, minor-unit money, separate status fields). Four integration steps, conventions (idempotency, signatures, money, status separation), and a CTA to the developer console.

### Section 10 — Security and trust (`marketing/SecuritySection.tsx`)
Only implemented mechanisms: server-side verification, signed event handling, role-based access (backend-authoritative), audit trails, idempotency, controlled proof sharing — plus an explicit **verification limits** panel and a statement that no certifications, compliance, bank partnerships or production integrations are claimed.

### Section 11 — Final CTA and footer (`marketing/FinalCta.tsx`, `PublicFooter.tsx`)
“See it on your own evidence” with sandbox / application / developer-docs destinations and the standing simulated-data notice. The footer carries platform, developer, security and workspace link columns plus the “simulated banking data is not a real bank confirmation” statement.

## Verification (all run, not assumed)

| Check | Result |
| --- | --- |
| `npm run typecheck` | **Pass** — 0 errors |
| `npm run lint` | **Pass** — 0 problems |
| `npm test` | **Pass** — **94 tests**, 10 files (16 new: fixtures integrity, homepage structure, demo interactions, scenario switching, dashboard modes, reduced-motion) |
| `npm run build` | **Pass** — chunked, no warnings |
| Browser (production build, headless Chromium) | **Pass** — homepage: **0 console errors, 0 failed requests** |
| GSAP hero entrance | **Pass** — timeline settles (opacity 1, identity transform); skipped under reduced motion by design |
| Demo run-through (browser) | **Pass** — verified scenario completes with 5 passed checks and a proof ID |
| Mismatch scenario (browser) | **Pass** — ₦500,000.00 claim vs ₦250,000.00 source, failing amount check, mismatch outcome |
| Delivery scenario (browser) | **Pass** — payment status and delivery status shown separately; scenario switch resets the run |
| Dashboard mode switching (browser) | **Pass** — all three modes render their panels and tables |
| Anchor navigation (browser) | **Pass** — header links scroll to sections at the 72 px sticky-header offset |
| Tab semantics | **Pass** — tablist/tab/tabpanel with `aria-controls` on all three scenario tabs |
| Horizontal overflow | **Pass** — **0 px at 390 / 768 / 1280** (iframe-probe measured on the full page) |
| Screenshots inspected | **Pass** — hero, full page and demo section match the purple/white direction |

## Issues found and fixed during verification

1. **Fixture arithmetic bug** — `50_000_0000 / 100` produced ₦50,000 instead of ₦500,000 (a factor-of-ten error in minor units). Caught by the demo test; all fixture amounts corrected to direct minor units and locked by a fixtures test.
2. **Mobile horizontal overflow** — grid children holding scrollable content (code blocks, tables) lacked `min-w-0`, stretching the grid tracks at 390 px (408 px of overflow). Fixed across the capabilities, developer, dashboard-preview, demo and investigator grids; now 0 px at every width.
3. **Recharts per-bar colouring** — repeated `<Bar>` children rendered the series multiple times; replaced with a single `<Bar>` + `<Cell>` per datum.
4. **Dead controls in the design-system catalogue** — the EmptyState action and ErrorState retry were no-ops; the EmptyState action now navigates to the verification workspace and the error state is driven by a **live probe** of the configured data source (rendered the real `not_implemented (HTTP 501)` from the simulated transport during verification).
5. **Routing test** referenced the removed Phase-1 placeholder; updated to assert the real homepage.
6. **Vitest forks workers failed to start** under memory pressure from concurrent preview/browser processes; `npm test` now runs `vitest run --pool=threads`, which completed all 94 tests reliably.

## Deviations and notes

- The demo and dashboard preview use controlled in-page fixtures (`marketing/demoFixtures.ts`); no demonstration data is written anywhere, and every figure is labelled sample/simulated.
- GSAP is used only for the hero entrance (per the motion plan); all other motion uses Motion for React with `MotionConfig reducedMotion="user"`.
- Section ids `#platform`, `#how-it-works`, `#developers`, `#security`, `#demo` back the navigation links; footer links to workspace routes land on honest in-progress states until their phases ship.

## Next

**Phase 3 — Authentication and application shell:** supported sign-in/out flows against the session endpoints in the contract, session persistence and expiry handling, protected routes, role-aware navigation and error handling. Awaiting approval before starting.
