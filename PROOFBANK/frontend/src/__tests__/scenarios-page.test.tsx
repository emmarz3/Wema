import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../state/auth';
import { ToastProvider } from '../state/toast';
import { ScenariosPage } from '../pages/ScenariosPage';
import { createTestQueryClient, clearSession, seedSession } from '../test/utils';
import type { ReactElement } from 'react';

function renderWorkspacePage(
  ui: ReactElement,
  route = '/scenarios',
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
              <Route path="/scenarios" element={ui} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

async function waitForCatalogue() {
  await waitFor(
    () => expect(screen.getByText('Financial scenarios')).toBeInTheDocument(),
    { timeout: 10000 },
  );
}

describe('Scenarios workspace', () => {
  beforeEach(() => {
    clearSession();
  });

  it('renders the scenario library with both groups', async () => {
    renderWorkspacePage(<ScenariosPage />);
    await waitForCatalogue();

    expect(screen.getByText('Infrastructure scenarios')).toBeInTheDocument();
    // The name appears in both the library and the recorded history.
    expect(screen.getAllByText('Successful deposit').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Webhook delivery failure').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Recovery after simulated failure').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: /Execution history/i })).toBeInTheDocument();
  });

  it('opens a scenario and reviews its impact before starting', async () => {
    const user = userEvent.setup();
    renderWorkspacePage(<ScenariosPage />);
    await waitForCatalogue();

    // The Run button next to the "Successful deposit" card.
    const runButtons = screen.getAllByRole('button', { name: 'Run' });
    await user.click(runButtons[0]);

    const dialog = await screen.findByRole('dialog', { name: 'Successful deposit' });
    // Expected behaviour is stated before anything runs.
    expect(
      within(dialog).getByText(/CREATED .* PENDING .* PROCESSING .* SUCCESS/i),
    ).toBeInTheDocument();
    // The review step is blocked until the parameters are valid.
    const review = within(dialog).getByRole('button', { name: /review impact/i });
    expect(review).toBeDisabled();

    await waitFor(
      () =>
        expect(
          within(dialog)
            .getAllByRole('option')
            .filter((option) => Boolean((option as HTMLOptionElement).value)).length,
        ).toBeGreaterThan(0),
      { timeout: 8000 },
    );
    const options = within(dialog)
      .getAllByRole('option')
      .filter((option) => Boolean((option as HTMLOptionElement).value)) as HTMLOptionElement[];
    await user.selectOptions(within(dialog).getByLabelText(/Account/), options[0].value);
    // The amount is pre-filled with the scenario default; leave it as is.

    await waitFor(() => expect(review).toBeEnabled(), { timeout: 5000 });
    await user.click(review);

    // The impact review names what the simulation will generate.
    expect(
      within(dialog).getByText(/One new transaction, journal entries, events and deliveries/i),
    ).toBeInTheDocument();
    expect(within(dialog).getByText('₦2,500.00')).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: /start scenario/i }),
    ).toBeEnabled();
  });

  it('runs a scenario and reports its result from the source', async () => {
    const user = userEvent.setup();
    renderWorkspacePage(<ScenariosPage />);
    await waitForCatalogue();

    const runButtons = screen.getAllByRole('button', { name: 'Run' });
    await user.click(runButtons[0]);
    const dialog = await screen.findByRole('dialog', { name: 'Successful deposit' });

    await waitFor(
      () =>
        expect(
          within(dialog)
            .getAllByRole('option')
            .filter((option) => Boolean((option as HTMLOptionElement).value)).length,
        ).toBeGreaterThan(0),
      { timeout: 8000 },
    );
    const options = within(dialog)
      .getAllByRole('option')
      .filter((option) => Boolean((option as HTMLOptionElement).value)) as HTMLOptionElement[];
    await user.selectOptions(within(dialog).getByLabelText(/Account/), options[0].value);
    await user.click(within(dialog).getByRole('button', { name: /review impact/i }));
    await user.click(within(dialog).getByRole('button', { name: /start scenario/i }));

    // The configure dialog closes and the run detail opens with live progress.
    await waitFor(
      () => expect(screen.queryAllByRole('dialog')).toHaveLength(1),
      { timeout: 10000 },
    );
    const runDialog = screen.getByRole('dialog');
    expect(await within(runDialog).findByText('Progress', {}, { timeout: 10000 })).toBeInTheDocument();

    // Wait for the run to finish and report a result.
    await waitFor(
      () => expect(within(runDialog).getByText('Succeeded')).toBeInTheDocument(),
      { timeout: 30000 },
    );
    expect(within(runDialog).getByText(/Generated transactions/)).toBeInTheDocument();
    // ProofOps is not claimed as an authorised integration.
    expect(within(runDialog).getByText(/does not claim one/i)).toBeInTheDocument();
  });

  it('refuses scenario execution to read-only roles', async () => {
    renderWorkspacePage(<ScenariosPage />, '/scenarios', 'viewer');
    await waitForCatalogue();

    await waitFor(
      () => expect(screen.getAllByRole('button', { name: 'Run' })[0]).toBeDisabled(),
      { timeout: 5000 },
    );
    expect(
      screen.getAllByText(/Your role has read-only access to the scenario library/i).length,
    ).toBeGreaterThan(0);
  });

  it('shows recorded history with a run detail link', async () => {
    renderWorkspacePage(<ScenariosPage />);
    await waitForCatalogue();
    expect(await screen.findByText(/Successful transfer/i)).toBeInTheDocument();
  });

  it('keeps seeded execution history read-only - no dead run detail', async () => {
    renderWorkspacePage(<ScenariosPage />);
    await waitForCatalogue();
    await screen.findByRole('heading', { name: /Execution history/i });
    // Recorded (seeded) executions carry no step-level detail: their View is
    // disabled and explains why, instead of opening a failed "not found" request.
    const seededViews = await screen.findAllByTitle('Recorded before run detail was available');
    expect(seededViews.length).toBeGreaterThan(0);
    for (const button of seededViews) {
      expect(button).toBeDisabled();
    }
  });
});
