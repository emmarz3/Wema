# Phase 6 Completion — Scenario Management

## Objective

Complete the scenario library, execution workflow, status progression, generated-record
inspection and scenario history.

## Scope — completed in this phase

- **Scenario library** (`src/api/simulated/scenarios.ts`, surfaced by `ScenariosPage.tsx`):
  23 implemented scenarios across two groups — 13 financial (successful deposit /
  withdrawal / transfer, insufficient funds, invalid account, currency mismatch, failed
  transaction, pending, delayed, reversal, duplicate request, repeated reference, amount
  discrepancy) and 10 infrastructure (webhook delivery failure, repeated retries, delayed
  webhook, out-of-order events, provider timeout, simulated API latency, simulated
  provider outage, queue processing delay, recovery, duplicate event delivery). Each
  scenario declares its description, expected behaviour, permitted parameters and side
  effects; the interface reproduces the source verbatim.
- **Execution workflow**: a scenario is selected from the library, its expected behaviour
  is shown before anything runs, permitted parameters are configured within validated
  limits (account + amount, or none where deterministic), the impact on the simulation is
  reviewed, and only then is the run started.
- **Status progression**: the data source owns the execution. It advances each run through
  five steps on its own clock (`Prepare context → action → record events → deliver →
  record result`), and the interface polls that state. It never marks a scenario
  successful on its own — a completed run reflects what the source reported.
- **Generated-record inspection**: the run detail lists the real records a run produced
  and links to the canonical screens (transaction lifecycle, journal entries, status
  history). Event counts and any recorded incident are surfaced honestly, and the
  interface is explicit that ProofOps is a separate product it does not claim an
  authorised integration with.
- **Scenario history**: every run — live and seeded — is listed newest first with its
  result, duration, generated-record count and start time.

## Defect found and fixed during verification

The scenario history offered a **dead button**: recorded (seeded) executions reused the
runtime `run_` id prefix, so their "View" (and the "Running now" → View progress) controls
looked enabled but opened a failed "No scenario run with that identifier" request.

Fixed against the "no dead buttons" rule:

- `src/api/simulated/data.ts` — recorded executions now use a distinct `exec_` id prefix
  so they are distinguished from live runs.
- `src/pages/ScenariosPage.tsx` — "Running now" View progress is gated the same way the
  history table already was: recorded runs are disabled with the explanation "recorded
  before step-level detail was available"; live runs stay viewable.
- `src/__tests__/scenarios-page.test.tsx` — added a regression test asserting recorded
  history rows are disabled rather than opening a failed request.

## Verification

Run against the production build (`npm run build` then `vite preview`).

- **Automated**: `npm run typecheck` (0 errors), `npm run lint` (0 problems),
  `npm run build` (success), `npm test` — **204 passed** (15 files), including the
  scenario data-source tests, the scenarios-page workflow tests and the new regression test.
- **Browser (headless Chromium, production preview)**: signed in and landed on `/scenarios`;
  the 23-scenario library rendered both groups; ran **"Successful deposit"** end to end —
  configure → review impact → start → the run progressed through all five steps on the
  engine's own clock to **Succeeded** → a real transaction was generated (a Deposit for
  **₦2,500.00**) and opened into its lifecycle / ledger / status-history detail → the
  execution appeared in history. **0 console errors, 0 failed network requests.**
  The regression fix was confirmed live: on a fresh load every recorded history "View" is
  disabled, "Running now" View progress is disabled for the recorded run, and a live run's
  "View" opens a real detail.

**Environment note.** The simulated world, like every earlier phase, is deterministic
in-memory state rebuilt on a full page reload; scenario runs are not persisted across a
reload. This matches the rest of the workspace and is why generated-record inspection is
performed within a single live session.

## Next

- **Phase 7** — Infrastructure and event workflow: services, incidents, queue status,
  webhook deliveries and raw event inspection; explicit ProofOps cross-links; emergency
  pause visuals. Awaiting approval before starting.
