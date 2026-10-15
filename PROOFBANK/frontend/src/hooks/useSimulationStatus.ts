import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, isSimulated, observeSimulationStatus } from '../api';
import { queryKeys } from '../state/queryClient';

/**
 * Reads the simulation status from the data source.
 *
 * The interface only renders what the source reports — heartbeat, cadence,
 * mode and state are never computed or advanced by the UI. When the
 * simulated source is active it notifies this hook directly, so control
 * actions and heartbeat ticks are reflected without hammering the transport.
 */
export function useSimulationStatus() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.simulationStatus,
    queryFn: () => api.simulationStatus(),
    staleTime: 2_000,
    refetchInterval: 5_000,
  });

  useEffect(() => {
    if (!isSimulated) return;
    return observeSimulationStatus(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.simulationStatus });
    });
  }, [queryClient]);

  return query;
}

/** Control-action history recorded by the simulation. */
export function useSimulationHistory() {
  return useQuery({
    queryKey: queryKeys.simulationHistory,
    queryFn: () => api.simulationHistory(),
    staleTime: 3_000,
  });
}

/** Errors the simulation recorded while running. */
export function useSimulationErrors() {
  return useQuery({
    queryKey: queryKeys.simulationErrors,
    queryFn: () => api.simulationErrors(),
    staleTime: 3_000,
    refetchInterval: 10_000,
  });
}

/** Recent events emitted by the simulation itself (heartbeats, scenarios). */
export function useSimulationRecentEvents(limit = 12) {
  return useQuery({
    queryKey: ['simulation', 'recent-events', limit] as const,
    queryFn: async () => {
      const events = await api.recentEvents(limit);
      return events.filter((event) => event.type.startsWith('simulation.'));
    },
    staleTime: 3_000,
    refetchInterval: 8_000,
  });
}

/** A clock that re-renders on an interval (for relative timestamps). */
export function useNow(intervalMs = 10_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
