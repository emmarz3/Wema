/**
 * ProofOps domain model.
 *
 * These types describe the shape of data as the ProofOps backend reports
 * it. Rules encoded here:
 *
 * - Money is always minor units (kobo) plus a currency code.
 * - Transaction status, verification result, webhook delivery status and
 *   incident status are deliberately separate vocabularies (see lib/status).
 * - Timestamps are ISO-8601 strings from the source.
 * - Attachments (receipts, evidence) are referenced by ID; private files
 *   are only ever exposed through short-lived, source-provided URLs.
 */

import type { Role } from '../lib/permissions';
import type {
  DiscrepancyKind,
  DiscrepancyStatus,
  CheckOutcome,
  DeliveryStatus,
  IncidentSeverity,
  IncidentStatus,
  ProviderStatus,
  ReconciliationStatus,
  TransactionStatus,
  VerificationResult,
  VerificationStatus,
} from '../lib/status';

export type { Role };
export type {
  DiscrepancyKind,
  DiscrepancyStatus,
  CheckOutcome,
  DeliveryStatus,
  IncidentSeverity,
  IncidentStatus,
  ProviderStatus,
  ReconciliationStatus,
  TransactionStatus,
  VerificationResult,
  VerificationStatus,
};

/* ----------------------------------------------------------------- shared */

export interface Money {
  /** Amount in minor units (kobo). Never a float of the major unit. */
  amountMinor: number;
  /** ISO 4217 currency code, e.g. NGN. */
  currency: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Selectable windows for operational summaries and infrastructure charts. */
export type DashboardRange = '24h' | '7d' | '30d';

export interface Organisation {
  id: string;
  name: string;
}

/* ------------------------------------------------------------ auth/session */

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  title?: string;
  role: Role;
  organisation: Organisation;
}

export interface AuthSession {
  token: string;
  user: SessionUser;
  /** ISO timestamp at which the backend will treat the session as expired. */
  expiresAt: string;
}

/* ---------------------------------------------------------- verification */

export interface SourceRecord {
  /** Provider that holds the authoritative record, e.g. a bank or PSP. */
  provider: string;
  sourceTransactionId: string;
  amount: Money;
  status: TransactionStatus;
  occurredAt: string;
  /** True when the provider record was located; false when the source
   *  could not be reached or has no matching record. */
  found: boolean;
  note?: string;
}

export type ReceiptStatus = 'stored' | 'extracting' | 'extracted' | 'unavailable';

export interface ReceiptClaim {
  /** Field name as extracted, e.g. `amount`, `reference`, `paid_at`. */
  field: string;
  value: string;
  /** Extraction confidence 0–1 when the source provides it. */
  confidence?: number;
}

export interface Receipt {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  status: ReceiptStatus;
  claims: ReceiptClaim[];
  /** Short-lived private preview URL issued by the source; never a public
   *  storage URL. Absent until the source grants it. */
  previewUrl?: string;
  previewExpiresAt?: string;
  /** Present when extraction could not run (e.g. OCR unavailable). */
  unavailableReason?: string;
}

export interface VerificationCheck {
  id: string;
  /** Stable key, e.g. `amount`, `reference`, `source_found`. */
  key: string;
  label: string;
  outcome: CheckOutcome;
  /** What was compared, in one sentence. */
  compared: string;
  /** Why it passed, failed, or could not be determined. */
  detail: string;
  expected?: string;
  observed?: string;
  /** Source of the authoritative side of the comparison. */
  source?: string;
}

export type ReversalState = 'none' | 'reversed' | 'refunded';

export interface Verification {
  id: string;
  /** Caller-supplied reference for the claim being verified. */
  reference: string;
  proofId?: string;
  provider?: string;
  merchant?: string;
  /** Amount recorded against the claim (may be absent before extraction). */
  claimedAmount?: Money;
  /** Amount from the authoritative source record, when found. */
  sourceAmount?: Money;
  transactionStatus?: TransactionStatus;
  result: VerificationResult;
  status: VerificationStatus;
  checks: VerificationCheck[];
  receipt?: Receipt;
  sourceRecord?: SourceRecord;
  /** Whether the authoritative source was reachable for this check. */
  sourceAvailability: 'available' | 'unavailable' | 'pending';
  reversal: ReversalState;
  /** Set when this claim duplicates another verified claim. */
  duplicateOf?: string;
  /** Related infrastructure event IDs (source-side). */
  relatedEventIds: string[];
  discrepancyId?: string;
  incidentId?: string;
  createdAt: string;
  updatedAt: string;
  verifiedAt?: string;
}

export interface VerificationQuery {
  search?: string;
  provider?: string;
  merchant?: string;
  proofId?: string;
  result?: VerificationResult;
  transactionStatus?: TransactionStatus;
  reversal?: ReversalState;
  sourceAvailability?: 'available' | 'unavailable' | 'pending';
  currency?: string;
  minAmountMinor?: number;
  maxAmountMinor?: number;
  from?: string;
  to?: string;
  sort?: 'created' | 'updated' | 'reference' | 'amount' | 'result';
  direction?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface VerifyTransactionInput {
  reference: string;
  provider?: string;
  merchant?: string;
  claimedAmountMinor?: number;
  currency?: string;
  /** Optional receipt to attach before verification. */
  receiptId?: string;
  /** Caller-supplied idempotency key; the source must not double-verify. */
  idempotencyKey?: string;
}

export interface UploadReceiptInput {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  /** Reference the receipt is attached to. */
  reference: string;
}

/* ------------------------------------------------------------ proof records */

export type ProofShareStatus = 'active' | 'expired' | 'revoked';

export interface ProofShare {
  id: string;
  /** Public proof URL, only present when the source issues one. */
  url?: string;
  status: ProofShareStatus;
  createdAt: string;
  expiresAt?: string;
  revokedAt?: string;
  /** Number of recorded views when the source reports them. */
  viewCount?: number;
}

export interface ProofRecord {
  id: string;
  reference: string;
  result: VerificationResult;
  provider?: string;
  createdAt: string;
  /** Current status of the underlying transaction at the source — may have
   *  changed since the proof was created; never collapsed into the
   *  historical result. */
  currentTransactionStatus?: TransactionStatus;
  latestStatus: string;
  discrepancyId?: string;
  incidentId?: string;
  shares: ProofShare[];
}

export interface ProofDetail extends ProofRecord {
  verification: Verification;
  eventHistory: ProofHistoryEntry[];
}

export interface ProofHistoryEntry {
  id: string;
  at: string;
  kind: 'created' | 'share' | 'revoked' | 'status_change' | 'note';
  detail: string;
  actor?: string;
}

/** One recorded view of a shared proof link. */
export interface ProofAccessEntry {
  id: string;
  at: string;
  /** Coarse viewer description; never personal data. */
  viewer: string;
  outcome: 'viewed' | 'expired' | 'revoked';
}

/**
 * The public proof page payload. Contains only fields the sharer
 * authorised; anything not allow-listed is absent by design.
 */
export interface PublicProofView {
  proofId: string;
  result: VerificationResult;
  reference: string;
  provider?: string;
  verifiedAt?: string;
  /** Only the fields explicitly authorised at share time. */
  fields: string[];
  /** Historical result snapshot; never overwritten by later changes to the
   *  underlying transaction. */
  resultAtShareTime: VerificationResult;
  shareExpiresAt?: string;
  shareStatus: ProofShareStatus;
}

export interface CreateProofShareInput {
  expiresInHours?: number;
  /** Fields the recipient may see; the source enforces this. */
  fields?: string[];
}

/* ------------------------------------------------------- discrepancies */

export interface Discrepancy {
  id: string;
  verificationId: string;
  reference: string;
  kind: DiscrepancyKind;
  status: DiscrepancyStatus;
  expected?: string;
  observed?: string;
  openedAt: string;
  updatedAt: string;
  resolution?: string;
  resolvedAt?: string;
}

/* ------------------------------------------------------- reconciliation */

export interface ReconciliationRun {
  id: string;
  provider: string;
  fileName: string;
  status: ReconciliationStatus;
  startedAt: string;
  completedAt?: string;
  counts: {
    total: number;
    matched: number;
    unmatched: number;
    duplicates: number;
    invalid: number;
  };
}

export interface ReconciliationRow {
  id: string;
  reference: string;
  amount: Money;
  status: TransactionStatus;
  occurredAt: string;
  outcome: 'matched' | 'unmatched' | 'duplicate';
  /** Difference against the matched record, when any. */
  differenceMinor?: number;
  /** Suggested candidate the source proposed, if any. */
  candidateId?: string;
  /** Whether an authorised user has confirmed the suggestion. */
  candidateDecision?: 'pending' | 'accepted' | 'rejected';
  invalidReason?: string;
}

export interface ReconciliationDetail extends ReconciliationRun {
  columnMapping: Record<string, string>;
  invalidRows: Array<{ rowNumber: number; reason: string }>;
  rows: ReconciliationRow[];
}

export interface ReconciliationCandidate {
  id: string;
  rowId: string;
  proofId?: string;
  reference: string;
  amount: Money;
  status: TransactionStatus;
  occurredAt: string;
  /** 0–1 score from the source when provided. */
  score?: number;
  reason: string;
}

export interface UploadReconciliationInput {
  provider: string;
  fileName: string;
  /** Raw CSV rows (arrays of cell strings) as parsed client-side. */
  rows: string[][];
}

export interface ColumnMappingInput {
  mapping: Record<string, string>;
}

/** Client-parsed CSV rows sent to the source for a reconciliation run. */
export interface UploadReconciliationInput {
  provider: string;
  fileName: string;
  rows: string[][];
}

/* ------------------------------------------------------- infrastructure */

export interface ProviderService {
  id: string;
  /** Provider name, e.g. the bank/PSP the record comes from. */
  provider: string;
  environment: string;
  status: ProviderStatus;
  /** Availability percentage for the selected window, when reported. */
  availabilityPct?: number;
  latencyMsP50?: number;
  latencyMsP95?: number;
  errorRatePct?: number;
  lastCheckedAt: string;
  /** True when these values come from the simulated source. */
  simulated: boolean;
}

export interface DeliveryAttempt {
  attemptNumber: number;
  at: string;
  outcome: 'succeeded' | 'failed' | 'timeout';
  responseStatus?: number;
  durationMs?: number;
  error?: string;
}

export interface WebhookDelivery {
  id: string;
  eventId: string;
  eventType: string;
  destination: string;
  status: DeliveryStatus;
  createdAt: string;
  lastAttemptAt?: string;
  nextRetryAt?: string;
  attempts: DeliveryAttempt[];
}

export interface InfrastructureEvent {
  id: string;
  eventType: string;
  provider: string;
  reference?: string;
  at: string;
  /** Correlation identifier from the source. */
  correlationId?: string;
  deliveryStatus?: DeliveryStatus;
  summary: string;
  payload?: Record<string, unknown>;
}

export interface LatencyPoint {
  /** ISO timestamp for the bucket. */
  at: string;
  p50Ms: number;
  p95Ms: number;
  errorRatePct: number;
  volume: number;
}

export interface InfrastructureHealth {
  services: ProviderService[];
  incidents: InfrastructureIncident[];
  latency: LatencyPoint[];
  /** Point in time the health snapshot was taken by the source. */
  generatedAt: string;
  simulated: boolean;
}

export interface InfrastructureIncident {
  id: string;
  title: string;
  provider?: string;
  serviceId?: string;
  status: IncidentStatus;
  openedAt: string;
  updatedAt: string;
  resolvedAt?: string;
  summary: string;
}

/* ------------------------------------------------------------- incidents */

export interface IncidentNote {
  id: string;
  author: string;
  at: string;
  body: string;
  internal: boolean;
}

export interface IncidentTimelineEntry {
  id: string;
  at: string;
  kind: 'event' | 'delivery' | 'verification' | 'note' | 'status_change';
  title: string;
  detail?: string;
  actor?: string;
  /** Deep link target inside the workspace, when applicable. */
  refId?: string;
}

export interface Incident {
  id: string;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  provider?: string;
  serviceId?: string;
  summary: string;
  impact?: string;
  assignee?: string;
  openedAt: string;
  updatedAt: string;
  resolvedAt?: string;
  relatedReferences: string[];
  timeline: IncidentTimelineEntry[];
  notes: IncidentNote[];
  investigationId?: string;
}

/* ------------------------------------------------------ AI investigations */

export type InvestigationStatus =
  | 'idle'
  | 'running'
  | 'complete'
  | 'unavailable'
  | 'denied';

export interface PossibleCause {
  text: string;
  /** 0–1 when the source provides it; a hypothesis, never a fact. */
  confidence?: number;
}

export interface InvestigationSource {
  label: string;
  refId?: string;
  kind: 'verification' | 'delivery' | 'event' | 'incident' | 'note';
}

export interface AiInvestigation {
  id: string;
  subjectType: 'verification' | 'incident' | 'discrepancy';
  subjectId: string;
  status: InvestigationStatus;
  generatedAt?: string;
  /** Facts confirmed by the source — never AI-generated. */
  confirmedFacts: string[];
  /** Hypotheses generated by the investigator — never presented as fact. */
  possibleCauses: PossibleCause[];
  nextChecks: string[];
  sources: InvestigationSource[];
  /** Present when status is `unavailable` or `denied`. */
  unavailableReason?: string;
}

/* ------------------------------------------------------ developer console */

export interface ApiKeyRecord {
  id: string;
  label: string;
  /** Non-secret prefix for display; the secret is shown once at creation
   *  and never retrievable afterwards. */
  prefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt?: string;
  revokedAt?: string;
  createdBy: string;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  status: 'enabled' | 'disabled';
  createdAt: string;
  /** Only ever a masked hint — signing secrets are never readable again. */
  secretHint?: string;
}

export interface RequestLogEntry {
  id: string;
  at: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  keyPrefix?: string;
  errorCode?: string;
}

/* ------------------------------------------------------ notifications */

export interface NotificationItem {
  id: string;
  kind: 'verification' | 'incident' | 'delivery' | 'reconciliation' | 'system';
  title: string;
  body: string;
  createdAt: string;
  readAt?: string;
  severity?: IncidentSeverity;
  /** Workspace route the notification points to. */
  link?: string;
}

export interface NotificationPreferences {
  emailDigest: boolean;
  incidentAlerts: boolean;
  deliveryFailures: boolean;
  verificationMismatches: boolean;
}

/* ---------------------------------------------------------------- audit */

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  subjectType: string;
  subjectId: string;
  detail?: string;
}

/* ------------------------------------------------------ organisation */

export interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  title?: string;
  joinedAt: string;
  lastActiveAt?: string;
}

export interface OrganisationSettings {
  id: string;
  name: string;
  /** Display name of the authoritative source records are checked against. */
  authoritativeSourceLabel: string;
  /** Whether receipt upload and extraction are available for the workspace. */
  receiptsEnabled: boolean;
  /** Whether the AI investigator is available for the workspace. */
  investigatorEnabled: boolean;
  plan: string;
}

/* ------------------------------------------------------------ dashboard */

export interface OverviewSummary {  /** Window the summary covers, as decided by the caller. */
  range: '24h' | '7d' | '30d';
  generatedAt: string;
  volume: number;
  byResult: Record<VerificationResult, number>;
  openDiscrepancies: number;
  reconciliation: {
    running: number;
    complete: number;
    failed: number;
  };
  providers: ProviderService[];
  deliveries: {
    delivered: number;
    pending: number;
    retrying: number;
    failed: number;
    deadLettered: number;
  };
  incidents: {
    open: number;
    bySeverity: Record<IncidentSeverity, number>;
  };
  recentVerifications: Verification[];
  recentEvents: InfrastructureEvent[];
}
