import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { streamMessagesCreate, validateRequest, twilioClient } = vi.hoisted(() => {
  const streamMessagesCreate = vi.fn();
  const validateRequest = vi.fn(() => true);
  const twilioClient = {
    sync: { v1: { services: () => ({ syncStreams: () => ({ streamMessages: { create: (o: unknown) => streamMessagesCreate(o) } }) }) } },
  };
  return { streamMessagesCreate, validateRequest, twilioClient };
});

vi.mock('twilio', () => ({ default: Object.assign(vi.fn(() => twilioClient), { validateRequest }) }));

import { POST } from '../route';

const KEYS = ['TWILIO_ACCOUNT_SID', 'TWILIO_API_KEY', 'TWILIO_API_SECRET', 'TWILIO_SYNC_SERVICE_SID', 'TWILIO_AUTH_TOKEN', 'PUBLIC_BASE_URL'] as const;

function formReq(fields: Record<string, string>, sig = 'sig'): Request {
  const body = new URLSearchParams(fields).toString();
  return new Request('http://localhost/api/transcription/callback', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-twilio-signature': sig },
    body,
  });
}
function setLive() {
  process.env.TWILIO_ACCOUNT_SID = 'ACx';
  process.env.TWILIO_API_KEY = 'SKx';
  process.env.TWILIO_API_SECRET = 'sec';
  process.env.TWILIO_SYNC_SERVICE_SID = 'ISx';
}

describe('POST /api/transcription/callback', () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const k of KEYS) { saved[k] = process.env[k]; delete process.env[k]; }
    streamMessagesCreate.mockReset().mockResolvedValue({});
    validateRequest.mockReset().mockReturnValue(true);
    setLive();
  });
  afterEach(() => { for (const k of KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } });

  it('publishes a customer transcription (inbound track) and returns 200', async () => {
    const res = await POST(formReq({
      CallSid: 'CA1', Track: 'inbound_track', Final: 'true',
      TranscriptionData: JSON.stringify({ transcript: 'I need help' }),
    }));
    expect(res.status).toBe(200);
    expect(streamMessagesCreate).toHaveBeenCalledWith({
      data: { type: 'transcription', text: 'I need help', role: 'customer', isFinal: true },
    });
  });

  it('maps outbound track to agent', async () => {
    await POST(formReq({ CallSid: 'CA1', Track: 'outbound_track', Final: 'false', TranscriptionData: JSON.stringify({ transcript: 'Hi' }) }));
    expect(streamMessagesCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ role: 'agent', isFinal: false }) });
  });

  it('skips empty transcripts but still 200s', async () => {
    const res = await POST(formReq({ CallSid: 'CA1', Track: 'inbound_track', Final: 'true', TranscriptionData: JSON.stringify({ transcript: '' }) }));
    expect(res.status).toBe(200);
    expect(streamMessagesCreate).not.toHaveBeenCalled();
  });

  it('rejects a bad signature with 403 when auth token is set', async () => {
    process.env.TWILIO_AUTH_TOKEN = 'authy';
    validateRequest.mockReturnValue(false);
    const res = await POST(formReq({ CallSid: 'CA1', Track: 'inbound_track', Final: 'true', TranscriptionData: '{}' }));
    expect(res.status).toBe(403);
    expect(streamMessagesCreate).not.toHaveBeenCalled();
  });

  it('validates signature against PUBLIC_BASE_URL not request.url', async () => {
    process.env.TWILIO_AUTH_TOKEN = 'authy';
    process.env.PUBLIC_BASE_URL = 'https://example.ngrok.app';
    validateRequest.mockReturnValue(true);
    await POST(formReq({ CallSid: 'CA1', Track: 'inbound_track', Final: 'false', TranscriptionData: JSON.stringify({ transcript: 'hello' }) }));
    expect(validateRequest).toHaveBeenCalledWith(
      'authy',
      'sig',
      'https://example.ngrok.app/api/transcription/callback',
      expect.any(Object),
    );
  });

  it('falls back to request.url when PUBLIC_BASE_URL is not set', async () => {
    process.env.TWILIO_AUTH_TOKEN = 'authy';
    delete process.env.PUBLIC_BASE_URL;
    validateRequest.mockReturnValue(true);
    await POST(formReq({ CallSid: 'CA1', Track: 'inbound_track', Final: 'false', TranscriptionData: JSON.stringify({ transcript: 'hello' }) }));
    expect(validateRequest).toHaveBeenCalledWith(
      'authy',
      'sig',
      'http://localhost/api/transcription/callback',
      expect.any(Object),
    );
  });
});
