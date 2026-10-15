import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../state/auth';
import { ToastProvider } from '../state/toast';
import { TransactionsPage } from '../pages/TransactionsPage';
import { TransactionDetailPage } from '../pages/TransactionDetailPage';
import { LedgerPage } from '../pages/LedgerPage';
import { createTestQueryClient, clearSession, seedSession } from '../test/utils';
import type { ReactElement } from 'react';

function renderWorkspacePage(
  ui: ReactElement,
  route: string,
  pattern: string = route,
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
              <Route path={pattern} element={ui} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

async function enabledAction(name: RegExp) {
  const button = await screen.findByRole('button', { name });
  await waitFor(() => expect(button).toBeEnabled(), { timeout: 5000 });
  return button;
}

async function clientFor(kind: 'transaction' | 'ledger-entry'): Promise<string> {
  const { ApiClient } = await import('../api/client');
  const { createSimulatedTransport } = await import('../api/simulated');
  const client = new ApiClient(createSimulatedTransport());
  await client.signIn({
    email: 'amara.okafor@proofbank.test',
    password: 'demonstration1',
    role: 'super_admin',
  });
  if (kind === 'transaction') {
    const page = await client.transactionsList({ pageSize: 1 });
    return page.items[0].id;
  }
  const page = await client.ledgerList({ pageSize: 1 });
  return page.items[0].id;
}

describe('Transactions workspace', () => {
  beforeEach(() => {
    clearSession();
  });

  it('renders transactions with formatted amounts and status badges', async () => {
    renderWorkspacePage(<TransactionsPage />, '/transactions');
    const table = await screen.findByRole('table', { name: /simulated transactions/i });
    expect(within(table).getAllByText(/₦[\d,]+\.\d{2}/).length).toBeGreaterThan(0);
    expect(
      within(table).getAllByText(/TXN-\d{8}-\d{4}/).length,
    ).toBeGreaterThan(0);
    expect(within(table).getAllByText(/Successful|Failed|Pending|Reversed|Processing|Created/).length)
      .toBeGreaterThan(0);
  });

  it('filters by status', async () => {
    const user = userEvent.setup();
    renderWorkspacePage(<TransactionsPage />, '/transactions');
    await screen.findByRole('table', { name: /simulated transactions/i });
    await user.selectOptions(screen.getByLabelText('Filter by status'), 'SUCCESS');
    await waitFor(
      () =>
        expect(
          within(screen.getByRole('table')).getAllByText('Successful').length,
        ).toBeGreaterThan(0),
      { timeout: 6000 },
    );
  });

  it('searches by reference', async () => {
    const user = userEvent.setup();
    renderWorkspacePage(<TransactionsPage />, '/transactions');
    await screen.findByRole('table', { name: /simulated transactions/i });
    const firstReference =
      document.querySelector('tbody tr td')?.textContent ?? '';
    await user.type(screen.getByLabelText('Search transactions'), 'TXN-2025');
    await waitFor(
      () => expect(document.querySelector('tbody tr td')?.textContent).not.toBe(firstReference),
      { timeout: 6000 },
    );
  });

  it('exports the visible page as CSV', async () => {
    renderWorkspacePage(<TransactionsPage />, '/transactions');
    await screen.findByRole('table', { name: /simulated transactions/i });
    const exportButton = await screen.findByRole('button', { name: /export csv/i });
    expect(exportButton).toBeEnabled();
  });

  it('opens the operation dialog from the query string', async () => {
    renderWorkspacePage(
      <TransactionsPage />,
      '/transactions?operation=deposit',
      '/transactions',
    );
    // The dialog opens from the URL; the list behind it loads at the same time.
    expect(
      await screen.findByRole('dialog', { name: /initiate a deposit/i }, { timeout: 8000 }),
    ).toBeInTheDocument();
    await waitFor(
      () =>
        expect(
          screen.getByRole('table', { name: /simulated transactions/i }),
        ).toBeInTheDocument(),
      { timeout: 8000 },
    );
  });

  it('runs a deposit end to end through the dialog', async () => {
    const user = userEvent.setup();
    renderWorkspacePage(
      <TransactionsPage />,
      '/transactions?operation=deposit',
      '/transactions',
    );

    const dialog = await screen.findByRole(
      'dialog',
      { name: /initiate a deposit/i },
      { timeout: 8000 },
    );

    // Wait for the account options to load.
    await waitFor(
      () =>
        expect(
          within(dialog)
            .getAllByRole('option')
            .filter((option) => (option as HTMLOptionElement).value).length,
        ).toBeGreaterThan(0),
      { timeout: 8000 },
    );

    const accountOptions = within(dialog)
      .getAllByRole('option')
      .filter((option) => Boolean((option as HTMLOptionElement).value)) as HTMLOptionElement[];
    await user.selectOptions(
      within(dialog).getByLabelText(/destination account/i),
      accountOptions[0].value,
    );
    await user.type(within(dialog).getByLabelText(/amount \(/i), '2500.00');

    // Review summary appears before submission.
    await user.click(within(dialog).getByRole('button', { name: /review operation/i }));
    expect(await within(dialog).findByText('₦2,500.00')).toBeInTheDocument();
    expect(
      within(dialog).getByText(/same reference will return the existing transaction/i),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: /confirm and submit/i }),
    ).toBeEnabled();

    await user.click(within(dialog).getByRole('button', { name: /confirm and submit/i }));

    // The result reports what the source actually returned.
    expect(
      await within(dialog).findByText(/Transaction accepted/i, {}, { timeout: 8000 }),
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/DEP-\d{8}-\d{6}/)).toBeInTheDocument();
  });

  it('refuses operations to read-only roles', async () => {
    renderWorkspacePage(<TransactionsPage />, '/transactions', '/transactions', 'viewer');
    await screen.findByRole('table', { name: /simulated transactions/i });
    await waitFor(
      () =>
        expect(screen.getByRole('button', { name: /new transaction/i })).toBeDisabled(),
      { timeout: 5000 },
    );
  });
});

describe('Transaction detail', () => {
  beforeEach(() => {
    clearSession();
  });

  it('renders summary, lifecycle, ledger, events and deliveries', async () => {
    const id = await clientFor('transaction');
    renderWorkspacePage(
      <TransactionDetailPage />,
      `/transactions/${id}`,
      '/transactions/:transactionId',
    );
    expect(await screen.findByText('Lifecycle')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Ledger journal entries/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Associated events/i })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Webhook delivery attempts/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Correlation ID/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/corr_[0-9a-f]{8,}/).length).toBeGreaterThan(0);
    // Lifecycle shows the current state and notes.
    expect(screen.getByText(/Current state/)).toBeInTheDocument();
  });

  it('states that delivery status is not the transaction outcome', async () => {
    const id = await clientFor('transaction');
    renderWorkspacePage(
      <TransactionDetailPage />,
      `/transactions/${id}`,
      '/transactions/:transactionId',
    );
    expect(await screen.findByText(/Delivery status . transaction outcome/i)).toBeInTheDocument();
  });

  it('explains reversals before confirming', async () => {
    const user = userEvent.setup();
    const { ApiClient } = await import('../api/client');
    const { createSimulatedTransport } = await import('../api/simulated');
    const client = new ApiClient(createSimulatedTransport());
    await client.signIn({
      email: 'amara.okafor@proofbank.test',
      password: 'demonstration1',
      role: 'super_admin',
    });
    const page = await client.transactionsList({ status: 'SUCCESS', pageSize: 1 });

    renderWorkspacePage(
      <TransactionDetailPage />,
      `/transactions/${page.items[0].id}`,
      '/transactions/:transactionId',
    );
    await enabledAction(/reverse/i);
    await user.click(screen.getByRole('button', { name: /reverse/i }));
    const dialog = await screen.findByRole('dialog', { name: /reverse transaction/i });
    expect(
      within(dialog).getByText(/compensating financial operation/i),
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/history is never edited/i)).toBeInTheDocument();
  });
});

describe('Ledger workspace', () => {
  beforeEach(() => {
    clearSession();
  });

  it('renders entries with direction and balanced totals', async () => {
    renderWorkspacePage(<LedgerPage />, '/ledger');
    const table = await screen.findByRole('table', { name: /journal entries/i });
    expect(within(table).getAllByText('Debit').length).toBeGreaterThan(0);
    expect(within(table).getAllByText('Credit').length).toBeGreaterThan(0);
    await waitFor(
      () => expect(screen.getByText('Balanced')).toBeInTheDocument(),
      { timeout: 6000 },
    );
  });

  it('filters by direction and explains the resulting imbalance', async () => {
    const user = userEvent.setup();
    renderWorkspacePage(<LedgerPage />, '/ledger');
    await screen.findByRole('table', { name: /journal entries/i });
    await user.selectOptions(screen.getByLabelText('Filter by direction'), 'DEBIT');
    await waitFor(
      () => expect(screen.getByText('Out of balance')).toBeInTheDocument(),
      { timeout: 6000 },
    );
    expect(
      screen.getByText(/excludes one half of a posting pair/i),
    ).toBeInTheDocument();
  });

  it('opens a journal entry detail dialog from the query string', async () => {
    const id = await clientFor('ledger-entry');
    renderWorkspacePage(<LedgerPage />, `/ledger?entry=${id}`, '/ledger');
    // The dialog is driven by the URL; its title resolves once the entry loads.
    expect(
      await screen.findByRole('dialog', { name: /JE-\d{6}/ }, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(await screen.findByText(/Source transaction/)).toBeInTheDocument();
    expect(screen.getByText(/Posting pair/)).toBeInTheDocument();
  });
});
