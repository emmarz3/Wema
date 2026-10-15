import { describe, expect, it, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../state/auth';
import { renderWithRouter, clearSession } from '../test/utils';
import { Button } from '../components/ui/Button';

function AuthProbe() {
  const { status, role, user, signIn, signOut, can } = useAuth();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="role">{role ?? 'none'}</span>
      <span data-testid="name">{user?.name ?? 'anonymous'}</span>
      <span data-testid="can-control">{String(can('control_simulation'))}</span>
      <Button
        onClick={() =>
          void signIn({
            email: 'amara.okafor@proofbank.test',
            password: 'demonstration1',
            role: 'super_admin',
          })
        }
      >
        Sign in as supervisor
      </Button>
      <Button variant="secondary" onClick={() => void signOut()}>
        Sign out
      </Button>
    </div>
  );
}

describe('authentication shell', () => {
  beforeEach(() => {
    clearSession();
  });

  it('boots signed out when there is no session', async () => {
    renderWithRouter(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('signedOut'),
    );
    expect(screen.getByTestId('role')).toHaveTextContent('none');
    expect(screen.getByTestId('can-control')).toHaveTextContent('false');
  });

  it('signs in against the simulated source and updates capabilities', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await user.click(screen.getByRole('button', { name: /sign in as supervisor/i }));

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('signedIn'),
    );
    expect(screen.getByTestId('role')).toHaveTextContent('super_admin');
    expect(screen.getByTestId('name')).toHaveTextContent('Amara Okafor');
    expect(screen.getByTestId('can-control')).toHaveTextContent('true');
  });

  it('keeps the session after sign-out', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await user.click(screen.getByRole('button', { name: /sign in as supervisor/i }));
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('signedIn'),
    );

    await user.click(screen.getByRole('button', { name: /^sign out$/i }));
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('signedOut'),
    );
    expect(localStorage.getItem('proofbank.auth.token')).toBeNull();
  });
});
