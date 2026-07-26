import type { StateCreator } from 'zustand';

export type CallStatus = 'idle' | 'ringing' | 'connected' | 'onHold' | 'ended';
export interface VoiceParticipant { sid: string; label: string; onHold: boolean; isExternal: boolean }
export interface CallState {
  taskSid: string | null;
  callSid: string | null;
  status: CallStatus;
  muted: boolean;
  startedAt: number | null;
  participants: VoiceParticipant[];
}

export const INITIAL_CALL: CallState = {
  taskSid: null, callSid: null, status: 'idle', muted: false, startedAt: null, participants: [],
};

export interface VoiceSlice {
  call: CallState;
  setCall(patch: Partial<CallState>): void;
  resetCall(): void;
  setParticipants(p: VoiceParticipant[]): void;
  setMuted(m: boolean): void;
}

export const createVoiceSlice: StateCreator<VoiceSlice, [], [], VoiceSlice> = (set) => ({
  call: { ...INITIAL_CALL },
  setCall: (patch) => set((s) => ({ call: { ...s.call, ...patch } })),
  resetCall: () => set({ call: { ...INITIAL_CALL } }),
  setParticipants: (participants) => set((s) => ({ call: { ...s.call, participants } })),
  setMuted: (muted) => set((s) => ({ call: { ...s.call, muted } })),
});
