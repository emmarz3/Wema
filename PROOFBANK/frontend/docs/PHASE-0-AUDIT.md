# ProofBank Frontend — Phase 0: Repository & API Audit Report

**Date:** 2026-10-13
**Scope:** `PROOFBANK/` within `WEMA HACKATHON/`
**Status:** Audit complete — awaiting approval

---

## 1. Current frontend state

| Item | Finding |
| --- | --- |
| Frontend code | **None exists.** `PROOFBANK/frontend/` is an empty directory. |
| Build tooling | None. No `package.json`, no lockfile, no config files. |
| Git repository | Not a git repo. No history, no remotes, no baseline. |
| Framework / dependencies | Nothing installed or configured anywhere in `PROOFBANK/`. |
| Environment configuration | No `.env`, no `.env.example`, no deploy config. |
| Sibling product (ProofOps) | `WEMA HACKATHON/PROOFOPS/` is also empty (`backend/` + `frontend/`, no files). Nothing to keep visual compatibility with or reuse. |
| Other clues | `WEMA HACKATHON/firebase-debug.log` exists but is 0 bytes — a Firebase CLI run once started and produced no recoverable configuration. |

**Conclusion: this is a greenfield repository.** The prompt assumes an existing ProofBank backend ("works with the existing ProofBank backend"); none exists on this machine at any location searched.

## 2. Framework and dependencies

Nothing to reuse. Available local toolchain (verified):

- Node.js **v25.9.0**
- npm **11.12.1**
- Git **2.52.0**

Windows 11 environment, `win32`.

Per the prompt, the new frontend will use: **React + TypeScript + Vite + Tailwind CSS + Motion for React (`motion`) + React Router + TanStack Query + React Hook Form + Zod + Lucide icons + Recharts**, with **Vitest + React Testing Library + Playwright** for testing.

## 3. Existing backend endpoints

**None.** `PROOFBANK/backend/` contains zero files — no server, no routes, no database schema, no migrations, no seed data, no API documentation.

## 4. Authentication and permissions

**None exist.** No auth service, no session/JWT mechanism, no users table, no role definitions. The role categories in the prompt (super administrator, simulator administrator, operations user, developer, viewer) are aspirational, not confirmed by any backend.

## 5. Customer / account / transaction APIs

**Do not exist.** No customer, account, or transaction endpoints; no schemas for balances, ledger entries, statuses, or reversals.

## 6. Ledger capabilities

**Do not exist.** No journal-entry endpoints; no double-entry or compensating-entry accounting rules to preserve.

## 7. Simulation control APIs

**Do not exist.** No start/pause/resume/stop, no mode selection (live / scenario / replay), no event-interval configuration, no heartbeat state.

## 8. Scenario APIs

**Do not exist.** No scenario library, no execution endpoints, no run status stream, no execution history.

## 9. Infrastructure APIs

**Do not exist.** No simulated availability, latency, error-rate, queue-delay or incident endpoints.

## 10. Event and webhook delivery APIs

**Do not exist.** No event types are emitted, no webhook destination configured, no delivery-attempt or retry/dead-letter data, no ProofOps integration settings.

## 11. Audit endpoints

**Do not exist.** No audit log storage or query endpoints.

## 12. Missing capabilities and integration risks

| Risk | Impact | Severity |
| --- | --- | --- |
| **No backend of any kind** | Every screen would be dead. Rules 4 ("integrate only endpoints that actually exist") and 13 ("no dead buttons, nonfunctional forms") cannot both be satisfied against a nonexistent API. | **Blocker** |
| Rule 1 says "build the frontend only… do not create a replacement transaction engine" | With no engine present, a frontend-only build has nothing to integrate with; a demo would show empty/error states everywhere. | **Blocker** |
| Rule 6 says "never fabricate a transaction, ledger entry, successful transfer, balance change… in the real application state" | Any data the frontend shows before a backend exists would be fabricated unless it is unambiguously labelled as simulation data. Note the entire product *is* a simulated environment, so the UI must make the simulated origin of every value visible. | **High** |
| No ProofOps product to interoperate with | Event-delivery screens cannot be verified against a real consumer; ProofOps link buttons must not be dead controls. | Medium |
| No auth provider | Sign-in shell must be built against a defined contract, not an existing one. | Medium |
| No design reference for ProofOps | Visual compatibility must be achieved by sharing the same purple/white token direction in both products. | Low |

## 13. Implementation plan (pending approval)

1. **Phase 1 — Design system & application shell.** Vite + React + TS scaffold; Tailwind theme with the specified Wema-inspired tokens; base components (buttons, inputs, selects, tables, dialogs, badges, cards, status pills); app shell with sidebar navigation, top bar, environment indicator, responsive layout, sign-in shell; Motion conventions.
2. **Phase 2 — Overview dashboard.** Metrics, charts, recent activity, simulation state, quick actions.
3. **Phase 3 — Customers & accounts.** Lists, filters, detail pages, forms.
4. **Phase 4 — Transactions & ledger.** Transaction list/detail, lifecycle timeline, ledger explorer, deposit/withdrawal/transfer forms.
5. **Phase 5 — Simulation control centre.** Status, modes, controls, configuration.
6. **Phase 6 — Scenario management.** Library, execution workflow, progress, history.
7. **Phase 7 — Infrastructure & event delivery.** Infrastructure monitoring, event/webhook delivery, ProofOps visibility.
8. **Phase 8 — Audit, settings & administration.** Roles, settings, audit viewer, profile.
9. **Phase 9 — Full QA & release readiness.** Type check, lint, tests, production build, honest handover report.

Data-layer approach (decision required): one typed API client module with every ProofBank endpoint defined in a single contract file, so screens never talk to a transport directly. Whether that client is backed by a real backend or by a clearly-labelled simulation data source is the approval question below.

## 14. Decision required from the approver

Because there is no backend, three lawful paths exist. **No code will be written before this is chosen and Phase 0 is approved.**

- **A — Frontend only, with a clearly-labelled simulated data source (recommended).** Honors rule 1 (no backend work, no transaction engine in the repo backend). A single API-contract module defines every endpoint; a simulation data source implements it for demo use, and every screen visibly labels values as **SIMULATED**. Swapping in the real backend later is a one-file change.
- **B — Frontend only, strictly against a real backend.** The app renders empty/error states until a backend exists. Fully honest, but the hackathon demo would be nonfunctional.
- **C — Frontend plus a new backend.** Deliver a working end-to-end product, but this contradicts rule 1's explicit "build the frontend only" instruction and needs your sign-off as a scope change.
