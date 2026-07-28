import type { StateCreator } from 'zustand';
import type { Worker } from '@twilio/flex-sdk/taskrouter';
import type { ConnectionState } from '@/lib/flex/types';

export interface SessionSlice {
  token: string | null;
  /**
   * The username/identity used to mint the current token. Persisted alongside
   * the token so the custom-token refresh loop can replay the mint after the
   * proactive timer fires (or after a page reload restores the session).
   */
  identity: string | null;
  worker: Worker | null;
  connectionState: ConnectionState;
  /** True once the persist middleware has rehydrated from storage. */
  hasHydrated: boolean;
  setToken: (token: string | null) => void;
  setIdentity: (identity: string | null) => void;
  setWorker: (worker: Worker | null) => void;
  setConnectionState: (state: ConnectionState) => void;
  setHasHydrated: (v: boolean) => void;
}

export const createSessionSlice: StateCreator<SessionSlice, [], [], SessionSlice> = (set) => ({
  token: null,
  identity: null,
  worker: null,
  connectionState: 'disconnected',
  hasHydrated: false,
  setToken: (token) => set({ token }),
  setIdentity: (identity) => set({ identity }),
  setWorker: (worker) => set({ worker }),
  setConnectionState: (connectionState) => set({ connectionState }),
  setHasHydrated: (hasHydrated) => set({ hasHydrated }),
});
