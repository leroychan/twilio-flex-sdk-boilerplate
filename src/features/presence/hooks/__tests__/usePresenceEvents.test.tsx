import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const { subscribePresence } = vi.hoisted(() => ({ subscribePresence: vi.fn() }));
vi.mock('../../events', () => ({ subscribePresence }));

import { useFlexStore } from '@/store';
import { usePresenceEvents } from '../usePresenceEvents';

describe('usePresenceEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFlexStore.getState().setWorker(null);
  });

  it('does nothing when there is no worker', () => {
    renderHook(() => usePresenceEvents());
    expect(subscribePresence).not.toHaveBeenCalled();
  });

  it('subscribes with the store worker and unsubscribes on unmount', () => {
    const unsub = vi.fn();
    subscribePresence.mockReturnValue(unsub);
    const worker = { activities: new Map(), activity: null } as unknown;
    useFlexStore.getState().setWorker(worker as never);

    const { unmount } = renderHook(() => usePresenceEvents());
    expect(subscribePresence).toHaveBeenCalledTimes(1);
    expect(subscribePresence).toHaveBeenCalledWith(worker);

    unmount();
    expect(unsub).toHaveBeenCalledTimes(1);
  });
});
