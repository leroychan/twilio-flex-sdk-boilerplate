import { NextResponse } from 'next/server';
import twilio from 'twilio';

// Node runtime: uses the twilio JWT helper (server-only). Never import
// @twilio/flex-sdk or twilio-sync here — those are browser-only.
export const runtime = 'nodejs';

function readEnv() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID ?? '';
  const apiKey = process.env.TWILIO_API_KEY ?? '';
  const apiSecret = process.env.TWILIO_API_SECRET ?? '';
  const syncServiceSid = process.env.TWILIO_SYNC_SERVICE_SID ?? '';
  const missing = [
    !accountSid && 'TWILIO_ACCOUNT_SID',
    !apiKey && 'TWILIO_API_KEY',
    !apiSecret && 'TWILIO_API_SECRET',
    !syncServiceSid && 'TWILIO_SYNC_SERVICE_SID',
  ].filter(Boolean) as string[];
  return { accountSid, apiKey, apiSecret, syncServiceSid, missing };
}

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as { identity?: string };
  const env = readEnv();
  if (env.missing.length > 0) {
    return NextResponse.json(
      { configured: false, error: `Sync not configured. Missing: ${env.missing.join(', ')}` },
      { status: 503 },
    );
  }

  const identity =
    body.identity?.trim() || process.env.TWILIO_FLEX_USERNAME?.trim() || 'flex-agent';

  const { AccessToken } = twilio.jwt;
  const token = new AccessToken(env.accountSid, env.apiKey, env.apiSecret, { identity, ttl: 3600 });
  token.addGrant(new AccessToken.SyncGrant({ serviceSid: env.syncServiceSid }));

  return NextResponse.json({ token: token.toJwt(), identity, syncServiceSid: env.syncServiceSid });
}
