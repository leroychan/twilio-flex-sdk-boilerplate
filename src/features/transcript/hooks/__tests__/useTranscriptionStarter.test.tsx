import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { DEFAULT_TRANSCRIPTION_SETTINGS } from '@/store/slices/settings';

const { useFlexStore } = vi.hoisted(() => ({ useFlexStore: vi.fn() }));
vi.mock('@/store', () => ({ useFlexStore }));

import { useTranscriptionStarter } from '../useTranscriptionStarter';

type State = { call: { callSid: string | null; status: string }; transcription: typeof DEFAULT_TRANSCRIPTION_SETTINGS };
function mockState(state: State) {
  useFlexStore.mockImplementation((sel: (s: State) => unknown) => sel(state));
}

describe('useTranscriptionStarter', () => {
  beforeEach(() => {
    useFlexStore.mockReset();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ started: true }) } as Response)));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('POSTs start once when a call connects, with settings overrides', () => {
    mockState({ call: { callSid: 'CA1', status: 'connected' }, transcription: { ...DEFAULT_TRANSCRIPTION_SETTINGS, language: 'es-MX' } });
    const { rerender } = renderHook(() => useTranscriptionStarter());
    rerender();
    expect(fetch).toHaveBeenCalledTimes(1);
    const [, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(JSON.parse((init as RequestInit).body as string)).toMatchObject({ callSid: 'CA1', language: 'es-MX' });
  });

  it('does not fire when disabled', () => {
    mockState({ call: { callSid: 'CA1', status: 'connected' }, transcription: { ...DEFAULT_TRANSCRIPTION_SETTINGS, enabled: false } });
    renderHook(() => useTranscriptionStarter());
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does not fire when there is no connected call', () => {
    mockState({ call: { callSid: null, status: 'idle' }, transcription: { ...DEFAULT_TRANSCRIPTION_SETTINGS } });
    renderHook(() => useTranscriptionStarter());
    expect(fetch).not.toHaveBeenCalled();
  });
});
