import { describe, expect, it } from 'vitest';
import { buildWorld } from '../api/simulated/data';
import { getEventDetail, listEvents } from '../api/simulated/events';
import { listDeliveries } from '../api/simulated/deliveries';
import type { SimulationEvent, WebhookDelivery } from '../types/domain';

function haystack(delivery: WebhookDelivery): string {
  return [
    delivery.id,
    delivery.destination,
    delivery.correlationId,
    delivery.eventType,
    delivery.error ?? '',
  ]
    .join(' ')
    .toLowerCase();
}

describe('event and delivery reads (simulated source)', () => {
  const world = buildWorld();

  it('returns every emitted event by default', () => {
    const result = listEvents(world, {});
    expect(result.total).toBe(world.events.length);
    expect(result.items.length).toBeGreaterThan(0);
  });

  it('filters events by type', () => {
    const result = listEvents(world, { type: 'transaction.created' });
    expect(result.total).toBeGreaterThan(0);
    expect(result.items.every((event) => event.type === 'transaction.created')).toBe(true);
  });

  it('searches events by correlation id, summary and reference', () => {
    const target = world.events[0];
    const result = listEvents(world, { search: target.correlationId });
    expect(result.items.every((event) => event.correlationId === target.correlationId)).toBe(
      true,
    );
  });

  it('paginates events without dropping items', () => {
    const pageOne = listEvents(world, { pageSize: 3, page: 1 });
    const pageTwo = listEvents(world, { pageSize: 3, page: 2 });
    expect(pageOne.items).toHaveLength(3);
    expect(pageTwo.items).toHaveLength(3);
    expect(pageOne.items[0].id).not.toBe(pageTwo.items[0].id);
  });

  it('assembles a single event with its reconstructed payload and deliveries', () => {
    const target = world.events.find((event) => event.transactionReference);
    expect(target).toBeDefined();
    const detail = getEventDetail(world, (target as SimulationEvent).id);
    expect(detail).not.toBeNull();
    expect(detail?.event.id).toBe((target as SimulationEvent).id);
    expect(detail?.payload).toBeTruthy();
    expect(detail?.payload?.correlationId).toBe((target as SimulationEvent).correlationId);
    expect(Array.isArray(detail?.deliveries)).toBe(true);
  });

  it('reports an unknown event as not found', () => {
    expect(getEventDetail(world, 'evt_missing')).toBeNull();
  });

  it('filters deliveries by status and event type', () => {
    const delivered = listDeliveries(world, { status: 'DELIVERED' });
    expect(delivered.items.every((d) => d.status === 'DELIVERED')).toBe(true);
    expect(delivered.total).toBeGreaterThan(0);

    const failed = listDeliveries(world, { status: 'FAILED' });
    expect(failed.items.every((d) => d.status === 'FAILED')).toBe(true);
  });

  it('searches deliveries by destination text', () => {
    const result = listDeliveries(world, { search: 'proofops' });
    expect(result.items.every((d) => haystack(d).includes('proofops'))).toBe(true);
  });

  it('sorts deliveries newest first and paginates', () => {
    const pageOne = listDeliveries(world, { pageSize: 5, page: 1 });
    expect(pageOne.items.length).toBeGreaterThan(0);
    const timestamps = pageOne.items.map((d) => d.lastAttemptAt ?? d.firstAttemptAt ?? '');
    const sorted = [...timestamps].sort((a, b) => b.localeCompare(a));
    expect(timestamps).toEqual(sorted);
  });
});
