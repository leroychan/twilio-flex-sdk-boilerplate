'use client';

import { ClientEvent } from '@twilio/flex-sdk';
import type { FlexClient } from './client';
import { requestToken } from './auth';
import { useFlexStore } from '@/store';

// Flex-issued custom tokens carry a 1-hour TTL (see mintFlexUserToken's
// `ttlSeconds = 3600`). We proactively re-mint one minute before expiry so the
// SDK session never lapses. This mirrors flex-template-builder's FlexProvider,
// which runs the same (TTL - margin) interval + a reactive fallback.
export const TOKEN_TTL_SECONDS = 3600;
export const REFRESH_MARGIN_SECONDS = 60;

/**
 * Re-mint a custom token for `identity` and rotate it into the live SDK session
 * in place. The token is also written back to the store so live readers (e.g.
 * recording-availability lookups in adoptVoiceCall) keep a fresh token.
 *
 * Unlike flex-template-builder — which derives identity from an authenticated
 * server session — our /api/token mint is keyed on a username, so we replay the
 * persisted login identity.
 */
export async function refreshCustomToken(
  client: FlexClient,
  identity: string | null,
): Promise<void> {
  const { token } = await requestToken(identity ?? undefined);
  client.updateToken(token);
  useFlexStore.getState().setToken(token);
}

/**
 * Start the custom-token refresh loop for a live client. Runs a proactive timer
 * one minute before expiry and reacts to the SDK's TokenAutoUpdateFailed event
 * with an immediate re-mint. Refresh failures are logged, never thrown, so the
 * timer keeps running. Returns a cleanup that stops the timer and detaches the
 * listener.
 *
 * Only used on the custom-token path; the SSO path relies on the SDK's native
 * autoUpdateToken instead.
 */
export function startCustomTokenRefresh(
  client: FlexClient,
  identity: string | null,
): () => void {
  const run = (reason: 'scheduled' | 'emergency') => {
    refreshCustomToken(client, identity).catch((err) => {
      console.error(`Flex token ${reason} refresh failed:`, err);
    });
  };

  const interval = setInterval(
    () => run('scheduled'),
    (TOKEN_TTL_SECONDS - REFRESH_MARGIN_SECONDS) * 1000,
  );

  const onAutoUpdateFailed = () => run('emergency');
  client.addListener(ClientEvent.TokenAutoUpdateFailed, onAutoUpdateFailed);

  return () => {
    clearInterval(interval);
    client.removeListener(ClientEvent.TokenAutoUpdateFailed, onAutoUpdateFailed);
  };
}
