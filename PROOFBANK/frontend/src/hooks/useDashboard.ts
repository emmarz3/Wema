import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { queryKeys } from '../state/queryClient';
import type { DashboardRange } from '../types/domain';

/**
 * Dashboard data hooks. The interface renders exactly what the data source
 * reports and refreshes on a visible cadence (polling, because no
 * server-push transport exists); it never derives or invents values.
 */
export function useDashboardSummary(range: DashboardRange) {
  return useQuery({
    queryKey: queryKeys.dashboard.summary(range),
    queryFn: () => api.dashboardSummary(range),
    staleTime: 15_000,
    refetchInterval: 20_000,
  });
}

export function useRecentTransactions(limit = 8) {
  return useQuery({
    queryKey: queryKeys.recents.transactions,
    queryFn: () => api.recentTransactions(limit),
    staleTime: 8_000,
    refetchInterval: 12_000,
  });
}

export function useRecentEvents(limit = 8) {
  return useQuery({
    queryKey: queryKeys.recents.events,
    queryFn: () => api.recentEvents(limit),
    staleTime: 8_000,
    refetchInterval: 12_000,
  });
}

export function useRecentScenarioExecutions(limit = 6) {
  return useQuery({
    queryKey: queryKeys.recents.scenarioExecutions,
    queryFn: () => api.recentScenarioExecutions(limit),
    staleTime: 8_000,
    refetchInterval: 12_000,
  });
}

export function useRecentDeliveries(limit = 8) {
  return useQuery({
    queryKey: queryKeys.recents.deliveries,
    queryFn: () => api.recentDeliveries(limit),
    staleTime: 8_000,
    refetchInterval: 12_000,
  });
}

export function useInfrastructureHealth() {
  return useQuery({
    queryKey: queryKeys.infrastructure.health,
    queryFn: () => api.infrastructureHealth(),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}
