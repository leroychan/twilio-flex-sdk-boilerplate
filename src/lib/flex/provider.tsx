'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { initFlexClient, type FlexClient } from './client';
import type { FlexClientOptions } from './types';
import { registerSessionListeners } from './events';
import { startCustomTokenRefresh, refreshCustomToken } from './tokenRefresh';
import { normalizeFlexError } from './errors';
import { useFlexStore } from '@/store';

interface FlexClientContextValue {
  client: FlexClient | null;
  error: string | null;
  /** Manually re-mint and rotate the custom token (no-op on the SSO path). */
  refreshToken: () => Promise<void>;
}

const FlexClientContext = createContext<FlexClientContextValue>({
  client: null,
  error: null,
  refreshToken: async () => {},
});

export function useFlexClientContext(): FlexClientContextValue {
  return useContext(FlexClientContext);
}

export function FlexClientProvider({
  token,
  options,
  children,
}: {
  token: string | null;
  options?: FlexClientOptions;
  children: React.ReactNode;
}) {
  const [client, setClient] = useState<FlexClient | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const refreshCleanupRef = useRef<(() => void) | null>(null);
  const clientRef = useRef<FlexClient | null>(null);

  const setToken = useFlexStore((s) => s.setToken);
  const setWorker = useFlexStore((s) => s.setWorker);
  const setConnectionState = useFlexStore((s) => s.setConnectionState);

  // The SSO path (refreshToken + ssoProfileSid) uses the SDK's native
  // autoUpdateToken; every other login is the custom-token path, which we
  // refresh ourselves. Mirror the same discriminator client.ts uses.
  const isCustomTokenPath = !(options?.refreshToken && options?.ssoProfileSid);

  const refreshToken = useCallback(async () => {
    if (!clientRef.current || !isCustomTokenPath) return;
    await refreshCustomToken(clientRef.current, useFlexStore.getState().identity);
  }, [isCustomTokenPath]);

  // Keyed on the PRESENCE of a token, not its value. A refresh rotates the token
  // and writes it back to the store, which flows here as a new `token` prop — but
  // because `hasToken` stays true, the effect neither re-inits nor tears down.
  // The client is created once per session and torn down only on logout
  // (token → null) or unmount. The provider only mounts once a token exists, so
  // the token captured on the init pass is the login token.
  const hasToken = Boolean(token);

  useEffect(() => {
    if (!hasToken) return;
    let cancelled = false;

    setConnectionState('connecting');
    // token is guaranteed non-null here (hasToken); capture the login token.
    setToken(token!);
    setError(null);

    initFlexClient(token!, options)
      .then(async (c) => {
        const worker = await c.getWorker();
        if (cancelled) return;
        clientRef.current = c;
        setWorker(worker);
        cleanupRef.current = registerSessionListeners(c);
        if (isCustomTokenPath) {
          refreshCleanupRef.current = startCustomTokenRefresh(
            c,
            useFlexStore.getState().identity,
          );
        }
        setClient(c);
        setConnectionState('connected');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(normalizeFlexError(err).message);
        setConnectionState('error');
      });

    return () => {
      cancelled = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
      refreshCleanupRef.current?.();
      refreshCleanupRef.current = null;
      clientRef.current = null;
    };
    // Re-init only when a token appears/disappears, never on refresh-driven token
    // value changes. `token`/`options` are read at init time by design.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasToken]);

  return (
    <FlexClientContext.Provider value={{ client, error, refreshToken }}>
      {children}
    </FlexClientContext.Provider>
  );
}
