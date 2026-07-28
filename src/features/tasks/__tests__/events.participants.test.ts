import { describe, it, expect, vi, beforeEach } from 'vitest';
import { create } from 'zustand';
import { createTasksSlice, type TasksSlice } from '@/store/slices/tasks';

const { subscribeTaskParticipants } = vi.hoisted(() => ({
  subscribeTaskParticipants: vi.fn(),
}));
vi.mock('../participantEvents', () => ({ subscribeTaskParticipants }));

import { subscribeReservations, type ReservationLike, type TasksWorkerLike } from '../events';

function makeEmitter() {
  const listeners: Record<string, Array<(...a: unknown[]) => void>> = {};
  return {
    on(e: string, cb: (...a: unknown[]) => void) {
      (listeners[e] ??= []).push(cb);
    },
    off(e: string, cb: (...a: unknown[]) => void) {
      listeners[e] = (listeners[e] ?? []).filter((f) => f !== cb);
    },
    emit(e: string, ...a: unknown[]) {
      (listeners[e] ?? []).forEach((f) => f(...a));
    },
  };
}

describe('subscribeReservations participant wiring', () => {
  beforeEach(() => subscribeTaskParticipants.mockReset());

  it('subscribes to participants when a reservation is accepted (worker has sid)', async () => {
    subscribeTaskParticipants.mockResolvedValue(() => undefined);
    const workerEmitter = makeEmitter();
    const worker: TasksWorkerLike = {
      sid: 'WKself',
      reservations: new Map(),
      on: workerEmitter.on as TasksWorkerLike['on'],
      off: workerEmitter.off as TasksWorkerLike['off'],
    };
    const store = create<TasksSlice>()(createTasksSlice);
    subscribeReservations(worker, store);

    const resEmitter = makeEmitter();
    const reservation: ReservationLike = {
      sid: 'WR1',
      status: 'pending',
      task: { sid: 'WT1', taskChannelUniqueName: 'voice', attributes: {} },
      on: resEmitter.on,
      off: resEmitter.off,
    };
    workerEmitter.emit('reservationCreated', reservation);
    resEmitter.emit('accepted');

    expect(subscribeTaskParticipants).toHaveBeenCalledWith('WT1', 'WKself');
  });

  it('does not subscribe when the worker has no sid', () => {
    const workerEmitter = makeEmitter();
    const worker: TasksWorkerLike = {
      reservations: new Map(),
      on: workerEmitter.on as TasksWorkerLike['on'],
      off: workerEmitter.off as TasksWorkerLike['off'],
    };
    const store = create<TasksSlice>()(createTasksSlice);
    subscribeReservations(worker, store);

    const resEmitter = makeEmitter();
    workerEmitter.emit('reservationCreated', {
      sid: 'WR1',
      status: 'pending',
      task: { sid: 'WT1', taskChannelUniqueName: 'voice', attributes: {} },
      on: resEmitter.on,
      off: resEmitter.off,
    } as ReservationLike);
    resEmitter.emit('accepted');

    expect(subscribeTaskParticipants).not.toHaveBeenCalled();
  });
});
