import { describe, it, expect, vi } from 'vitest';

// Mock the twilio node SDK before importing the route.
const fetchStats = vi.fn();
const listQueues = vi.fn();

vi.mock('twilio', () => ({
  default: () => ({
    taskrouter: {
      v1: {
        workspaces: () => ({
          taskQueues: Object.assign(() => ({ statistics: () => ({ fetch: fetchStats }) }), {
            list: listQueues,
          }),
        }),
      },
    },
  }),
}));

describe('GET /api/queue-stats', () => {
  it('returns { configured: false } when creds are absent', async () => {
    vi.stubEnv('TWILIO_ACCOUNT_SID', '');
    vi.stubEnv('TWILIO_AUTH_TOKEN', '');
    vi.stubEnv('TWILIO_WORKSPACE_SID', '');
    const { GET } = await import('../route');
    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ configured: false });
    vi.unstubAllEnvs();
  });

  it('projects queue statistics when configured', async () => {
    vi.stubEnv('TWILIO_ACCOUNT_SID', 'AC123');
    vi.stubEnv('TWILIO_AUTH_TOKEN', 'secret');
    vi.stubEnv('TWILIO_WORKSPACE_SID', 'WS123');
    listQueues.mockResolvedValue([{ sid: 'WQ1', friendlyName: 'Support' }]);
    fetchStats.mockResolvedValue({
      realtime: {
        tasks_by_status: { pending: 2, reserved: 1, assigned: 3 },
        longest_task_waiting_age: 42,
        total_available_workers: 5,
        total_eligible_workers: 8,
      },
      cumulative: { wait_duration_until_accepted: { avg: 12 } },
    });
    vi.resetModules();
    const { GET } = await import('../route');
    const res = await GET();
    const body = await res.json();
    expect(body.configured).toBe(true);
    expect(body.queues).toHaveLength(1);
    expect(body.queues[0]).toMatchObject({
      sid: 'WQ1',
      friendlyName: 'Support',
      waiting: 3,
      active: 3,
      longestWaitAge: 42,
      availableWorkers: 5,
      eligibleWorkers: 8,
      avgWaitAccepted: 12,
    });
    vi.unstubAllEnvs();
  });
});
