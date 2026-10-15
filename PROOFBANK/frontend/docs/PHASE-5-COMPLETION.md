# ProofBank Frontend — Phase 5: Simulation Control Centre — Completion Report

**Phase:** 5 of 9
**Status:** Complete — verified. Stopping for approval before Phase 6.
**Location:** `PROOFBANK/frontend/`

## What was built

1. **A controllable simulation engine** (`clock.ts`) — the clock became a real engine owned by the data source. It supports `start`, `pause`, `resume`, `stop`, mode changes and cadence changes; every transition is validated against the current state (pausing a stopped simulation is refused with a clear reason); every accepted action is recorded in a control history with actor, detail, from-state and to-state; and the engine notifies subscribers so the top bar refreshes the moment state changes.

2. **Heartbeat activity** — while running in live or scenario mode, each configured-cadence tick emits a real `simulation.heartbeat` event into the world and increments the generated-event count. **Replay mode generates nothing** — it reports recorded activity, which the interface states. The engine also records simulated errors while running (the payment provider is degraded), which appear in a dedicated panel.

3. **Next-expected-activity calculation** — the source computes `nextActivityAt` from the last heartbeat plus the configured cadence and reports `null` when it cannot be calculated reliably (paused or stopped), so the interface never invents a time.

4. **New endpoints** — `POST /simulation/start|pause|resume|stop`, `POST /simulation/mode`, `POST /simulation/interval` (validated to 5–300 seconds), `GET /simulation/history`, `GET /simulation/errors`, all added to `routes.ts` and the typed client.

5. **Simulation Control Centre** (`SimulationControlPage.tsx`) —
   - **Status tiles and panel**: state, mode, cadence (labelled "Heartbeat interval — not a transaction duration"), generated events, last heartbeat, last activity, next expected activity, active scenario, started/stopped timestamps.
   - **Controls**: Start / Pause / Resume / Stop, enabled only in the states where the source accepts them and only for the `control_simulation` capability, each showing why it is unavailable. Stop requires confirmation behind a dialog that states what is preserved.
   - **Mode selector**: Live simulation / Scenario mode / Replay mode cards with plain-language explanations; scenario execution is attributed to the Scenarios workspace rather than faked here.
   - **Cadence configuration**: a dialog with a 5–300 second control that states the heartbeat is not a transaction duration.
   - **Control history** panel, **recent simulation errors** panel, and **recent simulation events** panel, with links to the Event Delivery workspace.

## Verification (all run, not assumed)

| Check | Result |
| --- | --- |
| `npm run typecheck` | **Pass** — 0 errors |
| `npm run lint` | **Pass** — 0 problems |
| `npm test` | **Pass** — **179 tests**, 13 files |
| `npm run build` | **Pass** |
| Headless-Chromium verification of the production build | **Pass** — see below |

New tests this phase (15 engine tests in `simulation-engine.test.ts`, 9 page tests in `simulation-page.test.tsx`): start/pause/resume/stop transitions and their refusals; mode changes with repeat/unknown-mode refusal; cadence limits and rejection; heartbeat events generated while running, none while stopped, and none in replay mode; control history recorded newest-first with actor and states; subscriber notifications; error recording; API-level refusals (409 for an invalid transition, 400 for an out-of-range cadence) and history/errors serving; page-level rendering of status and cadence, starting the simulation from the workspace (and the top bar following), the stop confirmation and its impact text, mode changes, the cadence dialog, out-of-range cadence rejection, control actions appearing in the history panel, read-only roles having every control disabled with an explanation, and the events/errors panels.

Browser verification (production preview): the control centre showed the running state in both the page and the top bar; pausing moved the top bar to **Paused** and the panel to "Not available" for next activity; resume returned to Running; the cadence change applied (button label and tile both showed **20s**); switching to Replay mode applied with its explanation; Stop opened a confirmation stating that existing data is preserved and then moved the top bar to **Stopped**; control history, error and event panels all rendered; as a viewer all four controls were disabled with the explanatory banner while status stayed visible; no horizontal overflow at 390 px. **0 console errors, 0 failed requests.** Screenshot inspected (status panel, controls, mode cards, history and stacked action toasts).

## Issues found and fixed during verification

1. **Control history ordering was unreliable** — entries were re-sorted by timestamp, which shuffles actions recorded within the same millisecond. The engine now keeps newest-first order by construction.
2. **Every dialog stole focus from the field being typed into** whenever its parent re-rendered (the focus effect depended on an inline `onClose` callback). The effect now runs only when the dialog opens — this fixed the cadence input losing characters mid-typing and protects all forms in the app.

## Deviations and notes

- Replay mode is implemented as a real mode change the source accepts; it reports recorded activity and generates nothing new, which the interface states rather than implying a replay engine.
- Scenario execution is deliberately not implemented here: the mode card attributes it to the Scenarios workspace, and the control centre shows the active scenario name once a scenario is selected there (Phase 6).

## Next

Phase 6 — Scenario management: scenario library, execution workflow, status progression, generated-record inspection and scenario history. Awaiting approval before starting.
