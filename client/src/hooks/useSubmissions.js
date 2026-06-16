import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchEvents, fetchStats, retryEvent, simulateSubmission } from '../services/api';

export function useSubmissions(page = 1) {
  return useQuery({
    queryKey: ['submissions', page],
    queryFn: () => fetchEvents(page),
    refetchInterval: 5_000, // poll every 5 s so processing → success transitions appear live
  });
}

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: fetchStats,
    refetchInterval: 5_000,
  });
}

export function useRetryEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: retryEvent,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['submissions'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useSimulate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: simulateSubmission,
    onSuccess: () => {
      // Give the fanout ~2 s head start before the dashboard refetches
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ['submissions'] });
        qc.invalidateQueries({ queryKey: ['stats'] });
      }, 2000);
    },
  });
}
