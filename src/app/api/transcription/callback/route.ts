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

function roleFromTrack(track: string): 'agent' | 'customer' {
  return track === 'inbound_track' ? 'customer' : 'agent';
}

export async function POST(request: Request): Promise<Response> {
  const env = readEnv();
  const raw = await request.text();
  const params = Object.fromEntries(new URLSearchParams(raw));

  // Validate Twilio's signature when we have an auth token; skip in pure dev/stub.
  if (env.authToken) {
    const signature = request.headers.get('x-twilio-signature') ?? '';
    const url = request.url;
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

    if (callSid && text) {
      const client = twilio(env.apiKey, env.apiSecret, { accountSid: env.accountSid });
      await client.sync.v1
        .services(env.syncServiceSid)
        .syncStreams(`session-${callSid}`)
        .streamMessages.create({
          data: { type: 'transcription', text, role: roleFromTrack(track), isFinal },
        });
    }
  } catch {
    // Never fail the callback back to Twilio — log-and-swallow in real code.
  }
  return NextResponse.json({ ok: true });
}
