import type { StateCreator } from 'zustand';

export interface MonitoredWorker {
  sid: string;
  friendlyName: string;
  activitySid: string;
  activityName: string;
  available: boolean;
  attributes: Record<string, unknown>;
}

export interface MonitoredTask {
  taskSid: string;
  /** The agent's reservation SID for this task — required to start a MonitorCall. */
  reservationSid: string;
  workerSid: string;
  workerName: string;
  queueName: string;
  channelType: string;
}

export type SupervisorMode = 'monitor' | 'coach' | 'barge';

export interface SupervisorSlice {
  workers: MonitoredWorker[];
  monitoredTasks: MonitoredTask[];
  activeMonitorTaskSid: string | null;
  monitorMode: SupervisorMode | null;
  supervisorError: string | null;
  setWorkers: (workers: MonitoredWorker[]) => void;
  upsertWorker: (worker: MonitoredWorker) => void;
  setMonitoredTasks: (tasks: MonitoredTask[]) => void;
  setActiveMonitor: (taskSid: string | null, mode: SupervisorMode | null) => void;
  setSupervisorError: (message: string | null) => void;
}

export const createSupervisorSlice: StateCreator<SupervisorSlice, [], [], SupervisorSlice> = (
  set,
) => ({
  workers: [],
  monitoredTasks: [],
  activeMonitorTaskSid: null,
  monitorMode: null,
  supervisorError: null,
  setWorkers: (workers) => set({ workers }),
  upsertWorker: (worker) =>
    set((state) => {
      const index = state.workers.findIndex((w) => w.sid === worker.sid);
      if (index === -1) {
        return { workers: [...state.workers, worker] };
      }
      const next = state.workers.slice();
      next[index] = worker;
      return { workers: next };
    }),
  setMonitoredTasks: (monitoredTasks) => set({ monitoredTasks }),
  setActiveMonitor: (taskSid, mode) =>
    set({ activeMonitorTaskSid: taskSid, monitorMode: taskSid ? mode : null }),
  setSupervisorError: (supervisorError) => set({ supervisorError }),
});
