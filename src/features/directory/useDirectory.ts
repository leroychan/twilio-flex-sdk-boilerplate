'use client';
import { useEffect, useState } from 'react';
import {
  fetchTaskQueuesList,
  fetchWorkersList,
  type QueueInfo,
  type WorkerDirectoryInfo,
} from '@/lib/flex/workspace';

export interface Directory {
  queues: QueueInfo[];
  workers: WorkerDirectoryInfo[];
}

// Reference data (queues + workers) changes rarely, so it's fetched once and
// shared across every transfer picker via a module-level cache. A single in-flight
// promise dedupes concurrent first-mounts.
let cache: Directory | null = null;
let inflight: Promise<Directory> | null = null;

export function resetDirectoryCache(): void {
  cache = null;
  inflight = null;
}

/** Load queues + workers once, cached. `loading` is true only until the first load resolves. */
export function useDirectory(): Directory & { loading: boolean } {
  const [directory, setDirectory] = useState<Directory>(cache ?? { queues: [], workers: [] });
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    if (cache) {
      setDirectory(cache);
      setLoading(false);
      return;
    }
    let cancelled = false;
    inflight ??= Promise.all([fetchTaskQueuesList(), fetchWorkersList()]).then(
      ([queues, workers]) => {
        cache = { queues, workers };
        return cache;
      },
    );
    void inflight.then((data) => {
      if (cancelled) return;
      setDirectory(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { ...directory, loading };
}
