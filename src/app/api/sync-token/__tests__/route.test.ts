import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { POST } from '../route';

const KEYS = [
  'TWILIO_ACCOUNT_SID', 'TWILIO_API_KEY', 'TWILIO_API_SECRET',
  'TWILIO_SYNC_SERVICE_SID', 'TWILIO_FLEX_USERNAME',
] as const;

function req(body: unknown): Request {
  return new Request('http://localhost/api/sync-token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}
function setLive() {
  process.env.TWILIO_ACCOUNT_SID = 'ACxxxx';
  process.env.TWILIO_API_KEY = 'SKxxxx';
  process.env.TWILIO_API_SECRET = 'secret';
  process.env.TWILIO_SYNC_SERVICE_SID = 'ISxxxx';
}
function decode(jwt: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString('utf8'));
}

describe('POST /api/sync-token', () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => { for (const k of KEYS) { saved[k] = process.env[k]; delete process.env[k]; } });
  afterEach(() => { for (const k of KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } });

  it('returns 503 not configured when Sync env is absent', async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(503);
    expect((await res.json()).configured).toBe(false);
  });

  it('mints a Sync-granted token when configured', async () => {
    setLive();
    const res = await POST(req({ identity: 'alice' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.identity).toBe('alice');
    expect(json.syncServiceSid).toBe('ISxxxx');
    const payload = decode(json.token) as { grants?: Record<string, { service_sid?: string }> };
    expect(payload.grants?.data_sync?.service_sid).toBe('ISxxxx');
  });

  it('falls back to TWILIO_FLEX_USERNAME then flex-agent for identity', async () => {
    setLive();
    process.env.TWILIO_FLEX_USERNAME = 'lechan';
    expect((await (await POST(req({}))).json()).identity).toBe('lechan');
    delete process.env.TWILIO_FLEX_USERNAME;
    expect((await (await POST(req({}))).json()).identity).toBe('flex-agent');
  });
});
