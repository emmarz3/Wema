import { describe, expect, it, beforeEach, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/utils';
import { AppRoutes } from '../App';
import { api } from '../api';
import { roleLabels, type Role } from '../lib/permissions';
import { WORKSPACE_NAV } from '../components/layout/Sidebar';

/**
 * Authentication and workspace-shell tests (Phase 3).
 *
 * Covers the flows the build spec requires: sign in and protected routes,
 * role-aware navigation, session expiry, validation, and prevention of
 * duplicate submissions.
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

/** The session restore runs before the sign-in form is mounted. */
async function waitForSignInForm() {
  await waitFor(() =>
    expect(screen.getByLabelText(/work email/i)).toBeInTheDocument(),
  );
}

/** Signs in through the real sign-in screen. */
async function signInThroughUi(user: ReturnType<typeof userEvent.setup>, email: string) {
  await user.type(screen.getByLabelText(/work email/i), email);
  await user.type(screen.getByLabelText(/password/i), 'password123');
  await user.click(screen.getByRole('button', { name: /^sign in$/i }));
}

describe('authentication flows', () => {
  beforeEach(() => {
    clearSessions();
  });

  it('signs in through the form and lands in the workspace', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppRoutes />, { route: '/sign-in' });
    await waitForSignInForm();

    await signInThroughUi(user, 'chidi.nwosu@proofops.test');

    await waitFor(() =>
      expect(
        screen.getByRole('navigation', { name: 'Workspace sections' }),
      ).toBeInTheDocument(),
    );
    // The session user's name and role appear in the top bar.
    expect(screen.getByText('Chidi Nwosu')).toBeInTheDocument();
    expect(screen.getByText(roleLabels.analyst)).toBeInTheDocument();
  });

  it('rejects an invalid email and a short password with inline errors', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppRoutes />, { route: '/sign-in' });
    await waitForSignInForm();

    await user.type(screen.getByLabelText(/work email/i), 'not-an-email');
    await user.type(screen.getByLabelText(/password/i), 'short');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument();
    // Still on the sign-in screen — no session was created.
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('prevents duplicate submissions while a sign-in is in flight', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppRoutes />, { route: '/sign-in' });
    await waitForSignInForm();

    await user.type(screen.getByLabelText(/work email/i), 'chidi.nwosu@proofops.test');
    await user.type(screen.getByLabelText(/password/i), 'password123');

    const button = screen.getByRole('button', { name: /^sign in$/i });
    await user.click(button);
    // The button disables while in flight, so a second click cannot double
    // the request.
    await waitFor(() => expect(button).toBeDisabled());
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('redirects protected routes to sign-in and returns afterwards', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppRoutes />, { route: '/app/verification' });

    // Blocked: sent to sign-in.
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument(),
    );
    await waitForSignInForm();

    // Sign in: the app returns to the originally requested route.
    await signInThroughUi(user, 'chidi.nwosu@proofops.test');
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Verification' })).toBeInTheDocument(),
    );
  });

  it('restores a session from the stored token on boot', async () => {
    await signInDirect('grace.view@proofops.test');
    renderWithProviders(<AppRoutes />, { route: '/app' });
    await waitFor(() =>
      expect(screen.getByText('Grace View')).toBeInTheDocument(),
    );
    expect(screen.getByRole('navigation', { name: 'Workspace sections' })).toBeInTheDocument();
  });

  it('signs out and returns to the sign-in screen', async () => {
    const user = userEvent.setup();
    await signInDirect('chidi.nwosu@proofops.test');
    renderWithProviders(<AppRoutes />, { route: '/app' });
    await waitFor(() => expect(screen.getByText('Chidi Nwosu')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /chidi nwosu/i }));
    await user.click(await screen.findByRole('menuitem', { name: /sign out/i }));

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument(),
    );
    expect(localStorage.getItem('proofops.auth.token')).toBeNull();
  });

  it('explains an expired session on the sign-in screen', async () => {
    // A session that is already past its expiry restores as expired.
    const session = await signInDirect('chidi.nwosu@proofops.test');
    const sessions = JSON.parse(localStorage.getItem('proofops.simulated.sessions') ?? '{}');
    sessions[session.token] = {
      ...sessions[session.token],
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    };
    localStorage.setItem('proofops.simulated.sessions', JSON.stringify(sessions));

    renderWithProviders(<AppRoutes />, { route: '/app' });

    await waitFor(() =>
      expect(screen.getByText(/your session expired/i)).toBeInTheDocument(),
    );
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('keeps frontend sign-in state honest when the source rejects credentials', async () => {
    const user = userEvent.setup();
    // Any email works in the simulated source, but a short password is
    // rejected — proving the form cannot bypass the source's own rules.
    renderWithProviders(<AppRoutes />, { route: '/sign-in' });
    await waitForSignInForm();
    await user.type(screen.getByLabelText(/work email/i), 'chidi.nwosu@proofops.test');
    await user.type(screen.getByLabelText(/password/i), '123');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));
    expect(await screen.findByText('Password must be at least 8 characters.')).toBeInTheDocument();
  });
});

describe('role-aware workspace navigation', () => {
  beforeEach(() => {
    clearSessions();
  });

  it('shows every section to the owner', async () => {
    await signInDirect('amara.okafor@proofops.test');
    renderWithProviders(<AppRoutes />, { route: '/app' });
    await waitFor(() =>
      expect(screen.getByRole('navigation', { name: 'Workspace sections' })).toBeInTheDocument(),
    );
    WORKSPACE_NAV.forEach((item) => {
      expect(screen.getByRole('link', { name: item.label })).toBeInTheDocument();
    });
  });

  it('hides reconciliation, developer console and settings from a viewer', async () => {
    await signInDirect('grace.view@proofops.test');
    renderWithProviders(<AppRoutes />, { route: '/app' });
    await waitFor(() =>
      expect(screen.getByRole('navigation', { name: 'Workspace sections' })).toBeInTheDocument(),
    );
    const nav = screen.getByRole('navigation', { name: 'Workspace sections' });
    expect(within(nav).queryByRole('link', { name: 'Reconciliation' })).not.toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Developer console' })).not.toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Settings & audit' })).not.toBeInTheDocument();
    // Core sections remain visible.
    expect(within(nav).getByRole('link', { name: 'Overview' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Verification' })).toBeInTheDocument();
  });

  it('blocks a restricted section with an honest state', async () => {
    await signInDirect('grace.view@proofops.test');
    renderWithProviders(<AppRoutes />, { route: '/app/reconciliation' });
    await waitFor(() =>
      expect(screen.getByText(/outside your role's access/i)).toBeInTheDocument(),
    );
  });

  it('gives the analyst the operations sections but not administration', async () => {
    await signInDirect('chidi.nwosu@proofops.test');
    renderWithProviders(<AppRoutes />, { route: '/app' });
    await waitFor(() =>
      expect(screen.getByRole('navigation', { name: 'Workspace sections' })).toBeInTheDocument(),
    );
    const nav = screen.getByRole('navigation', { name: 'Workspace sections' });
    expect(within(nav).getByRole('link', { name: 'Reconciliation' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Infrastructure' })).toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Developer console' })).not.toBeInTheDocument();
  });
});

describe('session behaviour with the data source', () => {
  beforeEach(() => {
    clearSessions();
  });

  it('refuses workspace routes with no session at all', async () => {
    // The simulated transport gates every non-auth route.
    await expect(api.overviewSummary('7d')).rejects.toMatchObject({
      status: 401,
    });
  });

  it('expires a session according to the source, not the interface', async () => {
    vi.useFakeTimers();
    try {
      const session = await api.signIn({
        email: 'chidi.nwosu@proofops.test',
        password: 'password123',
      });
      const expiresAt = new Date(session.expiresAt).getTime();
      expect(expiresAt).toBeGreaterThan(Date.now());

      // Move past the expiry and confirm the source rejects the session.
      vi.setSystemTime(expiresAt + 1_000);
      const stillValid = await api.currentSession(session.token);
      expect(stillValid).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
