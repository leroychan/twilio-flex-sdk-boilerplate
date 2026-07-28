import { NextResponse } from 'next/server';
import type { TokenResponse } from '@/lib/flex/types';
import { mintFlexUserToken, listActivities, FlexTokenError } from '@/lib/flex/server/flexToken';

// Runs on the server. Live mode mints a real Flex-issued token via Flex SDK
// Authentication Option 3 (see src/lib/flex/server/flexToken.ts). When live
// creds are absent it returns a clearly-marked STUB token so the UI is
// developable offline.
export const runtime = 'nodejs';

function readEnv() {
  return {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    apiKey: process.env.TWILIO_API_KEY,
    apiSecret: process.env.TWILIO_API_SECRET,
    instanceSid: process.env.TWILIO_FLEX_INSTANCE_SID,
    defaultUsername: process.env.TWILIO_FLEX_USERNAME,
    workspaceSid: process.env.TWILIO_WORKSPACE_SID,
  };
}

function hasLiveCreds(env: ReturnType<typeof readEnv>): boolean {
  return Boolean(env.accountSid && env.apiKey && env.apiSecret);
}

function stubToken(identity: string): string {
  const payload = Buffer.from(
    JSON.stringify({ identity, stub: true, iat: Date.now() }),
  ).toString('base64url');
  return `STUB.${payload}.STUB`;
}

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as {
    username?: string;
    identity?: string;
  };
  const env = readEnv();
  const requested = (body.username ?? body.identity ?? '').trim();

  if (!hasLiveCreds(env)) {
    const identity = requested || 'demo-agent';
    const stub: TokenResponse = { token: stubToken(identity), identity, stub: true };
    return NextResponse.json(stub);
  }

  const username = requested || (env.defaultUsername ?? '').trim();
  if (!username) {
    return NextResponse.json({ error: 'username_required' }, { status: 400 });
  }

  try {
    const { token, identity } = await mintFlexUserToken(
      {
        accountSid: env.accountSid!,
        apiKey: env.apiKey!,
        apiSecret: env.apiSecret!,
        instanceSid: env.instanceSid,
      },
      username,
    );
    const activities = await listActivities(
      { apiKey: env.apiKey!, apiSecret: env.apiSecret! },
      env.workspaceSid,
    );
    const live: TokenResponse = { token, identity, stub: false, activities };
    return NextResponse.json(live);
  } catch (err) {
    if (err instanceof FlexTokenError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    return NextResponse.json({ error: 'flex_token_mint_failed' }, { status: 502 });
  }
}
