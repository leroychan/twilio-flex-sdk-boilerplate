import { NextResponse } from 'next/server';
import twilio from 'twilio';

// Node runtime: uses the twilio REST SDK (server-only). Never import
// @twilio/flex-sdk here — that library is browser-only.
export const runtime = 'nodejs';

function readEnv() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID ?? '';
  const apiKey = process.env.TWILIO_API_KEY ?? '';
  const apiSecret = process.env.TWILIO_API_SECRET ?? '';
  const syncServiceSid = process.env.TWILIO_SYNC_SERVICE_SID ?? '';
  const baseUrl = process.env.PUBLIC_BASE_URL ?? '';
  const configured = Boolean(accountSid && apiKey && apiSecret && syncServiceSid && baseUrl);
  return { accountSid, apiKey, apiSecret, syncServiceSid, baseUrl, configured };
}

const bool = (v: unknown, envVar: string | undefined, dflt: boolean): boolean =>
  typeof v === 'boolean' ? v : envVar != null ? envVar !== 'false' : dflt;
const str = (v: unknown, envVar: string | undefined, dflt: string): string =>
  typeof v === 'string' && v.trim() ? v : envVar && envVar.trim() ? envVar : dflt;

interface StartBody {
  callSid?: string;
  language?: string;
  engine?: string;
  speechModel?: string;
  partialResults?: boolean;
  profanityFilter?: boolean;
  punctuation?: boolean;
  hints?: string;
}

export async function POST(request: Request): Promise<Response> {
  const env = readEnv();
  if (!env.configured) return NextResponse.json({ configured: false }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as StartBody;
  const callSid = body.callSid?.trim();
  if (!callSid) return NextResponse.json({ error: 'callSid_required' }, { status: 400 });

  const languageCode = str(body.language, process.env.TRANSCRIPTION_LANGUAGE, 'en-US');
  const transcriptionEngine = str(body.engine, process.env.TRANSCRIPTION_ENGINE, 'google');
  const speechModel = str(body.speechModel, process.env.TRANSCRIPTION_SPEECH_MODEL, 'telephony');
  const partialResults = bool(body.partialResults, process.env.TRANSCRIPTION_PARTIAL_RESULTS, true);
  const profanityFilter = bool(body.profanityFilter, process.env.TRANSCRIPTION_PROFANITY_FILTER, true);
  const enableAutomaticPunctuation = bool(body.punctuation, process.env.TRANSCRIPTION_PUNCTUATION, true);
  const hints = str(body.hints, process.env.TRANSCRIPTION_HINTS, '');

  const client = twilio(env.apiKey, env.apiSecret, { accountSid: env.accountSid });

  // Ensure the per-call Sync stream exists (idempotent: swallow "already exists").
  try {
    await client.sync.v1.services(env.syncServiceSid).syncStreams.create({
      uniqueName: `session-${callSid}`,
      ttl: 14400,
    });
  } catch {
    // stream already exists (409) or transient — publishing tolerates this
  }

  try {
    await client.calls(callSid).transcriptions.create({
      track: 'both_tracks',
      inboundTrackLabel: 'customer',
      outboundTrackLabel: 'agent',
      languageCode,
      transcriptionEngine,
      speechModel,
      partialResults,
      profanityFilter,
      enableAutomaticPunctuation,
      ...(hints ? { hints } : {}),
      statusCallbackUrl: `${env.baseUrl}/api/transcription/callback`,
    });
    return NextResponse.json({ started: true });
  } catch (err) {
    if ((err as { status?: number }).status === 409) {
      return NextResponse.json({ started: false }); // already running
    }
    return NextResponse.json({ error: 'transcription_start_failed' }, { status: 502 });
  }
}
