import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useQueueStats } from '../useQueueStats';

describe('useQueueStats', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('exposes configured=false when the route is unconfigured', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ configured: false }),
    });
    const { result } = renderHook(() => useQueueStats(999999));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.configured).toBe(false);
    expect(result.current.queues).toEqual([]);
  });

  it('loads queue rows when configured', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        configured: true,
        updatedAt: '2026-07-27T00:00:00.000Z',
        queues: [
          {
            sid: 'WQ1', friendlyName: 'Support', waiting: 2, active: 1,
            longestWaitAge: 30, availableWorkers: 4, eligibleWorkers: 6, avgWaitAccepted: 9,
          },
        ],
      }),
    });
    const { result } = renderHook(() => useQueueStats(999999));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.configured).toBe(true);
    expect(result.current.queues).toHaveLength(1);
    expect(result.current.queues[0]?.friendlyName).toBe('Support');
  });
});
