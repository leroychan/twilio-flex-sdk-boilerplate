import { describe, it, expect, beforeEach } from 'vitest';
import { useFlexStore } from '@/store';

describe('sessionSlice via useFlexStore', () => {
  beforeEach(() => {
    useFlexStore.setState({ token: null, worker: null, connectionState: 'disconnected' });
  });

  it('starts with sensible defaults', () => {
    const s = useFlexStore.getState();
    expect(s.token).toBeNull();
    expect(s.worker).toBeNull();
    expect(s.connectionState).toBe('disconnected');
  });

  it('setToken updates the token', () => {
    useFlexStore.getState().setToken('tok-1');
    expect(useFlexStore.getState().token).toBe('tok-1');
  });

  it('setConnectionState updates the connection state', () => {
    useFlexStore.getState().setConnectionState('connected');
    expect(useFlexStore.getState().connectionState).toBe('connected');
  });

  it('setWorker updates the worker', () => {
    const worker = { sid: 'WK1' } as unknown as Parameters<
      ReturnType<typeof useFlexStore.getState>['setWorker']
    >[0];
    useFlexStore.getState().setWorker(worker);
    expect(useFlexStore.getState().worker).toBe(worker);
  });
});
