# Sync + Live Transcript Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a self-contained live voice-transcript pipeline — start Twilio Real-Time Transcription on the live call, publish results to a Sync stream `session-{callSid}`, subscribe and render them in a tabbed right-side panel, with a full settings popover — degrading gracefully to a "not configured" state in stub mode.

**Architecture:** Five layers, each honoring an existing boundary: (1) `/api/sync-token` mints a Sync AccessToken; (2) `src/lib/sync/` is a module-level `twilio-sync` client singleton; (3) in-app producer routes (`/api/transcription/start` + `/callback`) drive Twilio Real-Time Transcription and publish to Sync; (4) `src/features/transcript/` normalizes + renders; (5) a `settings` Zustand slice + header popover configures it. UI integration swaps the right column to a tabbed `RightPanel`.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript strict, Zustand (+persist), next-intl, Tailwind semantic tokens, Vitest + Testing Library. New dep: `twilio-sync`. Server uses the existing `twilio` REST SDK.

**Spec:** `docs/superpowers/specs/2026-07-28-sync-live-transcript-design.md`

## Global Constraints

- Node 20+; Next.js `^15.5.22`; React `19.2.4`; TypeScript strict. Path alias `@/* → src/*`.
- Browser-only Twilio code is `'use client'`; server routes use the `twilio` REST SDK (or its JWT helper) — **never** `@twilio/flex-sdk` or `twilio-sync` in a route. `runtime = 'nodejs'` on all new routes.
- Non-serializable live handles stay OUT of the Zustand store (module registry / hook-local only).
- Tailwind **semantic tokens only** (`bg-surface`, `bg-surface-2`, `text`, `text-muted`, `bg-primary`, `border`, etc.) — no raw hex, no new colors.
- **i18n:** every user-visible string via `next-intl`; `react/jsx-no-literals` is error-level. New strings live in `src/features/transcript/messages/en.json` (namespace `transcript`). **Never put ICU braces `{ }` in raw catalog text** unless they are real placeholders.
- **Transcription param resolution** (in `/api/transcription/start`): `body.X ?? env.TRANSCRIPTION_X ?? hardcoded default`. Defaults: language `en-US`, engine `google`, speechModel `telephony`, partialResults `true`, profanityFilter `true`, punctuation `true`, hints `''`.
- **Env** (all optional; live transcript only): `TWILIO_SYNC_SERVICE_SID`, `PUBLIC_BASE_URL`, `TWILIO_AUTH_TOKEN` (callback signature), `TRANSCRIPTION_LANGUAGE|ENGINE|SPEECH_MODEL|PARTIAL_RESULTS|PROFANITY_FILTER|PUNCTUATION|HINTS`.
- **TDD:** each task writes tests first, watches them fail, implements, watches them pass, commits.
- **Definition of done gate** (run before the final commit): `npm run test:run`, `npx tsc --noEmit`, `npm run lint`, `npm run build` — all clean.
- Commit messages end with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Work on branch `feat/sync-live-transcript` (already checked out).
- Test command for a single file: `npx vitest run <path>`.
- i18n component-test pattern (verbatim house style):
  ```tsx
  import { NextIntlClientProvider } from 'next-intl';
  import messages from '@/features/transcript/messages/en.json';
  function renderWithIntl(ui: React.ReactNode) {
    return render(
      <NextIntlClientProvider locale="en" messages={{ transcript: messages }}>{ui}</NextIntlClientProvider>,
    );
  }
  ```

## File Structure

**New — routes:** `src/app/api/sync-token/route.ts`, `src/app/api/transcription/start/route.ts`, `src/app/api/transcription/callback/route.ts` (+ colocated `__tests__/route.test.ts` each).
**New — Sync boundary:** `src/lib/sync/types.ts`, `src/lib/sync/client.ts` (+ `__tests__/client.test.ts`).
**New — transcript feature:** `src/features/transcript/lib/transcriptMessage.ts`, `hooks/useLiveTranscript.ts`, `hooks/useTranscriptionStarter.ts`, `components/TranscriptPanel.tsx`, `components/TranscriptionSettingsMenu.tsx`, `messages/en.json`, `index.ts` (+ colocated tests).
**New — settings slice:** `src/store/slices/settings.ts` (+ `__tests__/settings.test.ts`).
**New — layout:** `src/components/layout/RightPanel.tsx` (+ `__tests__/RightPanel.test.tsx`).
**Modified:** `src/store/index.ts`, `src/features/session/components/AgentDesktopShell.tsx`, `.env.example`, `package.json`, `README.md`.

Build order is bottom-up so every task ends green and independently reviewable.

---

### Task 1: Sync token route (`/api/sync-token`)

**Files:**
- Create: `src/app/api/sync-token/route.ts`
- Test: `src/app/api/sync-token/__tests__/route.test.ts`

**Interfaces:**
- Produces: `POST /api/sync-token` — body `{ identity?: string }` → `200 { token, identity, syncServiceSid }` when configured, else `503 { configured: false, error }`.

- [ ] **Step 1: Write the failing test**

`src/app/api/sync-token/__tests__/route.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { POST } from '../route';

const KEYS = [
  'TWILIO_ACCOUNT_SID', 'TWILIO_API_KEY', 'TWILIO_API_SECRET',
  'TWILIO_SYNC_SERVICE_SID', 'TWILIO_FLEX_USERNAME',
] as const;

function req(body: unknown): Request {
  return new Request('http://localhost/api/sync-token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}
function setLive() {
  process.env.TWILIO_ACCOUNT_SID = 'ACxxxx';
  process.env.TWILIO_API_KEY = 'SKxxxx';
  process.env.TWILIO_API_SECRET = 'secret';
  process.env.TWILIO_SYNC_SERVICE_SID = 'ISxxxx';
}
function decode(jwt: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString('utf8'));
}

describe('POST /api/sync-token', () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => { for (const k of KEYS) { saved[k] = process.env[k]; delete process.env[k]; } });
  afterEach(() => { for (const k of KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } });

  it('returns 503 not configured when Sync env is absent', async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(503);
    expect((await res.json()).configured).toBe(false);
  });

  it('mints a Sync-granted token when configured', async () => {
    setLive();
    const res = await POST(req({ identity: 'alice' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.identity).toBe('alice');
    expect(json.syncServiceSid).toBe('ISxxxx');
    const payload = decode(json.token) as { grants?: Record<string, { service_sid?: string }> };
    expect(payload.grants?.data_sync?.service_sid).toBe('ISxxxx');
  });

  it('falls back to TWILIO_FLEX_USERNAME then flex-agent for identity', async () => {
    setLive();
    process.env.TWILIO_FLEX_USERNAME = 'lechan';
    expect((await (await POST(req({}))).json()).identity).toBe('lechan');
    delete process.env.TWILIO_FLEX_USERNAME;
    expect((await (await POST(req({}))).json()).identity).toBe('flex-agent');
  });
});
```

- [ ] **Step 2: Run it — verify it fails**

Run: `npx vitest run src/app/api/sync-token/__tests__/route.test.ts`
Expected: FAIL (`Cannot find module '../route'`).

- [ ] **Step 3: Implement the route**

`src/app/api/sync-token/route.ts`:
```ts
import { NextResponse } from 'next/server';
import twilio from 'twilio';

// Node runtime: uses the twilio JWT helper (server-only). Never import
// @twilio/flex-sdk or twilio-sync here — those are browser-only.
export const runtime = 'nodejs';

function readEnv() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID ?? '';
  const apiKey = process.env.TWILIO_API_KEY ?? '';
  const apiSecret = process.env.TWILIO_API_SECRET ?? '';
  const syncServiceSid = process.env.TWILIO_SYNC_SERVICE_SID ?? '';
  const missing = [
    !accountSid && 'TWILIO_ACCOUNT_SID',
    !apiKey && 'TWILIO_API_KEY',
    !apiSecret && 'TWILIO_API_SECRET',
    !syncServiceSid && 'TWILIO_SYNC_SERVICE_SID',
  ].filter(Boolean) as string[];
  return { accountSid, apiKey, apiSecret, syncServiceSid, missing };
}

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as { identity?: string };
  const env = readEnv();
  if (env.missing.length > 0) {
    return NextResponse.json(
      { configured: false, error: `Sync not configured. Missing: ${env.missing.join(', ')}` },
      { status: 503 },
    );
  }

  const identity =
    body.identity?.trim() || process.env.TWILIO_FLEX_USERNAME?.trim() || 'flex-agent';

  const { AccessToken } = twilio.jwt;
  const token = new AccessToken(env.accountSid, env.apiKey, env.apiSecret, { identity, ttl: 3600 });
  token.addGrant(new AccessToken.SyncGrant({ serviceSid: env.syncServiceSid }));

  return NextResponse.json({ token: token.toJwt(), identity, syncServiceSid: env.syncServiceSid });
}
```

- [ ] **Step 4: Run tests — verify pass**

Run: `npx vitest run src/app/api/sync-token/__tests__/route.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/sync-token
git commit -m "feat: add /api/sync-token route (Sync AccessToken, stub-safe)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Sync client boundary (`src/lib/sync/`)

**Files:**
- Modify: `package.json` (add `twilio-sync`)
- Create: `src/lib/sync/types.ts`, `src/lib/sync/client.ts`
- Test: `src/lib/sync/__tests__/client.test.ts`

**Interfaces:**
- Consumes: `POST /api/sync-token` (Task 1) via `fetch`.
- Produces: `subscribeToStream(streamName: string, listener: SyncStreamListener): Promise<{ unsubscribe: () => void; configured: boolean }>`, `resetSyncClient(): void`, `getSyncClient(): Promise<SyncClientLike | null>`; types `SyncStreamMessage`, `SyncStreamListener`, `TranscriptionSyncMessage`.

- [ ] **Step 1: Add the dependency**

Run: `npm install twilio-sync@^3.4.0`
Expected: `package.json` + lockfile updated; no build performed.

- [ ] **Step 2: Write the types**

`src/lib/sync/types.ts`:
```ts
export interface TranscriptionSyncMessage {
  type: 'transcription';
  text: string;
  role: 'agent' | 'customer' | string;
  isFinal?: boolean;
}
export type SyncStreamMessage =
  | TranscriptionSyncMessage
  | { type: string; [k: string]: unknown };
export type SyncStreamListener = (msg: SyncStreamMessage) => void;
```

- [ ] **Step 3: Write the failing test**

`src/lib/sync/__tests__/client.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// A fake twilio-sync SyncClient whose stream() records the messagePublished handler.
const publishers = new Map<string, (evt: unknown) => void>();
const streamCloses = vi.fn();
class FakeSyncClient {
  constructor(public token: string) {}
  on() {}
  async stream(name: string) {
    return {
      on: (_e: string, cb: (evt: unknown) => void) => publishers.set(name, cb),
      close: streamCloses,
    };
  }
}
vi.mock('twilio-sync', () => ({ SyncClient: FakeSyncClient }));

import { subscribeToStream, resetSyncClient } from '../client';

function mockToken(ok: boolean) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      ok
        ? ({ ok: true, json: async () => ({ token: 'jwt' }) } as Response)
        : ({ ok: false, json: async () => ({ configured: false }) } as Response)),
  );
}

describe('sync client', () => {
  beforeEach(() => { publishers.clear(); streamCloses.mockReset(); resetSyncClient(); });
  afterEach(() => { vi.unstubAllGlobals(); resetSyncClient(); });

  it('reports not configured when the token endpoint 503s', async () => {
    mockToken(false);
    const listener = vi.fn();
    const { configured } = await subscribeToStream('session-CA1', listener);
    expect(configured).toBe(false);
    expect(listener).not.toHaveBeenCalled();
  });

  it('delivers published messages to the listener', async () => {
    mockToken(true);
    const listener = vi.fn();
    const { configured } = await subscribeToStream('session-CA1', listener);
    expect(configured).toBe(true);
    publishers.get('session-CA1')!({ message: { data: { type: 'transcription', text: 'hi' } } });
    expect(listener).toHaveBeenCalledWith({ type: 'transcription', text: 'hi' });
  });

  it('shares one underlying stream for concurrent subscribers (no double dispatch)', async () => {
    mockToken(true);
    const a = vi.fn();
    const b = vi.fn();
    await Promise.all([subscribeToStream('session-CA1', a), subscribeToStream('session-CA1', b)]);
    publishers.get('session-CA1')!({ message: { data: { type: 'transcription', text: 'x' } } });
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('closes the stream when the last listener unsubscribes', async () => {
    mockToken(true);
    const { unsubscribe } = await subscribeToStream('session-CA1', vi.fn());
    unsubscribe();
    expect(streamCloses).toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Run it — verify it fails**

Run: `npx vitest run src/lib/sync/__tests__/client.test.ts`
Expected: FAIL (`Cannot find module '../client'`).

- [ ] **Step 5: Implement the client**

`src/lib/sync/client.ts`:
```ts
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
```

- [ ] **Step 6: Run tests — verify pass**

Run: `npx vitest run src/lib/sync/__tests__/client.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/lib/sync
git commit -m "feat: add twilio-sync client boundary (singleton, stub-safe subscribe)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Transcript message normalizer

**Files:**
- Create: `src/features/transcript/lib/transcriptMessage.ts`
- Test: `src/features/transcript/lib/__tests__/transcriptMessage.test.ts`

**Interfaces:**
- Consumes: `SyncStreamMessage` (Task 2).
- Produces: `TranscriptEntry { id, role: 'agent'|'customer'|'other', speaker, text, at }`, `toTranscriptEntry(msg, callSid, index, now?): TranscriptEntry | null`.

- [ ] **Step 1: Write the failing test**

`src/features/transcript/lib/__tests__/transcriptMessage.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { toTranscriptEntry } from '../transcriptMessage';

const now = () => '2026-07-28T00:00:00.000Z';

describe('toTranscriptEntry', () => {
  it('maps an agent transcription', () => {
    const e = toTranscriptEntry({ type: 'transcription', text: 'Hello', role: 'agent' }, 'CA1', 0, now);
    expect(e).toEqual({ id: 'CA1-0', role: 'agent', speaker: 'agent', text: 'Hello', at: now() });
  });
  it('maps customer synonyms to customer', () => {
    expect(toTranscriptEntry({ type: 'transcription', text: 'Hi', role: 'end-user' }, 'CA1', 1, now)?.role).toBe('customer');
  });
  it('maps unknown roles to other', () => {
    expect(toTranscriptEntry({ type: 'transcription', text: 'Hi', role: 'ivr' }, 'CA1', 2, now)?.role).toBe('other');
  });
  it('drops non-transcription messages', () => {
    expect(toTranscriptEntry({ type: 'realtimeCintel' }, 'CA1', 0, now)).toBeNull();
  });
  it('drops interim (isFinal:false) and empty text', () => {
    expect(toTranscriptEntry({ type: 'transcription', text: 'x', role: 'agent', isFinal: false }, 'CA1', 0, now)).toBeNull();
    expect(toTranscriptEntry({ type: 'transcription', text: '   ', role: 'agent' }, 'CA1', 0, now)).toBeNull();
  });
});
```

- [ ] **Step 2: Run it — verify it fails**

Run: `npx vitest run src/features/transcript/lib/__tests__/transcriptMessage.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

`src/features/transcript/lib/transcriptMessage.ts`:
```ts
import type { SyncStreamMessage } from '@/lib/sync/types';

export interface TranscriptEntry {
  id: string;
  role: 'agent' | 'customer' | 'other';
  speaker: string; // raw role passthrough; the panel localizes agent/customer
  text: string;
  at: string; // ISO timestamp, stamped on receipt
}

const AGENT_ROLES = new Set(['agent', 'assistant']);
const CUSTOMER_ROLES = new Set(['customer', 'user', 'end-user']);

/**
 * Normalize a raw Sync message into a TranscriptEntry, or null if it is not a
 * final, non-empty transcription. `now` is injectable for deterministic tests.
 */
export function toTranscriptEntry(
  msg: SyncStreamMessage,
  callSid: string,
  index: number,
  now: () => string = () => new Date().toISOString(),
): TranscriptEntry | null {
  if (!msg || msg.type !== 'transcription') return null;
  const m = msg as { text?: unknown; role?: unknown; isFinal?: unknown };
  if (m.isFinal === false) return null;
  const text = typeof m.text === 'string' ? m.text.trim() : '';
  if (!text) return null;
  const raw = typeof m.role === 'string' ? m.role.toLowerCase() : '';
  const role = AGENT_ROLES.has(raw) ? 'agent' : CUSTOMER_ROLES.has(raw) ? 'customer' : 'other';
  return { id: `${callSid}-${index}`, role, speaker: raw || role, text, at: now() };
}
```

- [ ] **Step 4: Run tests — verify pass**

Run: `npx vitest run src/features/transcript/lib/__tests__/transcriptMessage.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/transcript/lib
git commit -m "feat: add transcript message normalizer

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: `useLiveTranscript` hook

**Files:**
- Create: `src/features/transcript/hooks/useLiveTranscript.ts`
- Test: `src/features/transcript/hooks/__tests__/useLiveTranscript.test.tsx`

**Interfaces:**
- Consumes: `subscribeToStream` (Task 2), `toTranscriptEntry` (Task 3).
- Produces: `useLiveTranscript(callSid: string | null): { entries: TranscriptEntry[]; status: 'idle' | 'not_configured' | 'listening' }`.

- [ ] **Step 1: Write the failing test**

`src/features/transcript/hooks/__tests__/useLiveTranscript.test.tsx`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const { subscribeToStream } = vi.hoisted(() => ({ subscribeToStream: vi.fn() }));
vi.mock('@/lib/sync/client', () => ({ subscribeToStream }));

import { useLiveTranscript } from '../useLiveTranscript';

type Handler = (msg: unknown) => void;

describe('useLiveTranscript', () => {
  beforeEach(() => subscribeToStream.mockReset());

  it('is idle with no callSid', () => {
    const { result } = renderHook(() => useLiveTranscript(null));
    expect(result.current.status).toBe('idle');
    expect(subscribeToStream).not.toHaveBeenCalled();
  });

  it('accumulates final transcription entries', async () => {
    let handler: Handler = () => {};
    subscribeToStream.mockImplementation(async (_name: string, h: Handler) => {
      handler = h;
      return { unsubscribe: vi.fn(), configured: true };
    });
    const { result } = renderHook(() => useLiveTranscript('CA1'));
    await waitFor(() => expect(result.current.status).toBe('listening'));
    act(() => handler({ type: 'transcription', text: 'Hello', role: 'customer' }));
    await waitFor(() => expect(result.current.entries).toHaveLength(1));
    expect(result.current.entries[0].text).toBe('Hello');
  });

  it('reports not_configured when the client is unconfigured', async () => {
    subscribeToStream.mockResolvedValue({ unsubscribe: vi.fn(), configured: false });
    const { result } = renderHook(() => useLiveTranscript('CA1'));
    await waitFor(() => expect(result.current.status).toBe('not_configured'));
  });

  it('resets entries when callSid changes', async () => {
    let handler: Handler = () => {};
    subscribeToStream.mockImplementation(async (_n: string, h: Handler) => {
      handler = h;
      return { unsubscribe: vi.fn(), configured: true };
    });
    const { result, rerender } = renderHook(({ sid }) => useLiveTranscript(sid), {
      initialProps: { sid: 'CA1' },
    });
    await waitFor(() => expect(result.current.status).toBe('listening'));
    act(() => handler({ type: 'transcription', text: 'A', role: 'agent' }));
    await waitFor(() => expect(result.current.entries).toHaveLength(1));
    rerender({ sid: 'CA2' });
    await waitFor(() => expect(result.current.entries).toHaveLength(0));
  });
});
```

- [ ] **Step 2: Run it — verify it fails**

Run: `npx vitest run src/features/transcript/hooks/__tests__/useLiveTranscript.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

`src/features/transcript/hooks/useLiveTranscript.ts`:
```ts
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { subscribeToStream } from '@/lib/sync/client';
import { toTranscriptEntry, type TranscriptEntry } from '../lib/transcriptMessage';
import type { SyncStreamMessage } from '@/lib/sync/types';

export type TranscriptStatus = 'idle' | 'not_configured' | 'listening';

export function useLiveTranscript(callSid: string | null): {
  entries: TranscriptEntry[];
  status: TranscriptStatus;
} {
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [status, setStatus] = useState<TranscriptStatus>('idle');
  const indexRef = useRef(0);

  useEffect(() => {
    if (!callSid) {
      setEntries([]);
      setStatus('idle');
      return;
    }
    let cancelled = false;
    indexRef.current = 0;
    setEntries([]);
    setStatus('listening');

    const handler = (msg: SyncStreamMessage) => {
      if (cancelled) return;
      const entry = toTranscriptEntry(msg, callSid, indexRef.current);
      if (!entry) return;
      indexRef.current += 1;
      setEntries((prev) => [...prev, entry]);
    };

    let unsubscribe: (() => void) | null = null;
    void subscribeToStream(`session-${callSid}`, handler).then((res) => {
      if (cancelled) {
        res.unsubscribe();
        return;
      }
      unsubscribe = res.unsubscribe;
      if (!res.configured) setStatus('not_configured');
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [callSid]);

  return useMemo(() => ({ entries, status }), [entries, status]);
}
```

- [ ] **Step 4: Run tests — verify pass**

Run: `npx vitest run src/features/transcript/hooks/__tests__/useLiveTranscript.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/transcript/hooks/useLiveTranscript.ts src/features/transcript/hooks/__tests__/useLiveTranscript.test.tsx
git commit -m "feat: add useLiveTranscript hook

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: TranscriptPanel + i18n catalog + barrel

**Files:**
- Create: `src/features/transcript/components/TranscriptPanel.tsx`, `src/features/transcript/messages/en.json`, `src/features/transcript/index.ts`
- Test: `src/features/transcript/components/__tests__/TranscriptPanel.test.tsx`

**Interfaces:**
- Consumes: `useLiveTranscript` (Task 4), `useFlexStore(s => s.call.callSid)`.
- Produces: `<TranscriptPanel />` (no props); barrel `src/features/transcript/index.ts` exporting `TranscriptPanel`, `useLiveTranscript`.

- [ ] **Step 1: Write the i18n catalog**

`src/features/transcript/messages/en.json`:
```json
{
  "title": "Transcript",
  "empty": {
    "noCall": "No active call.",
    "notConfigured": "Live transcript isn't configured.",
    "notConfiguredHint": "Set TWILIO_SYNC_SERVICE_SID and enable transcription to stream results into the per-call Sync stream.",
    "waiting": "Waiting for transcription…"
  },
  "speaker": {
    "agent": "Agent",
    "customer": "Customer",
    "other": "Speaker"
  },
  "settings": {
    "title": "Transcription",
    "enabled": "Enable live transcription",
    "language": "Language",
    "engine": "Engine",
    "speechModel": "Speech model",
    "partialResults": "Partial (interim) results",
    "profanityFilter": "Profanity filter",
    "punctuation": "Automatic punctuation",
    "hints": "Hints (comma-separated)"
  }
}
```
(The `settings.*` keys are used in Task 7 — added now so the catalog is written once.)

- [ ] **Step 2: Write the failing test**

`src/features/transcript/components/__tests__/TranscriptPanel.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import messages from '@/features/transcript/messages/en.json';
import type { TranscriptEntry } from '../../lib/transcriptMessage';

const { useLiveTranscript } = vi.hoisted(() => ({ useLiveTranscript: vi.fn() }));
vi.mock('../../hooks/useLiveTranscript', () => ({ useLiveTranscript }));

const { useFlexStore } = vi.hoisted(() => ({ useFlexStore: vi.fn() }));
vi.mock('@/store', () => ({ useFlexStore }));

import { TranscriptPanel } from '../TranscriptPanel';

function renderPanel() {
  return render(
    <NextIntlClientProvider locale="en" messages={{ transcript: messages }}>
      <TranscriptPanel />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  useFlexStore.mockReset();
  useLiveTranscript.mockReset();
  // TranscriptPanel selects call.callSid: useFlexStore(s => s.call.callSid)
  useFlexStore.mockImplementation((sel: (s: unknown) => unknown) =>
    sel({ call: { callSid: 'CA1' } }));
});

describe('TranscriptPanel', () => {
  it('shows the no-call empty state when idle', () => {
    useFlexStore.mockImplementation((sel: (s: unknown) => unknown) => sel({ call: { callSid: null } }));
    useLiveTranscript.mockReturnValue({ entries: [], status: 'idle' });
    renderPanel();
    expect(screen.getByText('No active call.')).toBeInTheDocument();
  });

  it('shows the not-configured hint', () => {
    useLiveTranscript.mockReturnValue({ entries: [], status: 'not_configured' });
    renderPanel();
    expect(screen.getByText("Live transcript isn't configured.")).toBeInTheDocument();
  });

  it('shows the waiting state while listening with no entries', () => {
    useLiveTranscript.mockReturnValue({ entries: [], status: 'listening' });
    renderPanel();
    expect(screen.getByText('Waiting for transcription…')).toBeInTheDocument();
  });

  it('renders entries with localized speaker labels', () => {
    const entries: TranscriptEntry[] = [
      { id: 'CA1-0', role: 'customer', speaker: 'customer', text: 'I need help', at: '' },
      { id: 'CA1-1', role: 'agent', speaker: 'agent', text: 'Happy to help', at: '' },
    ];
    useLiveTranscript.mockReturnValue({ entries, status: 'listening' });
    renderPanel();
    expect(screen.getByText('I need help')).toBeInTheDocument();
    expect(screen.getByText('Happy to help')).toBeInTheDocument();
    expect(screen.getByText('Agent')).toBeInTheDocument();
    expect(screen.getByText('Customer')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run it — verify it fails**

Run: `npx vitest run src/features/transcript/components/__tests__/TranscriptPanel.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 4: Implement the panel**

`src/features/transcript/components/TranscriptPanel.tsx`:
```tsx
'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useFlexStore } from '@/store';
import { useLiveTranscript } from '../hooks/useLiveTranscript';

export function TranscriptPanel() {
  const t = useTranslations('transcript');
  const callSid = useFlexStore((s) => s.call.callSid);
  const { entries, status } = useLiveTranscript(callSid);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [entries.length]);

  const speakerLabel = (role: string, speaker: string) =>
    role === 'agent' ? t('speaker.agent') : role === 'customer' ? t('speaker.customer') : speaker || t('speaker.other');

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-text">{t('title')}</h3>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {status === 'idle' ? (
          <p className="text-sm text-muted">{t('empty.noCall')}</p>
        ) : status === 'not_configured' ? (
          <div className="flex flex-col gap-1">
            <p className="text-sm text-muted">{t('empty.notConfigured')}</p>
            <p className="text-xs text-muted">{t('empty.notConfiguredHint')}</p>
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted">{t('empty.waiting')}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {entries.map((e) => (
              <li key={e.id} className={`flex flex-col ${e.role === 'agent' ? 'items-end text-right' : 'items-start'}`}>
                <span className="text-xs font-medium text-muted">{speakerLabel(e.role, e.speaker)}</span>
                <span className="inline-block max-w-[85%] rounded-lg bg-surface-2 px-3 py-1.5 text-sm text-text">
                  {e.text}
                </span>
              </li>
            ))}
            <div ref={endRef} />
          </ul>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create the barrel**

`src/features/transcript/index.ts`:
```ts
export { TranscriptPanel } from './components/TranscriptPanel';
export { useLiveTranscript } from './hooks/useLiveTranscript';
```
(Later tasks append `TranscriptionSettingsMenu` and `useTranscriptionStarter` exports.)

- [ ] **Step 6: Run tests — verify pass**

Run: `npx vitest run src/features/transcript/components/__tests__/TranscriptPanel.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add src/features/transcript/components/TranscriptPanel.tsx src/features/transcript/messages src/features/transcript/index.ts src/features/transcript/components/__tests__
git commit -m "feat: add TranscriptPanel + transcript i18n catalog

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Settings store slice + persistence

**Files:**
- Create: `src/store/slices/settings.ts`
- Modify: `src/store/index.ts`
- Test: `src/store/slices/__tests__/settings.test.ts`

**Interfaces:**
- Produces: `SettingsSlice { transcription: TranscriptionSettings; setTranscriptionSettings(patch): void }`; type `TranscriptionSettings { enabled, language, engine, speechModel, partialResults, profanityFilter, punctuation, hints }`. Persisted alongside `token`.

- [ ] **Step 1: Write the failing test**

`src/store/slices/__tests__/settings.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createSettingsSlice, DEFAULT_TRANSCRIPTION_SETTINGS } from '../settings';

function makeStore() {
  let state: ReturnType<typeof createSettingsSlice>;
  const set = (fn: (s: typeof state) => Partial<typeof state>) => {
    state = { ...state, ...fn(state) };
  };
  const get = () => state;
  state = createSettingsSlice(set as never, get as never, {} as never);
  return { get };
}

describe('settings slice', () => {
  it('defaults transcription to enabled en-US google', () => {
    const { get } = makeStore();
    expect(get().transcription).toEqual(DEFAULT_TRANSCRIPTION_SETTINGS);
    expect(get().transcription.enabled).toBe(true);
    expect(get().transcription.language).toBe('en-US');
  });

  it('merges a partial patch', () => {
    const { get } = makeStore();
    get().setTranscriptionSettings({ enabled: false, language: 'es-MX' });
    expect(get().transcription.enabled).toBe(false);
    expect(get().transcription.language).toBe('es-MX');
    expect(get().transcription.engine).toBe('google'); // untouched
  });
});
```

- [ ] **Step 2: Run it — verify it fails**

Run: `npx vitest run src/store/slices/__tests__/settings.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the slice**

`src/store/slices/settings.ts`:
```ts
import type { StateCreator } from 'zustand';

export interface TranscriptionSettings {
  enabled: boolean;
  language: string;
  engine: string;
  speechModel: string;
  partialResults: boolean;
  profanityFilter: boolean;
  punctuation: boolean;
  hints: string;
}

export const DEFAULT_TRANSCRIPTION_SETTINGS: TranscriptionSettings = {
  enabled: true,
  language: 'en-US',
  engine: 'google',
  speechModel: 'telephony',
  partialResults: true,
  profanityFilter: true,
  punctuation: true,
  hints: '',
};

export interface SettingsSlice {
  transcription: TranscriptionSettings;
  setTranscriptionSettings(patch: Partial<TranscriptionSettings>): void;
}

export const createSettingsSlice: StateCreator<SettingsSlice, [], [], SettingsSlice> = (set) => ({
  transcription: { ...DEFAULT_TRANSCRIPTION_SETTINGS },
  setTranscriptionSettings: (patch) =>
    set((s) => ({ transcription: { ...s.transcription, ...patch } })),
});
```

- [ ] **Step 4: Compose + persist in the store**

Edit `src/store/index.ts`:
1. Add import: `import { createSettingsSlice, type SettingsSlice } from './slices/settings';`
2. Add `& SettingsSlice` to the `FlexStore` type union.
3. Spread `...createSettingsSlice(...a),` into the initializer.
4. Extend `partialize` to persist transcription settings:
```ts
partialize: (state) => ({ token: state.token, transcription: state.transcription }),
```

- [ ] **Step 5: Run tests — verify pass (slice + store still green)**

Run: `npx vitest run src/store`
Expected: PASS (settings tests + existing store tests).

- [ ] **Step 6: Commit**

```bash
git add src/store/slices/settings.ts src/store/slices/__tests__/settings.test.ts src/store/index.ts
git commit -m "feat: add settings slice (transcription prefs) + persist

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: TranscriptionSettingsMenu (header popover)

**Files:**
- Create: `src/features/transcript/components/TranscriptionSettingsMenu.tsx`
- Modify: `src/features/transcript/index.ts` (add export)
- Test: `src/features/transcript/components/__tests__/TranscriptionSettingsMenu.test.tsx`

**Interfaces:**
- Consumes: `useFlexStore(s => s.transcription)` + `s.setTranscriptionSettings` (Task 6), `Popover`, `IconButton`.
- Produces: `<TranscriptionSettingsMenu />` (no props).

- [ ] **Step 1: Write the failing test**

`src/features/transcript/components/__tests__/TranscriptionSettingsMenu.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import messages from '@/features/transcript/messages/en.json';
import { DEFAULT_TRANSCRIPTION_SETTINGS } from '@/store/slices/settings';

const { useFlexStore } = vi.hoisted(() => ({ useFlexStore: vi.fn() }));
vi.mock('@/store', () => ({ useFlexStore }));

import { TranscriptionSettingsMenu } from '../TranscriptionSettingsMenu';

const setTranscriptionSettings = vi.fn();

function renderMenu() {
  return render(
    <NextIntlClientProvider locale="en" messages={{ transcript: messages }}>
      <TranscriptionSettingsMenu />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  useFlexStore.mockReset();
  setTranscriptionSettings.mockReset();
  useFlexStore.mockImplementation((sel: (s: unknown) => unknown) =>
    sel({ transcription: { ...DEFAULT_TRANSCRIPTION_SETTINGS }, setTranscriptionSettings }));
});

describe('TranscriptionSettingsMenu', () => {
  it('opens the popover and shows controls', async () => {
    renderMenu();
    await userEvent.click(screen.getByRole('button', { name: 'Transcription' }));
    expect(screen.getByLabelText('Enable live transcription')).toBeChecked();
    expect(screen.getByLabelText('Language')).toHaveValue('en-US');
  });

  it('writes an enable toggle change to the store', async () => {
    renderMenu();
    await userEvent.click(screen.getByRole('button', { name: 'Transcription' }));
    await userEvent.click(screen.getByLabelText('Enable live transcription'));
    expect(setTranscriptionSettings).toHaveBeenCalledWith({ enabled: false });
  });

  it('writes a language change to the store', async () => {
    renderMenu();
    await userEvent.click(screen.getByRole('button', { name: 'Transcription' }));
    await userEvent.selectOptions(screen.getByLabelText('Language'), 'es-MX');
    expect(setTranscriptionSettings).toHaveBeenCalledWith({ language: 'es-MX' });
  });
});
```

- [ ] **Step 2: Run it — verify it fails**

Run: `npx vitest run src/features/transcript/components/__tests__/TranscriptionSettingsMenu.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the menu**

`src/features/transcript/components/TranscriptionSettingsMenu.tsx`:
```tsx
'use client';

import { Captions } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Popover } from '@/components/ui/Popover';
import { IconButton } from '@/components/ui/IconButton';
import { useFlexStore } from '@/store';

const fieldClass =
  'w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';

const LANGUAGES = ['en-US', 'en-GB', 'es-MX', 'es-ES', 'fr-FR', 'de-DE', 'pt-BR', 'ja-JP'];
const ENGINES = ['google', 'deepgram'];

export function TranscriptionSettingsMenu() {
  const t = useTranslations('transcript');
  const s = useFlexStore((st) => st.transcription);
  const update = useFlexStore((st) => st.setTranscriptionSettings);

  return (
    <Popover
      trigger={({ toggle, open, id }) => (
        <IconButton label={t('settings.title')} onClick={toggle} aria-expanded={open} aria-controls={id} size={40}>
          <Captions className="h-5 w-5" aria-hidden />
        </IconButton>
      )}
    >
      <div className="flex w-72 flex-col gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">{t('settings.title')}</span>

        <label className="flex items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={s.enabled}
            onChange={(e) => update({ enabled: e.target.checked })}
          />
          {t('settings.enabled')}
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          {t('settings.language')}
          <select aria-label={t('settings.language')} className={fieldClass} value={s.language}
            onChange={(e) => update({ language: e.target.value })}>
            {LANGUAGES.map((l) => (<option key={l} value={l}>{l}</option>))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          {t('settings.engine')}
          <select aria-label={t('settings.engine')} className={fieldClass} value={s.engine}
            onChange={(e) => update({ engine: e.target.value })}>
            {ENGINES.map((en) => (<option key={en} value={en}>{en}</option>))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          {t('settings.speechModel')}
          <input aria-label={t('settings.speechModel')} className={fieldClass} value={s.speechModel}
            onChange={(e) => update({ speechModel: e.target.value })} />
        </label>

        <label className="flex items-center gap-2 text-sm text-text">
          <input type="checkbox" checked={s.partialResults} onChange={(e) => update({ partialResults: e.target.checked })} />
          {t('settings.partialResults')}
        </label>
        <label className="flex items-center gap-2 text-sm text-text">
          <input type="checkbox" checked={s.profanityFilter} onChange={(e) => update({ profanityFilter: e.target.checked })} />
          {t('settings.profanityFilter')}
        </label>
        <label className="flex items-center gap-2 text-sm text-text">
          <input type="checkbox" checked={s.punctuation} onChange={(e) => update({ punctuation: e.target.checked })} />
          {t('settings.punctuation')}
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          {t('settings.hints')}
          <input aria-label={t('settings.hints')} className={fieldClass} value={s.hints}
            onChange={(e) => update({ hints: e.target.value })} />
        </label>
      </div>
    </Popover>
  );
}
```
Note: the `{t(...)}` calls as JSX children are expressions (not literals) — `jsx-no-literals` passes. Verify `Captions` is exported by the installed `lucide-react`; if not, use `FileText`.

- [ ] **Step 4: Export from the barrel**

Append to `src/features/transcript/index.ts`:
```ts
export { TranscriptionSettingsMenu } from './components/TranscriptionSettingsMenu';
```

- [ ] **Step 5: Run tests — verify pass**

Run: `npx vitest run src/features/transcript/components/__tests__/TranscriptionSettingsMenu.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/features/transcript/components/TranscriptionSettingsMenu.tsx src/features/transcript/components/__tests__/TranscriptionSettingsMenu.test.tsx src/features/transcript/index.ts
git commit -m "feat: add transcription settings header popover

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: Transcription start route (`/api/transcription/start`)

**Files:**
- Create: `src/app/api/transcription/start/route.ts`
- Test: `src/app/api/transcription/start/__tests__/route.test.ts`

**Interfaces:**
- Produces: `POST /api/transcription/start` — body `{ callSid, language?, engine?, speechModel?, partialResults?, profanityFilter?, punctuation?, hints? }` → `{ started: boolean }` | `503 { configured: false }`.

- [ ] **Step 1: Write the failing test**

`src/app/api/transcription/start/__tests__/route.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const transcriptionsCreate = vi.fn();
const syncStreamsCreate = vi.fn();
const twilioClient = {
  calls: (sid: string) => ({ transcriptions: { create: (o: unknown) => transcriptionsCreate(sid, o) } }),
  sync: { v1: { services: () => ({ syncStreams: { create: (o: unknown) => syncStreamsCreate(o) } }) } },
};
vi.mock('twilio', () => ({ default: vi.fn(() => twilioClient) }));

import { POST } from '../route';

const KEYS = [
  'TWILIO_ACCOUNT_SID', 'TWILIO_API_KEY', 'TWILIO_API_SECRET',
  'TWILIO_SYNC_SERVICE_SID', 'PUBLIC_BASE_URL',
  'TRANSCRIPTION_LANGUAGE', 'TRANSCRIPTION_ENGINE',
] as const;

function req(body: unknown): Request {
  return new Request('http://localhost/api/transcription/start', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
}
function setLive() {
  process.env.TWILIO_ACCOUNT_SID = 'ACx';
  process.env.TWILIO_API_KEY = 'SKx';
  process.env.TWILIO_API_SECRET = 'sec';
  process.env.TWILIO_SYNC_SERVICE_SID = 'ISx';
  process.env.PUBLIC_BASE_URL = 'https://demo.test';
}

describe('POST /api/transcription/start', () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const k of KEYS) { saved[k] = process.env[k]; delete process.env[k]; }
    transcriptionsCreate.mockReset().mockResolvedValue({});
    syncStreamsCreate.mockReset().mockResolvedValue({});
  });
  afterEach(() => { for (const k of KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } });

  it('503s when unconfigured', async () => {
    const res = await POST(req({ callSid: 'CA1' }));
    expect(res.status).toBe(503);
    expect((await res.json()).configured).toBe(false);
    expect(transcriptionsCreate).not.toHaveBeenCalled();
  });

  it('ensures the stream and starts transcription with callback + labels + defaults', async () => {
    setLive();
    const res = await POST(req({ callSid: 'CA1' }));
    expect(res.status).toBe(200);
    expect((await res.json()).started).toBe(true);
    expect(syncStreamsCreate).toHaveBeenCalledWith(expect.objectContaining({ uniqueName: 'session-CA1' }));
    expect(transcriptionsCreate).toHaveBeenCalledWith('CA1', expect.objectContaining({
      track: 'both_tracks',
      inboundTrackLabel: 'customer',
      outboundTrackLabel: 'agent',
      languageCode: 'en-US',
      transcriptionEngine: 'google',
      statusCallbackUrl: 'https://demo.test/api/transcription/callback',
    }));
  });

  it('applies body overrides over env and defaults', async () => {
    setLive();
    process.env.TRANSCRIPTION_ENGINE = 'deepgram';
    await POST(req({ callSid: 'CA1', language: 'es-MX' }));
    expect(transcriptionsCreate).toHaveBeenCalledWith('CA1', expect.objectContaining({
      languageCode: 'es-MX',        // body override
      transcriptionEngine: 'deepgram', // env over default
    }));
  });

  it('treats an already-running transcription (409) as started:false, still 200', async () => {
    setLive();
    transcriptionsCreate.mockRejectedValue({ status: 409 });
    const res = await POST(req({ callSid: 'CA1' }));
    expect(res.status).toBe(200);
    expect((await res.json()).started).toBe(false);
  });
});
```

- [ ] **Step 2: Run it — verify it fails**

Run: `npx vitest run src/app/api/transcription/start/__tests__/route.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the route**

`src/app/api/transcription/start/route.ts`:
```ts
import { NextResponse } from 'next/server';
import twilio from 'twilio';

export const runtime = 'nodejs';

function readEnv() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID ?? '';
  const apiKey = process.env.TWILIO_API_KEY ?? '';
  const apiSecret = process.env.TWILIO_API_SECRET ?? '';
  const syncServiceSid = process.env.TWILIO_SYNC_SERVICE_SID ?? '';
  const baseUrl = process.env.PUBLIC_BASE_URL ?? '';
  const configured = Boolean(accountSid && apiKey && apiSecret && syncServiceSid && baseUrl);
  return { accountSid, apiKey, apiSecret, syncServiceSid, baseUrl, configured };
}

const bool = (v: unknown, envVar: string | undefined, dflt: boolean): boolean =>
  typeof v === 'boolean' ? v : envVar != null ? envVar !== 'false' : dflt;
const str = (v: unknown, envVar: string | undefined, dflt: string): string =>
  typeof v === 'string' && v.trim() ? v : envVar && envVar.trim() ? envVar : dflt;

interface StartBody {
  callSid?: string;
  language?: string; engine?: string; speechModel?: string;
  partialResults?: boolean; profanityFilter?: boolean; punctuation?: boolean; hints?: string;
}

export async function POST(request: Request): Promise<Response> {
  const env = readEnv();
  if (!env.configured) return NextResponse.json({ configured: false }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as StartBody;
  const callSid = body.callSid?.trim();
  if (!callSid) return NextResponse.json({ error: 'callSid_required' }, { status: 400 });

  const languageCode = str(body.language, process.env.TRANSCRIPTION_LANGUAGE, 'en-US');
  const transcriptionEngine = str(body.engine, process.env.TRANSCRIPTION_ENGINE, 'google');
  const speechModel = str(body.speechModel, process.env.TRANSCRIPTION_SPEECH_MODEL, 'telephony');
  const partialResults = bool(body.partialResults, process.env.TRANSCRIPTION_PARTIAL_RESULTS, true);
  const profanityFilter = bool(body.profanityFilter, process.env.TRANSCRIPTION_PROFANITY_FILTER, true);
  const enableAutomaticPunctuation = bool(body.punctuation, process.env.TRANSCRIPTION_PUNCTUATION, true);
  const hints = str(body.hints, process.env.TRANSCRIPTION_HINTS, '');

  const client = twilio(env.apiKey, env.apiSecret, { accountSid: env.accountSid });

  // Ensure the per-call stream exists (idempotent: swallow "already exists").
  try {
    await client.sync.v1.services(env.syncServiceSid).syncStreams.create({
      uniqueName: `session-${callSid}`,
      ttl: 14400,
    });
  } catch {
    // stream already exists (409) or transient — publishing tolerates this
  }

  try {
    await client.calls(callSid).transcriptions.create({
      track: 'both_tracks',
      inboundTrackLabel: 'customer',
      outboundTrackLabel: 'agent',
      languageCode,
      transcriptionEngine,
      speechModel,
      partialResults,
      profanityFilter,
      enableAutomaticPunctuation,
      ...(hints ? { hints } : {}),
      statusCallbackUrl: `${env.baseUrl}/api/transcription/callback`,
    });
    return NextResponse.json({ started: true });
  } catch (err) {
    if ((err as { status?: number }).status === 409) {
      return NextResponse.json({ started: false }); // already running
    }
    return NextResponse.json({ error: 'transcription_start_failed' }, { status: 502 });
  }
}
```
Note: the `twilio` REST types may not yet include every transcription option; if `tsc` complains, cast the options object `as unknown as <SDK type>` or `// @ts-expect-error` with a one-line comment. Confirm the `transcriptions.create` option names against the installed `twilio` version (`node_modules/twilio` types) and adjust casing if needed.

- [ ] **Step 4: Run tests — verify pass**

Run: `npx vitest run src/app/api/transcription/start/__tests__/route.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/transcription/start
git commit -m "feat: add /api/transcription/start (ensures stream, starts RT transcription)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: Transcription callback route (`/api/transcription/callback`)

**Files:**
- Create: `src/app/api/transcription/callback/route.ts`
- Test: `src/app/api/transcription/callback/__tests__/route.test.ts`

**Interfaces:**
- Consumes: Twilio Real-Time Transcription `statusCallback` (form-encoded `CallSid`, `TranscriptionData`, `Track`, `Final`, optional track labels).
- Produces: publishes `{ type:'transcription', text, role, isFinal }` to Sync stream `session-{CallSid}`; responds `200` always (or `403` on bad signature).

- [ ] **Step 1: Write the failing test**

`src/app/api/transcription/callback/__tests__/route.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const streamMessagesCreate = vi.fn();
const twilioClient = {
  sync: { v1: { services: () => ({ syncStreams: () => ({ streamMessages: { create: (o: unknown) => streamMessagesCreate(o) } }) }) } },
};
const validateRequest = vi.fn(() => true);
vi.mock('twilio', () => ({ default: Object.assign(vi.fn(() => twilioClient), { validateRequest }) }));

import { POST } from '../route';

const KEYS = ['TWILIO_ACCOUNT_SID', 'TWILIO_API_KEY', 'TWILIO_API_SECRET', 'TWILIO_SYNC_SERVICE_SID', 'TWILIO_AUTH_TOKEN'] as const;

function formReq(fields: Record<string, string>, sig = 'sig'): Request {
  const body = new URLSearchParams(fields).toString();
  return new Request('http://localhost/api/transcription/callback', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-twilio-signature': sig },
    body,
  });
}
function setLive() {
  process.env.TWILIO_ACCOUNT_SID = 'ACx';
  process.env.TWILIO_API_KEY = 'SKx';
  process.env.TWILIO_API_SECRET = 'sec';
  process.env.TWILIO_SYNC_SERVICE_SID = 'ISx';
}

describe('POST /api/transcription/callback', () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const k of KEYS) { saved[k] = process.env[k]; delete process.env[k]; }
    streamMessagesCreate.mockReset().mockResolvedValue({});
    validateRequest.mockReset().mockReturnValue(true);
    setLive();
  });
  afterEach(() => { for (const k of KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } });

  it('publishes a customer transcription (inbound track) and returns 200', async () => {
    const res = await POST(formReq({
      CallSid: 'CA1', Track: 'inbound_track', Final: 'true',
      TranscriptionData: JSON.stringify({ transcript: 'I need help' }),
    }));
    expect(res.status).toBe(200);
    expect(streamMessagesCreate).toHaveBeenCalledWith({
      data: { type: 'transcription', text: 'I need help', role: 'customer', isFinal: true },
    });
  });

  it('maps outbound track to agent', async () => {
    await POST(formReq({ CallSid: 'CA1', Track: 'outbound_track', Final: 'false', TranscriptionData: JSON.stringify({ transcript: 'Hi' }) }));
    expect(streamMessagesCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ role: 'agent', isFinal: false }) });
  });

  it('skips empty transcripts but still 200s', async () => {
    const res = await POST(formReq({ CallSid: 'CA1', Track: 'inbound_track', Final: 'true', TranscriptionData: JSON.stringify({ transcript: '' }) }));
    expect(res.status).toBe(200);
    expect(streamMessagesCreate).not.toHaveBeenCalled();
  });

  it('rejects a bad signature with 403 when auth token is set', async () => {
    process.env.TWILIO_AUTH_TOKEN = 'authy';
    validateRequest.mockReturnValue(false);
    const res = await POST(formReq({ CallSid: 'CA1', Track: 'inbound_track', Final: 'true', TranscriptionData: '{}' }));
    expect(res.status).toBe(403);
    expect(streamMessagesCreate).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it — verify it fails**

Run: `npx vitest run src/app/api/transcription/callback/__tests__/route.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the route**

`src/app/api/transcription/callback/route.ts`:
```ts
import { NextResponse } from 'next/server';
import twilio from 'twilio';

export const runtime = 'nodejs';

function readEnv() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID ?? '';
  const apiKey = process.env.TWILIO_API_KEY ?? '';
  const apiSecret = process.env.TWILIO_API_SECRET ?? '';
  const syncServiceSid = process.env.TWILIO_SYNC_SERVICE_SID ?? '';
  const authToken = process.env.TWILIO_AUTH_TOKEN ?? '';
  const configured = Boolean(accountSid && apiKey && apiSecret && syncServiceSid);
  return { accountSid, apiKey, apiSecret, syncServiceSid, authToken, configured };
}

function roleFromTrack(track: string): 'agent' | 'customer' {
  return track === 'inbound_track' ? 'customer' : 'agent';
}

export async function POST(request: Request): Promise<Response> {
  const env = readEnv();
  const raw = await request.text();
  const params = Object.fromEntries(new URLSearchParams(raw));

  // Validate Twilio's signature when we have an auth token; skip in pure dev/stub.
  if (env.authToken) {
    const signature = request.headers.get('x-twilio-signature') ?? '';
    const url = request.url;
    const ok = twilio.validateRequest(env.authToken, signature, url, params);
    if (!ok) return NextResponse.json({ error: 'bad_signature' }, { status: 403 });
  }

  if (!env.configured) return NextResponse.json({ ok: true }); // nothing to publish to

  try {
    const callSid = params.CallSid;
    const track = params.Track ?? 'outbound_track';
    const isFinal = params.Final === 'true';
    let text = '';
    try {
      text = (JSON.parse(params.TranscriptionData ?? '{}') as { transcript?: string }).transcript ?? '';
    } catch {
      text = '';
    }
    text = text.trim();

    if (callSid && text) {
      const client = twilio(env.apiKey, env.apiSecret, { accountSid: env.accountSid });
      await client.sync.v1
        .services(env.syncServiceSid)
        .syncStreams(`session-${callSid}`)
        .streamMessages.create({
          data: { type: 'transcription', text, role: roleFromTrack(track), isFinal },
        });
    }
  } catch {
    // Never fail the callback back to Twilio — log-and-swallow in real code.
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Run tests — verify pass**

Run: `npx vitest run src/app/api/transcription/callback/__tests__/route.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/transcription/callback
git commit -m "feat: add /api/transcription/callback (validate + publish to Sync)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 10: `useTranscriptionStarter` hook

**Files:**
- Create: `src/features/transcript/hooks/useTranscriptionStarter.ts`
- Modify: `src/features/transcript/index.ts` (add export)
- Test: `src/features/transcript/hooks/__tests__/useTranscriptionStarter.test.tsx`

**Interfaces:**
- Consumes: `useFlexStore` (`call.callSid`, `call.status`, `transcription`), `POST /api/transcription/start` (Task 8).
- Produces: `useTranscriptionStarter(): void` — side-effect only.

- [ ] **Step 1: Write the failing test**

`src/features/transcript/hooks/__tests__/useTranscriptionStarter.test.tsx`:
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { DEFAULT_TRANSCRIPTION_SETTINGS } from '@/store/slices/settings';

const { useFlexStore } = vi.hoisted(() => ({ useFlexStore: vi.fn() }));
vi.mock('@/store', () => ({ useFlexStore }));

import { useTranscriptionStarter } from '../useTranscriptionStarter';

type State = { call: { callSid: string | null; status: string }; transcription: typeof DEFAULT_TRANSCRIPTION_SETTINGS };
function mockState(state: State) {
  useFlexStore.mockImplementation((sel: (s: State) => unknown) => sel(state));
}

describe('useTranscriptionStarter', () => {
  beforeEach(() => {
    useFlexStore.mockReset();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ started: true }) } as Response)));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('POSTs start once when a call connects, with settings overrides', () => {
    mockState({ call: { callSid: 'CA1', status: 'connected' }, transcription: { ...DEFAULT_TRANSCRIPTION_SETTINGS, language: 'es-MX' } });
    const { rerender } = renderHook(() => useTranscriptionStarter());
    rerender();
    expect(fetch).toHaveBeenCalledTimes(1);
    const [, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(JSON.parse((init as RequestInit).body as string)).toMatchObject({ callSid: 'CA1', language: 'es-MX' });
  });

  it('does not fire when disabled', () => {
    mockState({ call: { callSid: 'CA1', status: 'connected' }, transcription: { ...DEFAULT_TRANSCRIPTION_SETTINGS, enabled: false } });
    renderHook(() => useTranscriptionStarter());
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does not fire when there is no connected call', () => {
    mockState({ call: { callSid: null, status: 'idle' }, transcription: { ...DEFAULT_TRANSCRIPTION_SETTINGS } });
    renderHook(() => useTranscriptionStarter());
    expect(fetch).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it — verify it fails**

Run: `npx vitest run src/features/transcript/hooks/__tests__/useTranscriptionStarter.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

`src/features/transcript/hooks/useTranscriptionStarter.ts`:
```ts
'use client';

import { useEffect, useRef } from 'react';
import { useFlexStore } from '@/store';

/**
 * When a voice call connects (and transcription is enabled), start Real-Time
 * Transcription on that CallSid exactly once. Mounted in the desktop shell so it
 * runs regardless of which right-panel tab is visible. A 503 (not configured) is
 * ignored — the panel already shows its "not configured" state.
 */
export function useTranscriptionStarter(): void {
  const callSid = useFlexStore((s) => s.call.callSid);
  const status = useFlexStore((s) => s.call.status);
  const settings = useFlexStore((s) => s.transcription);
  const startedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!settings.enabled || !callSid) return;
    if (status !== 'connected' && status !== 'onHold') return;
    if (startedRef.current.has(callSid)) return;
    startedRef.current.add(callSid);

    void fetch('/api/transcription/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        callSid,
        language: settings.language,
        engine: settings.engine,
        speechModel: settings.speechModel,
        partialResults: settings.partialResults,
        profanityFilter: settings.profanityFilter,
        punctuation: settings.punctuation,
        hints: settings.hints,
      }),
    }).catch(() => {
      // best-effort; the panel reflects actual stream state
    });
  }, [callSid, status, settings]);
}
```

- [ ] **Step 4: Export from the barrel**

Append to `src/features/transcript/index.ts`:
```ts
export { useTranscriptionStarter } from './hooks/useTranscriptionStarter';
```

- [ ] **Step 5: Run tests — verify pass**

Run: `npx vitest run src/features/transcript/hooks/__tests__/useTranscriptionStarter.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/features/transcript/hooks/useTranscriptionStarter.ts src/features/transcript/hooks/__tests__/useTranscriptionStarter.test.tsx src/features/transcript/index.ts
git commit -m "feat: add useTranscriptionStarter (start RT transcription on connect)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 11: RightPanel (tabbed Transcript / CRM)

**Files:**
- Create: `src/components/layout/RightPanel.tsx`
- Modify: `src/features/transcript/messages/en.json` (add `tabs` keys)
- Test: `src/components/layout/__tests__/RightPanel.test.tsx`

**Interfaces:**
- Consumes: `TranscriptPanel` (Task 5), `CrmPanel`, `Tabs`, `useFlexStore(s => s.call.callSid)`.
- Produces: `<RightPanel />` (no props).

- [ ] **Step 1: Add tab labels to the catalog**

Add to `src/features/transcript/messages/en.json` (top level):
```json
"tabs": { "transcript": "Transcript", "crm": "CRM" }
```

- [ ] **Step 2: Write the failing test**

`src/components/layout/__tests__/RightPanel.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import messages from '@/features/transcript/messages/en.json';

const { useFlexStore } = vi.hoisted(() => ({ useFlexStore: vi.fn() }));
vi.mock('@/store', () => ({ useFlexStore }));
vi.mock('@/features/transcript', () => ({ TranscriptPanel: () => <div data-testid="transcript-panel" /> }));
vi.mock('../CrmPanel', () => ({ CrmPanel: () => <div data-testid="crm-panel" /> }));

import { RightPanel } from '../RightPanel';

function renderPanel() {
  return render(
    <NextIntlClientProvider locale="en" messages={{ transcript: messages }}>
      <RightPanel />
    </NextIntlClientProvider>,
  );
}
function mockCallSid(sid: string | null) {
  useFlexStore.mockImplementation((sel: (s: unknown) => unknown) => sel({ call: { callSid: sid } }));
}

beforeEach(() => useFlexStore.mockReset());

describe('RightPanel', () => {
  it('auto-selects Transcript when a call is active', () => {
    mockCallSid('CA1');
    renderPanel();
    expect(screen.getByRole('tab', { name: 'Transcript' })).toHaveAttribute('aria-selected', 'true');
  });

  it('defaults to CRM when no call is active', () => {
    mockCallSid(null);
    renderPanel();
    expect(screen.getByRole('tab', { name: 'CRM' })).toHaveAttribute('aria-selected', 'true');
  });

  it('keeps both panels mounted and switches on click', async () => {
    mockCallSid('CA1');
    renderPanel();
    // both mounted regardless of active tab
    expect(screen.getByTestId('transcript-panel')).toBeInTheDocument();
    expect(screen.getByTestId('crm-panel')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'CRM' }));
    expect(screen.getByRole('tab', { name: 'CRM' })).toHaveAttribute('aria-selected', 'true');
  });
});
```

- [ ] **Step 3: Run it — verify it fails**

Run: `npx vitest run src/components/layout/__tests__/RightPanel.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 4: Implement**

`src/components/layout/RightPanel.tsx`:
```tsx
'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useFlexStore } from '@/store';
import { Tabs, type TabItem } from '@/components/ui/Tabs';
import { CrmPanel } from './CrmPanel';
import { TranscriptPanel } from '@/features/transcript';

type RightTab = 'transcript' | 'crm';

/**
 * Right column: a tabbed Transcript / CRM panel. Transcript is auto-selected while
 * a call is active (CRM otherwise); the user can override by clicking. Both panels
 * stay mounted (hidden) so the live transcript subscription survives tab switches.
 */
export function RightPanel() {
  const t = useTranslations('transcript');
  const callSid = useFlexStore((s) => s.call.callSid);
  const [manual, setManual] = useState<RightTab | null>(null);

  const active: RightTab = manual ?? (callSid ? 'transcript' : 'crm');

  const tabs: TabItem[] = useMemo(
    () => [
      { id: 'transcript', label: t('tabs.transcript') },
      { id: 'crm', label: t('tabs.crm') },
    ],
    [t],
  );

  return (
    <div className="flex h-full flex-col">
      <Tabs tabs={tabs} activeId={active} onChange={(id) => setManual(id as RightTab)} aria-label={t('title')} />
      <div className="min-h-0 flex-1">
        <div className={active === 'transcript' ? 'h-full' : 'hidden'}>
          <TranscriptPanel />
        </div>
        <div className={active === 'crm' ? 'h-full' : 'hidden'}>
          <CrmPanel />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run tests — verify pass**

Run: `npx vitest run src/components/layout/__tests__/RightPanel.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/RightPanel.tsx src/components/layout/__tests__/RightPanel.test.tsx src/features/transcript/messages/en.json
git commit -m "feat: add tabbed RightPanel (Transcript / CRM)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 12: Wire into the shell + docs + definition-of-done gate

**Files:**
- Modify: `src/features/session/components/AgentDesktopShell.tsx`
- Modify (if needed): `src/features/session/components/__tests__/AgentDesktopShell.test.tsx`
- Modify: `.env.example`, `README.md`

**Interfaces:**
- Consumes everything above via the `@/features/transcript` barrel and `@/components/layout/RightPanel`.

- [ ] **Step 1: Wire the shell**

Edit `src/features/session/components/AgentDesktopShell.tsx`:
1. Add imports:
   ```ts
   import { RightPanel } from '@/components/layout/RightPanel';
   import { TranscriptionSettingsMenu, useTranscriptionStarter } from '@/features/transcript';
   ```
   Remove the now-unused `CrmPanel` import (it is rendered inside `RightPanel`).
2. In `DesktopBody`, alongside the other bridge hooks (`usePresenceEvents()` … `useConversationEvents()`), add:
   ```ts
   useTranscriptionStarter();
   ```
3. In the header cluster, add the settings menu next to `AudioSettingsMenu`:
   ```tsx
   <AudioSettingsMenu />
   <TranscriptionSettingsMenu />
   <Separator />
   ```
4. Swap the right column:
   ```tsx
   right={<RightPanel />}
   ```

- [ ] **Step 2: Update the shell test if needed**

Run: `npx vitest run src/features/session/components/__tests__/AgentDesktopShell.test.tsx`
If it fails because it asserted `CrmPanel` rendered directly: `CrmPanel` now lives under the CRM tab inside `RightPanel`. Either (a) mock `@/components/layout/RightPanel` to a stub in that test, or (b) update the assertion to query the CRM tab. Make the minimal change that keeps the test's intent. Re-run until green.

- [ ] **Step 3: Update `.env.example`**

Append a documented block:
```bash
# --- Live transcript (optional; app runs without these) ---
# Sync service that carries per-call transcript streams (session-<CallSid>).
TWILIO_SYNC_SERVICE_SID=
# Publicly reachable base URL Twilio posts transcription callbacks to (use an ngrok
# tunnel in local dev, e.g. https://<subdomain>.ngrok.app). No trailing slash.
PUBLIC_BASE_URL=
# TWILIO_AUTH_TOKEN (declared above for queue-stats) also validates the callback signature.
# Transcription API defaults (override per-agent in the in-app settings popover):
TRANSCRIPTION_LANGUAGE=en-US
TRANSCRIPTION_ENGINE=google
TRANSCRIPTION_SPEECH_MODEL=telephony
TRANSCRIPTION_PARTIAL_RESULTS=true
TRANSCRIPTION_PROFANITY_FILTER=true
TRANSCRIPTION_PUNCTUATION=true
TRANSCRIPTION_HINTS=
```
(If `TWILIO_AUTH_TOKEN` is not already in `.env.example`, add it too.)

- [ ] **Step 4: Add a README "Live transcript" section**

Add under the features/configuration area of `README.md`, covering:
- What it does: live voice transcript in the right-column Transcript tab.
- The in-app pipeline: call connects → `/api/transcription/start` starts Twilio Real-Time Transcription on that CallSid → Twilio posts to `/api/transcription/callback` → callback publishes `{ type:'transcription', text, role, isFinal }` to Sync stream `session-<CallSid>` → the panel subscribes and renders.
- Required env: `TWILIO_SYNC_SERVICE_SID`, `PUBLIC_BASE_URL`, `TWILIO_AUTH_TOKEN`; optional `TRANSCRIPTION_*` defaults.
- Local dev needs a public tunnel for the callback (ngrok).
- Settings popover (gear in header) toggles transcription and overrides language/engine/model/etc.; default ON when configured.
- Stub mode: no creds → the panel shows "not configured"; the app still runs.

- [ ] **Step 5: Run the full definition-of-done gate**

```bash
npm run test:run
npx tsc --noEmit
npm run lint
npm run build
```
All must be clean. Fix any failures before continuing. Common gotchas to check here:
- `jsx-no-literals`: every visible string routes through `t(...)`.
- `twilio` REST option typing on `transcriptions.create` (Task 8 note).
- Unused-import lint after removing `CrmPanel` from the shell.

- [ ] **Step 6: Commit + open PR**

```bash
git add -A
git commit -m "feat: wire live transcript into shell + docs

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push -u origin feat/sync-live-transcript
gh pr create --fill --base main
```

---

## Self-Review (author checklist — completed during planning)

- **Spec coverage:** every spec file in the "File Summary" maps to a task — sync-token (T1), sync client + types (T2), normalizer (T3), useLiveTranscript (T4), TranscriptPanel + catalog + barrel (T5), settings slice + persist (T6), settings menu (T7), start route (T8), callback route (T9), starter hook (T10), RightPanel (T11), shell wire-up + `.env.example` + README (T12). `package.json` dep added in T2.
- **Type consistency:** `subscribeToStream` returns `{ unsubscribe, configured }` in T2 and is consumed that way in T4. `TranscriptEntry` shape defined in T3, consumed in T4/T5. `TranscriptionSettings` defined in T6, consumed in T7/T10. `DEFAULT_TRANSCRIPTION_SETTINGS` exported in T6, imported in T7/T10 tests. Route response shapes match spec Interfaces.
- **Placeholder scan:** no TODO/TBD; every code step shows complete code; every test step shows real assertions.
- **Known adjustable points (flagged inline, not blockers):** (a) `twilio` REST typing for transcription options — cast/`@ts-expect-error` if the installed types lag; (b) `lucide-react` `Captions` icon availability — fall back to `FileText`; (c) the existing `AgentDesktopShell` test may need a minimal query/mocks update after the right-column swap. Each is called out in its task.

