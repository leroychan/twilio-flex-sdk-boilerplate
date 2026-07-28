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
  /** When this task first entered the desktop (ms epoch), for the elapsed timer. */
  createdAt?: number;
  /**
   * Human-readable contact name resolved out-of-band (e.g. a webchat customer's
   * pre-engagement name from the Conversation resource, which the task attributes
   * carry only as an anonymous `FX…` identity). Populated by useTaskContactNames.
   */
  contactName?: string;
}

/** Serializable projection of an SDK TaskParticipant, keyed under a taskSid. */
export interface TaskParticipantView {
  participantSid: string;
  type: string;
  channelType: string;
  workerSid?: string;
  isOnHold: boolean;
}

export interface TasksSlice {
  tasks: TaskView[];
  /** The task whose detail is shown in the middle column (click-to-select). */
  activeTaskSid: string | null;
  taskParticipants: Record<string, TaskParticipantView[]>;
  workerNames: Record<string, string>;
  upsertTask: (task: TaskView) => void;
  setActiveTaskSid: (taskSid: string | null) => void;
  updateTaskStatus: (reservationSid: string, status: ReservationStatus) => void;
  updateTaskAttributes: (taskSid: string, attributes: Record<string, unknown>) => void;
  setTaskContactName: (taskSid: string, contactName: string) => void;
  removeTask: (reservationSid: string) => void;
  setTaskParticipants: (taskSid: string, participants: TaskParticipantView[]) => void;
  upsertTaskParticipant: (taskSid: string, participant: TaskParticipantView) => void;
  removeTaskParticipant: (taskSid: string, participantSid: string) => void;
  setWorkerName: (workerSid: string, name: string) => void;
}

export const createTasksSlice: StateCreator<TasksSlice, [], [], TasksSlice> = (set) => ({
  tasks: [],
  activeTaskSid: null,
  taskParticipants: {},
  workerNames: {},
  upsertTask: (task) =>
    set((state) => ({
      tasks: [...state.tasks.filter((t) => t.reservationSid !== task.reservationSid), task],
      // Auto-select the first task so the desktop always has a detail in view;
      // an existing selection is preserved.
      activeTaskSid: state.activeTaskSid ?? task.taskSid,
    })),
  setActiveTaskSid: (taskSid) => set({ activeTaskSid: taskSid }),
  updateTaskStatus: (reservationSid, status) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.reservationSid === reservationSid ? { ...t, status } : t)),
    })),
  updateTaskAttributes: (taskSid, attributes) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.taskSid === taskSid ? { ...t, attributes } : t)),
    })),
  setTaskContactName: (taskSid, contactName) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.taskSid === taskSid ? { ...t, contactName } : t)),
    })),
  removeTask: (reservationSid) =>
    set((state) => {
      const removed = state.tasks.find((t) => t.reservationSid === reservationSid);
      const tasks = state.tasks.filter((t) => t.reservationSid !== reservationSid);
      // If the removed task was selected, fall back to another remaining task
      // (or clear when none remain) so the detail pane never points at a gone task.
      const activeTaskSid =
        removed && state.activeTaskSid === removed.taskSid
          ? (tasks[0]?.taskSid ?? null)
          : state.activeTaskSid;
      return { tasks, activeTaskSid };
    }),
  setTaskParticipants: (taskSid, participants) =>
    set((state) => ({ taskParticipants: { ...state.taskParticipants, [taskSid]: participants } })),
  upsertTaskParticipant: (taskSid, participant) =>
    set((state) => {
      const list = state.taskParticipants[taskSid] ?? [];
      const next = [
        ...list.filter((p) => p.participantSid !== participant.participantSid),
        participant,
      ];
      return { taskParticipants: { ...state.taskParticipants, [taskSid]: next } };
    }),
  removeTaskParticipant: (taskSid, participantSid) =>
    set((state) => ({
      taskParticipants: {
        ...state.taskParticipants,
        [taskSid]: (state.taskParticipants[taskSid] ?? []).filter(
          (p) => p.participantSid !== participantSid,
        ),
      },
    })),
  setWorkerName: (workerSid, name) =>
    set((state) => ({ workerNames: { ...state.workerNames, [workerSid]: name } })),
});
