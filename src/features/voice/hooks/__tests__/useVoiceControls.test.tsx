import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const endCallForAll = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/flex/actions/Voice', () => ({
  endCallForAll: (...a: unknown[]) => endCallForAll(...a),
  holdParticipant: vi.fn().mockResolvedValue(undefined),
  unholdParticipant: vi.fn().mockResolvedValue(undefined),
  kickParticipant: vi.fn().mockResolvedValue(undefined),
  addExternalParticipant: vi.fn().mockResolvedValue(undefined),
}));
// Mute/DTMF/recording all operate on the live VoiceCall handle (from the registry).
const mute = vi.fn();
const unmute = vi.fn();
const sendDigits = vi.fn();
const hold = vi.fn().mockResolvedValue(undefined);
const unhold = vi.fn().mockResolvedValue(undefined);
const pauseRecording = vi.fn().mockResolvedValue(undefined);
const resumeRecording = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/flex/registry', () => ({
  getActiveVoiceCall: () => ({
    mute,
    unmute,
    hold,
    unhold,
    call: { sendDigits },
    pauseRecording,
    resumeRecording,
  }),
}));
import { useFlexStore } from '@/store';
import { INITIAL_CALL } from '@/store/slices/voice';
import { useVoiceControls } from '../useVoiceControls';

beforeEach(() => {
  mute.mockClear(); unmute.mockClear(); sendDigits.mockClear(); endCallForAll.mockClear();
  hold.mockClear(); unhold.mockClear();
  useFlexStore.setState({ call: { ...INITIAL_CALL, status: 'connected', taskSid: 'WT1', callSid: 'CA1', muted: false } });
});

describe('useVoiceControls', () => {
  it('toggleMute mutes the live call and updates the store', () => {
    const { result } = renderHook(() => useVoiceControls());
    act(() => result.current.toggleMute());
    expect(mute).toHaveBeenCalledOnce();
    expect(useFlexStore.getState().call.muted).toBe(true);
  });

  it('toggleMute unmutes when already muted', () => {
    useFlexStore.setState({ call: { ...INITIAL_CALL, status: 'connected', taskSid: 'WT1', muted: true } });
    const { result } = renderHook(() => useVoiceControls());
    act(() => result.current.toggleMute());
    expect(unmute).toHaveBeenCalledOnce();
    expect(useFlexStore.getState().call.muted).toBe(false);
  });

  it('toggleHold holds the live call and marks it on hold', async () => {
    const { result } = renderHook(() => useVoiceControls());
    await act(async () => { await result.current.toggleHold(); });
    expect(hold).toHaveBeenCalledOnce();
    expect(unhold).not.toHaveBeenCalled();
    expect(useFlexStore.getState().call.status).toBe('onHold');
  });

  it('toggleHold resumes when the call is already on hold', async () => {
    useFlexStore.setState({ call: { ...INITIAL_CALL, status: 'onHold', taskSid: 'WT1' } });
    const { result } = renderHook(() => useVoiceControls());
    await act(async () => { await result.current.toggleHold(); });
    expect(unhold).toHaveBeenCalledOnce();
    expect(hold).not.toHaveBeenCalled();
    expect(useFlexStore.getState().call.status).toBe('connected');
  });

  it('sendDigit forwards DTMF to the live call', () => {
    const { result } = renderHook(() => useVoiceControls());
    act(() => result.current.sendDigit('5'));
    expect(sendDigits).toHaveBeenCalledWith('5');
  });

  it('endForAll calls the SDK', async () => {
    const { result } = renderHook(() => useVoiceControls());
    await act(async () => { await result.current.endForAll(); });
    expect(endCallForAll).toHaveBeenCalledWith('WT1');
  });

  it('toggleRecording pauses when recording, resuming otherwise', async () => {
    pauseRecording.mockClear();
    resumeRecording.mockClear();
    const { result } = renderHook(() => useVoiceControls());
    await act(async () => { await result.current.toggleRecording(); });
    expect(pauseRecording).toHaveBeenCalledWith('silence');
    expect(useFlexStore.getState().call.recordingPaused).toBe(true);

    await act(async () => { await result.current.toggleRecording(); });
    expect(resumeRecording).toHaveBeenCalledOnce();
    expect(useFlexStore.getState().call.recordingPaused).toBe(false);
  });
});
