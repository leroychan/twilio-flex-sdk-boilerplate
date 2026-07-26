import { describe, it, expect } from 'vitest';
import { create } from 'zustand';
import { createPresenceSlice, type PresenceSlice } from '@/store/slices/presence';
import { subscribePresence, type PresenceWorkerLike } from '../events';

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

describe('subscribePresence', () => {
  it('seeds activities and current activity, then tracks activityUpdated', () => {
    const emitter = makeEmitter();
    const worker: PresenceWorkerLike = {
      activities: new Map([['WA1', { sid: 'WA1', name: 'Available', available: true }]]),
      activity: { sid: 'WA1' },
      on: emitter.on,
      off: emitter.off,
    };
    const store = create<PresenceSlice>()(createPresenceSlice);

    const unsubscribe = subscribePresence(worker, store);

    expect(store.getState().activities).toEqual([
      { sid: 'WA1', name: 'Available', available: true },
    ]);
    expect(store.getState().currentActivitySid).toBe('WA1');

    worker.activity = { sid: 'WA2' };
    emitter.emit('activityUpdated');
    expect(store.getState().currentActivitySid).toBe('WA2');

    unsubscribe();
    worker.activity = { sid: 'WA1' };
    emitter.emit('activityUpdated');
    expect(store.getState().currentActivitySid).toBe('WA2');
  });

  it('handles a null current activity', () => {
    const emitter = makeEmitter();
    const worker: PresenceWorkerLike = {
      activities: new Map(),
      activity: null,
      on: emitter.on,
      off: emitter.off,
    };
    const store = create<PresenceSlice>()(createPresenceSlice);
    subscribePresence(worker, store);
    expect(store.getState().currentActivitySid).toBeNull();
  });
});
