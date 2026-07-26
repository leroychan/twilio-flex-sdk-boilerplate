import { NextResponse } from 'next/server';
import twilio from 'twilio';
import type { TokenResponse } from '@/lib/flex/types';

// This route runs on the server. It mints a Flex access token from env vars.
// STUB-READY: when live creds are absent it returns a clearly-marked mock token
// so the UI and plugins are developable without a live Twilio account. Swapping
// in real creds (see .env.example) requires no code changes elsewhere.

export const runtime = 'nodejs';

function readEnv() {
  return {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    apiKey: process.env.TWILIO_API_KEY,
    apiSecret: process.env.TWILIO_API_SECRET,
    workspaceSid: process.env.TWILIO_WORKSPACE_SID,
    workerSid: process.env.TWILIO_WORKER_SID,
  };
}

function hasLiveCreds(env: ReturnType<typeof readEnv>): boolean {
  return Boolean(env.accountSid && env.apiKey && env.apiSecret && env.workspaceSid);
}

function stubToken(identity: string): string {
  const payload = Buffer.from(
    JSON.stringify({ identity, stub: true, iat: Date.now() }),
  ).toString('base64url');
  // TODO: replace by providing live creds in .env.local — see .env.example.
  return `STUB.${payload}.STUB`;
}

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as {
    identity?: string;
    workerSid?: string;
  };
  const identity = body.identity && body.identity.trim() ? body.identity.trim() : 'demo-agent';
  const env = readEnv();

  if (!hasLiveCreds(env)) {
    const stub: TokenResponse = { token: stubToken(identity), identity, stub: true };
    return NextResponse.json(stub);
  }

  const AccessToken = twilio.jwt.AccessToken;
  const TaskRouterGrant = AccessToken.TaskRouterGrant;
  const token = new AccessToken(env.accountSid!, env.apiKey!, env.apiSecret!, { identity });
  token.addGrant(
    new TaskRouterGrant({
      workspaceSid: env.workspaceSid!,
      workerSid: body.workerSid ?? env.workerSid ?? env.workspaceSid!,
      role: 'worker',
    }),
  );

  const live: TokenResponse = { token: token.toJwt(), identity, stub: false };
  return NextResponse.json(live);
}
