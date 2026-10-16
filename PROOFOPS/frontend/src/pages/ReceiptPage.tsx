import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Plus } from 'lucide-react';
import { PageHeader } from '../components/layout/AppShell';
import { Panel, PanelHeader, PanelBody } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Field, Input, Select, Checkbox } from '../components/ui/Field';
import { DataTable, type Column } from '../components/ui/Table';
import { Pagination } from '../components/ui/Pagination';
import { SearchInput } from '../components/ui/SearchInput';
import { Dialog } from '../components/ui/Dialog';
import { LoadingState, ErrorState, EmptyState } from '../components/ui/States';
import { useAuth } from '../state/auth';
import { useToast } from '../state/toast';
import { api } from '../api';
import type { Verification, VerificationQuery } from '../types/domain';
import { verificationResultLabels, verificationResultIcons, verificationResultTones } from '../lib/status';
import { formatMoney, formatDateTime } from '../lib/format';
import { isSimulated } from '../api';

/** Receipt upload and evidence workspace — Phase 5 implementation */

export function ReceiptPage() {
  const { can: canAccess } = useAuth();
  
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [receiptUploads, setReceiptUploads] = useState<Map<string, ReceiptClaim[]>>(new Map());
  const [receiptSearch, setReceiptSearch] = useState('');

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
        search: receiptSearch || undefined,
        result: undefined,
        provider: undefined,
        merchant: undefined,
        proofId: undefined,
        transactionStatus: undefined,
        from: undefined,
        to: undefined,
        currency: undefined,
        minAmountMinor: undefined,
        maxAmountMinor: undefined,
        page: 1,
        pageSize: 10,
        sort: 'reference',
        direction: 'asc' as const,
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
  }, [receiptSearch]);

  const handleFilterChange = (key: keyof typeof receiptSearch, value: any) => {
    setReceiptSearch(value as string);
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

  // Simulated OCR extraction
  const extractOCRClaims = (file: File): ReceiptClaim[] => {
    const claims: ReceiptClaim[] = [];
    
    // Read file as text for simulation
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target as FileReader).result as string;
      // Simulate extraction of common fields
      const amountMatch = text.match(/₦\s*([0-9,]+\.?[0-9]*)/i) || text.match(/([0-9]{2,5}(?:,[0-9]{3})*(?:\.[0-9]+)?)/);
      const refMatch = text.match(/(TRX|REF|Ref)\s*[:#]?\s*([A-Z0-9-]+)/i);
      const currencyMatch = text.match/(NGN|USD|EUR)/i);
      
      if (amountMatch) {
        claims.push({
          field: 'amount',
          value: amountMatch[1],
          confidence: 0.75,
          source: 'ocr',
        });
      }
      if (refMatch) {
        claims.push({
          field: 'reference',
          value: refMatch[2],
          confidence: 0.85,
          source: 'ocr',
        });
      }
      if (currencyMatch) {
        claims.push({
          field: 'currency',
          value: currencyMatch[1],
          confidence: 0.65,
          source: 'ocr',
        });
      }
    };
    reader.readAsText(file);
    
    // Return empty claims initially (async extraction)
    return [];
  };

  interface ReceiptClaim {
    field: string;
    value: string;
    confidence: number;
    source: 'ocr' | 'authoritative';
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
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (row) => formatDateTime(row.createdAt),
    },
  ];

  if (loading && verifications.length === 0) {
    return <LoadingState label="Loading verification records" />;
  }

  if (error) {
    return <ErrorState description={error} onRetry={fetchVerifications} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <PageHeader
        title="Receipt Evidence"
        description="Upload receipt images and compare extracted claims against authoritative transaction evidence. OCR is untrusted input and is not proof of settlement."
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
          />
          <PanelBody>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <SearchInput
                value={receiptSearch}
                onValueChange={(value) => handleFilterChange('search', value)}
                placeholder="Search references..."
              />
              <Field label="Provider" htmlFor="receipt-provider">
                <Input
                  id="receipt-provider"
                  value={''}
                  onChange={(e) => {}}
                  placeholder="Provider name"
                />
              </Field>
              <Field label="Result" htmlFor="receipt-result">
                <Select
                  id="receipt-result"
                  value={''}
                  onChange={(e) => {}}
                >
                  <option value="">All results</option>
                  {Object.entries(verificationResultLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={handleSearch}>
                Apply filters
              </Button>
            </div>
          </PanelBody>
        </Panel>

        {/* Receipt Upload Section */}
        <Panel>
          <PanelHeader title="Receipt Upload" description="Upload receipt evidence for verification">
            <PanelBody>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <Field
                  label="Receipt Image"
                  htmlFor="receipt-upload"
                  error={''}
                  required
                >
                  <Input
                    id="receipt-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        // Simulate OCR extraction
                        const claims = extractOCRClaims(file);
                        const ref = claims.find(c => c.field === 'reference')?.value || '';
                        useToast().push({
                          tone: 'success',
                          title: 'Receipt uploaded',
                          description: `Receipt claimed ₦${formatMoney({ amountMinor: 25000000, currency: 'NGN' }).replace('NGN', '')}. OCR extracted: ${claims.map(c => `${c.field}: ${c.value}`).join(', ')}.`,
                        });
                        setReceiptUploads(prev => {
                          const newMap = new Map(prev);
                          newMap.set(ref, claims);
                          return newMap;
                        });
                      }
                    }}
                  />
                </Field>

                <Field
                  label="Amount claimed (NGN)"
                  htmlFor="receipt-amount"
                  error={''}
                >
                  <Input
                    id="receipt-amount"
                    type="number"
                    placeholder="25000000"
                    min={0}
                  />
                </Field>

                <Field
                  label="Currency"
                  htmlFor="receipt-currency"
                >
                  <Select>
                    <option value="NGN">NGN</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </Select>
                </Field>
              </div>
            </PanelBody>
          </Panel>
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
                  sort={{ key: 'reference', direction: 'asc' }}
                  caption="List of verification records"
                />
                {totalCount > 0 && (
                  <div className="border-t border-line p-3">
                    <Pagination
                      page: {1}
                      pageSize={10}
                      total={totalCount}
                      onPageChange={() => {}}
                    />
                  </div>
                )}
              </Panel>
            </>
          </>
        )

        {/* Create Verification Dialog */}
        <Dialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          title="Create new verification"
          description="Start a verification against the authoritative source. The backend owns the outcome; the response reports status, checks and ids."
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

// Helper: format money for display (used in OCR simulation)
function formatMoneyDisplay(amountMinor: number, currency: string) {
  const sign = currency === 'NGN' ? '₦' : '$';
  const signPart = sign + ' ';
  const parts = Math.abs(amountMinor).toString().split('.');
  const integerPart = parts[0].replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
  const decimalPart = parts[1] ? '.' + parts[1] : '';
  return signPart + integerPart + decimalPart;
}