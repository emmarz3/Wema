# ProofBank Frontend — Phase 4: Transactions and Ledger — Completion Report

**Phase:** 4 of 9
**Status:** Complete — verified. Stopping for approval before Phase 5.
**Location:** `PROOFBANK/frontend/`

## What was built

1. **Journal entries in the world** (`data.ts`) — every settled transaction posts a **balanced pair** of journal entries: a simulated settlement account stands in for the outside world so total debits always equal total credits. A reversal never edits history: the original entries are marked `REVERSED` and compensating entries are posted alongside them, linked by `compensatesEntryId`.

2. **Transaction endpoints** (`transactions.ts`) — `GET /transactions` with search (reference, ID, correlation ID, scenario), status and type filters, account filter, amount range and date range filters, sorting (created, amount, status, reference) and pagination; `GET /transactions/:id` returning the transaction with its ledger entries, associated events, webhook deliveries and an `inProgress` flag; and the four operations:
   - `POST /transactions/deposit`, `/withdrawal`, `/transfer` — each validates the amount, account existence, account status (frozen/dormant refused) and currency, checks available funds for debits, and **uses the reference as an idempotency key**: reusing a reference returns the original transaction instead of creating a duplicate.
   - `POST /transactions/:id/reverse` — posts compensating entries, marks the originals reversed, and records the reason; only successful transactions can be reversed.
   - **Lifecycle engine**: a created transaction progresses CREATED → PENDING (funds held) → PROCESSING → SUCCESS (balanced entries posted, balances moved) or FAILED (hold released, reason recorded). The engine belongs to the data source; the interface only polls while `inProgress` is true. The simulated provider is degraded, so a minority of operations fail with a stated reason — demonstrating the failure path.

3. **Ledger endpoints** (`ledger.ts`) — `GET /ledger` with search (entry code, reference, account, correlation ID), direction and status filters, sorting, pagination, **and balanced totals** for the filtered set (total debits, total credits, balanced flag); `GET /ledger/:id` returning the entry with its transaction, the full posting pair, and its compensation links.

4. **Transactions workspace** (`TransactionsPage.tsx`) — searchable, filterable table with reference, type, accounts, amount, status and created time; an expandable amount/date filter panel; sortable columns; pagination; **CSV export** of the filtered page; and operation buttons (Deposit / Withdrawal / Transfer / New transaction) gated by the `execute_transactions` capability.

5. **Operation dialog** (`OperationDialog.tsx`) — deposit, withdrawal and transfer forms with account selection showing live available balances, decimal amount input converted to minor units, a generated editable reference (idempotency key) and an optional note; a **review step** with a confirmation summary and an estimated resulting balance (labelled as an estimate the simulation confirms); submission progress; and a result step reporting what the source actually returned — including the "reference reused, no duplicate created" case. Duplicate submission is prevented by disabling the button while in flight and by the reference itself.

6. **Transaction detail** (`TransactionDetailPage.tsx`) — summary tiles (amount, status with explanation, completed, correlation ID); the full transaction record (source/destination with the simulated settlement account named as external, scenario, IDs, reversal state); a **chronological lifecycle timeline** where each transition carries the note the source recorded and the current state is marked; ledger journal entries with direction badges and status; associated events; webhook delivery attempts with a permanent footer stating that delivery status is not the transaction outcome; failure reasons; and a reversal action behind a dialog that explains compensating entries and that history is never edited.

7. **Ledger explorer** (`LedgerPage.tsx`) — totals tiles (total debits, total credits, balance check, entry count), filterable and sortable entry table with transaction-linked navigation, CSV export, and a **read-only journal entry dialog** showing the entry, its source transaction, compensation links and the full posting pair.

8. **Dashboard quick actions** now open the real operations (navigating to `/transactions?operation=…`), and remain permission-aware — read-only roles see "Not permitted".

## Verification (all run, not assumed)

| Check | Result |
| --- | --- |
| `npm run typecheck` | **Pass** — 0 errors |
| `npm run lint` | **Pass** — 0 problems (after removing verification scripts) |
| `npm test` | **Pass** — **155 tests**, 11 files |
| `npm run build` | **Pass** |
| Headless-Chromium verification of the production build | **Pass** — see below |

New tests this phase (29 source-level in `transactions-ledger.test.ts`, 13 page-level in `transactions-pages.test.tsx`): transaction filtering (status, type, amount range), search, sorting, pagination; detail payload assembly; **balanced journal entries for every settled transaction and for the whole ledger**; out-of-balance detection when a filter excludes half a pair; entry detail with compensation links; deposit lifecycle progression through CREATED → PENDING → settled with the ledger and balances matching the outcome; insufficient-funds, frozen-account, unknown-account, invalid-amount and same-account-transfer rejections; **reference idempotency** (reuse returns the original, no duplicate created); reversal posting compensating entries that mirror the originals, marking them reversed, and keeping the ledger balanced; CSV escaping; page-level rendering of the transaction table with status badges and formatted amounts, status filtering, reference search, CSV export availability, the operation dialog opening from the URL, the **full end-to-end deposit flow through the dialog** (select account → amount → review summary → confirm → accepted), read-only roles refused, transaction detail sections and lifecycle, the delivery-vs-outcome disclaimer, the reversal impact statement, ledger balanced totals, direction filtering with the imbalance explanation, and the journal entry dialog.

Browser verification (production preview): the transactions list showed 420 records with amounts, references and all six statuses; the status filter returned only Successful rows; the deposit operation ran end to end (review summary showing ₦2,500.00 and a reference, then "Transaction accepted" with a real reference); the transaction detail page rendered all five sections and the lifecycle advanced from Created → Pending to **Successful with 6 posted journal entries** as the source reported; the ledger explorer showed balanced totals, the direction filter explained "Out of balance" as a filter artefact, and the entry dialog showed the source transaction and the full balanced posting pair (debit on the account, credit on Settlement (simulated)); at 390 px there was no horizontal overflow and tables scrolled inside their container. **0 console errors, 0 failed requests.** Screenshots inspected.

## Issues found and fixed during verification

1. **Ledger balances could be inflated by failed transactions** — the world generator counted FAILED and REVERSED transactions as holds. Only PENDING/PROCESSING work holds funds now; balances were verified non-negative with available ≤ ledger.
2. **A deposit created at PENDING credited the ledger immediately** — settlement timing was wrong. The engine now holds funds while pending and moves the ledger only on settlement, releasing the hold on failure.
3. **Duplicate references were rejected instead of reused** — the operations now return the existing transaction with `duplicate: true`, which the UI reports.
4. **The operation routes were shadowed by the `/transactions/:id` pattern** — the router now excludes the collection paths (`recent`, `deposit`, `withdrawal`, `transfer`) from the id pattern.
5. **The deposit dialog validated and submitted the wrong account field** (source instead of destination) so deposits never passed review — fixed, and a regression test now drives the full dialog flow.

## Deviations and notes

- Deposits and withdrawals post against a simulated settlement account so the ledger stays balanced; this is stated in the interface ("External (simulated settlement)") rather than implied.
- Amount filters take major units in the UI and are converted to minor units for the API, matching the money model.
- A minority of operations fail because the simulated payment provider is degraded — this is deliberate and visible, and each failure records its reason.

## Next

Phase 5 — Simulation control centre: simulation status, modes (live / scenario / replay), supported controls (start, pause, resume, stop), cadence configuration and activity monitoring. Awaiting approval before starting.
