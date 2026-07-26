import { describe, it, expect } from 'vitest';
import { create } from 'zustand';
import { createTasksSlice, type TasksSlice, type TaskView } from '../tasks';

const baseTask: TaskView = {
  reservationSid: 'WR1',
  taskSid: 'WT1',
  taskChannelUniqueName: 'voice',
  attributes: { name: 'Ada' },
  status: 'pending',
};

function makeStore() {
  return create<TasksSlice>()(createTasksSlice);
}

describe('tasks slice', () => {
  it('starts empty', () => {
    expect(makeStore().getState().tasks).toEqual([]);
  });

  it('upsertTask adds then replaces by reservationSid', () => {
    const store = makeStore();
    store.getState().upsertTask(baseTask);
    expect(store.getState().tasks).toHaveLength(1);
    store.getState().upsertTask({ ...baseTask, taskChannelUniqueName: 'chat' });
    expect(store.getState().tasks).toHaveLength(1);
    expect(
      store.getState().tasks.find((t) => t.reservationSid === 'WR1')?.taskChannelUniqueName,
    ).toBe('chat');
  });

  it('updateTaskStatus changes a task status by reservationSid', () => {
    const store = makeStore();
    store.getState().upsertTask(baseTask);
    store.getState().updateTaskStatus('WR1', 'accepted');
    expect(store.getState().tasks.find((t) => t.reservationSid === 'WR1')?.status).toBe('accepted');
  });

  it('updateTaskAttributes replaces attributes by taskSid', () => {
    const store = makeStore();
    store.getState().upsertTask(baseTask);
    store.getState().updateTaskAttributes('WT1', { priority: 'high' });
    expect(store.getState().tasks.find((t) => t.taskSid === 'WT1')?.attributes).toEqual({
      priority: 'high',
    });
  });

  it('removeTask drops a task by reservationSid', () => {
    const store = makeStore();
    store.getState().upsertTask(baseTask);
    store.getState().removeTask('WR1');
    expect(store.getState().tasks).toEqual([]);
  });
});
