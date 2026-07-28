import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useFlexStore } from '@/store';

const requestToken = vi.fn();
vi.mock('@/lib/flex/auth', () => ({
  requestToken: (...a: unknown[]) => requestToken(...a),
}));

import {
  startCustomTokenRefresh,
  refreshCustomToken,
  TOKEN_TTL_SECONDS,
  REFRESH_MARGIN_SECONDS,
} from '../tokenRefresh';

const INTERVAL_MS = (TOKEN_TTL_SECONDS - REFRESH_MARGIN_SECONDS) * 1000;

// Microtasks aren't governed by fake timers, so flush them explicitly after
// firing a timer/listener to let the async refresh chain settle.
async function flush() {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
}

function fakeClient() {
  const listeners: Record<string, (() => void)[]> = {};
  return {
    updateToken: vi.fn(),
    addListener: vi.fn((event: string, cb: () => void) => {
      (listeners[event] ??= []).push(cb);
    }),
    removeListener: vi.fn((event: string, cb: () => void) => {
      listeners[event] = (listeners[event] ?? []).filter((c) => c !== cb);
    }),
    emit: (event: string) => (listeners[event] ?? []).forEach((cb) => cb()),
  };
}

describe('token refresh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    requestToken.mockReset().mockResolvedValue({ token: 'fresh-token', identity: 'agent-1' });
    useFlexStore.setState({ token: 'stale-token', identity: 'agent-1' });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('refreshCustomToken', () => {
    it('re-mints for the identity, rotates the SDK token, and updates the store', async () => {
      const client = fakeClient();
      await refreshCustomToken(client as never, 'agent-1');
      expect(requestToken).toHaveBeenCalledWith('agent-1');
      expect(client.updateToken).toHaveBeenCalledWith('fresh-token');
      expect(useFlexStore.getState().token).toBe('fresh-token');
    });

    it('passes undefined (not null) to requestToken when identity is absent', async () => {
      const client = fakeClient();
      await refreshCustomToken(client as never, null);
      expect(requestToken).toHaveBeenCalledWith(undefined);
    });
  });

  describe('startCustomTokenRefresh', () => {
    it('proactively refreshes one minute before the token TTL elapses', async () => {
      const client = fakeClient();
      startCustomTokenRefresh(client as never, 'agent-1');

      // Nothing before the interval elapses.
      await vi.advanceTimersByTimeAsync(INTERVAL_MS - 1000);
      expect(client.updateToken).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1000);
      expect(requestToken).toHaveBeenCalledWith('agent-1');
      expect(client.updateToken).toHaveBeenCalledWith('fresh-token');
      expect(useFlexStore.getState().token).toBe('fresh-token');
    });

    it('keeps firing on every interval', async () => {
      const client = fakeClient();
      startCustomTokenRefresh(client as never, 'agent-1');
      await vi.advanceTimersByTimeAsync(INTERVAL_MS * 3);
      expect(client.updateToken).toHaveBeenCalledTimes(3);
    });

    it('reactively refreshes when the SDK emits tokenAutoUpdateFailed', async () => {
      const client = fakeClient();
      startCustomTokenRefresh(client as never, 'agent-1');
      expect(client.addListener).toHaveBeenCalledWith('tokenAutoUpdateFailed', expect.any(Function));

      client.emit('tokenAutoUpdateFailed');
      await flush();
      expect(client.updateToken).toHaveBeenCalledWith('fresh-token');
    });

    it('swallows a failed re-mint so the interval keeps running', async () => {
      const client = fakeClient();
      const err = vi.spyOn(console, 'error').mockImplementation(() => {});
      requestToken.mockRejectedValueOnce(new Error('mint failed'));
      startCustomTokenRefresh(client as never, 'agent-1');

      await vi.advanceTimersByTimeAsync(INTERVAL_MS); // fails, logged, not thrown
      expect(client.updateToken).not.toHaveBeenCalled();
      expect(err).toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(INTERVAL_MS); // next tick succeeds
      expect(client.updateToken).toHaveBeenCalledWith('fresh-token');
      err.mockRestore();
    });

    it('cleanup stops the timer and detaches the listener', async () => {
      const client = fakeClient();
      const stop = startCustomTokenRefresh(client as never, 'agent-1');
      stop();
      expect(client.removeListener).toHaveBeenCalledWith('tokenAutoUpdateFailed', expect.any(Function));

      await vi.advanceTimersByTimeAsync(INTERVAL_MS * 2);
      expect(client.updateToken).not.toHaveBeenCalled();
    });
  });
});
