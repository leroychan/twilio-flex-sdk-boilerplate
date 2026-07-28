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

  it('resolves a webchat name nested under pre_engagement_data', () => {
    const attrs = {
      channelType: 'web',
      from: 'FX0123456789abcdef0123456789abcdef',
      pre_engagement_data: { friendlyName: 'Jane Webchat', email: 'jane@example.com' },
    };
    expect(resolveTaskContact(attrs)).toEqual({ name: 'Jane Webchat', phone: null });
  });

  it('never returns a Twilio SID as the name or phone', () => {
    expect(resolveTaskContact({ name: 'FX0123456789abcdef0123456789abcdef' })).toEqual({
      name: null,
      phone: null,
    });
  });

  it('combines first and last name when present', () => {
    expect(resolveTaskContact({ first_name: 'Ada', last_name: 'Lovelace' }).name).toBe('Ada Lovelace');
  });

  it('reads a name from a nested customers block', () => {
    expect(resolveTaskContact({ customers: { name: 'Grace Hopper' } }).name).toBe('Grace Hopper');
  });

  it('does not descend into non-customer nested objects', () => {
    // A `name` buried in an unrelated block (e.g. conference metadata) must not win.
    expect(resolveTaskContact({ conference: { name: 'daily-standup' } }).name).toBeNull();
  });
});
