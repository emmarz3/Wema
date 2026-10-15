import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../state/auth';
import { ToastProvider } from '../state/toast';
import { EventDeliveryPage } from '../pages/EventDeliveryPage';
import { createTestQueryClient, clearSession, seedSession } from '../test/utils';
import type { ReactElement } from 'react';

function renderEvents(ui: ReactElement, route = '/events') {
  seedSession('developer');
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={[route]}>
          <AuthProvider>
            <Routes>
              <Route path="/events" element={ui} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('Event delivery workspace', () => {
  beforeEach(() => {
    clearSession();
  });

  it('lists deliveries and keeps delivery state separate from transaction state', async () => {
    renderEvents(<EventDeliveryPage />);
    expect(
      await screen.findByText(/Delivery status ≠ transaction outcome/i, {}, { timeout: 10000 }),
    ).toBeInTheDocument();
    // Known seeded content: the destination the simulation dispatches to.
    expect(screen.getAllByText(/proofops/i).length).toBeGreaterThan(0);
  });

  it('opens the raw event inspector with its payload and deliveries', async () => {
    const user = userEvent.setup();
    renderEvents(<EventDeliveryPage />);
    await screen.findByText(/Delivery status ≠ transaction outcome/i, {}, { timeout: 10000 });

    // Switch to the Events tab and inspect the first event.
    await user.click(screen.getByRole('tab', { name: /Events/i }));
    const inspectButtons = await screen.findAllByRole('button', { name: /Inspect/i }, { timeout: 10000 });
    await user.click(inspectButtons[0]);

    const dialog = await screen.findByRole('dialog', { name: /Inspect event/i }, { timeout: 10000 });
    expect(await within(dialog).findByText('Payload', {}, { timeout: 10000 })).toBeInTheDocument();
    // Match the count heading specifically, not the table caption.
    expect(
      await within(dialog).findByText(/Delivery attempts \(\d+\)/i, {}, { timeout: 10000 }),
    ).toBeInTheDocument();
  });

  it('does not claim a ProofOps cross-link when none is configured', async () => {
    const user = userEvent.setup();
    renderEvents(<EventDeliveryPage />);
    await screen.findByText(/Delivery status ≠ transaction outcome/i, {}, { timeout: 10000 });
    // The honest explanation is shown up front.
    expect(screen.getByText(/No authorised cross-link is configured/i)).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Events/i }));
    const inspectButtons = await screen.findAllByRole('button', { name: /Inspect/i }, { timeout: 10000 });
    await user.click(inspectButtons[0]);
    const dialog = await screen.findByRole('dialog', { name: /Inspect event/i }, { timeout: 10000 });

    const links = await within(dialog).findAllByRole(
      'button',
      { name: /Open in ProofOps/i },
      { timeout: 10000 },
    );
    expect(links.length).toBeGreaterThan(0);
    // Not a dead link: it is disabled and explains why.
    expect(links[0]).toBeDisabled();
    expect(links[0].getAttribute('title')).toMatch(
      /No authorised ProofOps link is configured/i,
    );
  });
});
