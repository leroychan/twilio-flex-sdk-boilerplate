'use client';

import { useCallback, useEffect, useState } from 'react';

export interface QueueStatRow {
  sid: string;
  friendlyName: string;
  waiting: number;
  active: number;
  longestWaitAge: number;
  availableWorkers: number;
  eligibleWorkers: number;
  avgWaitAccepted: number;
}

export interface QueueStatsState {
  configured: boolean;
  loading: boolean;
  error: boolean;
  updatedAt: string | null;
  queues: QueueStatRow[];
}

const DEFAULT_POLL_MS = 30_000;

/** Polls /api/queue-stats. configured=false is a first-class (non-error) state. */
export function useQueueStats(pollMs: number = DEFAULT_POLL_MS): QueueStatsState {
  const [state, setState] = useState<QueueStatsState>({
    configured: true,
    loading: true,
    error: false,
    updatedAt: null,
    queues: [],
  });

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/queue-stats');
      if (!res.ok) {
        setState((s) => ({ ...s, loading: false, error: true }));
        return;
      }
      const data = await res.json();
      if (data.configured === false) {
        setState({ configured: false, loading: false, error: false, updatedAt: null, queues: [] });
        return;
      }
      setState({
        configured: true,
        loading: false,
        error: false,
        updatedAt: data.updatedAt ?? null,
        queues: data.queues ?? [],
      });
    } catch {
      setState((s) => ({ ...s, loading: false, error: true }));
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), pollMs);
    return () => clearInterval(id);
  }, [load, pollMs]);

  return state;
}
