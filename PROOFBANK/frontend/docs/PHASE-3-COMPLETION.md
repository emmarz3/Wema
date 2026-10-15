# ProofBank Frontend — Phase 3: Customers and Accounts — Completion Report

**Phase:** 3 of 9
**Status:** Complete — verified. Stopping for approval before Phase 4.
**Location:** `PROOFBANK/frontend/`

## What was built

1. **Customer endpoints** (`src/api/simulated/customers.ts`) — `GET /customers` with search (name, email, code), status filter, sorting (name, created, account count) and pagination; `GET /customers/:id` returning the profile with linked accounts, recent transactions and related event history; `POST /customers` with field validation; `PATCH /customers/:id`; `POST /customers/:id/status` with a stated rule: **suspending a customer freezes their linked accounts, reactivation restores them**, and both are recorded in each account's status history.

2. **Account endpoints** (`src/api/simulated/accounts.ts`) — `GET /accounts` with search (number, customer, id), type and status filters, sorting (number, customer, available balance, created) and pagination; `GET /accounts/:id` returning balances, recent transactions, full status history and the posted journal-entry count; `POST /accounts` (zero opening balance, NGN/USD/GBP/EUR, rejects unknown customers and unsupported currencies); `POST /accounts/:id/status` recording every change in history.

3. **Account status history and ledger-entry counts in the world** — every account carries a chronological status history (opened, dormancy, freeze/restore cycle, runtime changes) and a count of posted journal entries derived from settled and reversed transactions.

4. **Customers workspace** (`src/pages/CustomersPage.tsx`) — searchable, filterable, sortable, paginated table (name, code, contact, account count, status, created); empty state with clear-filters action; permission-aware "New customer" action; create dialog.

5. **Customer detail** (`src/pages/CustomerDetailPage.tsx`) — profile statistics, linked accounts table, recent transactions, event history, edit dialog, and a suspend/reactivate dialog that states the impact (linked accounts will be frozen) before confirming.

6. **Accounts workspace** (`src/pages/AccountsPage.tsx`) — searchable table showing **available and ledger balances side by side** exactly as the source reports them, with type/status filters, sorting, pagination, permission-aware "New account" action, and a footnote explaining the available-versus-ledger distinction.

7. **Account detail** (`src/pages/AccountDetailPage.tsx`) — available/ledger/held-balance statistics, ledger entry count, full account details, chronological status history with actor and note, recent transactions, and a controlled status-change dialog.

8. **Shared infrastructure** — a toast notification system (`ToastProvider`/`useToast`) for action outcomes; `SearchInput` with debounce and clear; `Pagination` driven by the source's totals; `StatusChangeDialog` for controlled status changes; `CustomerForm` and `AccountForm` on React Hook Form + Zod with backend field errors mapped back onto the matching inputs.

## Verification (all run, not assumed)

| Check | Result |
| --- | --- |
| `npm run typecheck` | **Pass** — 0 errors |
| `npm run lint` | **Pass** — 0 problems |
| `npm test` | **Pass** — **112 tests**, 9 files |
| `npm run build` | **Pass** |
| Headless-Chromium verification of the production build | **Pass** — see below |

New tests this phase (25 source-level in `customers-accounts.test.ts`, 13 page-level in `customers-pages.test.tsx`): pagination, sorting and search across customers and accounts; status and type filters; balance invariants on detail payloads; customer create validation and creation; customer update validation; suspend-freezes-accounts and reactivation-restores; account creation at zero balance with customer/currency rejection; status-change history recording; 404s for unknown ids; page-level rendering of both workspaces, debounced search, pagination, form validation before submission, successful create with notification, read-only role disabling, detail sections, and the suspend impact statement.

Browser verification (production preview): customer list showed "Showing 1–10 of 24", search narrowed to exactly one matching record, column sorting flipped the order, page 2 worked, creating a customer took the total from 24 to 25 with a confirmation notification; the customer detail page rendered profile, linked accounts, recent transactions and event history; the accounts list showed 38 accounts with tabular ₦ balances; the frozen filter returned 2 accounts, all frozen; the account detail page rendered balances, held-by-pending, ledger entry count, account details and status history; at 390 px there was no horizontal overflow, the mobile navigation button appeared and tables scrolled inside their container. **0 console errors, 0 failed requests.** Desktop and mobile screenshots inspected.

## Issues found and fixed during verification

1. Parameterised routes (`/customers/:id`) did not match real identifiers in the simulated router — routes are now normalised to template form before dispatch, with ids extracted by pattern.
2. New accounts were generated with 9-digit numbers — fixed to the 10-digit format.
3. `SearchInput` lost typed characters when a parent re-render raced the debounce — the visible value is now held in local state with external sync, so typing is never reset.
4. Detail pages could not read route params in tests without a `Routes` wrapper, and auth-dependent buttons raced the session bootstrap — both fixed in the shared test harness.

## Deviations and notes

- The ledger explorer on the account detail screen shows the posted-entry count and states that individual journal entries arrive with the Ledger section (Phase 4); no ledger data is fabricated.
- Customer detail shows event history for the customer's transactions; full audit records arrive with the Audit Logs section (Phase 8).

## Next

Phase 4 — Transactions and ledger: transaction operations, transaction details, lifecycle timelines, ledger explorer and financial operation forms. Awaiting approval before starting.
