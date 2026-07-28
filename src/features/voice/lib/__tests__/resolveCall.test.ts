import { describe, it, expect, vi } from 'vitest';
import { resolveCallByTask, attachCallDisconnect } from '../resolveCall';

const noSleep = () => Promise.resolve();

describe('resolveCallByTask', () => {
  it('resolves { kind: "call" } as soon as a call appears', async () => {
    const call = { call: {} };
    const getCall = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(call);
    const result = await resolveCallByTask('WT1', { getCall, sleep: noSleep, attempts: 5 });
    expect(result).toEqual({ kind: 'call', call });
    expect(getCall).toHaveBeenCalledTimes(2);
  });

  it('retries up to `attempts` then resolves { kind: "none" } when no call ever appears', async () => {
    const getCall = vi.fn().mockResolvedValue(null);
    const result = await resolveCallByTask('WT1', { getCall, sleep: noSleep, attempts: 3 });
    expect(result).toEqual({ kind: 'none' });
    expect(getCall).toHaveBeenCalledTimes(3);
  });

  it('classifies a persistent "different voice device" error as { kind: "otherDevice" }', async () => {
    const getCall = vi.fn().mockRejectedValue(new Error('Call is active on a different voice device'));
    const result = await resolveCallByTask('WT1', { getCall, sleep: noSleep, attempts: 2 });
    expect(result).toEqual({ kind: 'otherDevice' });
  });

  it('bails out early with { kind: "cancelled" } when isCancelled() is true', async () => {
    const getCall = vi.fn().mockResolvedValue(null);
    const result = await resolveCallByTask('WT1', {
      getCall,
      sleep: noSleep,
      attempts: 5,
      isCancelled: () => true,
    });
    expect(result).toEqual({ kind: 'cancelled' });
    expect(getCall).not.toHaveBeenCalled();
  });
});

describe('attachCallDisconnect', () => {
  it('binds a self-detaching disconnect listener to the raw .call emitter', () => {
    const handlers: Record<string, () => void> = {};
    const raw = {
      on: (e: string, cb: () => void) => { handlers[e] = cb; },
      off: vi.fn((e: string) => { delete handlers[e]; }),
    };
    const handler = vi.fn();
    const detach = attachCallDisconnect({ call: raw } as never, handler);

    handlers.disconnect?.();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(raw.off).toHaveBeenCalledWith('disconnect', expect.any(Function));

    detach(); // idempotent, must not throw
  });
});
