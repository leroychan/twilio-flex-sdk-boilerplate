import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const { mockState } = vi.hoisted(() => ({
  mockState: {
    activities: [{ sid: 'WA1', name: 'Available', available: true }],
    currentActivitySid: 'WA1',
  } as { activities: unknown[]; currentActivitySid: string | null },
}));

vi.mock('@/store', () => ({
  useFlexStore: (selector: (s: typeof mockState) => unknown) => selector(mockState),
}));
vi.mock('@/lib/flex/actions/Worker', () => ({
  setCurrentActivity: vi.fn().mockResolvedValue(undefined),
}));

import { setCurrentActivity } from '@/lib/flex/actions/Worker';
import { usePresence } from '../usePresence';

describe('usePresence', () => {
  beforeEach(() => vi.clearAllMocks());

  it('exposes activities and current activity from the store', () => {
    const { result } = renderHook(() => usePresence());
    expect(result.current.activities).toHaveLength(1);
    expect(result.current.currentActivitySid).toBe('WA1');
  });

  it('changeActivity delegates to the Worker action wrapper', async () => {
    const { result } = renderHook(() => usePresence());
    await result.current.changeActivity('WA2');
    expect(setCurrentActivity).toHaveBeenCalledWith('WA2');
  });
});
