import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchWorkerInfo = vi.fn();
const getWorkspaceFn = vi.fn();
let client: unknown = { getWorkspace: getWorkspaceFn };

vi.mock('@/lib/flex/client', () => ({ getFlexClient: () => client }));

import {
  fetchWorkerInfo as fetchWI,
  fetchTaskQueuesList,
  fetchWorkersList,
  getWorkspace,
  resetWorkspaceCache,
} from '../workspace';

describe('workspace helper', () => {
  beforeEach(() => {
    resetWorkspaceCache();
    getWorkspaceFn.mockReset();
    fetchWorkerInfo.mockReset();
    client = { getWorkspace: getWorkspaceFn };
  });

  it('resolves worker info via the cached workspace', async () => {
    getWorkspaceFn.mockResolvedValue({ fetchWorkerInfo });
    fetchWorkerInfo.mockResolvedValue({ sid: 'WK1', name: 'ada', attributes: { full_name: 'Ada L' } });
    const info = await fetchWI('WK1');
    expect(info?.attributes.full_name).toBe('Ada L');
    // second call reuses the cached workspace handle
    await fetchWI('WK1');
    expect(getWorkspaceFn).toHaveBeenCalledTimes(1);
  });

  it('returns null when there is no client', async () => {
    client = null;
    expect(await getWorkspace()).toBeNull();
    expect(await fetchWI('WK1')).toBeNull();
  });

  it('returns null when fetchWorkerInfo throws', async () => {
    getWorkspaceFn.mockResolvedValue({
      fetchWorkerInfo: vi.fn().mockRejectedValue(new Error('nope')),
    });
    expect(await fetchWI('WKx')).toBeNull();
  });

  it('projects task queues to sid + name', async () => {
    getWorkspaceFn.mockResolvedValue({
      fetchTaskQueues: vi.fn().mockResolvedValue(
        new Map([
          ['WQ1', { sid: 'WQ1', name: 'Sales' }],
          ['WQ2', { sid: 'WQ2', name: 'Support' }],
        ]),
      ),
    });
    const queues = await fetchTaskQueuesList();
    expect(queues).toEqual([
      { sid: 'WQ1', name: 'Sales' },
      { sid: 'WQ2', name: 'Support' },
    ]);
  });

  it('projects workers to the directory shape', async () => {
    getWorkspaceFn.mockResolvedValue({
      fetchWorkersInfo: vi.fn().mockResolvedValue(
        new Map([
          [
            'WK1',
            {
              sid: 'WK1',
              name: 'Ada',
              friendlyName: 'Ada L',
              activitySid: 'WA1',
              activityName: 'Available',
              available: true,
              attributes: { full_name: 'Ada L' },
            },
          ],
        ]),
      ),
    });
    const workers = await fetchWorkersList();
    expect(workers[0]).toMatchObject({ sid: 'WK1', name: 'Ada', activityName: 'Available', available: true });
  });

  it('returns empty arrays when the workspace calls throw', async () => {
    getWorkspaceFn.mockResolvedValue({
      fetchTaskQueues: vi.fn().mockRejectedValue(new Error('nope')),
      fetchWorkersInfo: vi.fn().mockRejectedValue(new Error('nope')),
    });
    expect(await fetchTaskQueuesList()).toEqual([]);
    expect(await fetchWorkersList()).toEqual([]);
  });
});
