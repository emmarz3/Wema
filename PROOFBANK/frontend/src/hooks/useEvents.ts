import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { queryKeys } from '../state/queryClient';
import type { DeliveryQuery, EventQuery } from '../types/domain';

/**
 * Event and delivery data hooks. The event stream and delivery attempts are
 * owned by the data source; these hooks only render what it returns and keep
 * the workspace feeling live on a gentle interval.
 */
export function useEvents(query: EventQuery) {
  return useQuery({
    queryKey: queryKeys.events.list(query),
    queryFn: () => api.eventsList(query),
    staleTime: 4_000,
    refetchInterval: 8_000,
  });
}

export function useEventDetail(id: string | null) {
  return useQuery({
    queryKey: queryKeys.events.detail(id ?? ''),
    queryFn: () => api.eventDetail(id as string),
    enabled: Boolean(id),
    staleTime: 10_000,
  });
}

export function useDeliveries(query: DeliveryQuery) {
  return useQuery({
    queryKey: queryKeys.deliveries.list(query),
    queryFn: () => api.deliveriesList(query),
    staleTime: 4_000,
    refetchInterval: 8_000,
  });
}

/** Current provider services and incidents, as reported by the source. */
export function useInfrastructure() {
  return useQuery({
    queryKey: queryKeys.infrastructure.health,
    queryFn: () => api.infrastructureHealth(),
    staleTime: 8_000,
    refetchInterval: 15_000,
  });
}
