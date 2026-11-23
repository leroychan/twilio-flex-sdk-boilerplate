import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { listFlexUsers } = vi.hoisted(() => ({ listFlexUsers: vi.fn() }));
vi.mock('@/lib/flex/server/flexToken', () => ({ listFlexUsers }));

import { GET } from '../route';

const ENV_KEYS = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_API_KEY',
  'TWILIO_API_SECRET',
  'TWILIO_FLEX_INSTANCE_SID',
] as const;

describe('GET /api/flex-users', () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const k of ENV_KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
    listFlexUsers.mockReset();
  });
  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it('returns an empty stub list without calling Twilio when live creds are absent', async () => {
    const res = await GET();
    expect(await res.json()).toEqual({ users: [], stub: true });
    expect(listFlexUsers).not.toHaveBeenCalled();
  });

  it('returns the selectable Flex users in live mode', async () => {
    process.env.TWILIO_ACCOUNT_SID = 'ACxxxx';
    process.env.TWILIO_API_KEY = 'SKxxxx';
    process.env.TWILIO_API_SECRET = 'secret';
    process.env.TWILIO_FLEX_INSTANCE_SID = 'GO1';
    listFlexUsers.mockResolvedValue([{ username: 'ann', fullName: 'Ann A' }]);

    const res = await GET();
    expect(await res.json()).toEqual({
      users: [{ username: 'ann', fullName: 'Ann A' }],
      stub: false,
    });
    expect(listFlexUsers).toHaveBeenCalledWith({
      accountSid: 'ACxxxx',
      apiKey: 'SKxxxx',
      apiSecret: 'secret',
      instanceSid: 'GO1',
    });
  });
});
