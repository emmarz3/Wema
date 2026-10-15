import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OverviewPage } from '../pages/OverviewPage';
import { MetricTile } from '../components/dashboard/MetricTile';
import { QuickActions } from '../components/dashboard/QuickActions';
import { StatusBreakdown } from '../components/dashboard/StatusBreakdown';
import { VolumeChart } from '../components/dashboard/VolumeChart';
import { DeliveryTable } from '../components/dashboard/DeliveryTable';
import { AuthProvider } from '../state/auth';
import { clearSession, renderWithRouter, seedSession } from '../test/utils';
import type { StatusSlice, VolumePoint } from '../types/domain';

function renderOverview(role: Parameters<typeof seedSession>[0] = 'super_admin', route = '/overview') {
  seedSession(role);
  return renderWithRouter(
    <AuthProvider>
      <OverviewPage />
    </AuthProvider>,
    { route },
  );
}

describe('Overview dashboard', () => {
  beforeEach(() => {
    clearSession();
  });

  it('renders the environment identity and summary sections', async () => {
    renderOverview();
    expect(
      await screen.findByRole('heading', { name: 'Overview' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Summary metrics' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Simulated data')).toBeInTheDocument();
  });

  it('shows metric values computed by the data source, formatted for money', async () => {
    renderOverview();
    // Settled volume tile renders a compact NGN figure with tabular numerals.
    const tiles = within(screen.getByRole('region', { name: 'Summary metrics' }));
    const volume = await tiles.findByText(/^₦[\d.,]+[KMB]?$/);
    expect(volume).toBeInTheDocument();
    expect(volume.className).toContain('tabular-nums');
    // Count tiles render whole numbers.
    expect(tiles.getByText('Simulated customers')).toBeInTheDocument();
    expect(tiles.getByText('Successful')).toBeInTheDocument();
    expect(tiles.getByText('Failed')).toBeInTheDocument();
    expect(tiles.getByText('Pending')).toBeInTheDocument();
    expect(tiles.getByText('Reversed')).toBeInTheDocument();
  });

  it('renders activity panels, recent records and provider health', async () => {
    renderOverview();
    expect(await screen.findByText('Transaction volume')).toBeInTheDocument();
    expect(screen.getByText('Status distribution')).toBeInTheDocument();
    expect(screen.getByText('Recent transactions')).toBeInTheDocument();
    expect(screen.getByText('Simulation events')).toBeInTheDocument();
    expect(screen.getByText('Recent scenario executions')).toBeInTheDocument();
    expect(screen.getByText('Event delivery attempts')).toBeInTheDocument();
    expect(screen.getByText('Simulation state')).toBeInTheDocument();
    expect(screen.getByText('Simulated provider health')).toBeInTheDocument();
  });

  it('keeps delivery status clearly separate from transaction outcome', async () => {
    renderOverview();
    expect(
      await screen.findByText(/Delivery status .* transaction outcome/i),
    ).toBeInTheDocument();
  });

  it('switches the activity range from the selector', async () => {
    const user = userEvent.setup();
    renderOverview();
    await screen.findByRole('heading', { name: 'Overview' });

    await user.click(screen.getByRole('radio', { name: /7 days/ }));
    expect(await screen.findByText(/last 7 days/)).toBeInTheDocument();
  });

  it('reports simulated data rather than pretending to be live', async () => {
    renderOverview();
    expect(
      await screen.findByText(/simulated data source and refresh on a visible cadence/i),
    ).toBeInTheDocument();
  });

  it('offers real financial operations to permitted roles', async () => {
    renderOverview();
    const deposit = await screen.findByRole('link', { name: /Initiate a deposit/i });
    expect(deposit).toHaveAttribute('href', '/transactions?operation=deposit');
    expect(screen.getByRole('link', { name: /Initiate a withdrawal/i })).toHaveAttribute(
      'href',
      '/transactions?operation=withdrawal',
    );
    expect(screen.getByRole('link', { name: /Initiate an internal transfer/i })).toBeTruthy();
  });

  it('explains that operations are refused without permission', async () => {
    clearSession();
    seedSession('viewer');
    renderWithRouter(
      <AuthProvider>
        <OverviewPage />
      </AuthProvider>,
    );
    await waitFor(
      () =>
        expect(screen.getAllByText(/Not permitted/).length).toBeGreaterThanOrEqual(3),
      { timeout: 8000 },
    );
  });
});

describe('quick actions permissions', () => {
  beforeEach(() => {
    clearSession();
  });

  it('offers operational links to supervisors', async () => {
    seedSession('super_admin');
    renderWithRouter(
      <AuthProvider>
        <QuickActions />
      </AuthProvider>,
    );
    expect(
      await screen.findByRole('link', { name: /Create a simulated customer/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Run a scenario/i })).toBeInTheDocument();
  });

  it('tells read-only roles that operations are not permitted', async () => {
    seedSession('viewer');
    renderWithRouter(
      <AuthProvider>
        <QuickActions />
      </AuthProvider>,
    );
    // All three scheduled operations are marked not permitted for a viewer.
    expect((await screen.findAllByText(/Not permitted/)).length).toBe(3);
    const deposit = screen.getByRole('button', { name: /Initiate a deposit/i });
    expect(deposit).toBeDisabled();
  });
});

describe('dashboard components in isolation', () => {
  it('MetricTile computes the trend delta from the reported previous period', () => {
    renderWithRouter(
      <MetricTile
        label="Successful"
        value="40"
        comparison={{ current: 50, previous: 40 }}
      />,
    );
    expect(screen.getByText('+25%')).toBeInTheDocument();
  });

  it('MetricTile omits the delta when there is no comparable previous period', () => {
    renderWithRouter(<MetricTile label="Successful" value="40" comparison={{ current: 50, previous: 0 }} />);
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it('VolumeChart explains an empty range instead of drawing an empty axis', () => {
    renderWithRouter(<VolumeChart data={[]} range="24h" />);
    expect(screen.getByText('No transactions in this range')).toBeInTheDocument();
  });

  it('VolumeChart renders real buckets with a range total', () => {
    const points: VolumePoint[] = Array.from({ length: 3 }, (_, index) => ({
      bucketStart: new Date(Date.UTC(2026, 9, 13, index)).toISOString(),
      successful: 2 + index,
      failed: 1,
      pending: 0,
      reversed: 0,
      total: 3 + index,
    }));
    renderWithRouter(<VolumeChart data={points} range="24h" />);
    expect(screen.getByText('12 in range')).toBeInTheDocument();
  });

  it('StatusBreakdown lists every status with its share', () => {
    const data: StatusSlice[] = [
      { status: 'SUCCESS', count: 75, share: 75 },
      { status: 'FAILED', count: 25, share: 25 },
    ];
    renderWithRouter(<StatusBreakdown data={data} />);
    expect(screen.getByText('Successful')).toBeInTheDocument();
    expect(screen.getByText('75.0%')).toBeInTheDocument();
    expect(screen.getByText('25.0%')).toBeInTheDocument();
  });

  it('DeliveryTable lists attempts and keeps the disclaimer visible', async () => {
    renderWithRouter(
      <DeliveryTable
        deliveries={[
          {
            id: 'dlv_1',
            eventType: 'transaction.completed',
            destination: 'https://proofops.simulated.test/hooks/proofbank',
            status: 'RETRYING',
            attempts: 3,
            firstAttemptAt: new Date().toISOString(),
            lastAttemptAt: new Date().toISOString(),
            nextRetryAt: new Date().toISOString(),
            responseCode: 503,
            error: 'Destination rejected the delivery during simulation.',
            correlationId: 'corr_0123456789abcdef',
          },
        ]}
      />,
    );
    expect(await screen.findByText('Retrying')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/Delivery status ≠ transaction outcome/)).toBeInTheDocument();
  });
});
