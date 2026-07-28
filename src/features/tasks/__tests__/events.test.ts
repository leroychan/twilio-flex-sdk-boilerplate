import { describe, it, expect, vi } from 'vitest';
import { create } from 'zustand';
import { createTasksSlice, type TasksSlice } from '@/store/slices/tasks';
import { subscribeReservations, type ReservationLike, type TasksWorkerLike } from '../events';

function makeEmitter() {
  const listeners: Record<string, Array<(...args: unknown[]) => void>> = {};
  return {
    on(event: string, cb: (...args: unknown[]) => void) {
      (listeners[event] ??= []).push(cb);
    },
    off(event: string, cb: (...args: unknown[]) => void) {
      listeners[event] = (listeners[event] ?? []).filter((f) => f !== cb);
    },
    emit(event: string, ...args: unknown[]) {
      (listeners[event] ?? []).forEach((f) => f(...args));
    },
  };
}

describe('subscribeReservations', () => {
  it('registers a new reservation and maps its lifecycle events', () => {
    const workerEmitter = makeEmitter();
    const worker: TasksWorkerLike = {
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
      task: { sid: 'WT1', taskChannelUniqueName: 'voice', attributes: { name: 'Ada' } },
      on: resEmitter.on,
      off: resEmitter.off,
    };

    workerEmitter.emit('reservationCreated', reservation);
    expect(store.getState().tasks).toHaveLength(1);
    expect(store.getState().tasks[0]).toMatchObject({
      reservationSid: 'WR1',
      taskSid: 'WT1',
      taskChannelUniqueName: 'voice',
      status: 'pending',
      attributes: { name: 'Ada' },
    });

    resEmitter.emit('accepted');
    expect(store.getState().tasks.find((t) => t.reservationSid === 'WR1')?.status).toBe('accepted');

    resEmitter.emit('wrapup');
    expect(store.getState().tasks.find((t) => t.reservationSid === 'WR1')?.status).toBe('wrapping');

    resEmitter.emit('completed');
    expect(store.getState().tasks).toHaveLength(0);
  });

  it('parses string task attributes as JSON', () => {
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
      sid: 'WR2',
      status: 'pending',
      task: { sid: 'WT2', taskChannelUniqueName: 'chat', attributes: '{"channel":"web"}' },
      on: resEmitter.on,
      off: resEmitter.off,
    } satisfies ReservationLike);

    expect(store.getState().tasks.find((t) => t.reservationSid === 'WR2')?.attributes).toEqual({
      channel: 'web',
    });
  });

  it('links a voice task to the active call when it is accepted', () => {
    const setCall = vi.fn();
    const base = create<TasksSlice>()(createTasksSlice);
    const store = { getState: () => ({ ...base.getState(), setCall }) };

    const workerEmitter = makeEmitter();
    const worker: TasksWorkerLike = {
      reservations: new Map(),
      on: workerEmitter.on as TasksWorkerLike['on'],
      off: workerEmitter.off as TasksWorkerLike['off'],
    };
    subscribeReservations(worker, store as never);

    const resEmitter = makeEmitter();
    workerEmitter.emit('reservationCreated', {
      sid: 'WR9',
      status: 'pending',
      task: { sid: 'WT9', taskChannelUniqueName: 'voice', attributes: {} },
      on: resEmitter.on,
      off: resEmitter.off,
    } satisfies ReservationLike);

    resEmitter.emit('accepted');
    expect(setCall).toHaveBeenCalledWith({ taskSid: 'WT9' });
  });

  it('does not link non-voice tasks to the call', () => {
    const setCall = vi.fn();
    const base = create<TasksSlice>()(createTasksSlice);
    const store = { getState: () => ({ ...base.getState(), setCall }) };

    const workerEmitter = makeEmitter();
    const worker: TasksWorkerLike = {
      reservations: new Map(),
      on: workerEmitter.on as TasksWorkerLike['on'],
      off: workerEmitter.off as TasksWorkerLike['off'],
    };
    subscribeReservations(worker, store as never);

    const resEmitter = makeEmitter();
    workerEmitter.emit('reservationCreated', {
      sid: 'WR10',
      status: 'pending',
      task: { sid: 'WT10', taskChannelUniqueName: 'chat', attributes: {} },
      on: resEmitter.on,
      off: resEmitter.off,
    } satisfies ReservationLike);

    resEmitter.emit('accepted');
    expect(setCall).not.toHaveBeenCalled();
  });

  it('seeds reservations already present on the worker', () => {
    const resEmitter = makeEmitter();
    const existing: ReservationLike = {
      sid: 'WR3',
      status: 'accepted',
      task: { sid: 'WT3', taskChannelUniqueName: 'voice', attributes: {} },
      on: resEmitter.on,
      off: resEmitter.off,
    };
    const workerEmitter = makeEmitter();
    const worker: TasksWorkerLike = {
      reservations: new Map([['WR3', existing]]),
      on: workerEmitter.on as TasksWorkerLike['on'],
      off: workerEmitter.off as TasksWorkerLike['off'],
    };
    const store = create<TasksSlice>()(createTasksSlice);
    subscribeReservations(worker, store);

    expect(store.getState().tasks.find((t) => t.reservationSid === 'WR3')?.status).toBe('accepted');
  });
});
