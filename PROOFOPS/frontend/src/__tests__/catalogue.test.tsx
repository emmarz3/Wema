import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/utils';
import { DesignSystemPage } from '../pages/DesignSystemPage';

/**
 * The design-system catalogue is a real page: its live states are driven
 * by the typed client, not by mocks. The probe exercises the actual
 * simulated transport.
 */
describe('design system catalogue', () => {
  it('renders every component section', () => {
    renderWithProviders(<DesignSystemPage />);
    expect(screen.getByRole('heading', { name: 'Design system' })).toBeInTheDocument();
    [
      'Colour tokens',
      'Typography',
      'Buttons',
      'Form controls',
      'Status vocabulary',
      'Data table',
      'Dialog & drawer',
      'States',
      'Toasts',
      'Code & clipboard',
    ].forEach((section) => {
      expect(screen.getByText(section)).toBeInTheDocument();
    });
  });

  it('links the empty-state action to the verification workspace', () => {
    renderWithProviders(<DesignSystemPage />);
    const action = screen.getByRole('link', { name: 'Verify a transaction' });
    expect(action).toHaveAttribute('href', '/app/verification');
  });

  it('probes the configured source and reports the real result', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DesignSystemPage />);
    await user.click(screen.getByRole('button', { name: /probe the source/i }));

    // The simulated transport has no /health handler yet, so the honest
    // result is the structured not_implemented error — rendered, not hidden.
    await waitFor(() => expect(screen.getByText(/not_implemented/i)).toBeInTheDocument());
    // The failure state keeps its retry affordance available.
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('drives toasts from the catalogue', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DesignSystemPage />);
    await user.click(screen.getByRole('button', { name: 'Error toast' }));
    expect(await screen.findByText('Verification failed')).toBeInTheDocument();
  });
});
