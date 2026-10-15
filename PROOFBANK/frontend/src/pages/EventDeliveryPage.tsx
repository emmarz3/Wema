import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Braces, Radio, Send } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { SimulatedNotice } from '../components/layout/Environment';
import { Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Field';
import { SearchInput } from '../components/ui/SearchInput';
import { Pagination } from '../components/ui/Pagination';
import { Dialog } from '../components/ui/Dialog';
import { StatusBadge } from '../components/ui/Badge';
import { EmptyState, ErrorState } from '../components/ui/States';
import { LoadingPanel } from '../components/ui/Loading';
import {
  Table,
  TableScroll,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '../components/ui/Table';
import { cn } from '../lib/utils';
import { deliveryStatusMeta, eventTypeLabels } from '../lib/status';
import { formatRelativeTime, truncateMiddle } from '../lib/format';
import { useNow } from '../hooks/useSimulationStatus';
import { useDeliveries, useEventDetail, useEvents } from '../hooks/useEvents';
import { useToast } from '../state/toast';
import { ApiError } from '../api/errors';
import { api, proofOpsConfigured, proofOpsLabel } from '../api';
import { EventInspector } from '../components/events/EventInspector';
import { ProofOpsEventLink } from '../components/layout/ProofOpsLink';
import type { DeliveryQuery, DeliveryStatus, EventQuery, EventType } from '../types/domain';

const RECENT_DELIVERIES = 15;
const RECENT_EVENTS = 15;
const eventTypes = Object.keys(eventTypeLabels) as EventType[];

type Tab = 'deliveries' | 'events';

/**
 * Event delivery workspace. Delivery state is deliberately separate from
 * transaction state: a failed delivery says nothing about whether the
 * underlying transaction succeeded. Events carry the raw payload a
 * destination would receive, inspected exactly as the source reports it.
 */
export function EventDeliveryPage() {
  const { show } = useToast();
  const now = useNow(10_000);

  const [tab, setTab] = useState<Tab>('deliveries');

  // Delivery filters
  const [dSearch, setDSearch] = useState('');
  const [dStatus, setDStatus] = useState<DeliveryStatus | 'all'>('all');
  const [dType, setDType] = useState<EventType | 'all'>('all');
  const [dPage, setDPage] = useState(1);

  // Event filters
  const [eSearch, setESearch] = useState('');
  const [eType, setEType] = useState<EventType | 'all'>('all');
  const [ePage, setEPage] = useState(1);

  const [openEventId, setOpenEventId] = useState<string | null>(null);

  const deliveryQuery: DeliveryQuery = {
    search: dSearch,
    status: dStatus,
    eventType: dType,
    page: dPage,
    pageSize: RECENT_DELIVERIES,
  };
  const eventQuery: EventQuery = {
    search: eSearch,
    type: eType,
    page: ePage,
    pageSize: RECENT_EVENTS,
  };

  const deliveries = useDeliveries(deliveryQuery);
  const events = useEvents(eventQuery);
  const inspector = useEventDetail(openEventId);

  const deliveryItems = deliveries.data?.items ?? [];
  const eventItems = events.data?.items ?? [];

  function resetDelivery() {
    setDPage(1);
  }

  async function inspectDelivery(eventType: EventType, correlationId: string) {
    try {
      const result = await api.eventsList({
        type: eventType,
        correlationId,
        pageSize: 1,
      });
      const first = result.items[0];
      if (first) {
        setOpenEventId(first.id);
      } else {
        show({
          tone: 'info',
          title: 'No correlated event stored',
          description:
            'The source has no retained event for this delivery to inspect.',
        });
      }
    } catch (error) {
      show({
        tone: 'danger',
        title: 'Could not open the event',
        description:
          error instanceof ApiError
            ? error.message
            : 'The event could not be looked up.',
      });
    }
  }

  return (
    <>
      <PageHeader
        title="Event Delivery"
        sectionId="events"
        description="Outbound webhook deliveries to the ProofOps destination, and the raw events they carry. Delivery state is separate from transaction state."
        actions={<SimulatedNotice />}
        notice={
          <div className="flex flex-wrap items-center gap-2 rounded-control border border-line bg-surface px-3 py-2 text-xs text-ink-secondary">
            <Radio aria-hidden className="size-3.5 text-brand" />
            <span>
              {proofOpsConfigured
                ? `A contextual ${proofOpsLabel} link is configured for this environment.`
                : `${proofOpsLabel} is a separate product. No authorised cross-link is configured here, so those controls are disabled — this environment does not claim a ProofOps integration.`}
            </span>
          </div>
        }
      />

      <div className="flex flex-col gap-5">
        {/* Tabs ----------------------------------------------------------- */}
        <div className="flex items-center gap-2" role="tablist" aria-label="Event workspace">
          <TabButton
            active={tab === 'deliveries'}
            onClick={() => setTab('deliveries')}
            icon={<Send aria-hidden className="size-4" />}
          >
            Deliveries
          </TabButton>
          <TabButton
            active={tab === 'events'}
            onClick={() => setTab('events')}
            icon={<Braces aria-hidden className="size-4" />}
          >
            Events
          </TabButton>
        </div>

        {tab === 'deliveries' ? (
          <Panel
            title="Webhook deliveries"
            description="Attempts toward the ProofOps destination, newest first."
            bodyClassName="p-0"
            footer={
              <>
                <p className="text-xs leading-relaxed text-ink-secondary">
                  <strong className="font-medium text-ink">Delivery status ≠ transaction outcome.</strong>{' '}
                  A failed or dead-lettered delivery means the event did not
                  reach its destination; the underlying transaction may still
                  have succeeded.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 text-[0.6875rem] text-ink-secondary">
                  {(Object.keys(deliveryStatusMeta) as DeliveryStatus[]).map((status) => (
                    <span key={status} className="flex items-center gap-1">
                      <StatusBadge meta={deliveryStatusMeta[status]} size="sm" />
                    </span>
                  ))}
                </div>
              </>
            }
          >
            <div className="flex flex-wrap items-center gap-3 border-b border-line p-3">
              <SearchInput
                label="Search deliveries"
                placeholder="Search by destination, correlation id or error"
                value={dSearch}
                onValueChange={(value) => {
                  setDSearch(value);
                  resetDelivery();
                }}
                className="w-full sm:w-72"
              />
              <label className="flex items-center gap-2 text-xs text-ink-secondary">
                Status
                <Select
                  value={dStatus}
                  onChange={(event) => {
                    setDStatus(event.target.value as DeliveryStatus | 'all');
                    resetDelivery();
                  }}
                  className="h-9 w-36 py-0 text-xs"
                  aria-label="Filter by delivery status"
                >
                  <option value="all">All statuses</option>
                  {(Object.keys(deliveryStatusMeta) as DeliveryStatus[]).map((status) => (
                    <option key={status} value={status}>
                      {deliveryStatusMeta[status].label}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="flex items-center gap-2 text-xs text-ink-secondary">
                Event
                <Select
                  value={dType}
                  onChange={(event) => {
                    setDType(event.target.value as EventType | 'all');
                    resetDelivery();
                  }}
                  className="h-9 w-48 py-0 text-xs"
                  aria-label="Filter by event type"
                >
                  <option value="all">All event types</option>
                  {eventTypes.map((type) => (
                    <option key={type} value={type}>
                      {eventTypeLabels[type]}
                    </option>
                  ))}
                </Select>
              </label>
              <span className="ml-auto text-xs text-ink-secondary" data-numeric="true">
                {deliveries.data ? `${deliveries.data.total} deliveries` : 'Loading…'}
              </span>
            </div>

            {deliveries.error ? (
              <div className="p-4">
                <ErrorState error={deliveries.error} onRetry={() => void deliveries.refetch()} />
              </div>
            ) : deliveries.isPending ? (
              <div className="p-4">
                <LoadingPanel rows={6} />
              </div>
            ) : deliveryItems.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={<Send aria-hidden className="size-5" />}
                  title="No deliveries match these filters"
                  description="Deliveries appear when the simulation dispatches events."
                />
              </div>
            ) : (
              <>
                <TableScroll>
                  <Table caption="Simulated webhook deliveries">
                    <THead>
                      <TR>
                        <TH>Event</TH>
                        <TH>Destination</TH>
                        <TH>Status</TH>
                        <TH numeric>Attempts</TH>
                        <TH numeric>Response</TH>
                        <TH>Last attempt</TH>
                        <TH>Raw event</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {deliveryItems.map((delivery) => (
                        <TR key={delivery.id}>
                          <TD>{eventTypeLabels[delivery.eventType]}</TD>
                          <TD>
                            <span
                              className="font-technical text-ink-secondary"
                              title={delivery.destination}
                            >
                              {truncateMiddle(delivery.destination, 20, 8)}
                            </span>
                          </TD>
                          <TD>
                            <StatusBadge meta={deliveryStatusMeta[delivery.status]} size="sm" />
                            {delivery.status === 'RETRYING' && delivery.nextRetryAt && (
                              <span className="mt-0.5 block text-[0.6875rem] text-ink-secondary">
                                Retry {formatRelativeTime(delivery.nextRetryAt, now)}
                              </span>
                            )}
                          </TD>
                          <TD numeric>{delivery.attempts}</TD>
                          <TD numeric>{delivery.responseCode ?? '—'}</TD>
                          <TD
                            className="whitespace-nowrap text-ink-secondary"
                            title={
                              (delivery.lastAttemptAt ?? delivery.firstAttemptAt) ?? undefined
                            }
                          >
                            {delivery.lastAttemptAt ?? delivery.firstAttemptAt
                              ? formatRelativeTime(
                                  (delivery.lastAttemptAt ?? delivery.firstAttemptAt) as string,
                                  now,
                                )
                              : '—'}
                          </TD>
                          <TD>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void inspectDelivery(delivery.eventType, delivery.correlationId)}
                              icon={<Braces aria-hidden className="size-3.5" />}
                            >
                              Inspect
                            </Button>
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </TableScroll>
                {deliveries.data && (
                  <Pagination
                    page={deliveries.data.page}
                    pageSize={deliveries.data.pageSize}
                    total={deliveries.data.total}
                    onPageChange={setDPage}
                    onPageSizeChange={() => setDPage(1)}
                  />
                )}
              </>
            )}
          </Panel>
        ) : (
          <Panel
            title="Events"
            description="Raw events emitted by the simulation, with their payload and deliveries."
            bodyClassName="p-0"
            actions={
              <ProofOpsEventLink eventType="" correlationId="" label={`Open ${proofOpsLabel} events`} />
            }
          >
            <div className="flex flex-wrap items-center gap-3 border-b border-line p-3">
              <SearchInput
                label="Search events"
                placeholder="Search by summary, correlation id or reference"
                value={eSearch}
                onValueChange={(value) => {
                  setESearch(value);
                  setEPage(1);
                }}
                className="w-full sm:w-72"
              />
              <label className="flex items-center gap-2 text-xs text-ink-secondary">
                Type
                <Select
                  value={eType}
                  onChange={(event) => {
                    setEType(event.target.value as EventType | 'all');
                    setEPage(1);
                  }}
                  className="h-9 w-48 py-0 text-xs"
                  aria-label="Filter by event type"
                >
                  <option value="all">All event types</option>
                  {eventTypes.map((type) => (
                    <option key={type} value={type}>
                      {eventTypeLabels[type]}
                    </option>
                  ))}
                </Select>
              </label>
              <span className="ml-auto text-xs text-ink-secondary" data-numeric="true">
                {events.data ? `${events.data.total} events` : 'Loading…'}
              </span>
            </div>

            {events.error ? (
              <div className="p-4">
                <ErrorState error={events.error} onRetry={() => void events.refetch()} />
              </div>
            ) : events.isPending ? (
              <div className="p-4">
                <LoadingPanel rows={6} />
              </div>
            ) : eventItems.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={<Braces aria-hidden className="size-5" />}
                  title="No events match these filters"
                  description="Events appear once the simulation records activity."
                />
              </div>
            ) : (
              <>
                <TableScroll>
                  <Table caption="Simulated events">
                    <THead>
                      <TR>
                        <TH>Type</TH>
                        <TH>Summary</TH>
                        <TH>Reference</TH>
                        <TH>Correlation</TH>
                        <TH>Occurred</TH>
                        <TH>Inspect</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {eventItems.map((event) => (
                        <TR key={event.id}>
                          <TD>{eventTypeLabels[event.type]}</TD>
                          <TD className="text-ink-secondary">{event.summary}</TD>
                          <TD>
                            {event.transactionReference ? (
                              <Link
                                to={`/transactions?search=${encodeURIComponent(event.transactionReference)}`}
                                className="font-technical text-brand hover:underline"
                              >
                                {event.transactionReference}
                              </Link>
                            ) : (
                              '—'
                            )}
                          </TD>
                          <TD>
                            <span className="font-technical text-ink-secondary" title={event.correlationId}>
                              {truncateMiddle(event.correlationId, 12, 6)}
                            </span>
                          </TD>
                          <TD
                            className="whitespace-nowrap text-ink-secondary"
                            title={event.occurredAt}
                          >
                            {formatRelativeTime(event.occurredAt, now)}
                          </TD>
                          <TD>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setOpenEventId(event.id)}
                              icon={<Braces aria-hidden className="size-3.5" />}
                            >
                              Inspect
                            </Button>
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </TableScroll>
                {events.data && (
                  <Pagination
                    page={events.data.page}
                    pageSize={events.data.pageSize}
                    total={events.data.total}
                    onPageChange={setEPage}
                    onPageSizeChange={() => setEPage(1)}
                  />
                )}
              </>
            )}
          </Panel>
        )}
      </div>

      {/* Raw event inspector ------------------------------------------- */}
      <Dialog
        open={openEventId !== null}
        onClose={() => setOpenEventId(null)}
        title="Inspect event"
        description="The event, its payload and the deliveries it produced, as reported by the source."
      >
        {inspector.error ? (
          <ErrorState error={inspector.error} onRetry={() => void inspector.refetch()} />
        ) : inspector.isPending || !inspector.data ? (
          <LoadingPanel rows={6} />
        ) : (
          <EventInspector detail={inspector.data} />
        )}
      </Dialog>
    </>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-control border px-3 py-1.5 text-sm font-medium transition-colors duration-fast ease-standard',
        active
          ? 'border-brand-line bg-brand-soft text-plum'
          : 'border-line bg-surface text-ink-secondary hover:bg-surface-muted',
      )}
    >
      {icon}
      {children}
    </button>
  );
}
