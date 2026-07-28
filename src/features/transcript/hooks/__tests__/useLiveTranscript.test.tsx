import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const { subscribeToStream } = vi.hoisted(() => ({ subscribeToStream: vi.fn() }));
vi.mock('@/lib/sync/client', () => ({ subscribeToStream }));

import { useLiveTranscript } from '../useLiveTranscript';

type Handler = (msg: unknown) => void;

describe('useLiveTranscript', () => {
  beforeEach(() => subscribeToStream.mockReset());

  it('is idle with no callSid', () => {
    const { result } = renderHook(() => useLiveTranscript(null));
    expect(result.current.status).toBe('idle');
    expect(subscribeToStream).not.toHaveBeenCalled();
  });

  it('accumulates final transcription entries', async () => {
    let handler: Handler = () => {};
    subscribeToStream.mockImplementation(async (_name: string, h: Handler) => {
      handler = h;
      return { unsubscribe: vi.fn(), configured: true };
    });
    const { result } = renderHook(() => useLiveTranscript('CA1'));
    await waitFor(() => expect(result.current.status).toBe('listening'));
    act(() => handler({ type: 'transcription', text: 'Hello', role: 'customer' }));
    await waitFor(() => expect(result.current.entries).toHaveLength(1));
    expect(result.current.entries[0].text).toBe('Hello');
  });

  it('reports not_configured when the client is unconfigured', async () => {
    subscribeToStream.mockResolvedValue({ unsubscribe: vi.fn(), configured: false });
    const { result } = renderHook(() => useLiveTranscript('CA1'));
    await waitFor(() => expect(result.current.status).toBe('not_configured'));
  });

  it('resets entries when callSid changes', async () => {
    let handler: Handler = () => {};
    subscribeToStream.mockImplementation(async (_n: string, h: Handler) => {
      handler = h;
      return { unsubscribe: vi.fn(), configured: true };
    });
    const { result, rerender } = renderHook(({ sid }) => useLiveTranscript(sid), {
      initialProps: { sid: 'CA1' },
    });
    await waitFor(() => expect(result.current.status).toBe('listening'));
    act(() => handler({ type: 'transcription', text: 'A', role: 'agent' }));
    await waitFor(() => expect(result.current.entries).toHaveLength(1));
    rerender({ sid: 'CA2' });
    await waitFor(() => expect(result.current.entries).toHaveLength(0));
  });
});
