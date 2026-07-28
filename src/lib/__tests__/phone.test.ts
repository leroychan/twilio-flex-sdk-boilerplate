import { describe, it, expect } from 'vitest';
import { formatPhone } from '../phone';

describe('formatPhone', () => {
  it('formats an 11-digit +1 number as +1 NNN-NNN-NNNN', () => {
    expect(formatPhone('+15623197825')).toBe('+1 562-319-7825');
  });

  it('formats a bare 10-digit number as NNN-NNN-NNNN', () => {
    expect(formatPhone('5623197825')).toBe('562-319-7825');
  });

  it('strips non-digit noise before formatting', () => {
    expect(formatPhone('+1 (562) 319-7825')).toBe('+1 562-319-7825');
  });

  it('returns the original value when it is not a recognizable NANP number', () => {
    expect(formatPhone('client:alice')).toBe('client:alice');
    expect(formatPhone('+448081570192')).toBe('+448081570192');
  });

  it('returns an empty string for empty input', () => {
    expect(formatPhone('')).toBe('');
    expect(formatPhone(null)).toBe('');
    expect(formatPhone(undefined)).toBe('');
  });
});
