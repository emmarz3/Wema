# ProofOps — frontend

Financial verification and infrastructure intelligence platform. **Wema Hackathon Edition.**

ProofOps verifies transaction claims against authoritative records, reconciles
financial datasets, investigates discrepancies, tracks infrastructure failures
and preserves evidence of verification outcomes. It is a frontend
implementation built against a documented API contract; it is **not** Wema
Bank's official software.

> **Simulated data notice.** All records, metrics, deliveries, incidents and
> investigations shown in the simulated data source are demonstration values
> and are labelled as such in the interface. Simulated banking data is not a
> real bank confirmation.

## Running locally

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

```bash
npm run typecheck   # TypeScript, strict mode
npm run lint        # ESLint (flat config, typescript-eslint + react-hooks)
npm test            # Vitest + React Testing Library
npm run build       # typecheck + production build to dist/
npm run preview     # serve the production build
```

## Environment variables

Public configuration only — never put privileged keys, webhook signing
secrets or service credentials in these. Everything here ships in the
browser bundle.

> A `.env` file is created by each developer; the dotfile policy of this
> machine blocks committing `.env.example`, so the table below is the
> reference. Copy it into `.env` and adjust.

| Variable | Purpose | Default |
| --- | --- | --- |
| `VITE_DATA_SOURCE` | `simulated` (bundled, clearly-labelled data source) or `backend` (real ProofOps API). | `simulated` |
| `VITE_API_BASE_URL` | Base URL of the real backend; used only when `VITE_DATA_SOURCE=backend`. | `http://localhost:8080/api` |
| `VITE_AUTHORITATIVE_SOURCE_LABEL` | Display label for the simulated authoritative source. | `Simulated authoritative source` |
| `VITE_APP_ENV` | Environment name shown in the interface. | `Sandbox` |

Recommended `.gitignore` before `git init`: `dist`, `node_modules`, `.env`,
`.env.local`, `coverage`, `playwright-report`, `test-results`, `*.log`.

## Architecture

```
src/
  api/            API contract (routes + DTOs), typed client, errors,
                  transports (simulated / backend)
  components/
    layout/       Marketing, auth and workspace shells
    ui/           Design system: buttons, fields, tables, dialogs, states…
  hooks/          TanStack Query hooks (arrive with their screens)
  lib/            Formatting, status vocabulary, permissions, motion, charts
  pages/          Public site, auth, workspace screens, design-system catalogue
  state/          Query client, toasts (auth arrives in Phase 3)
  types/          Domain model
  __tests__/      Vitest + React Testing Library
docs/             Phase reports
```

Key rules the code follows:

- Screens call the typed API client (`src/api`) only; no screen builds URLs
  or touches a transport directly. The contract in `src/api/contract.ts` is
  the single auditable list of endpoints.
- The interface never fabricates a verification, transaction, delivery,
  incident or metric. It renders what the configured source reports, labels
  simulated data as simulated, and shows an honest unavailable state when a
  capability is not implemented by the source.
- Transaction status, verification result, webhook delivery status and
  incident status are separate concepts and stay separate in the model.
- Frontend permissions are a usability layer; the backend is the security
  boundary.
- Motion is activity-driven (150–250 ms), respects `prefers-reduced-motion`,
  and never animates a success the source did not report.

## Current build status

| Phase | Status |
| --- | --- |
| 0 — Repository audit & plan | Complete |
| 1 — Design system & application foundation | Complete |
| 2 — Public homepage | Complete |
| 3+ — See `docs/PHASE-0-AUDIT.md` for the plan | Pending |

Workspace sections whose screens arrive in later phases show an honest
in-progress state. `/design-system` is a live catalogue of every token and
component.

## Testing

Vitest + React Testing Library cover formatting, the status vocabulary,
permissions, the UI component library, tables and dialogs, toasts, routing,
the API contract and error classification, and the design-system catalogue.
