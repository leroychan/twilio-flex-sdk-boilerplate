import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createSessionSlice, type SessionSlice } from './slices/session';
import { createPresenceSlice, type PresenceSlice } from './slices/presence';
import { createTasksSlice, type TasksSlice } from './slices/tasks';
import { createVoiceSlice, type VoiceSlice } from './slices/voice';
import { createConversationsSlice, type ConversationsSlice } from './slices/conversations';
import { createSupervisorSlice, type SupervisorSlice } from './slices/supervisor';
import {
  createSettingsSlice,
  DEFAULT_TRANSCRIPTION_SETTINGS,
  type SettingsSlice,
} from './slices/settings';

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
      // v1: default engine→deepgram, speechModel→nova-3. Reset any persisted
      // transcription settings so stale combos (e.g. deepgram + 'telephony',
      // which Twilio rejects) don't survive in a returning browser.
      version: 1,
      migrate: (persisted) => {
        const p = (persisted ?? {}) as Partial<FlexStore>;
        return { ...p, transcription: { ...DEFAULT_TRANSCRIPTION_SETTINGS } };
      },
      // Persist the token, its minting identity, and transcription settings.
      // `identity` is needed so the custom-token refresh loop can re-mint after
      // a reload. `worker` is a live non-serializable SDK object and must not
      // be persisted.
      partialize: (state) => ({
        token: state.token,
        identity: state.identity,
        transcription: state.transcription,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
