import { describe, it, expect, beforeEach, vi } from 'vitest';

const createClient = vi.fn();

vi.mock('@twilio/flex-sdk', () => ({
  createClient: (...args: unknown[]) => createClient(...args),
}));

import { initFlexClient, getFlexClient, resetFlexClient } from '../client';

describe('flex client singleton', () => {
  beforeEach(() => {
    resetFlexClient();
    createClient.mockReset();
  });

  it('returns null before initialization', () => {
    expect(getFlexClient()).toBeNull();
  });

  it('creates the client once and exposes it via getFlexClient', async () => {
    const fake = { id: 'client-1' };
    createClient.mockResolvedValue(fake);

    const c = await initFlexClient('tok-123');

    expect(c).toBe(fake);
    expect(getFlexClient()).toBe(fake);
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledWith(
      'tok-123',
      expect.objectContaining({
        logger: { level: 'info' },
        voiceOptions: { autoAcceptIncomingCalls: false },
        session: expect.objectContaining({ autoUpdateToken: false }),
      }),
    );
  });

  it('does not re-create the client on subsequent calls', async () => {
    const fake = { id: 'client-1' };
    createClient.mockResolvedValue(fake);

    const first = await initFlexClient('tok-123');
    const second = await initFlexClient('tok-456');

    expect(second).toBe(first);
    expect(createClient).toHaveBeenCalledTimes(1);
  });

  it('passes session refresh options through and enables autoUpdateToken with a refresh token', async () => {
    createClient.mockResolvedValue({});
    await initFlexClient('tok', { refreshToken: 'r1', ssoProfileSid: 'sso1' });
    expect(createClient).toHaveBeenCalledWith(
      'tok',
      expect.objectContaining({
        session: { autoUpdateToken: true, refreshToken: 'r1', ssoProfileSid: 'sso1' },
      }),
    );
  });

  it('clears the failed init promise so a later call can retry', async () => {
    createClient.mockRejectedValueOnce(new Error('boom'));
    await expect(initFlexClient('tok')).rejects.toThrow('boom');
    createClient.mockResolvedValue({ id: 'ok' });
    const c = await initFlexClient('tok');
    expect(c).toEqual({ id: 'ok' });
  });
});
