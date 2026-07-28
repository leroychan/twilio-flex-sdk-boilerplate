'use client';

import { exchangeToken } from '@twilio/flex-sdk';
import type { TokenResponse } from './types';

export async function requestToken(username?: string): Promise<TokenResponse> {
  const res = await fetch('/api/token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username }),
  });
  if (!res.ok) {
    let code = 'token_request_failed';
    try {
      const j = (await res.json()) as { error?: string };
      if (j?.error) code = j.error;
    } catch {
      // ignore non-JSON error bodies
    }
    throw new Error(code);
  }
  return (await res.json()) as TokenResponse;
}

export async function exchangeSsoToken(params: {
  ssoProfileSid: string;
  codeVerifier: string;
  nonce: string;
  code: string;
}): Promise<{ accessToken: string; refreshToken?: string }> {
  const result = await exchangeToken(params);
  return { accessToken: result.accessToken, refreshToken: result.refreshToken };
}
