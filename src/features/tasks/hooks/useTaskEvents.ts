'use client';

import { useEffect } from 'react';
import { useFlexStore } from '@/store';
import { subscribeReservations, type TasksWorkerLike } from '../events';

/**
 * Mounts the reservation event bridge once the SDK worker is available: mirrors
 * the worker's existing reservations into the store and listens for
 * `reservationCreated` so incoming tasks appear in the TaskList in real time.
 * Without this, TaskList renders an empty store no matter what TaskRouter routes.
 * No-ops until a worker exists (stub/demo, tests).
 */
export function useTaskEvents(): void {
  const worker = useFlexStore((s) => s.worker);

  useEffect(() => {
    if (!worker) return;
    return subscribeReservations(worker as unknown as TasksWorkerLike);
  }, [worker]);
}
