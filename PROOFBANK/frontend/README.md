# ProofBank — Simulated Banking Environment (frontend)

A controlled banking simulation and transaction operations console used to
demonstrate and test financial operations and infrastructure events,
including the simulated activity consumed by ProofOps.

**All customers, accounts, balances, transactions, ledger entries and events
shown by this application are simulated demonstration data.** ProofBank is
not Wema Bank's official banking software and is not connected to real
banking infrastructure.

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

## Signing in (demonstration)

Sign-in is simulated. Any valid email with a password of at least eight
characters is accepted; the **Demonstration role** selector chooses the
capabilities the session carries:

| Role | Email |
| --- | --- |
| Super administrator | amara.okafor@proofbank.test |
| Simulator administrator | tunde.bello@proofbank.test |
| Operations user | chidi.nwosu@proofbank.test |
| Developer | sim.developer@proofbank.test |
| Viewer | grace.view@proofbank.test |

## Environment variables

Copy `.env.example` to `.env` and adjust. Only public configuration belongs
here — never privileged keys, webhook secrets or service credentials.

| Variable | Purpose |
| --- | --- |
| `VITE_DATA_SOURCE` | `simulated` (bundled labelled data source) or `backend` (real ProofBank API). |
| `VITE_API_BASE_URL` | Base URL of the real backend, used only when `VITE_DATA_SOURCE=backend`. |
| `VITE_PROOFOPS_LABEL` | Display label for the ProofOps destination. |
| `VITE_PROOFOPS_URL` | Optional base URL of the sibling ProofOps workspace. When set, event and delivery records offer a contextual cross-link filtered by event type and correlation id. When unset (the default), those controls are shown disabled with an explanation — the interface never claims an authorised ProofOps integration it does not have. |
| `VITE_APP_ENV` | Environment name shown in the interface. |

## Architecture

```
src/
  api/            Typed API client, transports and the labelled simulated data source
  components/
    layout/       App shell, sidebar, top bar, environment indicator, page header
    ui/           Design system: buttons, fields, tables, dialogs, badges, states
  hooks/          Data-source hooks (simulation status, clock)
  lib/            Design status vocabulary, formatting, motion, permissions
  pages/          Sign-in and workspace screens
  state/          Auth context and query client
  types/          Shared domain types and status vocabularies
```

Key rules the code follows:

- Screens call the typed API client only; no screen builds URLs or reads the
  transport directly.
- The UI never fabricates a transaction, balance, ledger entry or event. It
  renders what the data source reports, and labels simulated data as such.
- The simulation clock belongs to the data source. The frontend displays the
  heartbeat and configured cadence; it never advances them itself.
- Webhook delivery state is kept separate from transaction state — a failed
  delivery never reads as a failed payment, and vice versa.

## Testing

Vitest + React Testing Library cover formatting, permissions, the UI
component library, the auth flow, routing guards and role-based navigation.
Playwright-based browser verification is used during phase completion.
