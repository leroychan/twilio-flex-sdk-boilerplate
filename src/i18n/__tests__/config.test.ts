import { describe, it, expect } from 'vitest';
import { isLocale, locales, defaultLocale, LOCALE_COOKIE } from '../config';

describe('locale config', () => {
  it('recognises supported locales', () => {
    expect(isLocale('en')).toBe(true);
    expect(isLocale('es')).toBe(true);
  });

  it('rejects unsupported values and non-strings', () => {
    expect(isLocale('fr')).toBe(false);
    expect(isLocale(undefined)).toBe(false);
    expect(isLocale(42)).toBe(false);
  });

  it('defaults to en, lists en first, and names the cookie', () => {
    expect(defaultLocale).toBe('en');
    expect(locales[0]).toBe('en');
    expect(LOCALE_COOKIE).toBe('NEXT_LOCALE');
  });
});
