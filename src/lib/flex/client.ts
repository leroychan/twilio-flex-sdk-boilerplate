'use client';

import { createClient } from '@twilio/flex-sdk';
import type { Client } from '@twilio/flex-sdk';
import type { FlexClientOptions } from './types';

// Module-level singleton. Living here (not in React state) means Fast Refresh of UI
// components never tears down or re-initializes an in-progress live SDK session.
export type FlexClient = Client;

let client: FlexClient | null = null;
let initPromise: Promise<FlexClient> | null = null;

export async function initFlexClient(
  token: string,
  opts: FlexClientOptions = {},
): Promise<FlexClient> {
  if (client) return client;
  if (initPromise) return initPromise;

  initPromise = createClient(token, {
    logger: { level: opts.logLevel ?? 'info' },
    voiceOptions: { autoAcceptIncomingCalls: opts.autoAcceptIncomingCalls ?? false },
    session: {
      autoUpdateToken: opts.autoUpdateToken ?? Boolean(opts.refreshToken),
      ...(opts.refreshToken ? { refreshToken: opts.refreshToken } : {}),
      ...(opts.ssoProfileSid ? { ssoProfileSid: opts.ssoProfileSid } : {}),
    },
  })
    .then((c: FlexClient) => {
      client = c;
      return c;
    })
    .catch((err: unknown) => {
      initPromise = null;
      throw err;
    });

  return initPromise;
}

export function getFlexClient(): FlexClient | null {
  return client;
}

export function resetFlexClient(): void {
  client = null;
  initPromise = null;
}
