import { useFlexStore } from '@/store';
import type { ReservationStatus, TaskView, TasksSlice } from '@/store/slices/tasks';

export interface ReservationLike {
  sid: string;
  status: string;
  task: {
    sid: string;
    taskChannelUniqueName: string;
    attributes: Record<string, unknown> | string;
  };
  on: (event: string, listener: () => void) => void;
  off: (event: string, listener: () => void) => void;
}

export interface TasksWorkerLike {
  reservations: Map<string, ReservationLike>;
  on: (event: 'reservationCreated', listener: (reservation: ReservationLike) => void) => void;
  off: (event: 'reservationCreated', listener: (reservation: ReservationLike) => void) => void;
}

type TasksStore = {
  getState: () => Pick<TasksSlice, 'upsertTask' | 'updateTaskStatus' | 'removeTask'>;
};

function parseAttributes(raw: Record<string, unknown> | string): Record<string, unknown> {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return raw ?? {};
}

function toStatus(raw: string): ReservationStatus {
  switch (raw) {
    case 'accepted':
      return 'accepted';
    case 'wrapping':
    case 'wrapup':
      return 'wrapping';
    case 'completed':
      return 'completed';
    case 'rejected':
      return 'rejected';
    case 'canceled':
      return 'canceled';
    case 'rescinded':
      return 'rescinded';
    case 'timeout':
      return 'timeout';
    default:
      return 'pending';
  }
}

function toTaskView(reservation: ReservationLike): TaskView {
  return {
    reservationSid: reservation.sid,
    taskSid: reservation.task.sid,
    taskChannelUniqueName: reservation.task.taskChannelUniqueName,
    attributes: parseAttributes(reservation.task.attributes),
    status: toStatus(reservation.status),
  };
}

/**
 * Mirrors current + future reservations into the tasks slice and maps each
 * reservation's lifecycle events onto slice mutations. Returns an unsubscribe.
 */
export function subscribeReservations(
  worker: TasksWorkerLike,
  store: TasksStore = useFlexStore,
): () => void {
  const cleanups: Array<() => void> = [];

  const register = (reservation: ReservationLike) => {
    store.getState().upsertTask(toTaskView(reservation));

    const onAccepted = () => store.getState().updateTaskStatus(reservation.sid, 'accepted');
    const onWrapup = () => store.getState().updateTaskStatus(reservation.sid, 'wrapping');
    const onRemove = () => store.getState().removeTask(reservation.sid);

    reservation.on('accepted', onAccepted);
    reservation.on('wrapup', onWrapup);
    reservation.on('completed', onRemove);
    reservation.on('rejected', onRemove);
    reservation.on('canceled', onRemove);
    reservation.on('rescinded', onRemove);
    reservation.on('timeout', onRemove);

    cleanups.push(() => {
      reservation.off('accepted', onAccepted);
      reservation.off('wrapup', onWrapup);
      reservation.off('completed', onRemove);
      reservation.off('rejected', onRemove);
      reservation.off('canceled', onRemove);
      reservation.off('rescinded', onRemove);
      reservation.off('timeout', onRemove);
    });
  };

  worker.reservations.forEach(register);

  const onCreated = (reservation: ReservationLike) => register(reservation);
  worker.on('reservationCreated', onCreated);
  cleanups.push(() => worker.off('reservationCreated', onCreated));

  return () => cleanups.forEach((fn) => fn());
}
