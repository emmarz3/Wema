import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../state/auth';
import { ToastProvider } from '../state/toast';
import { CustomersPage } from '../pages/CustomersPage';
import { CustomerDetailPage } from '../pages/CustomerDetailPage';
import { AccountsPage } from '../pages/AccountsPage';
import { AccountDetailPage } from '../pages/AccountDetailPage';
import { createTestQueryClient, clearSession, seedSession } from '../test/utils';
import type { ReactElement } from 'react';

/**
 * Renders a workspace page inside the same providers the shell uses.
 * The page is matched by a route pattern so useParams works.
 */
function renderWorkspacePage(
  ui: ReactElement,
  route: string,
  pattern: string = route,
  role: 'super_admin' | 'viewer' = 'super_admin',
) {
  seedSession(role);
  const queryClient = createTestQueryClient();
  const utils = render(
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
  return utils;
}

/** Waits until the session has bootstrapped and the action is usable. */
async function enabledAction(name: RegExp) {
  const button = await screen.findByRole('button', { name });
  await waitFor(() => expect(button).toBeEnabled(), { timeout: 5000 });
  return button;
}

/** Builds a client seeded through the simulated source for id lookups. */
async function clientFor(kind: 'customer' | 'account'): Promise<string> {
  const { ApiClient } = await import('../api/client');
  const { createSimulatedTransport } = await import('../api/simulated');
  const client = new ApiClient(createSimulatedTransport());
  await client.signIn({
    email: 'amara.okafor@proofbank.test',
    password: 'demonstration1',
    role: 'super_admin',
  });
  const page =
    kind === 'customer'
      ? await client.customersList({ pageSize: 1 })
      : await client.accountsList({ pageSize: 1 });
  return page.items[0].id;
}

describe('Customers workspace', () => {
  beforeEach(() => {
    clearSession();
  });

  it('renders the customer table with real source data', async () => {
    renderWorkspacePage(<CustomersPage />, '/customers');
    expect(
      await screen.findByRole('table', { name: /simulated customers/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText(/of 24/)).toBeInTheDocument();
    expect(screen.getAllByText(/CUS-\d{5}/).length).toBeGreaterThan(0);
  });

  it('searches the population with debounce', async () => {
    const user = userEvent.setup();
    renderWorkspacePage(<CustomersPage />, '/customers');
    await screen.findByRole('table', { name: /simulated customers/i });

    const firstRowBefore = screen.getAllByText(/CUS-\d{5}/)[0].textContent;
    await user.type(screen.getByLabelText('Search customers'), 'CUS-00001');
    await waitFor(
      () =>
        expect(screen.getAllByText(/CUS-\d{5}/)[0].textContent).not.toBe(
          firstRowBefore,
        ),
      { timeout: 5000 },
    );
    // One matching record: "Showing 1–1 of 1".
    expect(screen.getByText(/^Showing 1.1 of 1$/)).toBeInTheDocument();
  });

  it('paginates through the population', async () => {
    const user = userEvent.setup();
    renderWorkspacePage(<CustomersPage />, '/customers');
    await screen.findByRole('table', { name: /simulated customers/i });

    const before = screen.getAllByText(/CUS-\d{5}/)[0].textContent;
    await user.click(screen.getByRole('button', { name: /next page/i }));
    await waitFor(
      () =>
        expect(screen.getAllByText(/CUS-\d{5}/)[0].textContent).not.toBe(before),
      { timeout: 5000 },
    );
    expect(screen.getByText(/Page 2 of/)).toBeInTheDocument();
  });

  it('shows an empty state when the filters match nothing', async () => {
    const user = userEvent.setup();
    renderWorkspacePage(<CustomersPage />, '/customers');
    await screen.findByRole('table', { name: /simulated customers/i });
    await user.type(screen.getByLabelText('Search customers'), 'zzz-no-such-customer');
    expect(
      await screen.findByText('No customers match these filters', {}, { timeout: 6000 }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /clear filters/i }));
    expect(
      await screen.findByRole('table', { name: /simulated customers/i }, { timeout: 6000 }),
    ).toBeInTheDocument();
  });

  it('validates the create form before contacting the source', async () => {
    const user = userEvent.setup();
    renderWorkspacePage(<CustomersPage />, '/customers');
    await enabledAction(/new customer/i);
    await user.click(screen.getByRole('button', { name: /new customer/i }));

    const dialog = await screen.findByRole('dialog', { name: /create simulated customer/i });
    await user.click(within(dialog).getByRole('button', { name: /create customer/i }));

    expect(
      await screen.findByText('Enter the customer name (at least 2 characters).'),
    ).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
  });

  it('creates a simulated customer and confirms with a notification', async () => {
    const user = userEvent.setup();
    renderWorkspacePage(<CustomersPage />, '/customers');
    await enabledAction(/new customer/i);
    await user.click(screen.getByRole('button', { name: /new customer/i }));

    const dialog = await screen.findByRole('dialog', { name: /create simulated customer/i });
    await user.type(within(dialog).getByLabelText(/full name/i), 'Zainab Sani');
    await user.type(
      within(dialog).getByLabelText(/email address/i),
      'zainab.sani@example.test',
    );
    await user.type(within(dialog).getByLabelText(/phone number/i), '+234 802 555 0101');
    await user.click(within(dialog).getByRole('button', { name: /create customer/i }));

    expect(
      await screen.findByText('Simulated customer created', {}, { timeout: 12000 }),
    ).toBeInTheDocument();
    // The new customer is returned by the refreshed listing when searched.
    await user.type(screen.getByLabelText('Search customers'), 'zainab.sani');
    expect(
      await screen.findByText('zainab.sani@example.test', {}, { timeout: 12000 }),
    ).toBeInTheDocument();
  });

  it('hides the create action from read-only roles', async () => {
    renderWorkspacePage(<CustomersPage />, '/customers', '/customers', 'viewer');
    await screen.findByRole('table', { name: /simulated customers/i });
    await waitFor(
      () => expect(screen.getByRole('button', { name: /new customer/i })).toBeDisabled(),
      { timeout: 5000 },
    );
  });
});

describe('Customer detail', () => {
  beforeEach(() => {
    clearSession();
  });

  it('renders profile, accounts, transactions and events', async () => {
    const id = await clientFor('customer');
    renderWorkspacePage(<CustomerDetailPage />, `/customers/${id}`, '/customers/:customerId');

    expect(await screen.findByText(/Linked accounts/)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Recent transactions' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Event history' })).toBeInTheDocument();
    expect(screen.getByText(/Customer code/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('states the impact of suspending a customer before confirming', async () => {
    const user = userEvent.setup();
    const id = await clientFor('customer');
    renderWorkspacePage(<CustomerDetailPage />, `/customers/${id}`, '/customers/:customerId');
    await enabledAction(/suspend|reactivate/i);

    await user.click(screen.getByRole('button', { name: /suspend|reactivate/i }));
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText(/freeze every linked account|accounts return to active/i),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });
});

describe('Accounts workspace', () => {
  beforeEach(() => {
    clearSession();
  });

  it('renders accounts with available and ledger balances in table form', async () => {
    renderWorkspacePage(<AccountsPage />, '/accounts');
    const table = await screen.findByRole('table', { name: /simulated accounts/i });
    expect(within(table).getByText('Available')).toBeInTheDocument();
    expect(within(table).getByText('Ledger')).toBeInTheDocument();
    expect(within(table).getAllByText(/₦[\d,]+\.\d{2}/).length).toBeGreaterThan(0);
  });

  it('filters by account status', async () => {
    const user = userEvent.setup();
    renderWorkspacePage(<AccountsPage />, '/accounts');
    await screen.findByRole('table', { name: /simulated accounts/i });
    await user.selectOptions(screen.getByLabelText('Filter by account status'), 'FROZEN');
    await waitFor(
      () =>
        expect(
          within(screen.getByRole('table')).getAllByText('Frozen').length,
        ).toBeGreaterThan(0),
      { timeout: 6000 },
    );
  });

  it('creates an account through the dialog', async () => {
    const user = userEvent.setup();
    renderWorkspacePage(<AccountsPage />, '/accounts');
    await enabledAction(/new account/i);
    await user.click(screen.getByRole('button', { name: /new account/i }));

    const dialog = await screen.findByRole('dialog', { name: /create simulated account/i });
    await waitFor(
      () => expect(within(dialog).getAllByRole('option').length).toBeGreaterThan(1),
      { timeout: 6000 },
    );
    const options = within(dialog).getAllByRole('option') as HTMLOptionElement[];
    await user.selectOptions(within(dialog).getByLabelText(/^customer/i), options[1].value);
    await user.selectOptions(within(dialog).getByLabelText(/account type/i), 'CURRENT');
    await user.click(within(dialog).getByRole('button', { name: /create account/i }));

    expect(
      await screen.findByText('Simulated account created', {}, { timeout: 6000 }),
    ).toBeInTheDocument();
  });
});

describe('Account detail', () => {
  beforeEach(() => {
    clearSession();
  });

  it('separates available and ledger balances and shows status history', async () => {
    const id = await clientFor('account');
    renderWorkspacePage(<AccountDetailPage />, `/accounts/${id}`, '/accounts/:accountId');

    expect(await screen.findByText('Available balance')).toBeInTheDocument();
    expect(screen.getByText('Ledger balance')).toBeInTheDocument();
    expect(screen.getByText(/Held by pending/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Status history' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Recent transactions' }),
    ).toBeInTheDocument();
  });
});
