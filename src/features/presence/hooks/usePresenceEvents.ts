'use client';

import { useEffect } from 'react';
import { useFlexStore } from '@/store';
import { subscribePresence, type PresenceWorkerLike } from '../events';

/**
 * Mounts the presence event bridge once the SDK worker is available: seeds the
 * activity list into the store and keeps `currentActivitySid` in sync with the
 * worker's `activityUpdated` event. Without this, the ActivitySelector stays
 * empty and the agent can never move to an Available activity — so TaskRouter
 * never routes tasks to them. No-ops until a worker exists (stub/demo, tests).
 */
export function usePresenceEvents(): void {
  const worker = useFlexStore((s) => s.worker);

  useEffect(() => {
    if (!worker) return;
    return subscribePresence(worker as unknown as PresenceWorkerLike);
  }, [worker]);
}
