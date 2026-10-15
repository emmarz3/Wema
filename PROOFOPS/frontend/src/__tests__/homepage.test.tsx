import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/utils';
import { HomePage } from '../pages/HomePage';

/**
 * Homepage rendering and interaction tests. The page renders the real
 * sections; the interactive demonstration runs its scripted steps.
 */
describe('homepage structure', () => {
  it('renders the hero with the product promise', () => {
    renderWithProviders(<HomePage />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Know what happened');
    expect(heading).toHaveTextContent('to every transaction.');
    expect(
      screen.getByText(/verify payment records, identify discrepancies/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Wema Hackathon Edition')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /explore the demo/i })).toHaveAttribute(
      'href',
      '#demo',
    );
    expect(screen.getByRole('link', { name: /how it works/i })).toHaveAttribute(
      'href',
      '#how-it-works',
    );
  });

  it('renders every required section', () => {
    renderWithProviders(<HomePage />);
    [
      ['See how a verification runs', 'heading'],
      ['Operations teams are asked to prove what they cannot see', 'heading'],
      ['Two layers, one record of what happened', 'heading'],
      ['The workspace your team works in', 'heading'],
      ['From claim to preserved proof in four steps', 'heading'],
      ['Investigate with evidence', 'heading'],
      ['Integrate the same contract the interface uses', 'heading'],
      ['Built so the answer can be defended', 'heading'],
      ['See it on your own evidence', 'heading'],
    ].forEach(([title]) => {
      expect(screen.getByText(title)).toBeInTheDocument();
    });
  });

  it('labels sample data on the hero preview and the dashboard preview', () => {
    renderWithProviders(<HomePage />);
    const samples = screen.getAllByText(/Sample data — simulated/i);
    expect(samples.length).toBeGreaterThan(2);
    expect(
      screen.getByText(/figures do not represent any real provider or institution/i),
    ).toBeInTheDocument();
  });

  it('shows the nine capabilities with previews', () => {
    renderWithProviders(<HomePage />);
    const platform = document.getElementById('platform');
    expect(platform).not.toBeNull();
    if (!platform) return;
    const articles = within(platform).getAllByRole('article');
    expect(articles).toHaveLength(9);
  });
});

describe('interactive verification demonstration', () => {
  it('runs the successful scenario to a verified outcome', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HomePage />);
    const demo = document.getElementById('demo');
    if (!demo) throw new Error('demo section missing');

    await user.click(within(demo).getByRole('button', { name: /run demonstration/i }));

    await waitFor(
      () => expect(within(demo).getByText(/Verified — the claim matches/i)).toBeInTheDocument(),
      { timeout: 15000 },
    );
    expect(within(demo).getByText('Amount match')).toBeInTheDocument();
    expect(within(demo).getAllByText('Passed').length).toBeGreaterThanOrEqual(4);
  }, 20000);

  it('shows the mismatch scenario with the failing amount check', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HomePage />);
    const demo = document.getElementById('demo');
    if (!demo) throw new Error('demo section missing');

    await user.click(within(demo).getByRole('tab', { name: /amount mismatch/i }));
    await user.click(within(demo).getByRole('button', { name: /step through/i }));

    // Step through to the comparison step and beyond.
    for (let i = 0; i < 12; i += 1) {
      const stepButton = within(demo).queryByRole('button', { name: /^step$/i });
      if (!stepButton) break;
      await user.click(stepButton);
    }

    await waitFor(() =>
      expect(within(demo).getByText(/Mismatch — the source contradicts the claim/i)).toBeInTheDocument(),
    );
    // The receipt and source amounts are both on screen, unmerged.
    expect(within(demo).getAllByText('₦500,000.00').length).toBeGreaterThan(0);
    expect(within(demo).getAllByText('₦250,000.00').length).toBeGreaterThan(0);
  }, 20000);

  it('separates payment status from delivery status in scenario C', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HomePage />);
    const demo = document.getElementById('demo');
    if (!demo) throw new Error('demo section missing');

    await user.click(within(demo).getByRole('tab', { name: /webhook failed/i }));
    expect(within(demo).getByText('Payment status (at source)')).toBeInTheDocument();
    expect(within(demo).getByText('Notification delivery')).toBeInTheDocument();
    expect(within(demo).getByText(/Delivery attempts/i)).toBeInTheDocument();
    expect(within(demo).getByText(/Payment status: successful\. Delivery status: failed/i)).toBeInTheDocument();
  });

  it('resets the demonstration when the scenario changes', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HomePage />);
    const demo = document.getElementById('demo');
    if (!demo) throw new Error('demo section missing');

    await user.click(within(demo).getByRole('button', { name: /run demonstration/i }));
    await waitFor(() =>
      expect(within(demo).getByText(/Source record located/i)).toBeInTheDocument(),
      { timeout: 15000 },
    );

    await user.click(within(demo).getByRole('tab', { name: /amount mismatch/i }));
    expect(within(demo).queryByText(/Verified — the claim matches/i)).not.toBeInTheDocument();
    expect(within(demo).getByRole('button', { name: /run demonstration/i })).toBeInTheDocument();
  }, 20000);
});

describe('dashboard preview modes', () => {
  it('switches between the three labelled preview modes', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HomePage />);
    const dashboard = document.getElementById('dashboard');
    if (!dashboard) throw new Error('dashboard section missing');

    // Overview by default.
    expect(within(dashboard).getByText(/Verifications \(24h\)/)).toBeInTheDocument();
    expect(within(dashboard).getByText(/Results by outcome/i)).toBeInTheDocument();

    await user.click(within(dashboard).getByRole('radio', { name: 'Verification' }));
    expect(within(dashboard).getByText(/What each outcome means/i)).toBeInTheDocument();
    expect(within(dashboard).getByText(/Recent infrastructure events/i)).toBeInTheDocument();

    await user.click(within(dashboard).getByRole('radio', { name: 'Infrastructure' }));
    expect(within(dashboard).getByText(/Latency percentiles/i)).toBeInTheDocument();
    expect(within(dashboard).getByText(/Webhook delivery outcomes/i)).toBeInTheDocument();
    expect(
      within(dashboard).getByRole('heading', { name: 'Provider health' }),
    ).toBeInTheDocument();
    expect(
      within(dashboard).getByRole('table', { name: /sample provider health/i }),
    ).toBeInTheDocument();
  });
});
