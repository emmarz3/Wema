/**
 * Typed API client.
 *
 * Screens call methods on this client only. The client resolves the
 * configured transport (simulated source or real backend) and normalises
 * transport failures into ApiError. No screen ever sees a raw fetch.
 */
import { routes, buildPath, withQuery } from './contract';
import type { ApiResponse, HttpMethod, Transport } from './types';
import { toApiError } from './errors';
import type {
  AiInvestigation,
  ApiKeyRecord,
  AuditEntry,
  AuthSession,
  ColumnMappingInput,
  CreateProofShareInput,
  DashboardRange,
  Discrepancy,
  Incident,
  IncidentSeverity,
  IncidentStatus,
  InfrastructureEvent,
  InfrastructureHealth,
  DeliveryStatus,
  Member,
  NotificationItem,
  NotificationPreferences,
  OrganisationSettings,
  OverviewSummary,
  Page,
  ProofAccessEntry,
  ProofDetail,
  ProofRecord,
  ProofShare,
  PublicProofView,
  ProviderService,
  Receipt,
  ReconciliationDetail,
  ReconciliationRun,
  RequestLogEntry,
  SessionUser,
  UploadReconciliationInput,
  Verification,
  VerificationQuery,
  VerificationResult,
  VerifyTransactionInput,
  WebhookDelivery,
  WebhookEndpoint,
} from '../types/domain';
import type { Role } from '../lib/permissions';

export interface SignInInput {
  email: string;
  password: string;
  /**
   * Demonstration role hint. A real backend ignores this and derives the
   * role from the account; the simulated source applies it only to
   * unknown demonstration emails (known demo accounts keep their role).
   */
  role?: Role;
}

export interface RequestOptions {
  body?: unknown;
  token?: string;
  /** Skip automatic error normalisation for 204-style responses. */
  expectNoContent?: boolean;
}

export class ApiClient {
  constructor(private readonly transport: Transport) {}

  private async request<T>(
    method: HttpMethod,
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    let response: ApiResponse;
    try {
      response = await this.transport({ method, path, body: options.body, token: options.token });
    } catch {
      throw toApiError(0, {
        code: 'network_error',
        message: 'The interface could not reach ProofOps.',
      });
    }

    if (response.status === 204 || options.expectNoContent) return undefined as T;
    if (!response.ok) throw toApiError(response.status, response.body);
    return response.body as T;
  }

  /* ---------------------------------------------------------------- auth */

  signIn(input: SignInInput): Promise<AuthSession> {
    return this.request<AuthSession>('POST', routes.auth.signIn.path, {
      body: input,
    });
  }

  /** Returns the stored session or null when there is none. */
  async currentSession(token?: string): Promise<AuthSession | null> {
    try {
      return await this.request<AuthSession>('GET', routes.auth.session.path, {
        token,
      });
    } catch {
      return null;
    }
  }

  signOut(token?: string): Promise<void> {
    return this.request<void>('POST', routes.auth.signOut.path, {
      token,
      expectNoContent: true,
    });
  }

  /* ------------------------------------------------------------- health */

  ping(): Promise<{ status: string; simulated: boolean }> {
    return this.request<{ status: string; simulated: boolean }>(
      'GET',
      routes.health.ping.path,
      { token: currentToken ?? undefined },
    );
  }

  /* ------------------------------------------------------------ overview */

  overviewSummary(range: DashboardRange): Promise<OverviewSummary> {
    return this.request<OverviewSummary>(
      'GET',
      withQuery(routes.overview.summary.path, { range }),
      { token: currentToken ?? undefined },
    );
  }

  /* -------------------------------------------------------- verification */

  verificationsList(query: VerificationQuery = {}): Promise<Page<Verification>> {
    return this.request<Page<Verification>>(
      'GET',
      withQuery(routes.verifications.list.path, {
        search: query.search,
        provider: query.provider,
        merchant: query.merchant,
        proofId: query.proofId,
        result: query.result,
        transactionStatus: query.transactionStatus,
        reversal: query.reversal,
        sourceAvailability: query.sourceAvailability,
        currency: query.currency,
        minAmountMinor: query.minAmountMinor,
        maxAmountMinor: query.maxAmountMinor,
        from: query.from,
        to: query.to,
        sort: query.sort,
        direction: query.direction,
        page: query.page,
        pageSize: query.pageSize,
      }),
      { token: currentToken ?? undefined },
    );
  }

  verificationDetail(id: string): Promise<Verification> {
    return this.request<Verification>(
      'GET',
      buildPath(routes.verifications.detail.path, { id }),
      { token: currentToken ?? undefined },
    );
  }

  recentVerifications(limit = 8): Promise<Verification[]> {
    return this.request<Verification[]>(
      'GET',
      withQuery(routes.verifications.recent.path, { limit }),
      { token: currentToken ?? undefined },
    );
  }

  /** Start a verification. The response is whatever the source reports:
   *  the interface never invents a result. */
  verifyTransaction(input: VerifyTransactionInput): Promise<Verification> {
    return this.request<Verification>('POST', routes.verifications.create.path, {
      body: input,
      token: currentToken ?? undefined,
    });
  }

  retryVerification(id: string): Promise<Verification> {
    return this.request<Verification>(
      'POST',
      buildPath(routes.verifications.retry.path, { id }),
      { token: currentToken ?? undefined },
    );
  }

  /* ------------------------------------------------------------ receipts */

  uploadReceipt(input: FormData): Promise<Receipt> {
    return this.request<Receipt>('POST', routes.receipts.upload.path, {
      body: input,
      token: currentToken ?? undefined,
    });
  }

  receiptDetail(id: string): Promise<Receipt> {
    return this.request<Receipt>(
      'GET',
      buildPath(routes.receipts.detail.path, { id }),
      { token: currentToken ?? undefined },
    );
  }

  receiptPreview(id: string): Promise<{ url: string; expiresAt: string }> {
    return this.request<{ url: string; expiresAt: string }>(
      'GET',
      buildPath(routes.receipts.preview.path, { id }),
      { token: currentToken ?? undefined },
    );
  }

  reviewReceipt(
    id: string,
    input: { decisions: Array<{ field: string; value: string }>; note?: string },
  ): Promise<Receipt> {
    return this.request<Receipt>(
      'POST',
      buildPath(routes.receipts.review.path, { id }),
      { body: input, token: currentToken ?? undefined },
    );
  }

  /* -------------------------------------------------------------- proofs */

  proofsList(query: {
    search?: string;
    result?: VerificationResult;
    provider?: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<Page<ProofRecord>> {
    return this.request<Page<ProofRecord>>(
      'GET',
      withQuery(routes.proofs.list.path, {
        search: query.search,
        result: query.result,
        provider: query.provider,
        from: query.from,
        to: query.to,
        page: query.page,
        pageSize: query.pageSize,
      }),
      { token: currentToken ?? undefined },
    );
  }

  proofDetail(id: string): Promise<ProofDetail> {
    return this.request<ProofDetail>(
      'GET',
      buildPath(routes.proofs.detail.path, { id }),
      { token: currentToken ?? undefined },
    );
  }

  createProofShare(id: string, input: CreateProofShareInput): Promise<ProofShare> {
    return this.request<ProofShare>(
      'POST',
      buildPath(routes.proofs.shares.path, { id }),
      { body: input, token: currentToken ?? undefined },
    );
  }

  revokeProofShare(id: string, shareId: string): Promise<void> {
    return this.request<void>(
      'DELETE',
      buildPath(routes.proofs.revokeShare.path, { id, shareId }),
      { token: currentToken ?? undefined, expectNoContent: true },
    );
  }

  proofAccessHistory(id: string): Promise<ProofAccessEntry[]> {
    return this.request<ProofAccessEntry[]>(
      'GET',
      buildPath(routes.proofs.accessHistory.path, { id }),
      { token: currentToken ?? undefined },
    );
  }

  publicProof(id: string): Promise<PublicProofView> {
    return this.request<PublicProofView>(
      'GET',
      buildPath(routes.proofs.publicView.path, { id }),
    );
  }

  /* ------------------------------------------------------- discrepancies */

  discrepanciesList(query: {
    status?: Discrepancy['status'];
    kind?: Discrepancy['kind'];
    page?: number;
    pageSize?: number;
  } = {}): Promise<Page<Discrepancy>> {
    return this.request<Page<Discrepancy>>(
      'GET',
      withQuery('/discrepancies', {
        status: query.status,
        kind: query.kind,
        page: query.page,
        pageSize: query.pageSize,
      }),
      { token: currentToken ?? undefined },
    );
  }

  /* ------------------------------------------------------- reconciliation */

  reconciliationRuns(): Promise<ReconciliationRun[]> {
    return this.request<ReconciliationRun[]>(
      'GET',
      routes.reconciliation.runs.path,
      { token: currentToken ?? undefined },
    );
  }

  reconciliationDetail(id: string): Promise<ReconciliationDetail> {
    return this.request<ReconciliationDetail>(
      'GET',
      buildPath(routes.reconciliation.detail.path, { id }),
      { token: currentToken ?? undefined },
    );
  }

  uploadReconciliation(input: UploadReconciliationInput): Promise<ReconciliationDetail> {
    return this.request<ReconciliationDetail>(
      'POST',
      routes.reconciliation.upload.path,
      { body: input, token: currentToken ?? undefined },
    );
  }

  updateReconciliationMapping(
    id: string,
    input: ColumnMappingInput,
  ): Promise<ReconciliationDetail> {
    return this.request<ReconciliationDetail>(
      'PUT',
      buildPath(routes.reconciliation.mapping.path, { id }),
      { body: input, token: currentToken ?? undefined },
    );
  }

  startReconciliation(id: string): Promise<ReconciliationDetail> {
    return this.request<ReconciliationDetail>(
      'POST',
      buildPath(routes.reconciliation.start.path, { id }),
      { token: currentToken ?? undefined },
    );
  }

  decideReconciliationCandidate(
    id: string,
    candidateId: string,
    decision: 'accepted' | 'rejected',
  ): Promise<ReconciliationDetail> {
    return this.request<ReconciliationDetail>(
      'POST',
      buildPath(routes.reconciliation.decideCandidate.path, { id, candidateId }),
      { body: { decision }, token: currentToken ?? undefined },
    );
  }

  /* ------------------------------------------------------ infrastructure */

  infrastructureHealth(range: DashboardRange): Promise<InfrastructureHealth> {
    return this.request<InfrastructureHealth>(
      'GET',
      withQuery(routes.infrastructure.health.path, { range }),
      { token: currentToken ?? undefined },
    );
  }

  providers(): Promise<ProviderService[]> {
    return this.request<ProviderService[]>('GET', routes.infrastructure.providers.path, {
      token: currentToken ?? undefined,
    });
  }

  deliveries(query: {
    status?: DeliveryStatus;
    eventType?: string;
    provider?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<Page<WebhookDelivery>> {
    return this.request<Page<WebhookDelivery>>(
      'GET',
      withQuery(routes.infrastructure.deliveries.path, {
        status: query.status,
        eventType: query.eventType,
        provider: query.provider,
        page: query.page,
        pageSize: query.pageSize,
      }),
      { token: currentToken ?? undefined },
    );
  }

  deliveryDetail(id: string): Promise<WebhookDelivery> {
    return this.request<WebhookDelivery>(
      'GET',
      buildPath(routes.infrastructure.deliveryDetail.path, { id }),
      { token: currentToken ?? undefined },
    );
  }

  events(query: {
    eventType?: string;
    provider?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<Page<InfrastructureEvent>> {
    return this.request<Page<InfrastructureEvent>>(
      'GET',
      withQuery(routes.infrastructure.events.path, {
        eventType: query.eventType,
        provider: query.provider,
        page: query.page,
        pageSize: query.pageSize,
      }),
      { token: currentToken ?? undefined },
    );
  }

  /* ----------------------------------------------------------- incidents */

  incidentsList(query: {
    status?: IncidentStatus;
    severity?: IncidentSeverity;
    provider?: string;
    assignee?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<Page<Incident>> {
    return this.request<Page<Incident>>(
      'GET',
      withQuery(routes.incidents.list.path, {
        status: query.status,
        severity: query.severity,
        provider: query.provider,
        assignee: query.assignee,
        page: query.page,
        pageSize: query.pageSize,
      }),
      { token: currentToken ?? undefined },
    );
  }

  incidentDetail(id: string): Promise<Incident> {
    return this.request<Incident>(
      'GET',
      buildPath(routes.incidents.detail.path, { id }),
      { token: currentToken ?? undefined },
    );
  }

  addIncidentNote(
    id: string,
    input: { body: string; internal: boolean },
  ): Promise<Incident> {
    return this.request<Incident>(
      'POST',
      buildPath(routes.incidents.note.path, { id }),
      { body: input, token: currentToken ?? undefined },
    );
  }

  assignIncident(id: string, assignee: string | null): Promise<Incident> {
    return this.request<Incident>(
      'POST',
      buildPath(routes.incidents.assign.path, { id }),
      { body: { assignee }, token: currentToken ?? undefined },
    );
  }

  updateIncidentStatus(id: string, status: IncidentStatus): Promise<Incident> {
    return this.request<Incident>(
      'POST',
      buildPath(routes.incidents.status.path, { id }),
      { body: { status }, token: currentToken ?? undefined },
    );
  }

  /* ------------------------------------------------------ investigations */

  createInvestigation(input: {
    subjectType: 'verification' | 'incident' | 'discrepancy';
    subjectId: string;
  }): Promise<AiInvestigation> {
    return this.request<AiInvestigation>('POST', routes.investigations.create.path, {
      body: input,
      token: currentToken ?? undefined,
    });
  }

  investigationDetail(id: string): Promise<AiInvestigation> {
    return this.request<AiInvestigation>(
      'GET',
      buildPath(routes.investigations.detail.path, { id }),
      { token: currentToken ?? undefined },
    );
  }

  /* ----------------------------------------------------------- developer */

  apiKeys(): Promise<ApiKeyRecord[]> {
    return this.request<ApiKeyRecord[]>('GET', routes.developer.keys.path, {
      token: currentToken ?? undefined,
    });
  }

  createApiKey(input: {
    label: string;
    scopes: string[];
  }): Promise<ApiKeyRecord & { secret: string }> {
    return this.request<ApiKeyRecord & { secret: string }>(
      'POST',
      routes.developer.createKey.path,
      { body: input, token: currentToken ?? undefined },
    );
  }

  revokeApiKey(id: string): Promise<ApiKeyRecord> {
    return this.request<ApiKeyRecord>(
      'POST',
      buildPath(routes.developer.revokeKey.path, { id }),
      { token: currentToken ?? undefined },
    );
  }

  webhookEndpoints(): Promise<WebhookEndpoint[]> {
    return this.request<WebhookEndpoint[]>(
      'GET',
      routes.developer.webhooks.path,
      { token: currentToken ?? undefined },
    );
  }

  saveWebhookEndpoint(input: {
    id?: string;
    url: string;
    events: string[];
    enabled: boolean;
  }): Promise<WebhookEndpoint> {
    return this.request<WebhookEndpoint>(
      'POST',
      routes.developer.saveWebhook.path,
      { body: input, token: currentToken ?? undefined },
    );
  }

  requestLogs(query: { page?: number; pageSize?: number } = {}): Promise<
    Page<RequestLogEntry>
  > {
    return this.request<Page<RequestLogEntry>>(
      'GET',
      withQuery(routes.developer.requestLogs.path, {
        page: query.page,
        pageSize: query.pageSize,
      }),
      { token: currentToken ?? undefined },
    );
  }

  /* ------------------------------------------------------ notifications */

  notificationsList(): Promise<NotificationItem[]> {
    return this.request<NotificationItem[]>('GET', routes.notifications.list.path, {
      token: currentToken ?? undefined,
    });
  }

  markNotificationRead(id: string): Promise<void> {
    return this.request<void>(
      'POST',
      buildPath(routes.notifications.markRead.path, { id }),
      { token: currentToken ?? undefined, expectNoContent: true },
    );
  }

  markAllNotificationsRead(): Promise<void> {
    return this.request<void>(
      'POST',
      routes.notifications.markAllRead.path,
      { token: currentToken ?? undefined, expectNoContent: true },
    );
  }

  notificationPreferences(): Promise<NotificationPreferences> {
    return this.request<NotificationPreferences>(
      'GET',
      routes.notifications.preferences.path,
      { token: currentToken ?? undefined },
    );
  }

  saveNotificationPreferences(
    input: NotificationPreferences,
  ): Promise<NotificationPreferences> {
    return this.request<NotificationPreferences>(
      'PUT',
      routes.notifications.preferences.path,
      { body: input, token: currentToken ?? undefined },
    );
  }

  /* ------------------------------------------------------------ settings */

  profile(): Promise<SessionUser> {
    return this.request<SessionUser>('GET', routes.settings.profile.path, {
      token: currentToken ?? undefined,
    });
  }

  members(): Promise<Member[]> {
    return this.request<Member[]>('GET', routes.settings.members.path, {
      token: currentToken ?? undefined,
    });
  }

  updateMemberRole(id: string, role: Role): Promise<Member> {
    return this.request<Member>(
      'POST',
      buildPath(routes.settings.updateMemberRole.path, { id }),
      { body: { role }, token: currentToken ?? undefined },
    );
  }

  audit(query: { page?: number; pageSize?: number } = {}): Promise<
    Page<AuditEntry>
  > {
    return this.request<Page<AuditEntry>>(
      'GET',
      withQuery(routes.settings.audit.path, {
        page: query.page,
        pageSize: query.pageSize,
      }),
      { token: currentToken ?? undefined },
    );
  }

  organisationSettings(): Promise<OrganisationSettings> {
    return this.request<OrganisationSettings>(
      'GET',
      '/settings/organisation',
      { token: currentToken ?? undefined },
    );
  }
}

/* The client keeps the active token for convenience calls such as the
   top-bar status strip. It is refreshed on sign-in/out. */
let currentToken: string | null = null;

export function setActiveToken(token: string | null): void {
  currentToken = token;
}

/** Currently active token, when any (never logged, never persisted here). */
export function getActiveToken(): string | null {
  return currentToken;
}
