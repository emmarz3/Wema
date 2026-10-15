# ProofOps Frontend — Phase 0: Repository Audit & Implementation Plan

**Date:** 2026-10-13
**Scope:** `PROOFOPS/` within `WEMA HACKATHON/`
**Status:** Audit complete — **stopping for approval before Phase 1. No code has been written.**

---

## 1. Repository findings

| Item | Finding |
| --- | --- |
| Frontend code (`PROOFOPS/frontend/`) | **None.** Contains only `firebase-debug.log` (1 KB, Firebase CLI auth traces). No `package.json`, lockfile, configs, or source. |
| Backend code (`PROOFOPS/backend/`) | **None exists.** Zero files — no server, routes, schemas, seeds, or API docs. |
| Git repository | **No.** No history, remotes, or baseline anywhere under `PROOFOPS/`. |
| Environment configuration | No `.env`, `.env.example`, or deploy config. |
| Firebase state | CLI authenticated as `lateefwarris12@gmail.com`; **no project initialised** in this directory; existing projects (`brainpop-game`, `chapel-flow`) are unrelated. |
| Sibling product (`PROOFBANK/`) | A **working reference implementation** of the same architecture, built to **Phase 4 of its own 9-phase plan** (~85 source files, 155 tests passing, production build verified). It is the *simulated banking environment* that produces the authoritative source records and outbound webhook deliveries ProofOps consumes (`https://proofops.simulated.test/hooks/proofbank`). Its `backend/` is likewise empty; its frontend runs on a clearly-labelled simulated data source behind a typed API contract (the approach chosen in its own Phase 0 audit, "Option A"). |

**Conclusion: ProofOps is a greenfield frontend on a greenfield workspace.** The master prompt's "existing backend" does not exist anywhere on this machine. The ProofBank sibling is not a backend — it is a frontend product. However, its code is an **existing, audited, tested implementation of the exact architecture the prompt prescribes** (React + TypeScript + Vite + Tailwind + Motion + Router + TanStack Query + RHF + Zod + Lucide + Recharts, same purple/white tokens), so Phase 1 will **adapt those established conventions** rather than invent new ones (rule 3).

## 2. Existing features to preserve

- **Nothing to preserve inside `PROOFOPS/`** — the directory is empty. Nothing will be deleted or modified; the only existing file (`firebase-debug.log`) is inert CLI output.
- **`PROOFBANK/` will not be touched at all.** Its simulated world (customers, accounts, transactions, lifecycle, ledger, scenarios, webhook deliveries to the ProofOps destination) is the upstream system ProofOps verifies *against*. In the ProofOps build it is referenced as the simulated authoritative source, never modified.
- Conventions adopted from ProofBank (verified by reading its source): typed API client with a single route table; transport abstraction (`simulated` / `backend`) selected by `VITE_DATA_SOURCE`; roles/capabilities matrix; motion conventions (150–250 ms); `@theme` design tokens; money as minor units + currency code; test stack (Vitest + React Testing Library, jsdom).

## 3. API integration map

**There is no live backend to integrate with.** No endpoint, auth mechanism, or event schema exists to discover. Therefore the ProofOps API layer will be built as:

1. **`src/api/contract.ts`** — the single auditable route table and DTO schemas for every ProofOps capability (auth, verification queue, verifications, receipts, proof records & shares, reconciliation runs, infrastructure health & webhook deliveries, incidents & notes, AI investigations, developer keys/webhooks/request logs, notifications, audit). This is the documented API contract the frontend is built against. Endpoints that a future backend does not implement will be listed in the handover report as unresolved (rule 4).
2. **`src/api/simulated/`** — a deterministic, in-memory (per-tab) simulated data source implementing the same contract, **every value labelled SIMULATED / SANDBOX in the interface** (rule 6). It never writes outside its own store; the homepage demo uses local fixtures only.
3. **`src/api/backendTransport.ts`** — the real `fetch`-based transport, activated by `VITE_DATA_SOURCE=backend` + `VITE_API_BASE_URL`. No screen code changes when the real backend arrives (one-file switch).

Environment variables (public config only): `VITE_DATA_SOURCE` (`simulated` default), `VITE_API_BASE_URL`, `VITE_APP_ENV`, `VITE_AUTHORITATIVE_SOURCE_LABEL` (e.g. "ProofBank — simulated"). No privileged secrets will be exposed in the bundle (rule 11).

## 4. Proposed frontend architecture

```
src/
  api/            contract.ts (routes+DTOs), client.ts, errors.ts,
                  backendTransport.ts, simulated/ (labelled data source)
  types/          domain.ts — all ProofOps entities & status vocabularies
  lib/            format, status, permissions, motion, chartPalette, exportCsv, utils
  components/
    layout/       marketing layout, auth layout, workspace shell (sidebar, topbar)
    ui/           design system: Button, Field, Table, Dialog, Badge, States, …
    marketing/    homepage sections, hero preview, interactive demo
    verification/ check lists, evidence comparison, verify workflow
    proof/        proof list/detail, share dialogs
    reconciliation/ import wizard, mapping, results, candidate review
    infrastructure/ health panels, delivery tables, charts, timeline
    incidents/    list, detail, timeline, notes, assignment
    ai/           structured investigation panel
    developer/    endpoint docs, key management, webhook config, logs
  hooks/          TanStack Query hooks per domain
  pages/          public site, auth, workspace screens
  state/          auth context, query client, toasts
  __tests__/      Vitest + React Testing Library
docs/             phase reports (this file and one per phase)
```

Non-negotiables honoured throughout: screens call the typed client only; frontend permissions are a usability layer, not a security boundary; verified / mismatch / unverified / suspicious / unknown are distinct result states and are never fabricated; transaction status, verification outcome, webhook delivery status and incident status remain separate concepts; simulated data is always visibly labelled.

## 5. Design system plan

Adopt the ProofBank token set verbatim (already matches the master prompt's §3 palette), extended for the ProofOps vocabulary:

- **Brand:** `#990D81` primary, `#AE328E` accent, `#38203B` plum (deep sections/footer only).
- **Surfaces:** canvas `#F5F4F7`, surface white, muted `#F0EDF2`; line `#E4DEE7`.
- **Content:** ink `#26212B`, secondary `#6D6673`; status: success `#287D61` (verified/healthy), warning `#A66B16` (review/at risk), danger `#B42318` (mismatch/failed), info `#315E8A`, plus soft-tint backgrounds; radii 8–12 px; shadows subtle; no glassmorphism/glow (spec §3).
- **Verification vocabulary** (new): result = `verified · mismatch · unverified · suspicious · unknown`; check outcome = `passed · failed · indeterminate`; delivery = `delivered · pending · retrying · failed · dead_lettered`; incident severity = `sev1…sev4`; each with badge + icon + text (colour never alone).
- **Typography:** Inter Variable (UI), JetBrains Mono Variable (references, IDs, code, logs), tabular numerals on all numerics via `data-numeric`.
- **Motion:** Motion for React for all interface motion (150–250 ms conventions already proven in ProofBank's `lib/motion.ts`); **GSAP only for the homepage hero sequence / walkthrough** (spec §18); `prefers-reduced-motion` honoured globally; nothing animates a success the backend did not report.
- **Components:** the ProofBank `ui/` set (Button, Field, Table, Dialog, Badge, Panel, States, Pagination, SearchInput, Loading) carried over and extended with DataTable, Drawer, Toast, Tooltip, Tabs, EmptyState, Timeline, Chart wrappers.

## 6. Phase-by-phase implementation checklist

| Phase | Deliverables | Exit gate |
| --- | --- | --- |
| 1 | Scaffold (Vite/TS/Tailwind v4), tokens, typography, core UI set, app shells (public + workspace), auth shell, motion conventions, `simulated` transport baseline | typecheck, lint, tests, build pass; responsive & a11y spot checks |
| 2 | Full public homepage: nav, hero + GSAP sequence, interactive 3-scenario verification demo (local fixtures), problem, 9 capabilities with real UI previews, dashboard preview (Overview/Verification/Infrastructure modes), how-it-works, AI evidence panel, developer integration, security & trust, footer | all links/controls work; all sample data labelled |
| 3 | Auth flows behind the contract (sign-in/out, session restore, expiry, role-aware nav), protected routes | tests for auth + guards + role nav |
| 4 | Overview dashboard; verification list with filters/URL state; verification detail with side-by-side evidence; verify action bound to backend result (no timers) | mismatch/verified/unknown rendering tests |
| 5 | Receipt evidence (upload path + extraction labelled), proof records list/detail, share links w/ expiry & revoke, audit history | upload validation + permission tests |
| 6 | Reconciliation: import wizard, column mapping, preview, results, candidates, accept/reject | import + results tests |
| 7 | Infrastructure monitoring (health, deliveries, latency/error charts) + incidents (timeline, notes, assignment) | filters + timeline tests |
| 8 | AI Investigator (structured panel; loading/retry/unavailable/permission states) + developer console (endpoints, keys, webhooks, logs) | unavailable-state + RBAC tests |
| 9 | Notifications, settings, audit, role management, remaining workflows | permission tests |
| 10 | Full QA: tests, responsive, a11y, typecheck/lint/build, critical journeys, honest handover report | report delivered; awaiting approval before any deploy |

## 7. Risks and missing backend capabilities

| Risk | Impact | Severity |
| --- | --- | --- |
| No ProofOps backend of any kind | Rules 4/6/9 can only be satisfied together via the labelled simulated source + documented contract (repo-proven pattern). **Blocker** unless decision A below is approved. | **Blocker** |
| No auth service | Sign-in is a simulated session against the contract; tokens are non-privileged demo artefacts. Frontend guards remain a usability layer only. | High |
| No OCR/storage service | Receipt extraction cannot be real: upload flow will be built against the contract; extraction shown only where the source provides it, otherwise a labelled development fixture (dev only) and an explicit unavailability explanation. | High |
| No AI service | AI Investigator renders backend-provided structured output only; with no backend it shows labelled simulated analysis or the unavailable state — never presented as the verifier. | High |
| No real provider metrics | Infrastructure charts render what the source reports; simulated health is labelled; no fabricated outages. | Medium |
| Firebase hosting/config unset | Deferred to Phase 10 (decision item), no deployment during build. | Low |

## 8. Decision required before Phase 1

Because no ProofOps backend exists, three lawful paths exist. **No application code will be written until one is chosen and Phase 0 is approved.**

- **A — Typed contract + clearly-labelled simulated data source (recommended, matches the repo's existing precedent).** One auditable contract module defines every endpoint; the labelled simulated source implements it for demo and test use; switching to the real backend later is a single-file change. Satisfies rules 4, 6, 9 and 13.
- **B — Contract + real-backend transport only.** The app renders honest empty/error states until a backend exists; the hackathon demo would be non-functional.
- **C — Also build a backend.** Exceeds the "frontend only" rule and requires explicit scope sign-off.

## Recommendation

Approve **A** and proceed to Phase 1: design system and application foundation, adapting the repository's established ProofBank architecture and tokens as required by rule 3.
