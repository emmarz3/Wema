/**
 * Homepage demonstration fixtures.
 *
 * Everything in this file is **simulated sample data** used by the public
 * homepage: the interactive verification demonstration and the dashboard
 * preview. Nothing here is written to any store, nothing is fetched, and
 * nothing here is a real bank record. The UI labels every value that
 * comes from this file as sample data.
 *
 * The demonstration is a scripted walk-through of how the ProofOps flow
 * behaves. It is not a verification, and its timing is illustrative.
 */

import type {
  CheckOutcome,
  DeliveryStatus,
  IncidentSeverity,
  TransactionStatus,
  VerificationResult,
} from '../../lib/status';

/* ------------------------------------------------------- demo scenarios */

export interface DemoStep {
  id: string;
  label: string;
  detail: string;
}

export interface DemoCheck {
  key: string;
  label: string;
  /** What was compared, in one sentence. */
  compared: string;
  expected: string;
  observed: string;
  outcome: CheckOutcome;
  /** Why it passed, failed, or could not be determined. */
  detail: string;
}

export interface DemoAttempt {
  attemptNumber: number;
  at: string;
  outcome: 'succeeded' | 'failed' | 'timeout';
  responseStatus?: number;
  error?: string;
}

export interface DemoScenario {
  id: 'verified' | 'mismatch' | 'delivery-failed';
  tabLabel: string;
  title: string;
  summary: string;
  receipt: {
    reference: string;
    amountMinor: number;
    currency: string;
    merchant: string;
    claimedAt: string;
    method: string;
  };
  source: {
    provider: string;
    sourceTransactionId: string;
    amountMinor: number;
    currency: string;
    status: TransactionStatus;
    occurredAt: string;
    found: boolean;
  };
  checks: DemoCheck[];
  outcome: {
    result: VerificationResult;
    headline: string;
    explanation: string;
  };
  /** Present when the scenario separates delivery from payment. */
  delivery?: {
    status: DeliveryStatus;
    destination: string;
    attempts: DemoAttempt[];
    note: string;
  };
}

export const DEMO_STEPS: DemoStep[] = [
  {
    id: 'claim',
    label: 'Claim received',
    detail:
      'A receipt references a payment. ProofOps records the claim exactly as presented — a claim, not a payment confirmation.',
  },
  {
    id: 'lookup',
    label: 'Authoritative source queried',
    detail:
      'The claim is matched to the provider record server-side. The interface only ever displays what the source returns.',
  },
  {
    id: 'compare',
    label: 'Checks compared',
    detail:
      'Amount, reference, status and duplicate history are compared between the receipt claim and the source record.',
  },
  {
    id: 'outcome',
    label: 'Outcome recorded',
    detail:
      'The result, every check and the evidence behind it are preserved as an auditable record with a Proof ID.',
  },
];

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'verified',
    tabLabel: 'Successful verification',
    title: 'Source record and receipt agree',
    summary:
      'The receipt claims a ₦500,000 payment. The authoritative record confirms the same amount, reference and status — the claim verifies.',
    receipt: {
      reference: 'TRX-88412',
      amountMinor: 50_000_000, // ₦500,000.00
      currency: 'NGN',
      merchant: 'Northwind Trading',
      claimedAt: '2026-10-12T16:04:22Z',
      method: 'Card ···· 4417',
    },
    source: {
      provider: 'Bank A (simulated)',
      sourceTransactionId: 'SRC-9F21C4EE',
      amountMinor: 50_000_000,
      currency: 'NGN',
      status: 'successful',
      occurredAt: '2026-10-12T16:04:19Z',
      found: true,
    },
    checks: [
      {
        key: 'source_found',
        label: 'Source record located',
        compared: 'Receipt reference against the provider record index',
        expected: 'Exactly one matching record',
        observed: '1 record (SRC-9F21C4EE)',
        outcome: 'passed',
        detail: 'The provider returned a single record matching the reference.',
      },
      {
        key: 'amount',
        label: 'Amount match',
        compared: 'Receipt amount against source amount',
        expected: '₦500,000.00',
        observed: '₦500,000.00',
        outcome: 'passed',
        detail: 'Both sides agree to the minor unit.',
      },
      {
        key: 'reference',
        label: 'Reference match',
        compared: 'Receipt reference against source reference',
        expected: 'TRX-88412',
        observed: 'TRX-88412',
        outcome: 'passed',
        detail: 'The references are identical.',
      },
      {
        key: 'status',
        label: 'Transaction status',
        compared: 'Source transaction status',
        expected: 'A settled status',
        observed: 'Successful',
        outcome: 'passed',
        detail: 'The source reports the transaction as settled.',
      },
      {
        key: 'duplicate',
        label: 'Duplicate check',
        compared: 'Reference across prior verifications',
        expected: 'No prior claim on this reference',
        observed: 'None found',
        outcome: 'passed',
        detail: 'This reference has not been verified before.',
      },
    ],
    outcome: {
      result: 'verified',
      headline: 'Verified — the claim matches the authoritative record',
      explanation:
        'Every comparable field agrees. The proof record preserves the checks and evidence behind this outcome.',
    },
  },
  {
    id: 'mismatch',
    tabLabel: 'Amount mismatch',
    title: 'Receipt claims more than the source paid',
    summary:
      'The receipt claims ₦500,000. The authoritative record shows ₦250,000. The claim does not verify — the difference is preserved, not smoothed over.',
    receipt: {
      reference: 'TRX-88437',
      amountMinor: 50_000_000,
      currency: 'NGN',
      merchant: 'Northwind Trading',
      claimedAt: '2026-10-12T18:41:03Z',
      method: 'Transfer ···· 9902',
    },
    source: {
      provider: 'Bank A (simulated)',
      sourceTransactionId: 'SRC-3AB90D12',
      amountMinor: 25_000_000, // ₦250,000.00
      currency: 'NGN',
      status: 'successful',
      occurredAt: '2026-10-12T18:40:58Z',
      found: true,
    },
    checks: [
      {
        key: 'source_found',
        label: 'Source record located',
        compared: 'Receipt reference against the provider record index',
        expected: 'Exactly one matching record',
        observed: '1 record (SRC-3AB90D12)',
        outcome: 'passed',
        detail: 'The provider returned a single record matching the reference.',
      },
      {
        key: 'amount',
        label: 'Amount match',
        compared: 'Receipt amount against source amount',
        expected: '₦500,000.00 (as claimed)',
        observed: '₦250,000.00 (at source)',
        outcome: 'failed',
        detail:
          'The source is ₦250,000.00 lower than the claim. The source amount is authoritative; the receipt claim is not.',
      },
      {
        key: 'reference',
        label: 'Reference match',
        compared: 'Receipt reference against source reference',
        expected: 'TRX-88437',
        observed: 'TRX-88437',
        outcome: 'passed',
        detail: 'The references are identical.',
      },
      {
        key: 'status',
        label: 'Transaction status',
        compared: 'Source transaction status',
        expected: 'A settled status',
        observed: 'Successful',
        outcome: 'passed',
        detail: 'The source transaction settled — for the amount the source records.',
      },
      {
        key: 'duplicate',
        label: 'Duplicate check',
        compared: 'Reference across prior verifications',
        expected: 'No prior claim on this reference',
        observed: 'None found',
        outcome: 'passed',
        detail: 'This reference has not been verified before.',
      },
    ],
    outcome: {
      result: 'mismatch',
      headline: 'Mismatch — the source contradicts the claim',
      explanation:
        'A payment exists, but not for the claimed amount. The mismatch is preserved as a discrepancy with both values attached, and the receipt is never treated as proof of payment.',
    },
  },
  {
    id: 'delivery-failed',
    tabLabel: 'Payment ok, webhook failed',
    title: 'The payment succeeded. The notification did not arrive.',
    summary:
      'The payment verifies, but the event notification to the merchant system failed repeatedly. ProofOps keeps payment status and delivery status separate — one succeeded, one did not.',
    receipt: {
      reference: 'TRX-88455',
      amountMinor: 12_000_000, // ₦120,000.00
      currency: 'NGN',
      merchant: 'Northwind Trading',
      claimedAt: '2026-10-12T20:12:44Z',
      method: 'Card ···· 8823',
    },
    source: {
      provider: 'Bank A (simulated)',
      sourceTransactionId: 'SRC-77C1A0B9',
      amountMinor: 12_000_000,
      currency: 'NGN',
      status: 'successful',
      occurredAt: '2026-10-12T20:12:41Z',
      found: true,
    },
    checks: [
      {
        key: 'source_found',
        label: 'Source record located',
        compared: 'Receipt reference against the provider record index',
        expected: 'Exactly one matching record',
        observed: '1 record (SRC-77C1A0B9)',
        outcome: 'passed',
        detail: 'The provider returned a single record matching the reference.',
      },
      {
        key: 'amount',
        label: 'Amount match',
        compared: 'Receipt amount against source amount',
        expected: '₦120,000.00',
        observed: '₦120,000.00',
        outcome: 'passed',
        detail: 'Both sides agree to the minor unit.',
      },
      {
        key: 'status',
        label: 'Transaction status',
        compared: 'Source transaction status',
        expected: 'A settled status',
        observed: 'Successful',
        outcome: 'passed',
        detail: 'The payment itself succeeded at the source.',
      },
      {
        key: 'delivery',
        label: 'Notification delivery',
        compared: 'Webhook delivery attempts for the event',
        expected: 'Delivered to the merchant endpoint',
        observed: 'Failed after 3 attempts',
        outcome: 'failed',
        detail:
          'The event was emitted for this payment, but delivery to the merchant endpoint failed. This says nothing about whether the payment succeeded — and everything about why the merchant system never learned of it.',
      },
    ],
    outcome: {
      result: 'verified',
      headline: 'Verified payment — with a failed delivery',
      explanation:
        'The payment is confirmed against the source. Separately, the notification failed after three attempts. Treating these as one status hides the problem; ProofOps reports both.',
    },
    delivery: {
      status: 'failed',
      destination: 'https://merchant.example.test/hooks/proofops',
      attempts: [
        {
          attemptNumber: 1,
          at: '2026-10-12T20:12:42Z',
          outcome: 'timeout',
          error: 'No response within 10s',
        },
        {
          attemptNumber: 2,
          at: '2026-10-12T20:17:42Z',
          outcome: 'failed',
          responseStatus: 502,
          error: 'Bad gateway',
        },
        {
          attemptNumber: 3,
          at: '2026-10-12T20:27:42Z',
          outcome: 'failed',
          responseStatus: 503,
          error: 'Service unavailable',
        },
      ],
      note: 'Payment status: successful. Delivery status: failed after three attempts. These are independent facts and are reported independently.',
    },
  },
];

/* ----------------------------------------------------- dashboard preview */

export interface PreviewLatencyPoint {
  at: string;
  p50Ms: number;
  p95Ms: number;
}

export interface PreviewVerificationRow {
  reference: string;
  amountMinor: number;
  currency: string;
  result: VerificationResult;
  provider: string;
  at: string;
}

export interface PreviewEventRow {
  eventType: string;
  reference: string;
  at: string;
  deliveryStatus: DeliveryStatus;
}

export const PREVIEW_LATENCY: PreviewLatencyPoint[] = [
  { at: '09:00', p50Ms: 180, p95Ms: 520 },
  { at: '10:00', p50Ms: 195, p95Ms: 610 },
  { at: '11:00', p50Ms: 210, p95Ms: 700 },
  { at: '12:00', p50Ms: 260, p95Ms: 940 },
  { at: '13:00', p50Ms: 240, p95Ms: 880 },
  { at: '14:00', p50Ms: 225, p95Ms: 760 },
  { at: '15:00', p50Ms: 205, p95Ms: 640 },
  { at: '16:00', p50Ms: 190, p95Ms: 560 },
];

export const PREVIEW_DELIVERY_MIX: Array<{ status: DeliveryStatus; count: number }> = [
  { status: 'delivered', count: 12940 },
  { status: 'retrying', count: 84 },
  { status: 'failed', count: 21 },
  { status: 'dead_lettered', count: 3 },
];

export const PREVIEW_RESULT_MIX: Array<{ result: VerificationResult; count: number }> = [
  { result: 'verified', count: 1142 },
  { result: 'mismatch', count: 46 },
  { result: 'unverified', count: 61 },
  { result: 'suspicious', count: 9 },
  { result: 'unknown', count: 26 },
];

export const PREVIEW_VERIFICATIONS: PreviewVerificationRow[] = [
  {
    reference: 'TRX-88412',
    amountMinor: 50_000_000,
    currency: 'NGN',
    result: 'verified',
    provider: 'Bank A (simulated)',
    at: '2026-10-12T16:04:22Z',
  },
  {
    reference: 'TRX-88437',
    amountMinor: 50_000_000,
    currency: 'NGN',
    result: 'mismatch',
    provider: 'Bank A (simulated)',
    at: '2026-10-12T18:41:03Z',
  },
  {
    reference: 'TRX-88455',
    amountMinor: 12_000_000,
    currency: 'NGN',
    result: 'verified',
    provider: 'PSP B (simulated)',
    at: '2026-10-12T20:12:44Z',
  },
  {
    reference: 'TRX-88461',
    amountMinor: 850_000,
    currency: 'NGN',
    result: 'unverified',
    provider: 'Bank C (simulated)',
    at: '2026-10-12T21:03:10Z',
  },
  {
    reference: 'TRX-88470',
    amountMinor: 320_000,
    currency: 'NGN',
    result: 'suspicious',
    provider: 'PSP B (simulated)',
    at: '2026-10-12T22:15:37Z',
  },
];

export const PREVIEW_EVENTS: PreviewEventRow[] = [
  {
    eventType: 'payment.settled',
    reference: 'TRX-88412',
    at: '2026-10-12T16:04:19Z',
    deliveryStatus: 'delivered',
  },
  {
    eventType: 'payment.settled',
    reference: 'TRX-88437',
    at: '2026-10-12T18:40:58Z',
    deliveryStatus: 'delivered',
  },
  {
    eventType: 'payment.settled',
    reference: 'TRX-88455',
    at: '2026-10-12T20:12:41Z',
    deliveryStatus: 'failed',
  },
  {
    eventType: 'payment.refunded',
    reference: 'TRX-88380',
    at: '2026-10-12T21:22:09Z',
    deliveryStatus: 'retrying',
  },
  {
    eventType: 'provider.degraded',
    reference: 'PSP-B',
    at: '2026-10-12T22:01:44Z',
    deliveryStatus: 'delivered',
  },
];

export const PREVIEW_PROVIDERS: Array<{
  provider: string;
  status: 'healthy' | 'degraded' | 'down';
  availabilityPct: number;
  p95Ms: number;
  errorRatePct: number;
}> = [
  {
    provider: 'Bank A (simulated)',
    status: 'healthy',
    availabilityPct: 99.98,
    p95Ms: 240,
    errorRatePct: 0.04,
  },
  {
    provider: 'PSP B (simulated)',
    status: 'degraded',
    availabilityPct: 99.21,
    p95Ms: 890,
    errorRatePct: 1.8,
  },
  {
    provider: 'Bank C (simulated)',
    status: 'healthy',
    availabilityPct: 99.95,
    p95Ms: 310,
    errorRatePct: 0.09,
  },
];

export const PREVIEW_INCIDENTS: Array<{
  id: string;
  title: string;
  severity: IncidentSeverity;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  provider: string;
  openedAt: string;
}> = [
  {
    id: 'INC-2043',
    title: 'Webhook deliveries timing out to one merchant endpoint',
    severity: 'sev2',
    status: 'investigating',
    provider: 'Infrastructure (simulated)',
    openedAt: '2026-10-12T20:12:44Z',
  },
  {
    id: 'INC-2041',
    title: 'PSP B latency above threshold for card authorisations',
    severity: 'sev3',
    status: 'monitoring',
    provider: 'PSP B (simulated)',
    openedAt: '2026-10-12T18:02:11Z',
  },
  {
    id: 'INC-2036',
    title: 'Event ingestion delay after provider maintenance',
    severity: 'sev4',
    status: 'resolved',
    provider: 'Bank A (simulated)',
    openedAt: '2026-10-11T09:41:00Z',
  },
];

export const PREVIEW_DISCREPANCIES: Array<{
  kind: 'amount' | 'reference' | 'missing_source' | 'duplicate' | 'timing';
  open: number;
}> = [
  { kind: 'amount', open: 7 },
  { kind: 'reference', open: 3 },
  { kind: 'missing_source', open: 2 },
  { kind: 'duplicate', open: 0 },
  { kind: 'timing', open: 1 },
];

/** The stable label attached to every sample figure on the homepage. */
export const SAMPLE_LABEL = 'Sample data — simulated, not a real bank record';
