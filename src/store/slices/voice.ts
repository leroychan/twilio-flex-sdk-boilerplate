import type { StateCreator } from 'zustand';

export type CallStatus = 'idle' | 'ringing' | 'connected' | 'onHold' | 'ended';
export interface VoiceParticipant { sid: string; label: string; onHold: boolean; isExternal: boolean }
export interface CallState {
  taskSid: string | null;
  callSid: string | null;
  /** The remote party — caller number (inbound) or dialed number (outbound). */
  from: string | null;
  status: CallStatus;
  muted: boolean;
  startedAt: number | null;
  participants: VoiceParticipant[];
  recordingEnabled: boolean;
  recordingPaused: boolean;
}

export const INITIAL_CALL: CallState = {
  taskSid: null, callSid: null, from: null, status: 'idle', muted: false, startedAt: null,
  participants: [], recordingEnabled: false, recordingPaused: false,
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
