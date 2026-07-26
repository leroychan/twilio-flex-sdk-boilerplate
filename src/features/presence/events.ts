import { useFlexStore } from '@/store';
import type { PresenceSlice } from '@/store/slices/presence';

export interface ActivityLike {
  sid: string;
  name: string;
  available: boolean;
}

export interface PresenceWorkerLike {
  activities: Map<string, ActivityLike>;
  activity: { sid: string } | null;
  on: (event: 'activityUpdated', listener: () => void) => void;
  off: (event: 'activityUpdated', listener: () => void) => void;
}

type PresenceStore = {
  getState: () => Pick<PresenceSlice, 'setActivities' | 'setCurrentActivitySid'>;
};

/**
 * Seeds presence state from the worker and keeps `currentActivitySid` in sync
 * with the SDK `activityUpdated` event. Returns an unsubscribe function.
 */
export function subscribePresence(
  worker: PresenceWorkerLike,
  store: PresenceStore = useFlexStore,
): () => void {
  const { setActivities, setCurrentActivitySid } = store.getState();

  setActivities(
    Array.from(worker.activities.values()).map((a) => ({
      sid: a.sid,
      name: a.name,
      available: a.available,
    })),
  );
  setCurrentActivitySid(worker.activity?.sid ?? null);

  const onActivityUpdated = () => {
    store.getState().setCurrentActivitySid(worker.activity?.sid ?? null);
  };
  worker.on('activityUpdated', onActivityUpdated);

  return () => worker.off('activityUpdated', onActivityUpdated);
}
