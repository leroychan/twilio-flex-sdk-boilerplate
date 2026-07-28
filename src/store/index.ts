import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createSessionSlice, type SessionSlice } from './slices/session';
import { createPresenceSlice, type PresenceSlice } from './slices/presence';
import { createTasksSlice, type TasksSlice } from './slices/tasks';
import { createVoiceSlice, type VoiceSlice } from './slices/voice';
import { createConversationsSlice, type ConversationsSlice } from './slices/conversations';
import { createSupervisorSlice, type SupervisorSlice } from './slices/supervisor';
import { createSettingsSlice, type SettingsSlice } from './slices/settings';

// Composition pattern — each feature part contributes one slice:
//   1. Add `& <Name>Slice` to FlexStore below.
//   2. Spread `...create<Name>Slice(...a)` into the initializer.
// Slice creators are typed `StateCreator<TSlice, [], [], TSlice>`.
export type FlexStore = SessionSlice &
  PresenceSlice &
  TasksSlice &
  VoiceSlice &
  ConversationsSlice &
  SupervisorSlice &
  SettingsSlice;

export const useFlexStore = create<FlexStore>()(
  persist(
    (...a) => ({
      ...createSessionSlice(...a),
      ...createPresenceSlice(...a),
      ...createTasksSlice(...a),
      ...createVoiceSlice(...a),
      ...createConversationsSlice(...a),
      ...createSupervisorSlice(...a),
      ...createSettingsSlice(...a),
    }),
    {
      name: 'flex-session',
      storage: createJSONStorage(() => localStorage),
      // Persist the token and transcription settings. `worker` is a live
      // non-serializable SDK object and must not be persisted.
      partialize: (state) => ({ token: state.token, transcription: state.transcription }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
