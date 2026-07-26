'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { initFlexClient, type FlexClient } from './client';
import type { FlexClientOptions } from './types';
import { registerSessionListeners } from './events';
import { normalizeFlexError } from './errors';
import { useFlexStore } from '@/store';

interface FlexClientContextValue {
  client: FlexClient | null;
  error: string | null;
}

const FlexClientContext = createContext<FlexClientContextValue>({ client: null, error: null });

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

  const setToken = useFlexStore((s) => s.setToken);
  const setWorker = useFlexStore((s) => s.setWorker);
  const setConnectionState = useFlexStore((s) => s.setConnectionState);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    setConnectionState('connecting');
    setToken(token);
    setError(null);

    initFlexClient(token, options)
      .then(async (c) => {
        const worker = await c.getWorker();
        if (cancelled) return;
        setWorker(worker);
        cleanupRef.current = registerSessionListeners(c);
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
    };
    // options is intentionally read once per token; token drives re-init.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <FlexClientContext.Provider value={{ client, error }}>{children}</FlexClientContext.Provider>
  );
}
