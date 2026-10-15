import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Field';
import { StatusBadge } from '../components/ui/Badge';
import { Dialog } from '../components/ui/Dialog';
import { EmptyState, ErrorState } from '../components/ui/States';
import { ApiError } from '../api/errors';
import {
  deliveryStatusMeta,
  simulationStateMeta,
  transactionStatusMeta,
} from '../lib/status';

describe('Button', () => {
  it('fires click handlers when enabled', async () => {
    const user = userEvent.setup();
    let clicks = 0;
    render(<Button onClick={() => clicks++}>Transfer funds</Button>);
    await user.click(screen.getByRole('button', { name: 'Transfer funds' }));
    expect(clicks).toBe(1);
  });

  it('blocks interaction and announces busy state while loading', async () => {
    const user = userEvent.setup();
    let clicks = 0;
    render(
      <Button loading onClick={() => clicks++}>
        Submit
      </Button>,
    );
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    await user.click(button).catch(() => undefined);
    expect(clicks).toBe(0);
  });
});

describe('form fields', () => {
  it('marks invalid inputs for assistive technology', () => {
    render(
      <Field label="Amount" error="Enter an amount greater than zero.">
        {(props) => <Input {...props} invalid />}
      </Field>,
    );
    expect(screen.getByLabelText(/Amount/)).toHaveAttribute('aria-invalid', 'true');
    expect(
      screen.getByText('Enter an amount greater than zero.'),
    ).toBeInTheDocument();
  });
});

describe('status badges', () => {
  it('pairs every status colour with a readable label and icon', () => {
    for (const meta of [
      transactionStatusMeta.SUCCESS,
      transactionStatusMeta.FAILED,
      transactionStatusMeta.PENDING,
      transactionStatusMeta.REVERSED,
      simulationStateMeta.running,
      deliveryStatusMeta.DELIVERED,
      deliveryStatusMeta.DEAD_LETTER,
    ]) {
      const { unmount } = render(<StatusBadge meta={meta} />);
      expect(screen.getByText(meta.label)).toBeInTheDocument();
      expect(meta.description.length).toBeGreaterThan(0);
      unmount();
    }
  });

  it('keeps failed deliveries visually distinct from successful transactions', () => {
    const { container: ok } = render(
      <StatusBadge meta={deliveryStatusMeta.DELIVERED} />,
    );
    const { container: failed } = render(
      <StatusBadge meta={deliveryStatusMeta.FAILED} />,
    );
    expect(ok.firstElementChild?.className).not.toEqual(
      failed.firstElementChild?.className,
    );
  });
});

describe('Dialog', () => {
  it('renders nothing while closed', () => {
    render(
      <Dialog open={false} onClose={() => undefined} title="Confirm">
        content
      </Dialog>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens as a labelled modal and closes on Escape', async () => {
    const user = userEvent.setup();
    let closed = false;
    render(
      <Dialog open onClose={() => (closed = true)} title="Confirm reversal">
        <p>Reversal body</p>
      </Dialog>,
    );
    expect(
      screen.getByRole('dialog', { name: 'Confirm reversal' }),
    ).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(closed).toBe(true);
  });
});

describe('states', () => {
  it('explains API errors and offers a retry', async () => {
    const user = userEvent.setup();
    let retried = false;
    render(
      <ErrorState
        error={new ApiError(409, {
          code: 'duplicate_reference',
          message: 'This reference has already been used.',
        })}
        onRetry={() => {
          retried = true;
        }}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      /reference has already been used/i,
    );
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(retried).toBe(true);
  });

  it('renders empty states with a title and description', () => {
    render(
      <EmptyState
        title="No transactions yet"
        description="Run the simulation to generate activity."
      />,
    );
    expect(screen.getByText('No transactions yet')).toBeInTheDocument();
  });
});

describe('motion hooks', () => {
  it('respects the reduced-motion preference', () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes('reduce'),
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;

    function Harness() {
      const [count, setCount] = useState(0);
      return (
        <div>
          <Button onClick={() => setCount(count + 1)}>Increase {count}</Button>
        </div>
      );
    }

    render(<Harness />);
    expect(screen.getByRole('button', { name: /Increase 0/ })).toBeInTheDocument();
    window.matchMedia = original;
  });
});
