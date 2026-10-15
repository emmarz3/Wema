/**
 * Typed API client.
 *
 * Screens call methods on this client only. The client resolves the
 * configured transport (simulated source or real backend) and normalises
 * transport failures into ApiError. No screen ever sees a raw fetch.
 */
import { routes, buildPath, withQuery } from './types';
import type { ApiResponse, HttpMethod, Transport } from './types';
import { toApiError } from './errors';
import type {
  Account,
  AccountDetail,
  AccountQuery,
  AuthSession,
  CreateAccountInput,
  CreateCustomerInput,
  Customer,
  CustomerDetail,
  CustomerQuery,
  CustomerStatusChangeResult,
  DashboardRange,
  DashboardSummary,
  DeliveryQuery,
  DepositInput,
  EventDetail,
  EventQuery,
  InfrastructureIncident,
  LedgerEntryDetail,
  LedgerPage,
  LedgerQuery,
  OperationResult,
  Page,
  ProviderService,
  ReverseInput,
  ReverseResult,
  ScenarioDefinition,
  ScenarioExecution,
  ScenarioExecutionRecord,
  ScenarioRun,
  SetAccountStatusInput,
  SetCustomerStatusInput,
  SimulationControlEntry,
  SimulationError,
  SimulationEvent,
  SimulationMode,
  SimulationStatus,
  Transaction,
  TransactionDetail,
  TransactionQuery,
  TransferInput,
  UpdateCustomerInput,
  WebhookDelivery,
  WithdrawalInput,
} from '../types/domain';
import type { Role } from '../lib/permissions';

export interface SignInInput {
  email: string;
  password: string;
  role: Role;
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
        message: 'The interface could not reach ProofBank.',
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

  /* ---------------------------------------------------------- simulation */

  simulationStatus(): Promise<SimulationStatus> {
    return this.request<SimulationStatus>('GET', routes.simulation.status.path, {
      token: lastToken ?? undefined,
    });
  }

  simulationHistory(): Promise<SimulationControlEntry[]> {
    return this.request<SimulationControlEntry[]>(
      'GET',
      routes.simulation.history.path,
      { token: lastToken ?? undefined },
    );
  }

  simulationErrors(): Promise<SimulationError[]> {
    return this.request<SimulationError[]>('GET', routes.simulation.errors.path, {
      token: lastToken ?? undefined,
    });
  }

  startSimulation(): Promise<SimulationStatus> {
    return this.request<SimulationStatus>('POST', routes.simulation.start.path, {
      token: lastToken ?? undefined,
    });
  }

  pauseSimulation(): Promise<SimulationStatus> {
    return this.request<SimulationStatus>('POST', routes.simulation.pause.path, {
      token: lastToken ?? undefined,
    });
  }

  resumeSimulation(): Promise<SimulationStatus> {
    return this.request<SimulationStatus>('POST', routes.simulation.resume.path, {
      token: lastToken ?? undefined,
    });
  }

  stopSimulation(): Promise<SimulationStatus> {
    return this.request<SimulationStatus>('POST', routes.simulation.stop.path, {
      token: lastToken ?? undefined,
    });
  }

  setSimulationMode(mode: SimulationMode): Promise<SimulationStatus> {
    return this.request<SimulationStatus>('POST', routes.simulation.setMode.path, {
      body: { mode },
      token: lastToken ?? undefined,
    });
  }

  setSimulationInterval(seconds: number): Promise<SimulationStatus> {
    return this.request<SimulationStatus>('POST', routes.simulation.setInterval.path, {
      body: { seconds },
      token: lastToken ?? undefined,
    });
  }

  /* ----------------------------------------------------------- dashboard */

  dashboardSummary(range: DashboardRange): Promise<DashboardSummary> {
    return this.request<DashboardSummary>(
      'GET',
      `${routes.dashboard.summary.path}?range=${encodeURIComponent(range)}`,
      { token: lastToken ?? undefined },
    );
  }

  /* ----------------------------------------------------------- customers */

  customersList(query: CustomerQuery = {}): Promise<Page<Customer>> {
    return this.request<Page<Customer>>(
      'GET',
      withQuery(routes.customers.list.path, {
        search: query.search,
        status: query.status,
        sort: query.sort,
        direction: query.direction,
        page: query.page,
        pageSize: query.pageSize,
      }),
      { token: lastToken ?? undefined },
    );
  }

  customerDetail(id: string): Promise<CustomerDetail> {
    return this.request<CustomerDetail>(
      'GET',
      buildPath(routes.customers.detail.path, { id }),
      { token: lastToken ?? undefined },
    );
  }

  createCustomer(input: CreateCustomerInput): Promise<Customer> {
    return this.request<Customer>('POST', routes.customers.create.path, {
      body: input,
      token: lastToken ?? undefined,
    });
  }

  updateCustomer(id: string, input: UpdateCustomerInput): Promise<Customer> {
    return this.request<Customer>(
      'PATCH',
      buildPath(routes.customers.update.path, { id }),
      { body: input, token: lastToken ?? undefined },
    );
  }

  setCustomerStatus(
    id: string,
    input: SetCustomerStatusInput,
  ): Promise<CustomerStatusChangeResult> {
    return this.request<CustomerStatusChangeResult>(
      'POST',
      buildPath(routes.customers.setStatus.path, { id }),
      { body: input, token: lastToken ?? undefined },
    );
  }

  /* ------------------------------------------------------------ accounts */

  accountsList(query: AccountQuery = {}): Promise<Page<Account>> {
    return this.request<Page<Account>>(
      'GET',
      withQuery(routes.accounts.list.path, {
        search: query.search,
        type: query.type,
        status: query.status,
        sort: query.sort,
        direction: query.direction,
        page: query.page,
        pageSize: query.pageSize,
      }),
      { token: lastToken ?? undefined },
    );
  }

  accountDetail(id: string): Promise<AccountDetail> {
    return this.request<AccountDetail>(
      'GET',
      buildPath(routes.accounts.detail.path, { id }),
      { token: lastToken ?? undefined },
    );
  }

  createAccount(input: CreateAccountInput): Promise<Account> {
    return this.request<Account>('POST', routes.accounts.create.path, {
      body: input,
      token: lastToken ?? undefined,
    });
  }

  setAccountStatus(id: string, input: SetAccountStatusInput): Promise<Account> {
    return this.request<Account>(
      'POST',
      buildPath(routes.accounts.setStatus.path, { id }),
      { body: input, token: lastToken ?? undefined },
    );
  }

  /* ------------------------------------------------------------- recents */

  recentTransactions(limit = 8, token?: string): Promise<Transaction[]> {
    return this.request<Transaction[]>(
      'GET',
      `${routes.transactions.recent.path}?limit=${limit}`,
      { token: token ?? lastToken ?? undefined },
    );
  }

  /* --------------------------------------------------------- transactions */

  transactionsList(query: TransactionQuery = {}): Promise<Page<Transaction>> {
    return this.request<Page<Transaction>>(
      'GET',
      withQuery(routes.transactions.list.path, {
        search: query.search,
        status: query.status,
        type: query.type,
        accountId: query.accountId,
        from: query.from,
        to: query.to,
        minAmount: query.minAmountMinor,
        maxAmount: query.maxAmountMinor,
        sort: query.sort,
        direction: query.direction,
        page: query.page,
        pageSize: query.pageSize,
      }),
      { token: lastToken ?? undefined },
    );
  }

  transactionDetail(id: string): Promise<TransactionDetail> {
    return this.request<TransactionDetail>(
      'GET',
      buildPath(routes.transactions.detail.path, { id }),
      { token: lastToken ?? undefined },
    );
  }

  deposit(input: DepositInput): Promise<OperationResult> {
    return this.request<OperationResult>('POST', routes.transactions.deposit.path, {
      body: input,
      token: lastToken ?? undefined,
    });
  }

  withdraw(input: WithdrawalInput): Promise<OperationResult> {
    return this.request<OperationResult>('POST', routes.transactions.withdrawal.path, {
      body: input,
      token: lastToken ?? undefined,
    });
  }

  transfer(input: TransferInput): Promise<OperationResult> {
    return this.request<OperationResult>('POST', routes.transactions.transfer.path, {
      body: input,
      token: lastToken ?? undefined,
    });
  }

  reverseTransaction(id: string, input: ReverseInput): Promise<ReverseResult> {
    return this.request<ReverseResult>(
      'POST',
      buildPath(routes.transactions.reverse.path, { id }),
      { body: input, token: lastToken ?? undefined },
    );
  }

  /* --------------------------------------------------------------- ledger */

  ledgerList(query: LedgerQuery = {}): Promise<LedgerPage> {
    return this.request<LedgerPage>(
      'GET',
      withQuery(routes.ledger.list.path, {
        search: query.search,
        accountId: query.accountId,
        transactionId: query.transactionId,
        direction: query.direction,
        status: query.status,
        sort: query.sort,
        directionSort: query.directionSort,
        page: query.page,
        pageSize: query.pageSize,
      }),
      { token: lastToken ?? undefined },
    );
  }

  ledgerEntryDetail(id: string): Promise<LedgerEntryDetail> {
    return this.request<LedgerEntryDetail>(
      'GET',
      buildPath(routes.ledger.detail.path, { id }),
      { token: lastToken ?? undefined },
    );
  }

  /* ------------------------------------------------------------ scenarios */

  scenarioCatalogue(): Promise<ScenarioDefinition[]> {
    return this.request<ScenarioDefinition[]>('GET', routes.scenarios.catalogue.path, {
      token: lastToken ?? undefined,
    });
  }

  executeScenario(
    name: string,
    parameters: Record<string, string>,
  ): Promise<ScenarioRun> {
    return this.request<ScenarioRun>('POST', routes.scenarios.execute.path, {
      body: { name, parameters },
      token: lastToken ?? undefined,
    });
  }

  scenarioHistory(): Promise<ScenarioExecutionRecord[]> {
    return this.request<ScenarioExecutionRecord[]>(
      'GET',
      routes.scenarios.history.path,
      { token: lastToken ?? undefined },
    );
  }

  scenarioRunDetail(id: string): Promise<ScenarioRun> {
    return this.request<ScenarioRun>(
      'GET',
      buildPath(routes.scenarios.detail.path, { id }),
      { token: lastToken ?? undefined },
    );
  }

  /* ------------------------------------------------------------- recents */

  recentEvents(limit = 8, token?: string): Promise<SimulationEvent[]> {
    return this.request<SimulationEvent[]>(
      'GET',
      `${routes.events.recent.path}?limit=${limit}`,
      { token: token ?? lastToken ?? undefined },
    );
  }

  recentScenarioExecutions(limit = 6, token?: string): Promise<ScenarioExecution[]> {
    return this.request<ScenarioExecution[]>(
      'GET',
      `${routes.scenarioExecutions.recent.path}?limit=${limit}`,
      { token: token ?? lastToken ?? undefined },
    );
  }

  recentDeliveries(limit = 8, token?: string): Promise<WebhookDelivery[]> {
    return this.request<WebhookDelivery[]>(
      'GET',
      `${routes.eventDeliveries.recent.path}?limit=${limit}`,
      { token: token ?? lastToken ?? undefined },
    );
  }

  /* --------------------------------------------- event & delivery workspace */

  eventsList(
    query: EventQuery = {},
    token?: string,
  ): Promise<Page<SimulationEvent>> {
    const path = withQuery(routes.events.list.path, {
      search: query.search,
      type: query.type,
      correlationId: query.correlationId,
      from: query.from,
      to: query.to,
      direction: query.direction,
      page: query.page,
      pageSize: query.pageSize,
    });
    return this.request<Page<SimulationEvent>>('GET', path, {
      token: token ?? lastToken ?? undefined,
    });
  }

  eventDetail(id: string, token?: string): Promise<EventDetail> {
    return this.request<EventDetail>(
      'GET',
      buildPath(routes.events.detail.path, { id }),
      { token: token ?? lastToken ?? undefined },
    );
  }

  deliveriesList(
    query: DeliveryQuery = {},
    token?: string,
  ): Promise<Page<WebhookDelivery>> {
    const path = withQuery(routes.eventDeliveries.list.path, {
      search: query.search,
      status: query.status,
      eventType: query.eventType,
      from: query.from,
      to: query.to,
      direction: query.direction,
      page: query.page,
      pageSize: query.pageSize,
    });
    return this.request<Page<WebhookDelivery>>('GET', path, {
      token: token ?? lastToken ?? undefined,
    });
  }

  /* ------------------------------------------------------ infrastructure */

  infrastructureHealth(
    token?: string,
  ): Promise<{ services: ProviderService[]; incidents: InfrastructureIncident[] }> {
    return this.request<{ services: ProviderService[]; incidents: InfrastructureIncident[] }>(
      'GET',
      routes.infrastructure.health.path,
      { token: token ?? lastToken ?? undefined },
    );
  }
}

/* The client keeps the active token for read-only convenience calls such as
   the top-bar simulation status. It is refreshed on sign-in/out. */
let lastToken: string | null = null;

export function setActiveToken(token: string | null): void {
  lastToken = token;
}
