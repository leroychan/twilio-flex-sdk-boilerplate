import { NextResponse } from 'next/server';
import type { FlexUsersResponse } from '@/lib/flex/types';
import { listFlexUsers } from '@/lib/flex/server/flexToken';

// Runs on the server. Lists the existing Flex users (with a linked worker) the
// login form can suggest. Stub mode returns an empty list — any username works.
export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const apiKey = process.env.TWILIO_API_KEY;
  const apiSecret = process.env.TWILIO_API_SECRET;

  if (!accountSid || !apiKey || !apiSecret) {
    const stub: FlexUsersResponse = { users: [], stub: true };
    return NextResponse.json(stub);
  }

  const users = await listFlexUsers({
    accountSid,
    apiKey,
    apiSecret,
    instanceSid: process.env.TWILIO_FLEX_INSTANCE_SID,
  });
  const live: FlexUsersResponse = { users, stub: false };
  return NextResponse.json(live);
}
