'use client';

import type { FlexClient } from './client';
import { useFlexStore } from '@/store';

// Bridges live SDK session events into the Zustand session slice. Currently wires
// the `tokenUpdated` event (fired by the SDK when `autoUpdateToken` refreshes the
// JWE) so the app always holds the freshest token. Later parts register their own
// domain listeners (voice/task/conversation) from their own modules.
export function registerSessionListeners(client: FlexClient): () => void {
  const setToken = useFlexStore.getState().setToken;

  const onTokenUpdated = (token: string) => {
    setToken(token);
  };

  client.addListener('tokenUpdated', onTokenUpdated);

  return () => {
    client.removeListener('tokenUpdated', onTokenUpdated);
  };
}
