import { describe, it, expect } from 'vitest';
import { toTranscriptEntry } from '../transcriptMessage';

const now = () => '2026-07-28T00:00:00.000Z';

describe('toTranscriptEntry', () => {
  it('maps an agent transcription', () => {
    const e = toTranscriptEntry({ type: 'transcription', text: 'Hello', role: 'agent' }, 'CA1', 0, now);
    expect(e).toEqual({ id: 'CA1-0', role: 'agent', speaker: 'agent', text: 'Hello', at: now() });
  });
  it('maps customer synonyms to customer', () => {
    expect(toTranscriptEntry({ type: 'transcription', text: 'Hi', role: 'end-user' }, 'CA1', 1, now)?.role).toBe('customer');
  });
  it('maps unknown roles to other', () => {
    expect(toTranscriptEntry({ type: 'transcription', text: 'Hi', role: 'ivr' }, 'CA1', 2, now)?.role).toBe('other');
  });
  it('drops non-transcription messages', () => {
    expect(toTranscriptEntry({ type: 'realtimeCintel' }, 'CA1', 0, now)).toBeNull();
  });
  it('drops interim (isFinal:false) and empty text', () => {
    expect(toTranscriptEntry({ type: 'transcription', text: 'x', role: 'agent', isFinal: false }, 'CA1', 0, now)).toBeNull();
    expect(toTranscriptEntry({ type: 'transcription', text: '   ', role: 'agent' }, 'CA1', 0, now)).toBeNull();
  });
});
