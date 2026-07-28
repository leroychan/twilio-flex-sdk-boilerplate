import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/flex/accountConfig', () => ({
  fetchCallRecordingEnabled: vi.fn().mockResolvedValue(true),
}));

import { adoptVoiceCall } from '../adoptVoiceCall';
import { useFlexStore } from '@/store';
import { INITIAL_CALL } from '@/store/slices/voice';
import { getActiveVoiceCall, resetRegistry } from '@/lib/flex/registry';

// The real SDK delivers a VoiceCall wrapper whose event emitter + call
// parameters live on the nested raw voice-sdk Call (`voiceCall.call`). The
// wrapper itself exposes only control methods (mute/hold/disconnect) — no `on`.
function makeCall({ status = 'pending' }: { status?: string } = {}) {
  const listeners: Record<string, (...a: unknown[]) => void> = {};
  const raw = {
    parameters: { CallSid: 'CA9' },
    status: () => status,
    on: (e: string, cb: (...a: unknown[]) => void) => {
      listeners[e] = cb;
    },
  };
  return {
    call: raw,
    // control methods the wrapper would expose (unused here)
    mute: () => {},
    disconnect: () => {},
    emit: (e: string) => listeners[e]?.(),
  };
}

beforeEach(() => {
  resetRegistry();
  useFlexStore.setState({ call: { ...INITIAL_CALL }, token: 'tok' });
});

describe('adoptVoiceCall', () => {
  it('registers the call and seeds ringing status + callSid', () => {
    const call = makeCall();
    adoptVoiceCall(call as never);
    expect(getActiveVoiceCall()).toBe(call);
    expect(useFlexStore.getState().call.status).toBe('ringing');
    expect(useFlexStore.getState().call.callSid).toBe('CA9');
  });

  it('follows accept → connected and disconnect → reset + cleared handle', () => {
    const call = makeCall();
    adoptVoiceCall(call as never);

    call.emit('accept');
    expect(useFlexStore.getState().call.status).toBe('connected');

    call.emit('disconnect');
    expect(useFlexStore.getState().call.status).toBe('idle');
    expect(getActiveVoiceCall()).toBeUndefined();
  });

  it('seeds connected immediately when the leg was already auto-accepted', () => {
    const call = makeCall({ status: 'open' });
    adoptVoiceCall(call as never);
    expect(useFlexStore.getState().call.status).toBe('connected');
  });

  it('resets on cancel and reject (call ended before/without accept)', () => {
    for (const ending of ['cancel', 'reject'] as const) {
      resetRegistry();
      useFlexStore.setState({ call: { ...INITIAL_CALL }, token: 'tok' });
      const call = makeCall();
      adoptVoiceCall(call as never);
      call.emit(ending);
      expect(useFlexStore.getState().call.status).toBe('idle');
      expect(getActiveVoiceCall()).toBeUndefined();
    }
  });
});
