import type { ReactElement } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../state/toast';
import type { Role } from '../lib/permissions';

/** Fresh query client per render so tests never share cached data. */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

/** Renders with the same providers the application shell uses. */
export function renderWithRouter(
  ui: ReactElement,
  { route = '/' }: { route?: string } = {},
): RenderResult {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

/** Seeds a simulated session the way the simulated data source stores it. */
export function seedSession(role: Role, name = 'Test Operator'): void {
  const session = {
    token: `tok_${role}`,
    user: {
      id: `usr_${role}`,
      name,
      email: `operator.${role}@proofbank.test`,
      role,
    },
    issuedAt: new Date().toISOString(),
  };
  localStorage.setItem('proofbank.simulated.session', JSON.stringify(session));
  localStorage.setItem('proofbank.auth.token', session.token);
}

export function clearSession(): void {
  localStorage.clear();
}
