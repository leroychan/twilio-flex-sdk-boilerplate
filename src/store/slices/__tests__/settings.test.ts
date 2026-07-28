import { describe, it, expect } from 'vitest';
import { createSettingsSlice, DEFAULT_TRANSCRIPTION_SETTINGS } from '../settings';

function makeStore() {
  let state: ReturnType<typeof createSettingsSlice>;
  const set = (fn: (s: typeof state) => Partial<typeof state>) => {
    state = { ...state, ...fn(state) };
  };
  const get = () => state;
  state = createSettingsSlice(set as never, get as never, {} as never);
  return { get };
}

describe('settings slice', () => {
  it('defaults transcription to enabled en-US google', () => {
    const { get } = makeStore();
    expect(get().transcription).toEqual(DEFAULT_TRANSCRIPTION_SETTINGS);
    expect(get().transcription.enabled).toBe(true);
    expect(get().transcription.language).toBe('en-US');
  });

  it('merges a partial patch', () => {
    const { get } = makeStore();
    get().setTranscriptionSettings({ enabled: false, language: 'es-MX' });
    expect(get().transcription.enabled).toBe(false);
    expect(get().transcription.language).toBe('es-MX');
    expect(get().transcription.engine).toBe('google'); // untouched
  });
});
