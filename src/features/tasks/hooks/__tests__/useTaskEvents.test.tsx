import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const { subscribeReservations } = vi.hoisted(() => ({ subscribeReservations: vi.fn() }));
vi.mock('../../events', () => ({ subscribeReservations }));

import { useFlexStore } from '@/store';
import { useTaskEvents } from '../useTaskEvents';

describe('useTaskEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFlexStore.getState().setWorker(null);
  });

  it('does nothing when there is no worker', () => {
    renderHook(() => useTaskEvents());
    expect(subscribeReservations).not.toHaveBeenCalled();
  });

  it('subscribes with the store worker and unsubscribes on unmount', () => {
    const unsub = vi.fn();
    subscribeReservations.mockReturnValue(unsub);
    const worker = { reservations: new Map() } as unknown;
    useFlexStore.getState().setWorker(worker as never);

    const { unmount } = renderHook(() => useTaskEvents());
    expect(subscribeReservations).toHaveBeenCalledTimes(1);
    expect(subscribeReservations).toHaveBeenCalledWith(worker);

    unmount();
    expect(unsub).toHaveBeenCalledTimes(1);
  });
});
