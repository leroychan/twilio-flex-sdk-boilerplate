import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const addListener = vi.fn();
vi.mock('@twilio/flex-sdk/actions/Voice', () => ({
  AddVoiceEventListener: (cb: (e: unknown) => void) => { addListener(cb); return () => {}; },
}));
vi.mock('@/lib/flex/client', () => ({ getFlexClient: () => null }));
import { useVoiceEvents } from '../useVoiceEvents';

beforeEach(() => addListener.mockReset());

describe('useVoiceEvents', () => {
  it('registers a voice event listener on mount', () => {
    renderHook(() => useVoiceEvents());
    expect(addListener).toHaveBeenCalledOnce();
  });
});
