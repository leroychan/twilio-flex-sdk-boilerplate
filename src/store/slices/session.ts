import type { StateCreator } from 'zustand';
import type { Worker } from '@twilio/flex-sdk/taskrouter';
import type { ConnectionState } from '@/lib/flex/types';

export interface SessionSlice {
  token: string | null;
  worker: Worker | null;
  connectionState: ConnectionState;
  setToken: (token: string | null) => void;
  setWorker: (worker: Worker | null) => void;
  setConnectionState: (state: ConnectionState) => void;
}

export const createSessionSlice: StateCreator<SessionSlice, [], [], SessionSlice> = (set) => ({
  token: null,
  worker: null,
  connectionState: 'disconnected',
  setToken: (token) => set({ token }),
  setWorker: (worker) => set({ worker }),
  setConnectionState: (connectionState) => set({ connectionState }),
});
