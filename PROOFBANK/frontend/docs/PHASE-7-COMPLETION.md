# Phase 7 Completion — Infrastructure & Event Workflow

## Objective

Deliver simulated service conditions and incidents with operational detail, a webhook
delivery workspace with retries, failures, latency and raw event inspection, explicit
ProofOps cross-links, and an emergency pause affordance that is obvious from anywhere in
the simulation flows. Nothing may be frozen, blank, bead-loaded, or meaningless.

## Scope — completed in this phase

- **Infrastructure workspace** (`src/pages/InfrastructurePage.tsx`). Reports the simulated
  provider services (status, latency, error rate, last-checked) and the incidents raised
  against them (severity, open/resolved, opened/resolved time, summary, the scenario that
  produced them). Headline counts, status/severity filters and explanatory empty states;
  degraded and down services are labelled as injected conditions of the simulation.
  Backed by the existing `GET /infrastructure/health` route.
- **Event delivery workspace** (`src/pages/EventDeliveryPage.tsx`) with two tabs:
  - **Deliveries** — attempts toward the ProofOps destination with retries (`attempts`,
    `nextRetryAt`), failures (`FAILED`, `DEAD_LETTER`), response codes and search/status/
    event-type filters and pagination. The interface states plainly that delivery status
    is separate from transaction state.
  - **Events** — the emitted events, each openable into a **raw inspector** (
    `src/components/events/EventInspector.tsx`) showing the event, the payload the
    destination would receive (rendered as JSON, as the source reports it) and the
    delivery attempts it produced.
  - New data-source reads in `src/api/simulated/events.ts` and `deliveries.ts` (filtering,
    sorting, pagination, single-event detail with reconstructed payload and correlated
    deliveries), wired through `events`/`event-deliveries` routes, the client, query keys
    and `src/hooks/useEvents.ts`.
- **ProofOps cross-links** (`src/api/index.ts`, `src/components/layout/ProofOpsLink.tsx`,
  README). ProofOps is a separate product. When `VITE_PROOFOPS_URL` is configured, event
  and delivery records offer a contextual cross-link filtered by event type and
  correlation id. When it is not configured (the default), the control is shown
  **disabled with an explanation** — the interface never claims an authorised ProofOps
  integration it does not have.
- **Emergency pause** (`src/components/layout/EmergencyPause.tsx`, surfaced in the
  Topbar). A prominent control on every simulation screen. Pausing is a single,
  non-disruptive click that suspends generated activity while preserving state. It is
  enabled only while the simulation is running; otherwise it is disabled with an honest
  reason, and it is disabled for roles without the simulation-control capability.
  Collapses to an icon-only button on mobile.

## Verification

- **Automated**: `npm run typecheck` (0 errors), `npm run lint` (0 problems),
  `npm run build` (success), `npm test` — **220 passed (18 files)**, including a new
  event/delivery data-source test, an infrastructure page test and an event-delivery page
  test (raw inspector, ProofOps disabled-with-reason). The navigation test now expects
  Infrastructure and Event Delivery to render their real screens.
- **Headless Chromium (production preview)**:
  - Infrastructure: services and incidents render with operational detail; filtering to a
    status with no seeded service shows the explanatory empty state rather than a blank
    table. 0 console errors, 0 failed requests.
  - Event delivery: deliveries list renders (772 seeded); switching to Events and opening
    an event shows the **payload JSON** (e.g. `transaction.completed`, its correlation id
    and transaction reference) and its delivery attempts; the **ProofOps button is
    disabled** with "No authorised ProofOps link is configured for this environment."
  - Emergency pause present in the workspace header: as the simulator admin it pauses the
    running simulation (button then disabled, "already paused"); as the viewer it is
    present but disabled with "Your role cannot control the simulation."
  - Mobile (390 px): topbar collapses to the menu button, Emergency pause is icon-only,
    and the Event Delivery layout stays legible with no clipping.

**Environment note.** The simulated world is deterministic in-memory state rebuilt on a
full page reload, as in every earlier phase; runtime-generated records do not persist
across reloads, so browser verification is performed within a single live session.

## Next

- **Phase 8** — Audit logs and settings: the two remaining deferred sections, plus
  cross-cutting polish. Awaiting approval before starting.
