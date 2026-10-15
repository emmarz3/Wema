import { describe, expect, it, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppRoutes } from '../App';
import { clearSession, renderWithRouter, seedSession } from '../test/utils';
import { navSections } from '../components/layout/Sidebar';

/** Renders the app and waits for the authenticated workspace to mount. */
async function renderWorkspace(
  role: Parameters<typeof seedSession>[0],
  route = '/overview',
) {
  seedSession(role);
  renderWithRouter(<AppRoutes />, { route });
  await screen.findByRole('heading', { name: 'Overview' });
}

/** Renders the app and waits for the sign-in form to mount. */
async function renderSignIn() {
  renderWithRouter(<AppRoutes />, { route: '/sign-in' });
  await screen.findByRole('heading', { name: /sign in to the workspace/i });
}

function sidebar() {
  return within(screen.getByRole('navigation', { name: 'Workspace sections' }));
}

describe('workspace routing', () => {
  beforeEach(() => {
    clearSession();
  });

  it('sends unauthenticated visitors to the sign-in page', async () => {
    renderWithRouter(<AppRoutes />, { route: '/overview' });
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: /sign in to the workspace/i }),
      ).toBeInTheDocument(),
    );
  });

  it('restores an existing session and shows the environment identity', async () => {
    seedSession('simulator_admin');
    renderWithRouter(<AppRoutes />, { route: '/overview' });

    expect(
      await screen.findByText('SIMULATED BANKING ENVIRONMENT'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('PROOFBANK').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
  });

  it('renders live simulation state in the top bar from the data source', async () => {
    await renderWorkspace('simulator_admin');

    // Scoped to the top bar: the dashboard also reports simulation state.
    const header = within(screen.getByRole('banner', { name: 'Workspace header' }));
    expect(await header.findByText('Running')).toBeInTheDocument();
    expect(header.getByText('Live simulation')).toBeInTheDocument();
    expect(header.getByText('15s cadence')).toBeInTheDocument();
  });

  it('gives supervisors a working link to every workspace section', async () => {
    const user = userEvent.setup();
    await renderWorkspace('super_admin');

    // Sections delivered so far render their real screen; later sections show
    // an explicit "Delivered in Phase N" note rather than a dead page.
    const delivered = new Set([
      'overview',
      'customers',
      'accounts',
      'transactions',
      'ledger',
      'simulation',
      'scenarios',
      'infrastructure',
      'events',
    ]);

    for (const section of navSections) {
      await user.click(sidebar().getByRole('link', { name: section.label }));
      await waitFor(
        () =>
          expect(
            screen.getByRole('heading', { name: section.label }),
          ).toBeInTheDocument(),
        { timeout: 5_000 },
      );
      if (!delivered.has(section.id)) {
        expect(
          screen.getByText(new RegExp(`Delivered in Phase ${section.deliveredInPhase}`)),
        ).toBeInTheDocument();
      }
    }
  });

  it('hides privileged navigation from viewers and blocks direct access', async () => {
    await renderWorkspace('viewer');

    expect(sidebar().queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument();
    expect(
      sidebar().queryByRole('link', { name: 'Simulation Control' }),
    ).not.toBeInTheDocument();

    // Direct navigation to a restricted section shows an explanation, not a crash.
    renderWithRouter(<AppRoutes />, { route: '/settings' });
    expect(
      await screen.findByText(/your role cannot open this section/i, {}, { timeout: 8000 }),
    ).toBeInTheDocument();
  });

  it('signs in through the form and lands in the workspace', async () => {
    const user = userEvent.setup();
    await renderSignIn();

    await user.type(
      await screen.findByLabelText(/email address/i),
      'tunde.bello@proofbank.test',
    );
    await user.type(screen.getByLabelText(/^password/i), 'demonstration1');
    await user.selectOptions(
      screen.getByLabelText(/demonstration role/i),
      'simulator_admin',
    );
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'Overview' }),
      ).toBeInTheDocument(),
    );
    expect(
      sidebar().getByRole('link', { name: 'Simulation Control' }),
    ).toBeInTheDocument();
  });

  it('rejects an obviously invalid submission before contacting the source', async () => {
    const user = userEvent.setup();
    await renderSignIn();

    await user.type(await screen.findByLabelText(/email address/i), 'not-an-email');
    await user.type(screen.getByLabelText(/^password/i), 'short');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(
      await screen.findByText('Enter a valid email address.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Use at least 8 characters.')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Overview' }),
    ).not.toBeInTheDocument();
  });

  it('remains usable with animations disabled (reduced motion)', async () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes('prefers-reduced-motion: reduce'),
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;

    try {
      const user = userEvent.setup();
      seedSession('simulator_admin');
      renderWithRouter(<AppRoutes />, { route: '/transactions' });
      await screen.findByRole('heading', { name: 'Transactions' });
      await user.click(sidebar().getByRole('link', { name: 'Ledger' }));
      await waitFor(() =>
        expect(screen.getByRole('heading', { name: 'Ledger' })).toBeInTheDocument(),
      );
    } finally {
      window.matchMedia = original;
    }
  });
});
