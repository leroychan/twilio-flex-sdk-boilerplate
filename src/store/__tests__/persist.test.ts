import { describe, it, expect, beforeEach } from 'vitest';
import { useFlexStore } from '@/store';

const STORAGE_KEY = 'flex-session';

function readPersisted() {
  const raw = localStorage.getItem(STORAGE_KEY);
  expect(raw).not.toBeNull();
  return JSON.parse(raw!) as { state: Record<string, unknown> };
}

describe('flex store persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    useFlexStore.setState({ token: null, worker: null });
  });

  it('writes the token to localStorage under the flex-session key', () => {
    useFlexStore.getState().setToken('tok-xyz');

    const persisted = readPersisted();
    expect(persisted.state.token).toBe('tok-xyz');
  });

  it('persists the minting identity alongside the token', () => {
    useFlexStore.getState().setIdentity('agent-1');

    const persisted = readPersisted();
    expect(persisted.state.identity).toBe('agent-1');
  });

  it('does not persist the live worker object (partialize excludes it)', () => {
    // A live SDK worker is non-serializable — it must never be written to storage.
    useFlexStore.getState().setWorker({} as never);
    useFlexStore.getState().setToken('tok-abc');

    const persisted = readPersisted();
    expect(persisted.state).not.toHaveProperty('worker');
    expect(persisted.state.token).toBe('tok-abc');
  });
});
