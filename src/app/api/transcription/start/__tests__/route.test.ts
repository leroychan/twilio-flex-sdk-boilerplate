import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const transcriptionsCreate = vi.fn();
const syncStreamsCreate = vi.fn();
const twilioClient = {
  calls: (sid: string) => ({ transcriptions: { create: (o: unknown) => transcriptionsCreate(sid, o) } }),
  sync: { v1: { services: () => ({ syncStreams: { create: (o: unknown) => syncStreamsCreate(o) } }) } },
};
vi.mock('twilio', () => ({ default: vi.fn(() => twilioClient) }));

import { POST } from '../route';

const KEYS = [
  'TWILIO_ACCOUNT_SID', 'TWILIO_API_KEY', 'TWILIO_API_SECRET',
  'TWILIO_SYNC_SERVICE_SID', 'PUBLIC_BASE_URL',
  'TRANSCRIPTION_LANGUAGE', 'TRANSCRIPTION_ENGINE',
] as const;

function req(body: unknown): Request {
  return new Request('http://localhost/api/transcription/start', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
}
function setLive() {
  process.env.TWILIO_ACCOUNT_SID = 'ACx';
  process.env.TWILIO_API_KEY = 'SKx';
  process.env.TWILIO_API_SECRET = 'sec';
  process.env.TWILIO_SYNC_SERVICE_SID = 'ISx';
  process.env.PUBLIC_BASE_URL = 'https://demo.test';
}

describe('POST /api/transcription/start', () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const k of KEYS) { saved[k] = process.env[k]; delete process.env[k]; }
    transcriptionsCreate.mockReset().mockResolvedValue({});
    syncStreamsCreate.mockReset().mockResolvedValue({});
  });
  afterEach(() => { for (const k of KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } });

  it('503s when unconfigured', async () => {
    const res = await POST(req({ callSid: 'CA1' }));
    expect(res.status).toBe(503);
    expect((await res.json()).configured).toBe(false);
    expect(transcriptionsCreate).not.toHaveBeenCalled();
  });

  it('ensures the stream and starts transcription with callback + labels + defaults', async () => {
    setLive();
    const res = await POST(req({ callSid: 'CA1' }));
    expect(res.status).toBe(200);
    expect((await res.json()).started).toBe(true);
    expect(syncStreamsCreate).toHaveBeenCalledWith(expect.objectContaining({ uniqueName: 'session-CA1' }));
    expect(transcriptionsCreate).toHaveBeenCalledWith('CA1', expect.objectContaining({
      track: 'both_tracks',
      inboundTrackLabel: 'customer',
      outboundTrackLabel: 'agent',
      languageCode: 'en-US',
      transcriptionEngine: 'google',
      statusCallbackUrl: 'https://demo.test/api/transcription/callback',
    }));
  });

  it('applies body overrides over env and defaults', async () => {
    setLive();
    process.env.TRANSCRIPTION_ENGINE = 'deepgram';
    await POST(req({ callSid: 'CA1', language: 'es-MX' }));
    expect(transcriptionsCreate).toHaveBeenCalledWith('CA1', expect.objectContaining({
      languageCode: 'es-MX',        // body override
      transcriptionEngine: 'deepgram', // env over default
    }));
  });

  it('treats an already-running transcription (409) as started:false, still 200', async () => {
    setLive();
    transcriptionsCreate.mockRejectedValue({ status: 409 });
    const res = await POST(req({ callSid: 'CA1' }));
    expect(res.status).toBe(200);
    expect((await res.json()).started).toBe(false);
  });
});
