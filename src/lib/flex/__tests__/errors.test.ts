import { describe, it, expect } from 'vitest';
import { normalizeFlexError } from '../errors';

describe('normalizeFlexError', () => {
  it('maps a FlexSdkError-shaped object', () => {
    const out = normalizeFlexError({ code: 20001, message: 'Nope', severity: 'warning' });
    expect(out).toEqual({ code: '20001', severity: 'warning', message: 'Nope' });
  });

  it('defaults severity to error and code to unknown_error', () => {
    const out = normalizeFlexError({ message: 'Broke' });
    expect(out).toEqual({ code: 'unknown_error', severity: 'error', message: 'Broke' });
  });

  it('handles a plain Error', () => {
    const out = normalizeFlexError(new Error('kaboom'));
    expect(out.code).toBe('unknown_error');
    expect(out.severity).toBe('error');
    expect(out.message).toBe('kaboom');
  });

  it('handles a string and unknown values', () => {
    expect(normalizeFlexError('bad').message).toBe('bad');
    expect(normalizeFlexError(null).message).toBe('An unexpected error occurred.');
  });
});
