import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mute = vi.fn();
const sendDigits = vi.fn();
vi.mock('../../lib/device', () => ({ getVoiceDevice: () => ({ mute, sendDigits }) }));
const endCallForAll = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/flex/actions/Voice', () => ({
  endCallForAll: (...a: unknown[]) => endCallForAll(...a),
  holdParticipant: vi.fn().mockResolvedValue(undefined),
  unholdParticipant: vi.fn().mockResolvedValue(undefined),
}));
import { useFlexStore } from '@/store';
import { INITIAL_CALL } from '@/store/slices/voice';
import { useVoiceControls } from '../useVoiceControls';

beforeEach(() => {
  mute.mockClear(); sendDigits.mockClear(); endCallForAll.mockClear();
  useFlexStore.setState({ call: { ...INITIAL_CALL, status: 'connected', taskSid: 'WT1', callSid: 'CA1', muted: false } });
});

describe('useVoiceControls', () => {
  it('toggleMute mutes the device and updates the store', () => {
    const { result } = renderHook(() => useVoiceControls());
    act(() => result.current.toggleMute());
    expect(mute).toHaveBeenCalledWith(true);
    expect(useFlexStore.getState().call.muted).toBe(true);
  });

  it('sendDigit forwards DTMF to the device', () => {
    const { result } = renderHook(() => useVoiceControls());
    act(() => result.current.sendDigit('5'));
    expect(sendDigits).toHaveBeenCalledWith('5');
  });

  it('endForAll calls the SDK', async () => {
    const { result } = renderHook(() => useVoiceControls());
    await act(async () => { await result.current.endForAll(); });
    expect(endCallForAll).toHaveBeenCalledWith('WT1');
  });
});
