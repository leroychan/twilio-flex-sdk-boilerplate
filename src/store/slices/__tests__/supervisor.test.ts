import { describe, it, expect, beforeEach } from 'vitest';
import { create } from 'zustand';
import {
  createSupervisorSlice,
  type SupervisorSlice,
  type MonitoredWorker,
  type MonitoredTask,
} from '../supervisor';

const makeStore = () => create<SupervisorSlice>()((...a) => createSupervisorSlice(...a));

const worker = (sid: string, activityName = 'Offline', available = false): MonitoredWorker => ({
  sid,
  friendlyName: `Agent ${sid}`,
  activitySid: 'WA0',
  activityName,
  available,
  attributes: {},
});

const task = (taskSid: string): MonitoredTask => ({
  taskSid,
  reservationSid: `WR-${taskSid}`,
  workerSid: 'WK1',
  workerName: 'Ada',
  queueName: 'Sales',
  channelType: 'voice',
});

describe('supervisor slice', () => {
  let store: ReturnType<typeof makeStore>;
  beforeEach(() => {
    store = makeStore();
  });

  it('starts empty', () => {
    const s = store.getState();
    expect(s.workers).toEqual([]);
    expect(s.monitoredTasks).toEqual([]);
    expect(s.activeMonitorTaskSid).toBeNull();
    expect(s.monitorMode).toBeNull();
    expect(s.supervisorError).toBeNull();
  });

  it('setWorkers replaces the list', () => {
    store.getState().setWorkers([worker('WK1'), worker('WK2')]);
    expect(store.getState().workers).toHaveLength(2);
  });

  it('upsertWorker inserts a new worker and updates an existing one', () => {
    store.getState().upsertWorker(worker('WK1', 'Offline'));
    store.getState().upsertWorker(worker('WK1', 'Available', true));
    const { workers } = store.getState();
    expect(workers).toHaveLength(1);
    expect(workers[0]?.activityName).toBe('Available');
    expect(workers[0]?.available).toBe(true);
  });

  it('setMonitoredTasks replaces the list', () => {
    store.getState().setMonitoredTasks([task('WT1'), task('WT2')]);
    expect(store.getState().monitoredTasks).toHaveLength(2);
  });

  it('setActiveMonitor sets task + mode, and clears mode when task is null', () => {
    store.getState().setActiveMonitor('WT1', 'coach');
    expect(store.getState().activeMonitorTaskSid).toBe('WT1');
    expect(store.getState().monitorMode).toBe('coach');
    store.getState().setActiveMonitor(null, 'coach');
    expect(store.getState().activeMonitorTaskSid).toBeNull();
    expect(store.getState().monitorMode).toBeNull();
  });

  it('setSupervisorError stores and clears the message', () => {
    store.getState().setSupervisorError('nope');
    expect(store.getState().supervisorError).toBe('nope');
    store.getState().setSupervisorError(null);
    expect(store.getState().supervisorError).toBeNull();
  });
});
