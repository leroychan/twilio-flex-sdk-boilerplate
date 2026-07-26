import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the Twilio server SDK so the live-creds path is deterministic and offline.
vi.mock('twilio', () => {
  class TaskRouterGrant {
    constructor(public opts: unknown) {}
  }
  class AccessToken {
    grants: unknown[] = [];
    constructor(
      public accountSid: string,
      public apiKey: string,
      public apiSecret: string,
      public opts: { identity: string },
    ) {}
    addGrant(g: unknown) {
      this.grants.push(g);
    }
    toJwt() {
      return `LIVE.jwt.for.${this.opts.identity}`;
    }
    static TaskRouterGrant = TaskRouterGrant;
  }
  return { default: { jwt: { AccessToken } } };
});

import { POST } from '../route';

const ENV_KEYS = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_API_KEY',
  'TWILIO_API_SECRET',
  'TWILIO_WORKSPACE_SID',
  'TWILIO_WORKER_SID',
] as const;

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/token', () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const k of ENV_KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });
  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it('returns a clearly-marked stub token when creds are absent', async () => {
    const res = await POST(makeRequest({ identity: 'alice' }));
    const json = await res.json();
    expect(json.stub).toBe(true);
    expect(json.identity).toBe('alice');
    expect(json.token.startsWith('STUB.')).toBe(true);
  });

  it('defaults the identity when none is supplied', async () => {
    const res = await POST(makeRequest({}));
    const json = await res.json();
    expect(json.identity).toBe('demo-agent');
    expect(json.stub).toBe(true);
  });

  it('mints a live JWT when all creds are present', async () => {
    process.env.TWILIO_ACCOUNT_SID = 'ACxxxx';
    process.env.TWILIO_API_KEY = 'SKxxxx';
    process.env.TWILIO_API_SECRET = 'secret';
    process.env.TWILIO_WORKSPACE_SID = 'WSxxxx';
    process.env.TWILIO_WORKER_SID = 'WKxxxx';
    const res = await POST(makeRequest({ identity: 'bob' }));
    const json = await res.json();
    expect(json.stub).toBe(false);
    expect(json.token).toBe('LIVE.jwt.for.bob');
    expect(json.identity).toBe('bob');
  });
});
