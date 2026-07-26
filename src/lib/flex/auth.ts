'use client';

import { exchangeToken } from '@twilio/flex-sdk';
import type { TokenResponse } from './types';

export async function requestToken(identity?: string): Promise<TokenResponse> {
  const res = await fetch('/api/token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identity }),
  });
  if (!res.ok) throw new Error('token_request_failed');
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
