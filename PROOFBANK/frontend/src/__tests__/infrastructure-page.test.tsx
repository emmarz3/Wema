import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../state/auth';
import { ToastProvider } from '../state/toast';
import { InfrastructurePage } from '../pages/InfrastructurePage';
import { createTestQueryClient, clearSession, seedSession } from '../test/utils';
import type { ReactElement } from 'react';

function renderInfrastructure(ui: ReactElement, route = '/infrastructure') {
  seedSession('simulator_admin');
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={[route]}>
          <AuthProvider>
            <Routes>
              <Route path="/infrastructure" element={ui} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('Infrastructure workspace', () => {
  beforeEach(() => {
    clearSession();
  });

  it('reports the simulated services with operational detail', async () => {
    renderInfrastructure(<InfrastructurePage />);
    await waitFor(
      () => expect(screen.getByRole('heading', { name: 'Infrastructure' })).toBeInTheDocument(),
    );

    const panel = await screen.findByText('Provider services');
    expect(panel).toBeInTheDocument();
    // Seeded provider services render with their reported status.
    expect(await screen.findByText('Core ledger')).toBeInTheDocument();
    // "Payment provider" appears in the services table and one incident.
    expect(screen.getAllByText('Payment provider').length).toBeGreaterThan(0);
    // The interface labels the data as simulated, never as a real bank.
    expect(screen.getAllByText(/simulated/i).length).toBeGreaterThan(0);
  });

  it('lists incidents and states they are injected conditions', async () => {
    renderInfrastructure(<InfrastructurePage />);
    await screen.findByText('Core ledger');
    expect(screen.getByText('Incidents')).toBeInTheDocument();
    expect(
      screen.getAllByText(/injected conditions of the simulation/i).length,
    ).toBeGreaterThan(0);
  });

  it('filters services by status without any dead result', async () => {
    const user = userEvent.setup();
    renderInfrastructure(<InfrastructurePage />);
    await screen.findByText('Core ledger');

    // Seeded services have no "down" service, so filtering to Down yields the
    // explanatory empty state rather than a blank table.
    await user.selectOptions(
      screen.getByLabelText(/Filter by service status/i),
      'DOWN',
    );
    expect(
      await screen.findByText(/No services match these filters/i),
    ).toBeInTheDocument();
  });

  it('filters incidents by severity without a dead result', async () => {
    const user = userEvent.setup();
    renderInfrastructure(<InfrastructurePage />);
    await screen.findByText('Core ledger');
    await user.selectOptions(
      screen.getByLabelText(/Filter incidents by severity/i),
      'CRITICAL',
    );
    // No crash; the services panel and incidents panel stay rendered.
    expect(screen.getByText('Provider services')).toBeInTheDocument();
    expect(screen.getByText('Incidents')).toBeInTheDocument();
  });
});
