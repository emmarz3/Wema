import { describe, expect, it, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../test/utils';
import { AppRoutes } from '../App';
import { api } from '../api';
import type { Role } from '../lib/permissions';

/**
 * Test helpers for the simulated data source. Signing in directly through
 * the typed client mirrors what the sign-in page does; the token is then
 * parked in the same storage the app reads on boot.
 */
async function signInDirect(email: string, role?: Role) {
  const session = await api.signIn({ email, password: 'password123', role });
  localStorage.setItem('proofops.auth.token', session.token);
  return session;
}

function clearSessions() {
  localStorage.removeItem('proofops.auth.token');
  localStorage.removeItem('proofops.simulated.session');
  localStorage.removeItem('proofops.simulated.sessions');
}

/**
 * Routing tests. The public homepage content landed in Phase 2; the
 * workspace is auth-gated and role-aware as of Phase 3.
 */
describe('routing', () => {
  beforeEach(() => {
    clearSessions();
  });

  it('renders the public homepage at the root', () => {
    renderWithProviders(<AppRoutes />, { route: '/' });
    const main = within(screen.getByRole('main'));
    expect(main.getByRole('heading', { level: 1 })).toHaveTextContent('Know what happened');
    expect(main.getAllByText(/Interactive demonstration/i).length).toBeGreaterThan(0);
  });

  it('renders the design system catalogue', () => {
    renderWithProviders(<AppRoutes />, { route: '/design-system' });
    expect(screen.getByRole('heading', { name: 'Design system' })).toBeInTheDocument();
  });

  it('renders the sign-in screen with a validated form', async () => {
    renderWithProviders(<AppRoutes />, { route: '/sign-in' });
    // The session restore runs before the form appears.
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument(),
    );
    expect(screen.getByLabelText(/work email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
    // Only the contract's auth routes are offered — no forgot-password or
    // registration links exist to invent capabilities the source lacks.
    expect(screen.queryByText(/forgot (your )?password/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/create (an )?account/i)).not.toBeInTheDocument();
  });

  it('shows a workspace 404 for unknown app routes', async () => {
    await signInDirect('chidi.nwosu@proofops.test');
    renderWithProviders(<AppRoutes />, { route: '/app/does-not-exist' });
    await waitFor(() =>
      expect(screen.getByText('Page not found')).toBeInTheDocument(),
    );
  });

  it('shows the sign-in screen with demonstration accounts', async () => {
    renderWithProviders(<AppRoutes />, { route: '/sign-in' });
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument(),
    );
    expect(screen.getByText(/Demonstration accounts/i)).toBeInTheDocument();
  });
});
