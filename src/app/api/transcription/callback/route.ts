import { NextResponse } from 'next/server';
import twilio from 'twilio';

export const runtime = 'nodejs';

function readEnv() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID ?? '';
  const apiKey = process.env.TWILIO_API_KEY ?? '';
  const apiSecret = process.env.TWILIO_API_SECRET ?? '';
  const syncServiceSid = process.env.TWILIO_SYNC_SERVICE_SID ?? '';
  const authToken = process.env.TWILIO_AUTH_TOKEN ?? '';
  const configured = Boolean(accountSid && apiKey && apiSecret && syncServiceSid);
  return { accountSid, apiKey, apiSecret, syncServiceSid, authToken, configured };
}

// Track→role for transcription attached to the AGENT's call leg (the leg Flex
// resolves via GetCallByTask on accept, auto-answered as the agent's WebRTC leg).
// On that leg Twilio's `inbound_track` is the audio it RECEIVES from the agent's
// mic, and `outbound_track` is what it plays back TO the agent — i.e. the
// customer. This is the mirror of the customer leg; if you ever transcribe the
// customer leg instead, swap these two.
function roleFromTrack(track: string): 'agent' | 'customer' {
  return track === 'inbound_track' ? 'agent' : 'customer';
}

export async function POST(request: Request): Promise<Response> {
  const env = readEnv();
  const raw = await request.text();
  const params = Object.fromEntries(new URLSearchParams(raw));

  // Validate Twilio's signature when we have an auth token; skip in pure dev/stub.
  // Use PUBLIC_BASE_URL to match what /start registered as statusCallbackUrl;
  // fall back to request.url only when PUBLIC_BASE_URL is unset (e.g. pure dev).
  if (env.authToken) {
    const signature = request.headers.get('x-twilio-signature') ?? '';
    const url = process.env.PUBLIC_BASE_URL
      ? `${process.env.PUBLIC_BASE_URL}/api/transcription/callback`
      : request.url;
    const ok = twilio.validateRequest(env.authToken, signature, url, params);
    if (!ok) return NextResponse.json({ error: 'bad_signature' }, { status: 403 });
  }

  if (!env.configured) return NextResponse.json({ ok: true }); // nothing to publish to

  try {
    const callSid = params.CallSid;
    const track = params.Track ?? 'outbound_track';
    const isFinal = params.Final === 'true';
    let text = '';
    try {
      text = (JSON.parse(params.TranscriptionData ?? '{}') as { transcript?: string }).transcript ?? '';
    } catch {
      text = '';
    }
    text = text.trim();

    // TEMP DIAGNOSTIC — remove once the pipeline is confirmed.
    console.log('[transcription/callback]', {
      event: params.TranscriptionEvent,
      callSid,
      track,
      final: params.Final,
      isFinal,
      textLen: text.length,
      text: text.slice(0, 60),
      stream: `session-${callSid}`,
    });
    if (params.TranscriptionEvent === 'transcription-error') {
      console.error('[transcription/callback] ERROR EVENT — raw params:', params);
    }

    if (callSid && text) {
      const client = twilio(env.apiKey, env.apiSecret, { accountSid: env.accountSid });
      await client.sync.v1
        .services(env.syncServiceSid)
        .syncStreams(`session-${callSid}`)
        .streamMessages.create({
          data: { type: 'transcription', text, role: roleFromTrack(track), isFinal },
        });
      console.log('[transcription/callback] published OK →', `session-${callSid}`);
    }
  } catch (err) {
    // Never fail the callback back to Twilio — log-and-swallow in real code.
    console.error('[transcription/callback] publish FAILED:', (err as Error)?.message, err);
  }
  return NextResponse.json({ ok: true });
}
