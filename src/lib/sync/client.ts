'use client';

import type { SyncStreamListener, SyncStreamMessage } from './types';

// twilio-sync is imported lazily (client-only) so the server bundle stays clean
// and a missing dep degrades to "no realtime" rather than a hard crash.
type SyncClientCtor = new (token: string) => SyncClientLike;
interface SyncClientLike {
  stream: (name: string) => Promise<SyncStreamLike>;
  updateToken?: (token: string) => Promise<void> | void;
  on?: (event: string, cb: (arg?: unknown) => void) => void;
}
interface SyncStreamLike {
  on: (event: string, cb: (evt: unknown) => void) => void;
  close?: () => void;
}

const TOKEN_TTL_SECONDS = 3600;
const TOKEN_REFRESH_LEAD_SECONDS = 60;

let clientPromise: Promise<SyncClientLike | null> | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
const streamCache = new Map<string, SyncStreamLike>();
const listeners = new Map<string, Set<SyncStreamListener>>();

const fetchToken = async (): Promise<string | null> => {
  try {
    const res = await fetch('/api/sync-token', { method: 'POST' });
    if (!res.ok) return null;
    const body = (await res.json()) as { token?: string };
    return body.token ?? null;
  } catch {
    return null;
  }
};

const scheduleTokenRefresh = (client: SyncClientLike) => {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(
    () => { void refreshToken(client); },
    (TOKEN_TTL_SECONDS - TOKEN_REFRESH_LEAD_SECONDS) * 1000,
  );
};

const refreshToken = async (client: SyncClientLike) => {
  const token = await fetchToken();
  if (!token) return;
  try {
    await client.updateToken?.(token);
    scheduleTokenRefresh(client);
  } catch {
    resetSyncClient();
  }
};

export const resetSyncClient = (): void => {
  if (refreshTimer) { clearTimeout(refreshTimer); refreshTimer = null; }
  clientPromise = null;
  for (const stream of streamCache.values()) {
    try { stream.close?.(); } catch { /* best-effort */ }
  }
  streamCache.clear();
  listeners.clear();
};

export const getSyncClient = async (): Promise<SyncClientLike | null> => {
  if (clientPromise) {
    const existing = await clientPromise;
    if (existing) return existing;
    clientPromise = null; // prior init failed — allow a retry
  }
  clientPromise = (async () => {
    try {
      const token = await fetchToken();
      if (!token) return null;
      const mod = await import('twilio-sync');
      const SyncClient = (mod.SyncClient ??
        (mod as unknown as { default: SyncClientCtor }).default) as SyncClientCtor;
      const client = new SyncClient(token);
      client.on?.('tokenAboutToExpire', () => { void refreshToken(client); });
      client.on?.('tokenExpired', () => { resetSyncClient(); });
      scheduleTokenRefresh(client);
      return client;
    } catch {
      return null;
    }
  })();
  return clientPromise;
};

const detach = (streamName: string, listener: SyncStreamListener) => {
  const set = listeners.get(streamName);
  if (!set) return;
  set.delete(listener);
  if (set.size > 0) return;
  listeners.delete(streamName);
  const stream = streamCache.get(streamName);
  if (stream) {
    streamCache.delete(streamName);
    try { stream.close?.(); } catch { /* best-effort */ }
  }
};

/**
 * Subscribe to a Sync stream by unique name. Returns an unsubscribe fn and a
 * `configured` flag (false when Sync creds/dep are absent, so callers can render
 * a "not configured" state). The messagePublished handler is attached once per
 * stream; a concurrent-subscribe guard prevents double dispatch under StrictMode.
 */
export const subscribeToStream = async (
  streamName: string,
  listener: SyncStreamListener,
): Promise<{ unsubscribe: () => void; configured: boolean }> => {
  if (!streamName) return { unsubscribe: () => {}, configured: false };

  let set = listeners.get(streamName);
  if (!set) { set = new Set(); listeners.set(streamName, set); }
  set.add(listener);

  if (!streamCache.has(streamName)) {
    const client = await getSyncClient();
    if (!client) {
      set.delete(listener);
      if (set.size === 0) listeners.delete(streamName);
      return { unsubscribe: () => {}, configured: false };
    }
    try {
      const stream = await client.stream(streamName);
      // A concurrent subscriber may have populated the cache while we awaited.
      if (!streamCache.has(streamName)) {
        streamCache.set(streamName, stream);
        stream.on('messagePublished', (evt) => {
          const msg = (evt as { message?: { data?: SyncStreamMessage } })?.message?.data;
          if (!msg) return;
          listeners.get(streamName)?.forEach((l) => l(msg));
        });
      }
    } catch {
      // best-effort: keep the listener attached so a later retry can serve it
    }
  }

  return { unsubscribe: () => detach(streamName, listener), configured: true };
};
