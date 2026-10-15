import type { Role } from '../lib/permissions';

/* ==========================================================================
   Shared domain vocabulary. These types describe the ProofBank contract;
   the data source decides which of them actually carry data.
   ========================================================================== */

/** Transaction lifecycle. Transitions are owned by the data source. */
export const transactionStatuses = [
  'CREATED',
  'PENDING',
  'PROCESSING',
  'SUCCESS',
  'FAILED',
  'REVERSED',
] as const;
export type TransactionStatus = (typeof transactionStatuses)[number];

export const transactionTypes = [
  'DEPOSIT',
  'WITHDRAWAL',
  'INTERNAL_TRANSFER',
] as const;
export type TransactionType = (typeof transactionTypes)[number];

export const accountTypes = ['SAVINGS', 'CURRENT'] as const;
export type AccountType = (typeof accountTypes)[number];

export const accountStatuses = ['ACTIVE', 'DORMANT', 'FROZEN'] as const;
export type AccountStatus = (typeof accountStatuses)[number];

export const customerStatuses = ['ACTIVE', 'SUSPENDED'] as const;
export type CustomerStatus = (typeof customerStatuses)[number];

/** Ledger journal entry direction. */
export const ledgerDirections = ['DEBIT', 'CREDIT'] as const;
export type LedgerDirection = (typeof ledgerDirections)[number];

/** Simulation lifecycle. */
export const simulationStates = ['running', 'paused', 'stopped'] as const;
export type SimulationState = (typeof simulationStates)[number];

export const simulationModes = ['live', 'scenario', 'replay'] as const;
export type SimulationMode = (typeof simulationModes)[number];

/** Webhook / event delivery states. */
export const deliveryStatuses = [
  'PENDING',
  'DELIVERED',
  'FAILED',
  'RETRYING',
  'DEAD_LETTER',
] as const;
export type DeliveryStatus = (typeof deliveryStatuses)[number];

/** Event types the environment may emit. Only implemented ones are shown. */
export const eventTypes = [
  'transaction.created',
  'transaction.pending',
  'transaction.completed',
  'transaction.failed',
  'transaction.reversed',
  'account.status_changed',
  'webhook.delivery_failed',
  'webhook.delivery_succeeded',
  'infrastructure.health_changed',
  'simulation.scenario_executed',
  'simulation.heartbeat',
] as const;
export type EventType = (typeof eventTypes)[number];

/** Money as delivered by the API contract: minor units plus currency. */
export interface Money {
  /** Amount in the currency's minor unit (e.g. kobo for NGN). */
  amountMinor: number;
  currency: string;
}

/* ==========================================================================
   Auth & session
   ========================================================================== */

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface AuthSession {
  token: string;
  user: SessionUser;
  issuedAt: string;
}

/* ==========================================================================
   Simulation
   ========================================================================== */

/**
 * Current simulation state as reported by the data source. The UI renders
 * this verbatim: it never derives or mutates the heartbeat itself.
 */
export interface SimulationStatus {
  state: SimulationState;
  mode: SimulationMode;
  /** Configured simulation cadence in seconds (the heartbeat interval). */
  eventIntervalSeconds: number;
  heartbeatAt: string;
  lastActivityAt: string;
  startedAt: string | null;
  stoppedAt: string | null;
  activeScenarioName: string | null;
  /** Events generated since the source started. */
  generatedEventCount: number;
  /**
   * Next expected activity, computed by the source from the last heartbeat
   * and the configured cadence. Null unless the source can calculate it
   * reliably (i.e. while running).
   */
  nextActivityAt: string | null;
  /** Label of the environment, e.g. "Hackathon Demonstration". */
  environmentName: string;
}

/** A control action recorded by the simulation. */
export interface SimulationControlEntry {
  id: string;
  action:
    | 'started'
    | 'paused'
    | 'resumed'
    | 'stopped'
    | 'mode_changed'
    | 'interval_changed';
  at: string;
  actor: string;
  /** What changed, in words. */
  detail: string;
  fromState: SimulationState | null;
  toState: SimulationState | null;
}

/** An error the simulation recorded while running. */
export interface SimulationError {
  id: string;
  at: string;
  code: string;
  message: string;
}

/** Scenario catalogue entry. Execution lives in the scenario workspace. */
export interface ScenarioDefinition {
  name: string;
  kind: 'financial' | 'infrastructure';
  description: string;
  expectedBehaviour: string;
  parameters: ScenarioParameter[];
  /** Side effects the scenario leaves behind, stated before execution. */
  sideEffects: string[];
}

/** A parameter the operator may configure for a scenario. */
export interface ScenarioParameter {
  key: 'accountId' | 'amountMinor' | 'reason';
  label: string;
  kind: 'account' | 'amount' | 'text';
  required: boolean;
  hint?: string;
  /** Default in minor units for amount parameters. */
  defaultMinor?: number;
}

export type ScenarioStepStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'SUCCESS'
  | 'FAILED'
  | 'SKIPPED';

export interface ScenarioStep {
  name: string;
  status: ScenarioStepStatus;
  at: string | null;
  detail: string | null;
}

/** A single execution of a scenario. */
export interface ScenarioRun {
  id: string;
  scenarioName: string;
  kind: 'financial' | 'infrastructure';
  status: 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  steps: ScenarioStep[];
  parameters: Record<string, string>;
  /** Records the run generated, by id. */
  transactionIds: string[];
  eventIds: string[];
  deliveryIds: string[];
  incidentId: string | null;
  summary: string;
  /** The scenario's own outcome statement, set by its action step. */
  resultDetail: string | null;
  /** True while the source is still progressing the run. */
  inProgress: boolean;
}

/** One row of the execution history (seeded or runtime). */
export interface ScenarioExecutionRecord {
  id: string;
  scenarioName: string;
  kind: 'financial' | 'infrastructure';
  status: 'SUCCEEDED' | 'FAILED' | 'RUNNING';
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  summary: string;
  transactionsGenerated: number;
  eventsGenerated: number;
}

/* ==========================================================================
   Customers, accounts, transactions
   ========================================================================== */

export interface Customer {
  id: string;
  /** Human-facing customer identifier, e.g. CUS-00042. */
  code: string;
  name: string;
  email: string;
  phone: string;
  status: CustomerStatus;
  createdAt: string;
  accountCount: number;
}

export interface Account {
  id: string;
  /** Simulated account number, e.g. 0123456789. */
  number: string;
  customerId: string;
  customerName: string;
  type: AccountType;
  currency: string;
  status: AccountStatus;
  /** Funds available for new operations. */
  availableBalance: Money;
  /** Total posted balance including pending holds. */
  ledgerBalance: Money;
  createdAt: string;
}

export interface TransactionStatusChange {
  status: TransactionStatus;
  at: string;
  /** Why the transaction moved into this state, when the source knows. */
  note?: string;
}

export interface Transaction {
  id: string;
  reference: string;
  type: TransactionType;
  status: TransactionStatus;
  sourceAccountId: string | null;
  destinationAccountId: string | null;
  sourceLabel: string | null;
  destinationLabel: string | null;
  amount: Money;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  correlationId: string;
  /** Present when the transaction was generated by a scenario. */
  scenarioName: string | null;
  failureReason: string | null;
  statusHistory: TransactionStatusChange[];
}

/* ==========================================================================
   Events, deliveries, scenarios, infrastructure
   ========================================================================== */

export interface SimulationEvent {
  id: string;
  type: EventType;
  occurredAt: string;
  transactionReference: string | null;
  correlationId: string;
  summary: string;
}

export interface ScenarioExecution {
  id: string;
  scenarioName: string;
  scenarioKind: 'financial' | 'infrastructure';
  status: 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  transactionsGenerated: number;
  eventsGenerated: number;
  summary: string;
}

export interface WebhookDelivery {
  id: string;
  eventType: EventType;
  destination: string;
  status: DeliveryStatus;
  attempts: number;
  firstAttemptAt: string | null;
  lastAttemptAt: string | null;
  nextRetryAt: string | null;
  responseCode: number | null;
  error: string | null;
  correlationId: string;
}

export type ServiceStatus = 'OPERATIONAL' | 'DEGRADED' | 'DOWN';

export interface ProviderService {
  name: string;
  status: ServiceStatus;
  latencyMs: number;
  errorRatePercent: number;
  checkedAt: string;
}

export type IncidentSeverity = 'MINOR' | 'MAJOR' | 'CRITICAL';

export interface InfrastructureIncident {
  id: string;
  service: string;
  severity: IncidentSeverity;
  status: 'OPEN' | 'RESOLVED';
  openedAt: string;
  resolvedAt: string | null;
  summary: string;
  scenarioName: string | null;
}

/* ==========================================================================
   Dashboard
   ========================================================================== */

export const dashboardRanges = ['24h', '7d', '30d'] as const;
export type DashboardRange = (typeof dashboardRanges)[number];

export interface PeriodComparison {
  transactions: number;
  successful: number;
  failed: number;
  reversed: number;
  volumeMinor: number;
}

export interface DashboardMetrics {
  period: { from: string; to: string; range: DashboardRange };
  customers: { total: number; newInPeriod: number };
  accounts: { total: number; active: number };
  transactions: {
    total: number;
    successful: number;
    failed: number;
    pending: number;
    reversed: number;
    created: number;
  };
  /** Value of transactions that settled successfully in the period. */
  volumeMinor: number;
  currency: string;
  previousPeriod: PeriodComparison;
  simulation: SimulationStatus;
  scenarios: {
    executionsInPeriod: number;
    lastExecutionStatus: ScenarioExecution['status'] | null;
    lastExecutionAt: string | null;
    running: number;
  };
  events: {
    emittedInPeriod: number;
    delivered: number;
    failed: number;
    pending: number;
  };
  infrastructure: {
    openIncidents: number;
    servicesDown: number;
    servicesDegraded: number;
  };
}

export interface VolumePoint {
  bucketStart: string;
  successful: number;
  failed: number;
  pending: number;
  reversed: number;
  total: number;
}

export interface StatusSlice {
  status: TransactionStatus;
  count: number;
  share: number;
}

export interface DashboardActivity {
  volume: VolumePoint[];
  statusDistribution: StatusSlice[];
}

export interface DashboardSummary {
  metrics: DashboardMetrics;
  activity: DashboardActivity;
}

/* ==========================================================================
   Pagination envelope
   ========================================================================== */

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/* ==========================================================================
   Ledger
   ========================================================================== */
export const ledgerEntryStatuses = ['POSTED', 'REVERSED'] as const;
export type LedgerEntryStatus = (typeof ledgerEntryStatuses)[number];

/**
 * A journal entry. Every entry belongs to exactly one transaction and one
 * account. Entries are never edited; reversals add compensating entries.
 */
export interface LedgerEntry {
  id: string;
  /** Human-facing journal code, e.g. JE-001234. */
  code: string;
  transactionId: string;
  reference: string;
  accountId: string;
  /** Display label: account number or the simulated settlement account. */
  accountLabel: string;
  direction: LedgerDirection;
  amount: Money;
  postedAt: string;
  status: LedgerEntryStatus;
  correlationId: string;
  /** Set when this entry compensates a reversed entry. */
  compensatesEntryId?: string;
}

/* ==========================================================================
   Queries
   ========================================================================== */

export type SortDirection = 'asc' | 'desc';

export interface CustomerQuery {
  search?: string;
  status?: CustomerStatus | 'all';
  sort?: 'name' | 'createdAt' | 'accountCount';
  direction?: SortDirection;
  page?: number;
  pageSize?: number;
}

export interface AccountQuery {
  search?: string;
  type?: AccountType | 'all';
  status?: AccountStatus | 'all';
  sort?: 'number' | 'createdAt' | 'availableBalance' | 'customerName';
  direction?: SortDirection;
  page?: number;
  pageSize?: number;
}

export interface TransactionQuery {
  search?: string;
  status?: TransactionStatus | 'all';
  type?: TransactionType | 'all';
  accountId?: string;
  /** Inclusive ISO date bounds on creation time. */
  from?: string;
  to?: string;
  minAmountMinor?: number;
  maxAmountMinor?: number;
  sort?: 'createdAt' | 'amount' | 'status' | 'reference';
  direction?: SortDirection;
  page?: number;
  pageSize?: number;
}

export interface LedgerQuery {
  search?: string;
  accountId?: string;
  transactionId?: string;
  direction?: LedgerDirection | 'all';
  status?: LedgerEntryStatus | 'all';
  sort?: 'postedAt' | 'amount' | 'code';
  directionSort?: SortDirection;
  page?: number;
  pageSize?: number;
}

/** Query for the event log. Only implemented event types carry data. */
export interface EventQuery {
  search?: string;
  type?: EventType | 'all';
  correlationId?: string;
  /** Inclusive ISO date bounds on occurrence time. */
  from?: string;
  to?: string;
  sort?: 'occurredAt';
  direction?: SortDirection;
  page?: number;
  pageSize?: number;
}

/** Query for the webhook delivery workspace. */
export interface DeliveryQuery {
  search?: string;
  status?: DeliveryStatus | 'all';
  eventType?: EventType | 'all';
  /** Inclusive ISO date bounds on the last attempt time. */
  from?: string;
  to?: string;
  sort?: 'lastAttemptAt';
  direction?: SortDirection;
  page?: number;
  pageSize?: number;
}

/** Current provider services and their incidents, as reported by the source. */
export interface InfrastructureHealth {
  services: ProviderService[];
  incidents: InfrastructureIncident[];
}

/** Ledger page with balanced totals for the filtered set. */
export interface LedgerPage {
  items: LedgerEntry[];
  total: number;
  page: number;
  pageSize: number;
  totals: {
    debitMinor: number;
    creditMinor: number;
    currency: string;
    balanced: boolean;
  };
}

/** Journal entry detail with its transaction and compensation links. */
export interface LedgerEntryDetail {
  entry: LedgerEntry;
  transaction: Transaction | null;
  /** Every entry posted by the same transaction, including its pair. */
  related: LedgerEntry[];
  /** The original entry this one compensates, when reversing. */
  compensatingFor: LedgerEntry[];
  /** Entries that compensate this one. */
  compensatedBy: LedgerEntry[];
}

/* ==========================================================================
   Detail payloads
   ========================================================================== */

export interface AccountStatusChange {
  status: AccountStatus;
  at: string;
  /** Why the status changed, when the source records a reason. */
  note?: string;
  actor: string;
}

export interface CustomerDetail {
  customer: Customer;
  accounts: Account[];
  recentTransactions: Transaction[];
  events: SimulationEvent[];
}

export interface AccountDetail {
  account: Account;
  recentTransactions: Transaction[];
  statusHistory: AccountStatusChange[];
  /** Journal entries posted for this account (explored in the Ledger workspace). */
  ledgerEntryCount: number;
}

/** Everything known about one transaction, assembled by the source. */
export interface TransactionDetail {
  transaction: Transaction;
  ledgerEntries: LedgerEntry[];
  events: SimulationEvent[];
  deliveries: WebhookDelivery[];
  /** True while the source is still progressing the transaction. */
  inProgress: boolean;
}

/** One event with its reconstructed payload and the deliveries it produced. */
export interface EventDetail {
  event: SimulationEvent;
  /** The payload the destination would receive, as the simulated source sees it. */
  payload: Record<string, unknown> | null;
  /** Delivery attempts produced for this event. */
  deliveries: WebhookDelivery[];
}

/* ==========================================================================
   Mutations
   ========================================================================== */

export interface CreateCustomerInput {
  name: string;
  email: string;
  phone: string;
  status?: CustomerStatus;
}

export interface UpdateCustomerInput {
  name?: string;
  email?: string;
  phone?: string;
}

export interface SetCustomerStatusInput {
  status: CustomerStatus;
  reason?: string;
}

/** Result of a customer status change, including its side effects. */
export interface CustomerStatusChangeResult {
  customer: Customer;
  /** Linked accounts the simulation froze as part of suspending the customer. */
  accountsFrozen: number;
}

export interface CreateAccountInput {
  customerId: string;
  type: AccountType;
  currency: string;
}

export interface SetAccountStatusInput {
  status: AccountStatus;
  reason?: string;
}

export interface DepositInput {
  accountId: string;
  /** Amount in the currency's minor unit. */
  amountMinor: number;
  currency: string;
  /** Idempotency reference; reusing it returns the original transaction. */
  reference?: string;
  note?: string;
}

export interface WithdrawalInput {
  accountId: string;
  amountMinor: number;
  currency: string;
  reference?: string;
  note?: string;
}

export interface TransferInput {
  sourceAccountId: string;
  destinationAccountId: string;
  amountMinor: number;
  currency: string;
  reference?: string;
  note?: string;
}

/** Outcome of a financial operation, including idempotent reuse. */
export interface OperationResult {
  transaction: Transaction;
  /** True when the supplied reference already existed and was reused. */
  duplicate: boolean;
}

export interface ReverseInput {
  reason: string;
}

export interface ReverseResult {
  transaction: Transaction;
  /** Compensating entries posted by the reversal. */
  compensatingEntries: LedgerEntry[];
}

/** Financial operation kinds the workspace can initiate. */
export type OperationKind = 'deposit' | 'withdrawal' | 'transfer';
