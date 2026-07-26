import { describe, it, expect, beforeEach } from 'vitest';
import { create } from 'zustand';
import { createVoiceSlice, INITIAL_CALL, type VoiceSlice } from '../voice';

const useTest = create<VoiceSlice>()((...a) => ({ ...createVoiceSlice(...a) }));

beforeEach(() => useTest.setState({ call: { ...INITIAL_CALL } }));

describe('voiceSlice', () => {
  it('patches call state', () => {
    useTest.getState().setCall({ status: 'connected', callSid: 'CA1', taskSid: 'WT1' });
    expect(useTest.getState().call.status).toBe('connected');
    expect(useTest.getState().call.callSid).toBe('CA1');
  });

  it('toggles mute', () => {
    useTest.getState().setMuted(true);
    expect(useTest.getState().call.muted).toBe(true);
  });

  it('resets to idle', () => {
    useTest.getState().setCall({ status: 'connected' });
    useTest.getState().resetCall();
    expect(useTest.getState().call.status).toBe('idle');
  });

  it('stores participants', () => {
    useTest.getState().setParticipants([{ sid: 'PA1', label: 'Customer', onHold: false, isExternal: false }]);
    expect(useTest.getState().call.participants).toHaveLength(1);
  });
});
