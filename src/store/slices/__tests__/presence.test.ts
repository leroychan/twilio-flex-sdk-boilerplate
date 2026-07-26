import { describe, it, expect } from 'vitest';
import { create } from 'zustand';
import { createPresenceSlice, type PresenceSlice } from '../presence';

function makeStore() {
  return create<PresenceSlice>()(createPresenceSlice);
}

describe('presence slice', () => {
  it('starts empty', () => {
    const store = makeStore();
    expect(store.getState().activities).toEqual([]);
    expect(store.getState().currentActivitySid).toBeNull();
  });

  it('setActivities replaces the activities list', () => {
    const store = makeStore();
    store.getState().setActivities([{ sid: 'WA1', name: 'Available', available: true }]);
    expect(store.getState().activities).toEqual([
      { sid: 'WA1', name: 'Available', available: true },
    ]);
  });

  it('setCurrentActivitySid updates the current activity', () => {
    const store = makeStore();
    store.getState().setCurrentActivitySid('WA1');
    expect(store.getState().currentActivitySid).toBe('WA1');
    store.getState().setCurrentActivitySid(null);
    expect(store.getState().currentActivitySid).toBeNull();
  });
});
