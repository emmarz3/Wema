import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable, type Column, type SortState } from '../components/ui/Table';
import { EmptyState, ErrorState } from '../components/ui/States';
import { Pagination } from '../components/ui/Pagination';
import { formatMoney } from '../lib/format';

interface Row {
  id: string;
  reference: string;
  amountMinor: number;
}

const ROWS: Row[] = [
  { id: '1', reference: 'TRX-100', amountMinor: 25000000 },
  { id: '2', reference: 'TRX-200', amountMinor: 50000000 },
  { id: '3', reference: 'TRX-300', amountMinor: 750000 },
];

const COLUMNS: Array<Column<Row>> = [
  { key: 'reference', header: 'Reference', sortable: true, render: (row) => row.reference },
  {
    key: 'amount',
    header: 'Amount',
    numeric: true,
    sortable: true,
    render: (row) => formatMoney({ amountMinor: row.amountMinor, currency: 'NGN' }),
  },
];

describe('DataTable', () => {
  it('renders rows with a caption and numeric cells', () => {
    render(
      <DataTable
        caption="Sample records"
        columns={COLUMNS}
        rows={ROWS}
        getRowKey={(row) => row.id}
      />,
    );
    expect(screen.getByText('TRX-100')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText(/sample records/i)).toBeInTheDocument();
  });

  it('announces sort state through aria-sort', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [sort, setSort] = useState<SortState>({ key: 'reference', direction: 'asc' });
      return (
        <DataTable
          caption="Records"
          columns={COLUMNS}
          rows={ROWS}
          getRowKey={(row) => row.id}
          sort={sort}
          onSortChange={(key) =>
            setSort((current) => ({
              key,
              direction:
                current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
            }))
          }
        />
      );
    }
    render(<Harness />);
    const header = screen.getByRole('button', { name: /reference/i });
    expect(header).toHaveAttribute('aria-sort', 'ascending');
    await user.click(header);
    expect(header).toHaveAttribute('aria-sort', 'descending');
  });

  it('shows the empty state instead of an empty table', () => {
    render(
      <DataTable
        caption="Records"
        columns={COLUMNS}
        rows={[]}
        getRowKey={(row) => row.id}
        empty={<EmptyState title="No records yet" description="Nothing to show." />}
      />,
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('No records yet')).toBeInTheDocument();
  });

  it('renders skeleton rows while loading', () => {
    render(
      <DataTable
        caption="Records"
        columns={COLUMNS}
        rows={[]}
        getRowKey={(row) => row.id}
        loading
      />,
    );
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.queryByText('TRX-100')).not.toBeInTheDocument();
  });

  it('renders mobile cards on narrow layouts', () => {
    render(
      <DataTable
        caption="Records"
        columns={COLUMNS}
        rows={ROWS}
        getRowKey={(row) => row.id}
        mobileCard={(row) => <div>card:{row.reference}</div>}
      />,
    );
    expect(screen.getByText('card:TRX-100')).toBeInTheDocument();
  });
});

describe('States', () => {
  it('renders an alert with a retry affordance', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorState description="Source unreachable." onRetry={onRetry} />);
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalled();
  });
});

describe('Pagination', () => {
  it('reports the range and disables edges', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <Pagination page={2} pageSize={10} total={87} onPageChange={onPageChange} />,
    );
    expect(screen.getByText(/showing 11–20 of 87 records/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous page/i })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: /next page/i }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('disables both edges on a single page', () => {
    render(<Pagination page={1} pageSize={10} total={3} onPageChange={() => {}} />);
    expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled();
    expect(screen.getByText(/showing 1–3 of 3 records/i)).toBeInTheDocument();
  });
});
