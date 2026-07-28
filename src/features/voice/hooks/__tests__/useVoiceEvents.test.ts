import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const getFlexClient = vi.fn();
const execute = vi.fn();
vi.mock('@/lib/flex/client', () => ({ getFlexClient: () => getFlexClient() }));
vi.mock('@/lib/flex/accountConfig', () => ({ fetchCallRecordingEnabled: vi.fn().mockResolvedValue(false) }));
vi.mock('@twilio/flex-sdk/actions/Voice', () => ({
  AddVoiceEventListener: class {
    constructor(
      public name: string,
      public listener: unknown,
    ) {}
  },
}));
import { useVoiceEvents } from '../useVoiceEvents';
import { useFlexStore } from '@/store';

beforeEach(() => {
  getFlexClient.mockReset();
  execute.mockReset().mockResolvedValue({ unsubscribe: () => {} });
  useFlexStore.setState({ worker: null, token: null });
});

describe('useVoiceEvents', () => {
  it('registers the incoming voice event once the worker is available', () => {
    getFlexClient.mockReturnValue({ execute });
    useFlexStore.setState({ worker: { sid: 'WK1' } as never });
    renderHook(() => useVoiceEvents());
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('does not register until the worker lands, then registers (client-readiness race)', () => {
    getFlexClient.mockReturnValue({ execute });
    // Worker not yet set — the SDK client init is still in flight.
    renderHook(() => useVoiceEvents());
    expect(execute).not.toHaveBeenCalled();
    // Worker arrives → effect re-runs and finally registers the incoming listener.
    act(() => {
      useFlexStore.setState({ worker: { sid: 'WK1' } as never });
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('no-ops (never throws) when there is no live client', () => {
    getFlexClient.mockReturnValue(null);
    useFlexStore.setState({ worker: { sid: 'WK1' } as never });
    expect(() => renderHook(() => useVoiceEvents())).not.toThrow();
    expect(execute).not.toHaveBeenCalled();
  });
});
