import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../state/auth';
import { ToastProvider } from '../state/toast';
import { SimulationControlPage } from '../pages/SimulationControlPage';
import { createTestQueryClient, clearSession, seedSession } from '../test/utils';
import {
  INTERVAL_LIMITS,
  runSimulationCommand,
  simulationStatus,
} from '../api/simulated/clock';
import type { ReactElement } from 'react';
function renderWorkspacePage(
  ui: ReactElement,
  route = '/simulation',
  role: 'super_admin' | 'viewer' = 'super_admin',
) {
  seedSession(role);
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={[route]}>
          <AuthProvider>
            <Routes>
              <Route path="/simulation" element={ui} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

/** Leaves the engine in a stopped, live, default-cadence state. */
function resetEngine() {
  if (simulationStatus().state === 'running') {
    runSimulationCommand({ kind: 'pause', actor: 'Test' });
  }
  if (simulationStatus().state === 'paused') {
    runSimulationCommand({ kind: 'stop', actor: 'Test' });
  }
  if (simulationStatus().mode !== 'live') {
    runSimulationCommand({ kind: 'mode', mode: 'live', actor: 'Test' });
  }
  if (simulationStatus().eventIntervalSeconds !== INTERVAL_LIMITS.default) {
    runSimulationCommand({
      kind: 'interval',
      seconds: INTERVAL_LIMITS.default,
      actor: 'Test',
    });
  }
}

async function waitForStatus() {
  await waitFor(
    () => expect(screen.getByText('Simulation status')).toBeInTheDocument(),
    { timeout: 8000 },
  );
}

describe('Simulation control centre', () => {
  beforeEach(() => {
    clearSession();
    resetEngine();
  });

  it('renders the current state, cadence and mode from the source', async () => {
    renderWorkspacePage(<SimulationControlPage />);
    await waitForStatus();

    const status = simulationStatus();
    expect(screen.getByText('Simulation state')).toBeInTheDocument();
    expect(screen.getByText('Event cadence')).toBeInTheDocument();
    expect(screen.getByText(`${status.eventIntervalSeconds}s`)).toBeInTheDocument();
    // Stopped simulations do not promise a next activity time.
    expect(screen.getByText(/Not available/)).toBeInTheDocument();
    // The cadence is explained as a heartbeat, not a transaction duration.
    expect(
      screen.getByText(/Heartbeat interval — not a transaction duration/),
    ).toBeInTheDocument();
  });

  it('starts the simulation from the workspace', async () => {
    const user = userEvent.setup();
    renderWorkspacePage(<SimulationControlPage />, '/simulation');
    await waitForStatus();

    const start = await screen.findByRole('button', { name: /^Start$/ });
    await waitFor(() => expect(start).toBeEnabled(), { timeout: 5000 });
    await user.click(start);

    expect(await screen.findByText(/Start — done/, {}, { timeout: 8000 })).toBeInTheDocument();
    expect(simulationStatus().state).toBe('running');
    // Next expected activity is now available because the source can compute it.
    await waitFor(
      () => expect(screen.queryByText(/Not available/)).not.toBeInTheDocument(),
      { timeout: 8000 },
    );
    // Leave the engine stopped for later tests.
    runSimulationCommand({ kind: 'stop', actor: 'Test' });
  });

  it('asks for confirmation before stopping', async () => {
    const user = userEvent.setup();
    renderSimulationRunning();

    const stop = await screen.findByRole('button', { name: /^Stop$/ });
    await waitFor(() => expect(stop).toBeEnabled(), { timeout: 5000 });
    await user.click(stop);

    const dialog = await screen.findByRole('dialog', { name: /stop the simulation/i });
    expect(within(dialog).getByText(/Existing customers, accounts, transactions/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('changes the simulation mode', async () => {
    const user = userEvent.setup();
    renderWorkspacePage(<SimulationControlPage />);
    await waitForStatus();

    await user.click(screen.getByRole('button', { name: /Replay mode/ }));
    expect(await screen.findByText(/Mode change — done/, {}, { timeout: 8000 })).toBeInTheDocument();
    expect(simulationStatus().mode).toBe('replay');
    expect(screen.getByRole('button', { name: /Replay mode/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // Replay reports recorded activity and generates nothing new.
    expect(
      screen.getAllByText(/Recorded activity is reported and nothing new is generated/).length,
    ).toBeGreaterThan(0);

    runSimulationCommand({ kind: 'mode', mode: 'live', actor: 'Test' });
  });

  it('configures the cadence through the dialog', async () => {
    const user = userEvent.setup();
    renderWorkspacePage(<SimulationControlPage />);
    await waitForStatus();

    await user.click(screen.getByRole('button', { name: /Cadence: 15s/ }));
    const dialog = await screen.findByRole('dialog', {
      name: /configure the event cadence/i,
    });
    const input = within(dialog).getByLabelText(/Event interval/);
    await user.clear(input);
    await user.type(input, '45');
    await user.click(within(dialog).getByRole('button', { name: /apply cadence/i }));

    expect(
      await screen.findByText(/Cadence change — done/, {}, { timeout: 8000 }),
    ).toBeInTheDocument();
    expect(simulationStatus().eventIntervalSeconds).toBe(45);

    runSimulationCommand({ kind: 'interval', seconds: 15, actor: 'Test' });
  });

  it('rejects an out-of-range cadence', async () => {
    const user = userEvent.setup();
    renderWorkspacePage(<SimulationControlPage />);
    await waitForStatus();

    await user.click(screen.getByRole('button', { name: /Cadence: 15s/ }));
    const dialog = await screen.findByRole('dialog', {
      name: /configure the event cadence/i,
    });
    const input = within(dialog).getByLabelText(/Event interval/);
    await user.clear(input);
    await user.type(input, '2');
    await user.click(within(dialog).getByRole('button', { name: /apply cadence/i }));

    expect(
      await screen.findByText('Cadence not applied', {}, { timeout: 8000 }),
    ).toBeInTheDocument();
    expect(simulationStatus().eventIntervalSeconds).toBe(INTERVAL_LIMITS.default);
  });

  it('records control actions in the history panel', async () => {
    const user = userEvent.setup();
    renderWorkspacePage(<SimulationControlPage />);
    await waitForStatus();

    await user.click(screen.getByRole('button', { name: /^Start$/ }));
    await waitFor(() => expect(simulationStatus().state).toBe('running'), { timeout: 8000 });

    expect(await screen.findByText(/Simulation started/, {}, { timeout: 8000 })).toBeInTheDocument();
    runSimulationCommand({ kind: 'stop', actor: 'Test' });
  });

  it('disables every control for read-only roles', async () => {
    renderWorkspacePage(<SimulationControlPage />, '/simulation', 'viewer');
    await waitForStatus();

    await waitFor(
      () => expect(screen.getByRole('button', { name: /^Start$/ })).toBeDisabled(),
      { timeout: 5000 },
    );
    expect(screen.getByRole('button', { name: /^Pause$/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^Stop$/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Cadence: 15s/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Live simulation/ })).toBeDisabled();
    expect(
      screen.getByText(/Signed in without the simulation-control capability/),
    ).toBeInTheDocument();
  });

  it('lists recent heartbeat events and errors', async () => {
    renderWorkspacePage(<SimulationControlPage />);
    await waitForStatus();
    expect(await screen.findByText('Recent simulation events')).toBeInTheDocument();
    expect(screen.getByText('Recent simulation errors')).toBeInTheDocument();
  });
});

/** Starts the simulation so state-dependent controls become available. */
function renderSimulationRunning() {
  if (simulationStatus().state !== 'running') {
    runSimulationCommand({ kind: 'start', actor: 'Test' });
  }
  renderWorkspacePage(<SimulationControlPage />);
}
