import type { StateCreator } from 'zustand';

export type ReservationStatus =
  | 'pending'
  | 'accepted'
  | 'wrapping'
  | 'completed'
  | 'rejected'
  | 'canceled'
  | 'rescinded'
  | 'timeout';

/** A task/reservation as mirrored from SDK reservation events. */
export interface TaskView {
  reservationSid: string;
  taskSid: string;
  taskChannelUniqueName: string;
  attributes: Record<string, unknown>;
  status: ReservationStatus;
}

export interface TasksSlice {
  tasks: TaskView[];
  upsertTask: (task: TaskView) => void;
  updateTaskStatus: (reservationSid: string, status: ReservationStatus) => void;
  updateTaskAttributes: (taskSid: string, attributes: Record<string, unknown>) => void;
  removeTask: (reservationSid: string) => void;
}

export const createTasksSlice: StateCreator<TasksSlice, [], [], TasksSlice> = (set) => ({
  tasks: [],
  upsertTask: (task) =>
    set((state) => ({
      tasks: [...state.tasks.filter((t) => t.reservationSid !== task.reservationSid), task],
    })),
  updateTaskStatus: (reservationSid, status) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.reservationSid === reservationSid ? { ...t, status } : t)),
    })),
  updateTaskAttributes: (taskSid, attributes) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.taskSid === taskSid ? { ...t, attributes } : t)),
    })),
  removeTask: (reservationSid) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.reservationSid !== reservationSid),
    })),
});
