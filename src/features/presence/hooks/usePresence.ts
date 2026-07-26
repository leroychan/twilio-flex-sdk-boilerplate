import { useCallback } from 'react';
import { useFlexStore } from '@/store';
import type { ActivityView, PresenceSlice } from '@/store/slices/presence';
import { setCurrentActivity } from '@/lib/flex/actions/Worker';

export interface UsePresenceResult {
  activities: ActivityView[];
  currentActivitySid: string | null;
  changeActivity: (activitySid: string) => Promise<void>;
}

export function usePresence(): UsePresenceResult {
  const activities = useFlexStore((s: PresenceSlice) => s.activities);
  const currentActivitySid = useFlexStore((s: PresenceSlice) => s.currentActivitySid);

  const changeActivity = useCallback(
    (activitySid: string) => setCurrentActivity(activitySid),
    [],
  );

  return { activities, currentActivitySid, changeActivity };
}
