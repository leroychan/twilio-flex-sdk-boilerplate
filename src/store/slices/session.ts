import type { StateCreator } from 'zustand';
import type { Worker } from '@twilio/flex-sdk/taskrouter';
import type { ConnectionState } from '@/lib/flex/types';

export interface SessionSlice {
  token: string | null;
  worker: Worker | null;
  connectionState: ConnectionState;
  /** True once the persist middleware has rehydrated from storage. */
  hasHydrated: boolean;
  setToken: (token: string | null) => void;
  setWorker: (worker: Worker | null) => void;
  setConnectionState: (state: ConnectionState) => void;
  setHasHydrated: (v: boolean) => void;
}

export const createSessionSlice: StateCreator<SessionSlice, [], [], SessionSlice> = (set) => ({
  token: null,
  worker: null,
  connectionState: 'disconnected',
  hasHydrated: false,
  setToken: (token) => set({ token }),
  setWorker: (worker) => set({ worker }),
  setConnectionState: (connectionState) => set({ connectionState }),
  setHasHydrated: (hasHydrated) => set({ hasHydrated }),
});
