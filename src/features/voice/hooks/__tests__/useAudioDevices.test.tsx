import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAudioDevices } from '../useAudioDevices';

const getUserMedia = vi.fn();
const enumerateDevices = vi.fn();
const addEventListener = vi.fn();
const removeEventListener = vi.fn();

beforeEach(() => {
  window.localStorage.clear();
  getUserMedia.mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] });
  enumerateDevices.mockResolvedValue([
    { kind: 'audioinput', deviceId: 'mic1', label: 'Mic One' },
    { kind: 'audiooutput', deviceId: 'spk1', label: 'Speaker One' },
    { kind: 'videoinput', deviceId: 'cam1', label: 'Camera' },
  ]);
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia, enumerateDevices, addEventListener, removeEventListener },
  });
});

afterEach(() => {
  vi.clearAllMocks();
  // @ts-expect-error cleanup the stubbed field
  delete navigator.mediaDevices;
});

describe('useAudioDevices', () => {
  it('requests permission and enumerates audio devices on mount', async () => {
    const { result } = renderHook(() => useAudioDevices());
    await waitFor(() => expect(result.current.inputs.length).toBe(1));
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(result.current.inputs[0]).toEqual({ id: 'mic1', label: 'Mic One' });
    expect(result.current.outputs[0]).toEqual({ id: 'spk1', label: 'Speaker One' });
    // Defaults to the first device of each kind.
    expect(result.current.selectedInput).toBe('mic1');
    expect(result.current.selectedOutput).toBe('spk1');
  });

  it('persists a chosen input across hook instances', async () => {
    const { result, unmount } = renderHook(() => useAudioDevices());
    await waitFor(() => expect(result.current.inputs.length).toBe(1));
    act(() => result.current.chooseInput('mic1'));
    expect(window.localStorage.getItem('flex.audio.inputDeviceId')).toBe('mic1');
    unmount();

    const next = renderHook(() => useAudioDevices());
    expect(next.result.current.selectedInput).toBe('mic1');
  });
});
