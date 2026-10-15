# ProofBank Frontend — Phase 2: Overview Dashboard — Completion Report

**Phase:** 2 of 9
**Status:** Complete — verified. Stopping for approval before Phase 3.
**Location:** `PROOFBANK/frontend/`

## What was built

1. **Simulated data world** (`src/api/simulated/data.ts`) — a deterministic, seeded simulation of the banking environment: 24 customers, 35 accounts, 420 transactions spread across 30 days (with a dense recent-activity window so the default 24-hour view is representative), status lifecycles with timestamps and notes, generated events and webhook delivery attempts, 14 scenario executions, simulated incidents and provider services. Balances are owned by the source: opening balances are derived from each account's actual drawdown, so **no balance is ever negative and available ≤ ledger on every account**. Generation is seeded, so the same world shape appears on every boot.

2. **Dashboard metric computation** (`src/api/simulated/metrics.ts`) — pure, testable computation of every dashboard figure: period counts by status, settled volume, previous-period comparison, hourly/daily volume buckets, status distribution with shares, scenario and delivery roll-ups, infrastructure counts.

3. **New API surface** — `GET /dashboard/summary?range=24h|7d|30d` (rejects unsupported ranges with a 400 rather than inventing one), `GET /transactions/recent`, `GET /events/recent`, `GET /scenario-executions/recent`, `GET /event-deliveries/recent`, `GET /infrastructure/health`. All added to `routes.ts` and the typed client; the client is transport-agnostic, so a real backend can serve the same routes.

4. **Overview dashboard** (`src/pages/OverviewPage.tsx`) — 8 metric tiles (simulated customers, active accounts, settled volume, successful, failed, pending, reversed, total transactions) with **trend deltas computed from the source's previous-period values**; a range selector (24h / 7 days / 30 days) that re-queries the source; a stacked volume chart with axes, tooltips, legend and range-aware bucket labels; status distribution with a stacked summary bar plus counts and shares; recent transactions table; simulation event feed; recent scenario executions; event delivery attempts table; simulation state panel (state, mode, cadence, heartbeat, events generated, active scenario); simulated provider health with open incidents; quick actions; and an exact period-totals panel.

5. **Safety framing in the UI** — the delivery table carries a permanent footer stating that delivery status is not transaction outcome; the provider health panel states its conditions are injected simulations, not interface faults; the quick actions panel shows the deposit/withdrawal/transfer operations as visibly scheduled for Phase 4 (disabled, labelled) instead of dead buttons, and marks them "Not permitted" for read-only roles.

## Verification (all run, not assumed)

| Check | Result |
| --- | --- |
| `npm run typecheck` | **Pass** — 0 errors |
| `npm run lint` | **Pass** — 0 problems |
| `npm test` | **Pass** — **74 tests**, 7 files |
| `npm run build` | **Pass** |
| Headless-Chromium verification of the production build | **Pass** — see below |

New tests this phase (19 in `simulated-data.test.ts`, 15 in `dashboard.test.tsx`): determinism of the world; balance invariants (non-negative, available ≤ ledger) on every account; transaction lifecycle coherence (chronology, terminal states have completion timestamps, failed transactions explain themselves, deposits have destinations, withdrawals have sources); metric invariants (statuses sum to total, volume comes only from successful transactions, bucket totals match the metric total, shares sum to 100%); 7-day/30-day range support; API behaviour (unsupported range → 400, recent-record limits, infrastructure health); dashboard rendering (tiles populated with formatted money and tabular numerals, all panels present, range switching, quick actions supervisor-vs-viewer permissions, delivery disclaimer, scheduled operations disabled); isolated component tests (metric delta computation, empty chart/breakdown states, chart bucket totals, delivery attempts).

Browser verification (production preview): 8 metric tiles populated with live source values (24 customers · 35 accounts · ₦1.85M settled · 109 successful · 13 failed · 21 pending · 2 reversed · 150 total for 24h); all ten panels render; the stacked chart drew 46 bars with axis ticks; range switching to 7 days works; quick-action links render and the three operation buttons are disabled; the delivery disclaimer is visible; **no horizontal overflow at 390 px** (a top-bar badge overflow found during verification was fixed); desktop and mobile screenshots inspected.

## Issues found and fixed during verification

1. Ledger balances could go negative for accounts with heavy debit history — opening balances are now derived from each account's required drawdown, guaranteeing non-negative balances with available ≤ ledger.
2. Two flaky navigation tests under parallel load — integration-style test timeouts raised (`testTimeout: 30s`, explicit `waitFor` budgets).
3. Mobile horizontal overflow at 390 px caused by the responsive `hidden` class losing to the Badge base `inline-flex` — the environment indicator now uses wrapper elements for responsive display, and shows a compact `SIMULATED` badge on small screens.

## Deviations and notes

- Quick actions for deposits/withdrawals/transfers are shown as scheduled Phase 4 operations rather than working buttons, because the operation forms and their API routes belong to Phase 4. This was verified in the browser: the buttons render disabled with a clear explanation.
- Trend deltas reflect the source's actual previous-period activity; the simulation concentrates recent activity, so deltas on wider ranges are large but truthful.

## Next

Phase 3 — Customers and accounts: list, search, filters, detail pages and supported customer/account forms. Awaiting approval before starting.
