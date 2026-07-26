import type { StateCreator } from 'zustand';

/** A worker activity as mirrored from the SDK worker.activities map. */
export interface ActivityView {
  sid: string;
  name: string;
  available: boolean;
}

export interface PresenceSlice {
  activities: ActivityView[];
  currentActivitySid: string | null;
  setActivities: (activities: ActivityView[]) => void;
  setCurrentActivitySid: (activitySid: string | null) => void;
}

export const createPresenceSlice: StateCreator<PresenceSlice, [], [], PresenceSlice> = (set) => ({
  activities: [],
  currentActivitySid: null,
  setActivities: (activities) => set({ activities }),
  setCurrentActivitySid: (activitySid) => set({ currentActivitySid: activitySid }),
});
