import type { DeliveryQuery, Page, WebhookDelivery } from '../../types/domain';
import type { SimulatedWorld } from './data';

/**
 * Webhook delivery reads. Delivery state is deliberately separate from
 * transaction state: a failed delivery here says nothing about whether the
 * underlying transaction succeeded. The source owns every field.
 */

function matches(delivery: WebhookDelivery, term: string): boolean {
  const haystack = [
    delivery.id,
    delivery.destination,
    delivery.correlationId,
    delivery.eventType,
    delivery.error ?? '',
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(term);
}

export function listDeliveries(
  world: SimulatedWorld,
  query: DeliveryQuery,
): Page<WebhookDelivery> {
  const term = query.search?.trim().toLowerCase() ?? '';
  let items = world.deliveries.filter((delivery) => {
    if (query.status && query.status !== 'all' && delivery.status !== query.status) {
      return false;
    }
    if (query.eventType && query.eventType !== 'all' && delivery.eventType !== query.eventType) {
      return false;
    }
    const stampedAt = delivery.lastAttemptAt ?? delivery.firstAttemptAt;
    if (query.from && stampedAt && stampedAt < query.from) return false;
    if (query.to && stampedAt && stampedAt > query.to) return false;
    if (term && !matches(delivery, term)) return false;
    return true;
  });

  items = items.sort((a, b) => {
    const aAt = a.lastAttemptAt ?? a.firstAttemptAt ?? '';
    const bAt = b.lastAttemptAt ?? b.firstAttemptAt ?? '';
    const cmp = aAt.localeCompare(bAt);
    return query.direction === 'asc' ? cmp : -cmp;
  });

  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.max(1, query.pageSize ?? 15);
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
}
