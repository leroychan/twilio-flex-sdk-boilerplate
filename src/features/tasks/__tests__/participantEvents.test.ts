import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getTaskParticipants, addTaskParticipantListener, fetchWorkerInfo } = vi.hoisted(() => ({
  getTaskParticipants: vi.fn(),
  addTaskParticipantListener: vi.fn(),
  fetchWorkerInfo: vi.fn(),
}));

vi.mock('@/lib/flex/actions/Task', () => ({ getTaskParticipants, addTaskParticipantListener }));
vi.mock('@/lib/flex/workspace', () => ({ fetchWorkerInfo }));

import { subscribeTaskParticipants } from '../participantEvents';

function makeStore() {
  const state = {
    taskParticipants: {} as Record<string, unknown[]>,
    workerNames: {} as Record<string, string>,
    setTaskParticipants: vi.fn((sid: string, p: unknown[]) => {
      state.taskParticipants[sid] = p;
    }),
    upsertTaskParticipant: vi.fn(),
    removeTaskParticipant: vi.fn(),
    setWorkerName: vi.fn((wk: string, n: string) => {
      state.workerNames[wk] = n;
    }),
  };
  return { getState: () => state, state };
}

describe('subscribeTaskParticipants', () => {
  beforeEach(() => {
    getTaskParticipants.mockReset();
    addTaskParticipantListener.mockReset();
    fetchWorkerInfo.mockReset();
  });

  it('seeds participants, resolves other-agent names, registers 3 listeners', async () => {
    getTaskParticipants.mockResolvedValue([
      { participantSid: 'UT1', type: 'customer', channelType: 'voice', isOnHold: false, routingProperties: null },
      {
        participantSid: 'UT2',
        type: 'agent',
        channelType: 'voice',
        isOnHold: false,
        routingProperties: { workerSid: 'WKother' },
      },
    ]);
    addTaskParticipantListener.mockResolvedValue({ unsubscribe: vi.fn() });
    fetchWorkerInfo.mockResolvedValue({ attributes: { full_name: 'Bob' }, name: 'bob' });

    const store = makeStore();
    const unsub = await subscribeTaskParticipants('WT1', 'WKself', store as never);

    expect(store.state.setTaskParticipants).toHaveBeenCalledWith('WT1', expect.any(Array));
    expect(fetchWorkerInfo).toHaveBeenCalledWith('WKother');
    expect(addTaskParticipantListener).toHaveBeenCalledTimes(3);
    const events = addTaskParticipantListener.mock.calls.map((c) => c[1]);
    expect(events).toEqual(['participantAdded', 'participantModified', 'participantRemoved']);
    expect(typeof unsub).toBe('function');
  });

  it('does not resolve the self worker name', async () => {
    getTaskParticipants.mockResolvedValue([
      {
        participantSid: 'UT2',
        type: 'agent',
        channelType: 'voice',
        isOnHold: false,
        routingProperties: { workerSid: 'WKself' },
      },
    ]);
    addTaskParticipantListener.mockResolvedValue({ unsubscribe: vi.fn() });

    const store = makeStore();
    await subscribeTaskParticipants('WT1', 'WKself', store as never);
    expect(fetchWorkerInfo).not.toHaveBeenCalled();
  });

  it('unsubscribe removes listeners and clears the store entry', async () => {
    getTaskParticipants.mockResolvedValue([]);
    const unsubscribe = vi.fn();
    addTaskParticipantListener.mockResolvedValue({ unsubscribe });

    const store = makeStore();
    const unsub = await subscribeTaskParticipants('WT1', 'WKself', store as never);
    unsub();
    expect(unsubscribe).toHaveBeenCalledTimes(3);
    expect(store.state.setTaskParticipants).toHaveBeenLastCalledWith('WT1', []);
  });
});
