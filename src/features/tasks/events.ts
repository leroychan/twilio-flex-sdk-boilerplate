import { useFlexStore } from '@/store';
import type { ReservationStatus, TaskView, TasksSlice } from '@/store/slices/tasks';
import type { VoiceSlice } from '@/store/slices/voice';
import { subscribeTaskParticipants } from './participantEvents';
import { resolveActiveVoiceCall } from '@/features/voice/lib/resolveActiveCall';

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
  sid?: string;
  reservations: Map<string, ReservationLike>;
  on: (event: 'reservationCreated', listener: (reservation: ReservationLike) => void) => void;
  off: (event: 'reservationCreated', listener: (reservation: ReservationLike) => void) => void;
}

type TasksStore = {
  getState: () => Pick<TasksSlice, 'upsertTask' | 'updateTaskStatus' | 'removeTask'> &
    Partial<Pick<VoiceSlice, 'setCall'>>;
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
  const attributes = parseAttributes(reservation.task.attributes);
  return {
    reservationSid: reservation.sid,
    taskSid: reservation.task.sid,
    taskChannelUniqueName: reservation.task.taskChannelUniqueName,
    attributes,
    status: toStatus(reservation.status),
    createdAt: Date.now(),
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

    // On accept, fetch + live-track the task's participants (voice conference
    // tiles, hold/kick, chat authors). Best-effort: no-ops without a worker sid.
    const subscribeParticipants = () => {
      if (!worker.sid) return;
      void subscribeTaskParticipants(reservation.task.sid, worker.sid)
        .then((unsub) => cleanups.push(unsub))
        .catch(() => undefined);
    };

    // Link the active voice call to its task and resolve the live media call so
    // the CallPanel + controls light up. The reservation is the authoritative
    // trigger (the device-level `incoming` event never carries the taskSid, and
    // the conference's media leg lands a beat after `accepted`). resolveActiveVoiceCall
    // retries GetCallByTask, then flips call.status → connected. No-op without a
    // live SDK client (stub/demo/tests).
    const linkVoiceTask = () => {
      if (reservation.task.taskChannelUniqueName === 'voice') {
        store.getState().setCall?.({ taskSid: reservation.task.sid });
        void resolveActiveVoiceCall(reservation.task.sid);
      }
    };

    const onAccepted = () => {
      store.getState().updateTaskStatus(reservation.sid, 'accepted');
      subscribeParticipants();
      linkVoiceTask();
    };
    const onWrapup = () => store.getState().updateTaskStatus(reservation.sid, 'wrapping');
    const onRemove = () => store.getState().removeTask(reservation.sid);

    reservation.on('accepted', onAccepted);
    reservation.on('wrapup', onWrapup);
    reservation.on('completed', onRemove);
    reservation.on('rejected', onRemove);
    reservation.on('canceled', onRemove);
    reservation.on('rescinded', onRemove);
    reservation.on('timeout', onRemove);

    // Already-accepted reservations at init won't re-fire 'accepted'.
    if (reservation.status === 'accepted') {
      subscribeParticipants();
      linkVoiceTask();
    }

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
