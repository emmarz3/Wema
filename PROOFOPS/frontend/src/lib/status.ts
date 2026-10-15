/**
 * Centralised status vocabulary for ProofOps.
 *
 * Every status that can appear in the interface is defined once, here, with
 * its label, tone, and icon. Colour is never the only signal — every status
 * badge also carries text (and an icon where a glyph helps).
 *
 * The statuses below describe **what the source reported**. The interface
 * never upgrades, downgrades, or completes a status on its own; in
 * particular, transaction status, verification result, webhook delivery
 * status and incident status are deliberately separate vocabularies.
 */

import {
  CircleAlert,
  CircleCheck,
  CircleHelp,
  CircleX,
  Clock,
  FileQuestion,
  Info,
  LoaderCircle,
  MailX,
  RefreshCw,
  ShieldAlert,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';

/* ------------------------------------------------------------------ tones */

export type StatusTone = 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export const toneClasses: Record<StatusTone, string> = {
  brand: 'border-brand-line bg-brand-soft text-brand',
  success: 'border-success-line bg-success-soft text-success',
  warning: 'border-warning-line bg-warning-soft text-warning',
  danger: 'border-danger-line bg-danger-soft text-danger',
  info: 'border-info-line bg-info-soft text-info',
  neutral: 'border-line-strong bg-surface-muted text-ink-secondary',
};

/* -------------------------------------------------- verification results */

/**
 * Verification outcome. Distinct from transaction status: a payment can be
 * successful while its receipt cannot be verified (mismatch / unverified),
 * and an unverified claim never becomes "verified" without an authoritative
 * source comparison.
 */
export const verificationResults = [
  'verified',
  'mismatch',
  'unverified',
  'suspicious',
  'unknown',
] as const;

export type VerificationResult = (typeof verificationResults)[number];

export const verificationResultLabels: Record<VerificationResult, string> = {
  verified: 'Verified',
  mismatch: 'Mismatch',
  unverified: 'Unverified',
  suspicious: 'Suspicious',
  unknown: 'Unknown',
};

export const verificationResultTones: Record<VerificationResult, StatusTone> = {
  verified: 'success',
  mismatch: 'danger',
  unverified: 'warning',
  suspicious: 'warning',
  unknown: 'neutral',
};

export const verificationResultIcons: Record<VerificationResult, LucideIcon> = {
  verified: CircleCheck,
  mismatch: CircleX,
  unverified: FileQuestion,
  suspicious: ShieldAlert,
  unknown: CircleHelp,
};

export const verificationResultDescriptions: Record<VerificationResult, string> = {
  verified: 'The authoritative source record and the receipt claim agree.',
  mismatch: 'The authoritative source record disagrees with the receipt claim.',
  unverified: 'No authoritative comparison has been completed for this claim.',
  suspicious: 'A comparison completed but the claim warrants manual review.',
  unknown: 'The outcome could not be determined from the available evidence.',
};

/* ------------------------------------------------------- check outcomes */

/** Outcome of a single verification check. */
export const checkOutcomes = ['passed', 'failed', 'indeterminate'] as const;

export type CheckOutcome = (typeof checkOutcomes)[number];

export const checkOutcomeLabels: Record<CheckOutcome, string> = {
  passed: 'Passed',
  failed: 'Failed',
  indeterminate: 'Indeterminate',
};

export const checkOutcomeTones: Record<CheckOutcome, StatusTone> = {
  passed: 'success',
  failed: 'danger',
  indeterminate: 'neutral',
};

export const checkOutcomeIcons: Record<CheckOutcome, LucideIcon> = {
  passed: CircleCheck,
  failed: CircleX,
  indeterminate: CircleHelp,
};

/* ---------------------------------------------------- transaction status */

/**
 * Status of the underlying payment at the source. Owned entirely by the
 * source; a verification result never implies a transaction status and vice
 * versa.
 */
export const transactionStatuses = [
  'pending',
  'processing',
  'successful',
  'failed',
  'reversed',
] as const;

export type TransactionStatus = (typeof transactionStatuses)[number];

export const transactionStatusLabels: Record<TransactionStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  successful: 'Successful',
  failed: 'Failed',
  reversed: 'Reversed',
};

export const transactionStatusTones: Record<TransactionStatus, StatusTone> = {
  pending: 'warning',
  processing: 'info',
  successful: 'success',
  failed: 'danger',
  reversed: 'neutral',
};

export const transactionStatusIcons: Record<TransactionStatus, LucideIcon> = {
  pending: Clock,
  processing: LoaderCircle,
  successful: CircleCheck,
  failed: CircleX,
  reversed: RefreshCw,
};

/* -------------------------------------------------- verification workflow */

/** Lifecycle of a verification request as reported by the backend. */
export const verificationStatuses = [
  'pending',
  'running',
  'complete',
  'failed',
  'unavailable',
] as const;

export type VerificationStatus = (typeof verificationStatuses)[number];

export const verificationStatusLabels: Record<VerificationStatus, string> = {
  pending: 'Queued',
  running: 'Running',
  complete: 'Complete',
  failed: 'Failed',
  unavailable: 'Source unavailable',
};

export const verificationStatusTones: Record<VerificationStatus, StatusTone> = {
  pending: 'neutral',
  running: 'info',
  complete: 'success',
  failed: 'danger',
  unavailable: 'warning',
};

export const verificationStatusIcons: Record<VerificationStatus, LucideIcon> = {
  pending: Clock,
  running: LoaderCircle,
  complete: CircleCheck,
  failed: CircleX,
  unavailable: TriangleAlert,
};

/* -------------------------------------------------- webhook deliveries */

/**
 * Delivery status of an outbound event. Kept strictly separate from the
 * transaction status: a failed delivery never reads as a failed payment.
 */
export const deliveryStatuses = [
  'delivered',
  'pending',
  'retrying',
  'failed',
  'dead_lettered',
] as const;

export type DeliveryStatus = (typeof deliveryStatuses)[number];

export const deliveryStatusLabels: Record<DeliveryStatus, string> = {
  delivered: 'Delivered',
  pending: 'Pending',
  retrying: 'Retrying',
  failed: 'Failed',
  dead_lettered: 'Dead-lettered',
};

export const deliveryStatusTones: Record<DeliveryStatus, StatusTone> = {
  delivered: 'success',
  pending: 'neutral',
  retrying: 'warning',
  failed: 'danger',
  dead_lettered: 'danger',
};

export const deliveryStatusIcons: Record<DeliveryStatus, LucideIcon> = {
  delivered: CircleCheck,
  pending: Clock,
  retrying: RefreshCw,
  failed: CircleX,
  dead_lettered: MailX,
};

/* ----------------------------------------------------- provider health */

export const providerStatuses = ['healthy', 'degraded', 'down', 'unknown'] as const;

export type ProviderStatus = (typeof providerStatuses)[number];

export const providerStatusLabels: Record<ProviderStatus, string> = {
  healthy: 'Healthy',
  degraded: 'Degraded',
  down: 'Down',
  unknown: 'Unknown',
};

export const providerStatusTones: Record<ProviderStatus, StatusTone> = {
  healthy: 'success',
  degraded: 'warning',
  down: 'danger',
  unknown: 'neutral',
};

export const providerStatusIcons: Record<ProviderStatus, LucideIcon> = {
  healthy: CircleCheck,
  degraded: TriangleAlert,
  down: CircleX,
  unknown: CircleHelp,
};

/* ----------------------------------------------------------- incidents */

export const incidentSeverities = ['sev1', 'sev2', 'sev3', 'sev4'] as const;

export type IncidentSeverity = (typeof incidentSeverities)[number];

export const incidentSeverityLabels: Record<IncidentSeverity, string> = {
  sev1: 'SEV1 — Critical',
  sev2: 'SEV2 — High',
  sev3: 'SEV3 — Moderate',
  sev4: 'SEV4 — Low',
};

export const incidentSeverityShortLabels: Record<IncidentSeverity, string> = {
  sev1: 'SEV1',
  sev2: 'SEV2',
  sev3: 'SEV3',
  sev4: 'SEV4',
};

export const incidentSeverityTones: Record<IncidentSeverity, StatusTone> = {
  sev1: 'danger',
  sev2: 'warning',
  sev3: 'info',
  sev4: 'neutral',
};

export const incidentSeverityIcons: Record<IncidentSeverity, LucideIcon> = {
  sev1: CircleX,
  sev2: CircleAlert,
  sev3: Info,
  sev4: CircleHelp,
};

export const incidentStatuses = [
  'investigating',
  'identified',
  'monitoring',
  'resolved',
] as const;

export type IncidentStatus = (typeof incidentStatuses)[number];

export const incidentStatusLabels: Record<IncidentStatus, string> = {
  investigating: 'Investigating',
  identified: 'Identified',
  monitoring: 'Monitoring',
  resolved: 'Resolved',
};

export const incidentStatusTones: Record<IncidentStatus, StatusTone> = {
  investigating: 'danger',
  identified: 'warning',
  monitoring: 'info',
  resolved: 'success',
};

export const incidentStatusIcons: Record<IncidentStatus, LucideIcon> = {
  investigating: LoaderCircle,
  identified: CircleAlert,
  monitoring: Clock,
  resolved: CircleCheck,
};

/* ------------------------------------------------------- discrepancies */

export const discrepancyKinds = [
  'amount',
  'reference',
  'missing_source',
  'duplicate',
  'reversal',
  'timing',
] as const;

export type DiscrepancyKind = (typeof discrepancyKinds)[number];

export const discrepancyKindLabels: Record<DiscrepancyKind, string> = {
  amount: 'Amount difference',
  reference: 'Reference difference',
  missing_source: 'Missing at source',
  duplicate: 'Duplicate record',
  reversal: 'Reversal / refund',
  timing: 'Timing difference',
};

export const discrepancyStatuses = [
  'open',
  'investigating',
  'resolved',
  'dismissed',
] as const;

export type DiscrepancyStatus = (typeof discrepancyStatuses)[number];

export const discrepancyStatusLabels: Record<DiscrepancyStatus, string> = {
  open: 'Open',
  investigating: 'Investigating',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
};

export const discrepancyStatusTones: Record<DiscrepancyStatus, StatusTone> = {
  open: 'danger',
  investigating: 'warning',
  resolved: 'success',
  dismissed: 'neutral',
};

/* --------------------------------------------------------- reconciliation */

export const reconciliationStatuses = [
  'draft',
  'validating',
  'ready',
  'running',
  'complete',
  'failed',
] as const;

export type ReconciliationStatus = (typeof reconciliationStatuses)[number];

export const reconciliationStatusLabels: Record<ReconciliationStatus, string> = {
  draft: 'Draft',
  validating: 'Validating',
  ready: 'Ready to run',
  running: 'Running',
  complete: 'Complete',
  failed: 'Failed',
};

export const reconciliationStatusTones: Record<ReconciliationStatus, StatusTone> = {
  draft: 'neutral',
  validating: 'info',
  ready: 'brand',
  running: 'info',
  complete: 'success',
  failed: 'danger',
};

export const reconciliationStatusIcons: Record<ReconciliationStatus, LucideIcon> = {
  draft: Clock,
  validating: LoaderCircle,
  ready: CircleCheck,
  running: LoaderCircle,
  complete: CircleCheck,
  failed: CircleX,
};

/* -------------------------------------------------------------- helpers */

/** Lookup helper used by badges across the app. */
export function labelOf<T extends string>(
  map: Record<T, string>,
  value: T | undefined | null,
  fallback = '—',
): string {
  if (value === undefined || value === null) return fallback;
  return map[value] ?? fallback;
}
