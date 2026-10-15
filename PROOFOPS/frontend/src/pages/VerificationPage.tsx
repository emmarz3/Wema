import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Plus } from 'lucide-react';
import { PageHeader } from '../components/layout/AppShell';
import { Panel, PanelBody, PanelHeader } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Field, Input, Select, Textarea, Checkbox } from '../components/ui/Field';
import { DataTable, type Column } from '../components/ui/Table';
import { Pagination } from '../components/ui/Pagination';
import { SearchInput } from '../components/ui/SearchInput';
import { Dialog } from '../components/ui/Dialog';
import { LoadingState, ErrorState, EmptyState } from '../components/ui/States';
import { useAuth } from '../state/auth';
import { useToast } from '../state/toast';
import { api } from '../api';
import type { Verification, VerificationResult, VerificationQuery } from '../types/domain';
import { verificationResultLabels, verificationResultIcons, verificationResultTones } from '../lib/status';
import { formatMoney, formatDateTime } from '../lib/format';

/** Verification workspace — Phase 4 implementation */

export function VerificationPage() {
  const { can: canAccess } = useAuth();
  
  const [filters, setFilters] = useState({
    search: '', provider: '', merchant: '', proofId: '', result: '', transactionStatus: '',
    from: '', to: '', currency: '', minAmountMinor: 0, maxAmountMinor: 0,
    page: 1, pageSize: 10, sort: 'reference', direction: 'asc' as const,
  });
  
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const createForm = useForm({
    resolver: zodResolver(z.object({
      reference: z.string().min(1, 'Reference is required'),
      provider: z.string().min(1, 'Provider is required'),
      merchant: z.string().min(1, 'Merchant is required'),
      amount: z.number().min(0, 'Amount must be positive'),
      currency: z.string().default('NGN'),
      receiptClaimed: z.boolean().default(false),
      note: z.string().optional(),
    })),
    defaultValues: { reference: '', provider: '', merchant: '', amount: 0, currency: 'NGN', receiptClaimed: false, note: '' }
  });

  // Fetch verifications
  const fetchVerifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const query: VerificationQuery = {
        search: filters.search || undefined,
        provider: filters.provider || undefined,
        merchant: filters.merchant || undefined,
        proofId: filters.proofId || undefined,
        result: filters.result as any || undefined,
        transactionStatus: filters.transactionStatus as any || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
        currency: filters.currency || undefined,
        minAmountMinor: filters.minAmountMinor || undefined,
        maxAmountMinor: filters.maxAmountMinor || undefined,
        page: filters.page,
        pageSize: filters.pageSize,
        sort: filters.sort as any,
        direction: filters.direction,
      };
      
      const response = await api.verificationsList(query);
      if (response.items) {
        setVerifications(response.items);
      }
      if (response.total !== undefined) {
        setTotalCount(response.total);
      }
    } catch (err) {
      setError('Failed to load verification records');
      setVerifications([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifications();
  }, [filters]);

  const handleFilterChange = (key: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleSearch = () => {
    setFilters(prev => ({ ...prev, search: filters.search, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const getResultBadge = (result: VerificationResult) => {
    const Icon = verificationResultIcons[result];
    return (
      <Badge tone={verificationResultTones[result]} icon={Icon}>
        {verificationResultLabels[result]}
      </Badge>
    );
  };

  const createVerification = async (data: any) => {
    try {
      const input = {
        reference: data.reference,
        provider: data.provider,
        merchant: data.merchant,
        amount: { amountMinor: data.amount * 100, currency: data.currency },
        receiptClaimed: data.receiptClaimed,
        note: data.note,
      };
      await api.verifyTransaction(input);
      useToast().push({ tone: 'success', title: 'Verification started', description: `Verification ${data.reference} has been created.` });
      setShowCreateDialog(false);
      createForm.reset();
      fetchVerifications();
    } catch (error) {
      useToast().push({ tone: 'error', title: 'Failed to create verification', description: 'Please check your input and try again.' });
    }
  };

  const handleCreateSubmit = createForm.handleSubmit(async (data) => {
    await createVerification(data);
  });

  if (loading && verifications.length === 0) {
    return <LoadingState label="Loading verification records" />;
  }

  if (error) {
    return <ErrorState description={error} onRetry={fetchVerifications} />;
  }

  const columns: Column<any>[] = [
    {
      key: 'reference',
      header: 'Reference',
      render: (row) => (
        <Link
          to={`/app/verification/${row.reference}`}
          className="font-medium text-brand hover:underline"
        >
          {row.reference}
        </Link>
      ),
      sortable: true,
    },
    {
      key: 'amount',
      header: 'Amount',
      numeric: true,
      sortable: true,
      render: (row) => formatMoney({ amountMinor: row.amountMinor, currency: row.currency }),
    },
    {
      key: 'result',
      header: 'Result',
      sortable: true,
      render: (row) => getResultBadge(row.result),
    },
    {
      key: 'provider',
      header: 'Provider',
      sortable: true,
      render: (row) => <span className="text-ink-secondary">{row.provider}</span>,
    },
    {
      key: 'transactionStatus',
      header: 'Transaction Status',
      sortable: true,
      render: (row) => {
        const status = row.transactionStatus;
        return status === 'success' ? (
          <Badge tone="success">Success</Badge>
        ) : (
          <Badge tone="danger">Failed</Badge>
        );
      },
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (row) => formatDateTime(row.createdAt),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <PageHeader
        title="Verification"
        description="Verify payment records against authoritative sources, investigate discrepancies, and preserve evidence."
        actions={
          canAccess('verify_transactions') && (
            <Button
              onClick={() => setShowCreateDialog(true)}
              icon={<Plus className="size-4" />}
            >
              New verification
            </Button>
          )
        }
      />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
        {/* Filters */}
        <Panel>
          <PanelHeader
            title="Filters"
            description="Search and filter verification records"
            actions={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setFilters(prev => ({ ...prev, search: '', provider: '', merchant: '', proofId: '', result: '', transactionStatus: '', from: '', to: '', currency: '', minAmountMinor: 0, maxAmountMinor: 0 }))}
              >
                Clear filters
              </Button>
            }
          />
          <PanelBody>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <SearchInput
                value={filters.search}
                onValueChange={(value) => handleFilterChange('search', value)}
                placeholder="Search references..."
              />
              <Field label="Provider" htmlFor="filter-provider">
                <Input
                  id="filter-provider"
                  value={filters.provider}
                  onChange={(e) => handleFilterChange('provider', e.target.value)}
                  placeholder="Provider name"
                />
              </Field>
              <Field label="Proof ID" htmlFor="filter-proof-id">
                <Input
                  id="filter-proof-id"
                  value={filters.proofId}
                  onChange={(e) => handleFilterChange('proofId', e.target.value)}
                  placeholder="Proof ID"
                />
              </Field>
              <Field label="Result" htmlFor="filter-result">
                <Select
                  id="filter-result"
                  value={filters.result}
                  onChange={(e) => handleFilterChange('result', e.target.value)}
                >
                  <option value="">All results</option>
                  {Object.entries(verificationResultLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Transaction Status" htmlFor="filter-transaction-status">
                <Select
                  id="filter-transaction-status"
                  value={filters.transactionStatus}
                  onChange={(e) => handleFilterChange('transactionStatus', e.target.value)}
                >
                  <option value="">All statuses</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                </Select>
              </Field>
              <Field label="From date" htmlFor="filter-from">
                <Input
                  id="filter-from"
                  type="date"
                  value={filters.from}
                  onChange={(e) => handleFilterChange('from', e.target.value)}
                />
              </Field>
              <Field label="To date" htmlFor="filter-to">
                <Input
                  id="filter-to"
                  type="date"
                  value={filters.to}
                  onChange={(e) => handleFilterChange('to', e.target.value)}
                />
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                onClick={handleSearch}
              >
                Apply filters
              </Button>
            </div>
          </PanelBody>
        </Panel>

        {/* Verification Records */}
        {verifications.length === 0 && !loading ? (
          <EmptyState
            title="No verification records"
            description="Start by creating a new verification to analyze payment records against authoritative sources."
            action={canAccess('verify_transactions') && (
              <Button onClick={() => setShowCreateDialog(true)}>Create verification</Button>
            )}
          />
        ) : (
          <>
            <Panel>
              <PanelHeader
                title="Verification records"
                description={`${totalCount} total verification${totalCount !== 1 ? 's' : ''}`}
              />
              <PanelBody className="p-0">
                <DataTable
                  columns={columns}
                  rows={verifications}
                  getRowKey={(row) => row.reference}
                  sort={{ key: filters.sort, direction: filters.direction }}
                  onSortChange={(key) => {
                    setFilters(prev => ({ ...prev, sort: key as any, direction: 'asc' }));
                  }}
                  caption="List of verification records"
                />
              </PanelBody>
              {totalCount > 0 && (
                <div className="border-t border-line p-3">
                  <Pagination
                    page={filters.page}
                    pageSize={filters.pageSize}
                    total={totalCount}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </Panel>
          </>
        )}

        {/* Create Verification Dialog */}
        <Dialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          title="Create new verification"
          description="Start a verification against the authoritative source. The backend owns the outcome; the response reports status, checks and IDs."
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <Field
              label="Reference"
              htmlFor="create-reference"
              error={createForm.formState.errors.reference?.message}
              required
            >
              <Input
                id="create-reference"
                {...createForm.register('reference')}
                placeholder="TRX-88412"
                invalid={!!createForm.formState.errors.reference}
              />
            </Field>

            <Field
              label="Provider"
              htmlFor="create-provider"
              error={createForm.formState.errors.provider?.message}
              required
            >
              <Input
                id="create-provider"
                {...createForm.register('provider')}
                placeholder="Bank A (simulated)"
                invalid={!!createForm.formState.errors.provider}
              />
            </Field>

            <Field
              label="Merchant"
              htmlFor="create-merchant"
              error={createForm.formState.errors.merchant?.message}
              required
            >
              <Input
                id="create-merchant"
                {...createForm.register('merchant')}
                placeholder="Customer A"
                invalid={!!createForm.formState.errors.merchant}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Amount (NGN)"
                htmlFor="create-amount"
                error={createForm.formState.errors.amount?.message}
                required
              >
                <Input
                  id="create-amount"
                  type="number"
                  {...createForm.register('amount', { valueAsNumber: true })}
                  placeholder="50000000"
                  invalid={!!createForm.formState.errors.amount}
                />
              </Field>

              <Field
                label="Currency"
                htmlFor="create-currency"
                error={createForm.formState.errors.currency?.message}
              >
                <Select {...createForm.register('currency')}>
                  <option value="NGN">NGN</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </Select>
              </Field>
            </div>

            <Field
              label="Receipt claimed"
              htmlFor="create-receipt-claimed"
            >
              <Checkbox
                label="Receipt attached for verification"
                checked={createForm.watch('receiptClaimed')}
                onChange={(e) => createForm.setValue('receiptClaimed', e.target.checked)}
              />
            </Field>

            <Field
              label="Note"
              htmlFor="create-note"
              hint="Internal notes about this verification"
            >
              <Textarea
                id="create-note"
                {...createForm.register('note')}
                placeholder="Record what you checked and what you found..."
                rows={3}
              />
            </Field>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowCreateDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                loading={createForm.formState.isSubmitting}
                icon={!createForm.formState.isSubmitting && <Plus className="size-4" />}
              >
                {createForm.formState.isSubmitting ? 'Creating...' : 'Create verification'}
              </Button>
            </div>
          </form>
        </Dialog>
      </div>
    </motion.div>
  );
}
