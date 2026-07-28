import { describe, it, expect } from 'vitest';
import { resolveTaskContact } from '../taskContact';

describe('resolveTaskContact', () => {
  it('reads the caller number from the `from` attribute', () => {
    expect(resolveTaskContact({ from: '+15623197825' })).toEqual({
      name: null,
      phone: '+15623197825',
    });
  });

  it('reads a display name from `name`', () => {
    expect(resolveTaskContact({ name: 'Ada Lovelace', from: '+15551230000' })).toEqual({
      name: 'Ada Lovelace',
      phone: '+15551230000',
    });
  });

  it('falls back through common name/phone attribute aliases', () => {
    expect(resolveTaskContact({ customerName: 'Grace', caller: '+15557654321' })).toEqual({
      name: 'Grace',
      phone: '+15557654321',
    });
    expect(resolveTaskContact({ customer_name: 'Alan', customerAddress: 'client:alan' })).toEqual({
      name: 'Alan',
      phone: 'client:alan',
    });
  });

  it('returns nulls when nothing identifying is present', () => {
    expect(resolveTaskContact({})).toEqual({ name: null, phone: null });
    expect(resolveTaskContact(undefined)).toEqual({ name: null, phone: null });
  });

  it('ignores non-string attribute values', () => {
    expect(resolveTaskContact({ name: 42, from: { nested: true } })).toEqual({
      name: null,
      phone: null,
    });
  });
});
