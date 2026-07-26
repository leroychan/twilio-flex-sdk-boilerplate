import { describe, it, expect, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { useFlexStore } from '@/store';
import type { FlexClient } from '../client';
import { registerSessionListeners } from '../events';

describe('registerSessionListeners', () => {
  beforeEach(() => {
    useFlexStore.setState({ token: null, worker: null, connectionState: 'disconnected' });
  });

  it('pushes tokenUpdated events into the session slice', () => {
    const emitter = new EventEmitter() as unknown as FlexClient;
    registerSessionListeners(emitter);
    (emitter as unknown as EventEmitter).emit('tokenUpdated', 'refreshed-token');
    expect(useFlexStore.getState().token).toBe('refreshed-token');
  });

  it('unsubscribe removes the listener', () => {
    const emitter = new EventEmitter();
    const unsubscribe = registerSessionListeners(emitter as unknown as FlexClient);
    unsubscribe();
    emitter.emit('tokenUpdated', 'ignored');
    expect(useFlexStore.getState().token).toBeNull();
  });
});
