import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// A fake twilio-sync SyncClient whose stream() records the messagePublished handler.
const publishers = new Map<string, (evt: unknown) => void>();
const streamCloses = vi.fn();
class FakeSyncClient {
  constructor(public token: string) {}
  on() {}
  async stream(name: string) {
    return {
      on: (_e: string, cb: (evt: unknown) => void) => publishers.set(name, cb),
      close: streamCloses,
    };
  }
}
vi.mock('twilio-sync', () => ({ SyncClient: FakeSyncClient }));

import { subscribeToStream, resetSyncClient } from '../client';

function mockToken(ok: boolean) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      ok
        ? ({ ok: true, json: async () => ({ token: 'jwt' }) } as Response)
        : ({ ok: false, json: async () => ({ configured: false }) } as Response)),
  );
}

describe('sync client', () => {
  beforeEach(() => { publishers.clear(); streamCloses.mockReset(); resetSyncClient(); });
  afterEach(() => { vi.unstubAllGlobals(); resetSyncClient(); });

  it('reports not configured when the token endpoint 503s', async () => {
    mockToken(false);
    const listener = vi.fn();
    const { configured } = await subscribeToStream('session-CA1', listener);
    expect(configured).toBe(false);
    expect(listener).not.toHaveBeenCalled();
  });

  it('delivers published messages to the listener', async () => {
    mockToken(true);
    const listener = vi.fn();
    const { configured } = await subscribeToStream('session-CA1', listener);
    expect(configured).toBe(true);
    publishers.get('session-CA1')!({ message: { data: { type: 'transcription', text: 'hi' } } });
    expect(listener).toHaveBeenCalledWith({ type: 'transcription', text: 'hi' });
  });

  it('shares one underlying stream for concurrent subscribers (no double dispatch)', async () => {
    mockToken(true);
    const a = vi.fn();
    const b = vi.fn();
    await Promise.all([subscribeToStream('session-CA1', a), subscribeToStream('session-CA1', b)]);
    publishers.get('session-CA1')!({ message: { data: { type: 'transcription', text: 'x' } } });
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('closes the stream when the last listener unsubscribes', async () => {
    mockToken(true);
    const { unsubscribe } = await subscribeToStream('session-CA1', vi.fn());
    unsubscribe();
    expect(streamCloses).toHaveBeenCalled();
  });
});
