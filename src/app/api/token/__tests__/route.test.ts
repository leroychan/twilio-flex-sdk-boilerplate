import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { mintFlexUserToken, listActivities } = vi.hoisted(() => ({
  mintFlexUserToken: vi.fn(),
  listActivities: vi.fn(),
}));
vi.mock('@/lib/flex/server/flexToken', () => {
  class FlexTokenError extends Error {
    code: string;
    status: number;
    constructor(code: string, status: number) {
      super(code);
      this.code = code;
      this.status = status;
    }
  }
  return { mintFlexUserToken, listActivities, FlexTokenError };
});

import { POST } from '../route';
import { FlexTokenError } from '@/lib/flex/server/flexToken';

const ENV_KEYS = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_API_KEY',
  'TWILIO_API_SECRET',
  'TWILIO_WORKSPACE_SID',
  'TWILIO_WORKER_SID',
  'TWILIO_FLEX_INSTANCE_SID',
  'TWILIO_FLEX_USERNAME',
] as const;

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function setLiveCreds() {
  process.env.TWILIO_ACCOUNT_SID = 'ACxxxx';
  process.env.TWILIO_API_KEY = 'SKxxxx';
  process.env.TWILIO_API_SECRET = 'secret';
}

describe('POST /api/token', () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const k of ENV_KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
    mintFlexUserToken.mockReset();
    listActivities.mockReset();
    listActivities.mockResolvedValue([]);
  });
  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it('returns a stub token when creds are absent', async () => {
    const res = await POST(makeRequest({ username: 'alice' }));
    const json = await res.json();
    expect(json.stub).toBe(true);
    expect(json.identity).toBe('alice');
    expect(json.token.startsWith('STUB.')).toBe(true);
  });

  it('defaults the identity in stub mode when none supplied', async () => {
    const res = await POST(makeRequest({}));
    const json = await res.json();
    expect(json.identity).toBe('demo-agent');
    expect(json.stub).toBe(true);
  });

  it('mints a live Flex token when creds present and username supplied', async () => {
    setLiveCreds();
    mintFlexUserToken.mockResolvedValue({ token: 'REAL.jwt', identity: 'bob' });
    const res = await POST(makeRequest({ username: 'bob' }));
    const json = await res.json();
    expect(json.stub).toBe(false);
    expect(json.token).toBe('REAL.jwt');
    expect(json.identity).toBe('bob');
    expect(mintFlexUserToken).toHaveBeenCalledWith(
      expect.objectContaining({ accountSid: 'ACxxxx', apiKey: 'SKxxxx', apiSecret: 'secret' }),
      'bob',
    );
  });

  it('does not include activities on a stub token response', async () => {
    const res = await POST(makeRequest({ username: 'alice' }));
    const json = await res.json();
    expect(json.stub).toBe(true);
    expect(json.activities).toBeUndefined();
    expect(listActivities).not.toHaveBeenCalled();
  });

  it('includes prefetched activities on the live token response', async () => {
    setLiveCreds();
    process.env.TWILIO_WORKSPACE_SID = 'WSxxx';
    mintFlexUserToken.mockResolvedValue({ token: 'REAL.jwt', identity: 'bob' });
    listActivities.mockResolvedValue([
      { sid: 'WA1', name: 'Available', available: true },
      { sid: 'WA2', name: 'Offline', available: false },
    ]);
    const res = await POST(makeRequest({ username: 'bob' }));
    const json = await res.json();
    expect(json.stub).toBe(false);
    expect(json.activities).toEqual([
      { sid: 'WA1', name: 'Available', available: true },
      { sid: 'WA2', name: 'Offline', available: false },
    ]);
    expect(listActivities).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'SKxxxx', apiSecret: 'secret' }),
      'WSxxx',
    );
  });

  it('falls back to TWILIO_FLEX_USERNAME when body omits username', async () => {
    setLiveCreds();
    process.env.TWILIO_FLEX_USERNAME = 'lechan';
    mintFlexUserToken.mockResolvedValue({ token: 'REAL.jwt', identity: 'lechan' });
    const res = await POST(makeRequest({}));
    const json = await res.json();
    expect(json.identity).toBe('lechan');
    expect(mintFlexUserToken).toHaveBeenCalledWith(expect.anything(), 'lechan');
  });

  it('returns 400 username_required when no username anywhere', async () => {
    setLiveCreds();
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('username_required');
    expect(mintFlexUserToken).not.toHaveBeenCalled();
  });

  it('passes through FlexTokenError status/code', async () => {
    setLiveCreds();
    mintFlexUserToken.mockRejectedValue(new FlexTokenError('flex_user_not_found', 404));
    const res = await POST(makeRequest({ username: 'ghost' }));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('flex_user_not_found');
  });
});
