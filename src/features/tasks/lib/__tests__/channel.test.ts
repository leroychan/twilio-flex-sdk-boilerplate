import { describe, it, expect } from 'vitest';
import { resolveChannel } from '../channel';

describe('resolveChannel', () => {
  it('prefers attributes.channelType over the task channel name', () => {
    expect(resolveChannel('chat', { channelType: 'whatsapp' })).toBe('whatsapp');
  });

  it('falls back to attributes.channel', () => {
    expect(resolveChannel('messaging', { channel: 'sms' })).toBe('sms');
  });

  it('detects whatsapp from a whatsapp: address prefix', () => {
    expect(resolveChannel('chat', { from: 'whatsapp:+14155238886' })).toBe('whatsapp');
  });

  it('detects sms/messenger from address prefixes', () => {
    expect(resolveChannel('chat', { from: 'messenger:123' })).toBe('messenger');
  });

  it('falls back to the task channel name when attributes say nothing', () => {
    expect(resolveChannel('voice', {})).toBe('voice');
    expect(resolveChannel('voice', undefined)).toBe('voice');
  });

  it('normalizes case and whitespace', () => {
    expect(resolveChannel('chat', { channelType: '  WhatsApp ' })).toBe('whatsapp');
  });

  it('ignores non-string attribute values', () => {
    expect(resolveChannel('sms', { channelType: 42 })).toBe('sms');
  });
});
