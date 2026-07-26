import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const getFlexClient = vi.fn();
const execute = vi.fn();
vi.mock('@/lib/flex/client', () => ({ getFlexClient: () => getFlexClient() }));
vi.mock('@twilio/flex-sdk/actions/Voice', () => ({
  AddVoiceEventListener: class {
    constructor(
      public name: string,
      public listener: unknown,
    ) {}
  },
}));
import { useVoiceEvents } from '../useVoiceEvents';

beforeEach(() => {
  getFlexClient.mockReset();
  execute.mockReset().mockResolvedValue({ unsubscribe: () => {} });
});

describe('useVoiceEvents', () => {
  it('registers the incoming voice event via client.execute when a client exists', () => {
    getFlexClient.mockReturnValue({ execute });
    renderHook(() => useVoiceEvents());
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('no-ops (never throws) when there is no live client', () => {
    getFlexClient.mockReturnValue(null);
    expect(() => renderHook(() => useVoiceEvents())).not.toThrow();
    expect(execute).not.toHaveBeenCalled();
  });
});
