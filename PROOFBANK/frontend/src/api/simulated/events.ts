import type {
  EventDetail,
  EventQuery,
  Page,
  SimulationEvent,
} from '../../types/domain';
import type { SimulatedWorld } from './data';

/**
 * Event log reads. The event stream is owned by the simulation; this module
 * only filters, sorts and paginates the records the source has emitted, and
 * assembles the inspection payload for a single event.
 */

function matches(event: SimulationEvent, term: string): boolean {
  const haystack = [
    event.id,
    event.type,
    event.summary,
    event.correlationId,
    event.transactionReference ?? '',
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(term);
}

export function listEvents(world: SimulatedWorld, query: EventQuery): Page<SimulationEvent> {
  const term = query.search?.trim().toLowerCase() ?? '';
  let items = world.events.filter((event) => {
    if (query.type && query.type !== 'all' && event.type !== query.type) return false;
    if (query.correlationId && event.correlationId !== query.correlationId) return false;
    if (query.from && event.occurredAt < query.from) return false;
    if (query.to && event.occurredAt > query.to) return false;
    if (term && !matches(event, term)) return false;
    return true;
  });

  items = items.sort((a, b) => {
    const cmp = a.occurredAt.localeCompare(b.occurredAt);
    return query.direction === 'asc' ? cmp : -cmp;
  });

  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.max(1, query.pageSize ?? 15);
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
}

/**
 * Reconstruct the payload a destination would receive for an event. The
 * simulated source does not persist a wire body, so the payload is assembled
 * from the stored event plus any correlated transaction — this is exactly
 * what the simulated destination is given.
 */
function reconstructPayload(world: SimulatedWorld, event: SimulationEvent) {
  const transaction = event.transactionReference
    ? world.transactions.find((item) => item.reference === event.transactionReference)
    : undefined;
  const payload: Record<string, unknown> = {
    id: event.id,
    type: event.type,
    occurredAt: event.occurredAt,
    correlationId: event.correlationId,
    transactionReference: event.transactionReference,
    summary: event.summary,
  };
  if (transaction) {
    payload.transaction = {
      id: transaction.id,
      reference: transaction.reference,
      type: transaction.type,
      status: transaction.status,
      amount: transaction.amount,
      sourceAccountId: transaction.sourceAccountId,
      destinationAccountId: transaction.destinationAccountId,
      scenarioName: transaction.scenarioName,
    };
  }
  return payload;
}

export function getEventDetail(world: SimulatedWorld, id: string): EventDetail | null {
  const event = world.events.find((item) => item.id === id);
  if (!event) return null;
  // Deliveries are correlated by event type and correlation id; the source
  // does not store a per-event delivery id.
  const deliveries = world.deliveries.filter(
    (delivery) =>
      delivery.correlationId === event.correlationId && delivery.eventType === event.type,
  );
  return { event, payload: reconstructPayload(world, event), deliveries };
}
