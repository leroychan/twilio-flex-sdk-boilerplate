import { describe, it, expect } from 'vitest';
import { create } from 'zustand';
import { createTasksSlice, type TasksSlice, type TaskParticipantView } from '../tasks';

function makeStore() {
  return create<TasksSlice>()(createTasksSlice);
}

const customer: TaskParticipantView = {
  participantSid: 'UT1',
  type: 'customer',
  channelType: 'voice',
  isOnHold: false,
};
const agent: TaskParticipantView = {
  participantSid: 'UT2',
  type: 'agent',
  channelType: 'voice',
  workerSid: 'WK2',
  isOnHold: false,
};

describe('tasks slice participants', () => {
  it('sets, upserts and removes participants by taskSid', () => {
    const store = makeStore();
    store.getState().setTaskParticipants('WT1', [customer]);
    expect(store.getState().taskParticipants.WT1).toHaveLength(1);

    store.getState().upsertTaskParticipant('WT1', agent);
    expect(store.getState().taskParticipants.WT1).toHaveLength(2);

    // upsert same participantSid replaces (updated hold state)
    store.getState().upsertTaskParticipant('WT1', { ...agent, isOnHold: true });
    expect(store.getState().taskParticipants.WT1).toHaveLength(2);
    expect(
      store.getState().taskParticipants.WT1?.find((p) => p.participantSid === 'UT2')?.isOnHold,
    ).toBe(true);

    store.getState().removeTaskParticipant('WT1', 'UT1');
    expect(store.getState().taskParticipants.WT1).toHaveLength(1);
  });

  it('caches worker names', () => {
    const store = makeStore();
    store.getState().setWorkerName('WK2', 'Ada');
    expect(store.getState().workerNames.WK2).toBe('Ada');
  });
});
