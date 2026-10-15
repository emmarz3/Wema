import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, isSimulated, observeRuns } from '../api';
import { queryKeys } from '../state/queryClient';
import type { ScenarioRun } from '../types/domain';

/**
 * Scenario data hooks. Runs progress on the source's own clock, so the run
 * detail is polled while `inProgress` is true — the interface never marks a
 * scenario successful on its own.
 */
export function useScenarioCatalogue() {
  return useQuery({
    queryKey: queryKeys.scenarios.catalogue,
    queryFn: () => api.scenarioCatalogue(),
    staleTime: 60_000,
  });
}

export function useScenarioHistory() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.scenarios.history,
    queryFn: () => api.scenarioHistory(),
    staleTime: 3_000,
    refetchInterval: 5_000,
  });

  // Runtime runs invalidate the history as they start and finish.
  useEffect(() => {
    if (!isSimulated) return;
    return observeRuns(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scenarios.history });
    });
  }, [queryClient]);

  return query;
}

export function useScenarioRun(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.scenarios.detail(id ?? ''),
    queryFn: () => api.scenarioRunDetail(id as string),
    enabled: Boolean(id),
    staleTime: 1_000,
    refetchInterval: (query) => (query.state.data?.inProgress ? 900 : false),
  });
}

export type { ScenarioRun };
