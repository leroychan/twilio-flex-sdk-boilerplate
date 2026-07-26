# Part 3 — Flex Client Boundary & Stub-Ready Auth — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the boilerplate a server-side stub-ready token route and a browser-only Flex SDK boundary (singleton client, React provider, event→store bridge, Zustand session slice, reference action wrapper) plus a login flow (SSO + custom token) and a client-only, session-gated agent-desktop shell, so the app authenticates and holds a live-or-mocked SDK session.

**Architecture:** The Twilio server SDK mints a Flex access token inside a Next.js Route Handler (`/api/token`); when live creds are absent it returns a clearly-marked mock token so the app boots offline. All `@twilio/flex-sdk` code sits behind a `'use client'` boundary: `lib/flex/client.ts` owns a module-level singleton so Fast Refresh never re-inits the live session; `FlexClientProvider` creates the client once a token exists and wires SDK events into a Zustand `sessionSlice` via `lib/flex/events.ts`. The agent desktop is loaded with `next/dynamic({ ssr: false })` and redirects to `/login` when no session token is present.

**Tech Stack:** Next.js 15 App Router, TypeScript (strict), `@twilio/flex-sdk` 4.1.x, `twilio` (server SDK), Zustand, next-intl (from Part 2), Vitest + @testing-library/react (jsdom).

## Global Constraints

- Next.js 15 App Router + TypeScript; strict mode on; import alias `@/` → `src/`.
- Package manager: **npm**. Tests run headless via `npm run test:run` (Vitest, jsdom, @testing-library/react) — established in Part 1.
- The Flex SDK is **browser-only** (needs `window`/WebRTC/localStorage): every module that imports `@twilio/flex-sdk` (or a subpath) MUST start with `'use client'`, and the agent desktop MUST be loaded via `next/dynamic` with `ssr: false`.
- The SDK is **mocked in tests** at two boundaries: `vi.mock('@twilio/flex-sdk')` (and its subpaths) for SDK-facing units, and `vi.mock('@/lib/flex/client')` for units that only consume the singleton. Always use factory-form mocks (the real package need not resolve in the test env).
- **Canonical singleton API (later parts depend on this exact shape):**
  - `initFlexClient(token: string, opts?: FlexClientOptions): Promise<FlexClient>` in `@/lib/flex/client.ts`
  - `getFlexClient(): FlexClient | null` in `@/lib/flex/client.ts`
- **Canonical action-wrapper pattern:** wrappers live at `@/lib/flex/actions/<Domain>.ts`, wrap `@twilio/flex-sdk/actions/<Domain>`, execute via `getFlexClient().execute(new <Action>(...))`, and normalize failures through the shared `@/lib/flex/errors.ts` `normalizeFlexError` → `{ code, severity, message }`. Part 3 ships the **Worker** wrapper (`setCurrentActivity`, `setAttributes`) as the reference; later parts add Voice/Task/Conversation/Supervisor following it.
- **Canonical Zustand pattern:** `@/store/index.ts` exports `useFlexStore`; slice creators live at `@/store/slices/<name>.ts` as `create<Name>Slice`. Later feature parts add their own slice file plus an "Integration hooks" note; the coordinator wires it into `store/index.ts`. Part 3 ships `sessionSlice` = `{ token, worker, connectionState, setToken, setWorker, setConnectionState }`.
- **i18n (from Part 2):** access strings via `useTranslations('<namespace>')`; Part 3's own strings live in `@/features/session/messages/en.json` under namespace `session`. The app's root layout (Part 2) supplies the `NextIntlClientProvider`.
- Tailwind brand tokens + `@/components/ui/*` primitives (`Button`, `Card`) from Part 1 are available.
- **File ownership — Part 3 owns:** `src/lib/flex/**`, `src/store/index.ts`, `src/store/slices/session.ts`, `src/app/api/token/**`, `src/app/(auth)/**`, `src/app/agent-desktop/page.tsx`, and the `src/features/session/**` files created here. Later parts MUST NOT edit these except via documented "Integration hooks".

---

### Task 1: Stub-ready token route + shared Flex types + `.env.example`

**Files:**
- Create: `src/lib/flex/types.ts`
- Create: `src/app/api/token/route.ts`
- Create: `src/app/api/token/__tests__/route.test.ts`
- Create: `.env.example`
- Modify: `package.json` (adds `twilio` dependency)

**Interfaces:**
- Consumes: nothing from earlier Part-3 tasks.
- Produces:
  - `src/lib/flex/types.ts` exporting `interface TokenResponse { token: string; identity: string; stub: boolean }`, `interface FlexClientOptions { logLevel?: 'debug'|'info'|'warn'|'error'|'silent'; autoAcceptIncomingCalls?: boolean; autoUpdateToken?: boolean; refreshToken?: string; ssoProfileSid?: string }`, and `type ConnectionState = 'disconnected'|'connecting'|'connected'|'error'`.
  - `POST /api/token` Route Handler returning `TokenResponse` JSON. Reads env at request time; when live creds are absent returns a mock token whose value begins with `STUB.` and `stub: true`.

- [ ] **Step 1: Install the Twilio server SDK**

Run:
```bash
npm i twilio
```
Expected: `twilio` added to `dependencies` in `package.json`.

- [ ] **Step 2: Create shared Flex types `src/lib/flex/types.ts`**

```ts
// Pure types shared across the server route and the browser SDK boundary.
// No runtime code here, so it is safe to import from both server and client modules.

export interface TokenResponse {
  token: string;
  identity: string;
  /** true when the app minted a mock token because live Twilio creds were absent. */
  stub: boolean;
}

export interface FlexClientOptions {
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'silent';
  autoAcceptIncomingCalls?: boolean;
  autoUpdateToken?: boolean;
  refreshToken?: string;
  ssoProfileSid?: string;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';
```

- [ ] **Step 3: Write the failing test `src/app/api/token/__tests__/route.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the Twilio server SDK so the live-creds path is deterministic and offline.
vi.mock('twilio', () => {
  class TaskRouterGrant {
    constructor(public opts: unknown) {}
  }
  class AccessToken {
    grants: unknown[] = [];
    constructor(
      public accountSid: string,
      public apiKey: string,
      public apiSecret: string,
      public opts: { identity: string },
    ) {}
    addGrant(g: unknown) {
      this.grants.push(g);
    }
    toJwt() {
      return `LIVE.jwt.for.${this.opts.identity}`;
    }
    static TaskRouterGrant = TaskRouterGrant;
  }
  return { default: { jwt: { AccessToken } } };
});

import { POST } from '../route';

const ENV_KEYS = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_API_KEY',
  'TWILIO_API_SECRET',
  'TWILIO_WORKSPACE_SID',
  'TWILIO_WORKER_SID',
] as const;

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/token', () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const k of ENV_KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });
  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it('returns a clearly-marked stub token when creds are absent', async () => {
    const res = await POST(makeRequest({ identity: 'alice' }));
    const json = await res.json();
    expect(json.stub).toBe(true);
    expect(json.identity).toBe('alice');
    expect(json.token.startsWith('STUB.')).toBe(true);
  });

  it('defaults the identity when none is supplied', async () => {
    const res = await POST(makeRequest({}));
    const json = await res.json();
    expect(json.identity).toBe('demo-agent');
    expect(json.stub).toBe(true);
  });

  it('mints a live JWT when all creds are present', async () => {
    process.env.TWILIO_ACCOUNT_SID = 'ACxxxx';
    process.env.TWILIO_API_KEY = 'SKxxxx';
    process.env.TWILIO_API_SECRET = 'secret';
    process.env.TWILIO_WORKSPACE_SID = 'WSxxxx';
    process.env.TWILIO_WORKER_SID = 'WKxxxx';
    const res = await POST(makeRequest({ identity: 'bob' }));
    const json = await res.json();
    expect(json.stub).toBe(false);
    expect(json.token).toBe('LIVE.jwt.for.bob');
    expect(json.identity).toBe('bob');
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm run test:run -- route`
Expected: FAIL — cannot resolve `../route` (module not created yet).

- [ ] **Step 5: Implement `src/app/api/token/route.ts`**

```ts
import { NextResponse } from 'next/server';
import twilio from 'twilio';
import type { TokenResponse } from '@/lib/flex/types';

// This route runs on the server. It mints a Flex access token from env vars.
// STUB-READY: when live creds are absent it returns a clearly-marked mock token
// so the UI and plugins are developable without a live Twilio account. Swapping
// in real creds (see .env.example) requires no code changes elsewhere.

export const runtime = 'nodejs';

function readEnv() {
  return {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    apiKey: process.env.TWILIO_API_KEY,
    apiSecret: process.env.TWILIO_API_SECRET,
    workspaceSid: process.env.TWILIO_WORKSPACE_SID,
    workerSid: process.env.TWILIO_WORKER_SID,
  };
}

function hasLiveCreds(env: ReturnType<typeof readEnv>): boolean {
  return Boolean(env.accountSid && env.apiKey && env.apiSecret && env.workspaceSid);
}

function stubToken(identity: string): string {
  const payload = Buffer.from(
    JSON.stringify({ identity, stub: true, iat: Date.now() }),
  ).toString('base64url');
  // TODO: replace by providing live creds in .env.local — see .env.example.
  return `STUB.${payload}.STUB`;
}

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as {
    identity?: string;
    workerSid?: string;
  };
  const identity = body.identity && body.identity.trim() ? body.identity.trim() : 'demo-agent';
  const env = readEnv();

  if (!hasLiveCreds(env)) {
    const stub: TokenResponse = { token: stubToken(identity), identity, stub: true };
    return NextResponse.json(stub);
  }

  const AccessToken = twilio.jwt.AccessToken;
  const TaskRouterGrant = AccessToken.TaskRouterGrant;
  const token = new AccessToken(env.accountSid!, env.apiKey!, env.apiSecret!, { identity });
  token.addGrant(
    new TaskRouterGrant({
      workspaceSid: env.workspaceSid!,
      workerSid: body.workerSid ?? env.workerSid ?? env.workspaceSid!,
      role: 'worker',
    }),
  );

  const live: TokenResponse = { token: token.toJwt(), identity, stub: false };
  return NextResponse.json(live);
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm run test:run -- route`
Expected: 3 passed.

- [ ] **Step 7: Write `.env.example` documenting every variable**

```bash
# Twilio Flex SDK boilerplate — environment variables.
# Copy to .env.local and fill in to switch from stub mode to a live Flex account.
# When any required var below is missing, /api/token returns a clearly-marked STUB
# token and the app runs offline (no live SDK session).

# --- Required for a LIVE token (all four must be set) ---
TWILIO_ACCOUNT_SID=
TWILIO_API_KEY=
TWILIO_API_SECRET=
TWILIO_WORKSPACE_SID=

# --- Optional ---
# Worker SID to scope the TaskRouter grant to a specific worker (falls back to workspace).
TWILIO_WORKER_SID=

# --- Enhanced SSO (OAuth) login, client-side (NEXT_PUBLIC_*) ---
# SSO connection / profile SID used by the exchangeToken OAuth callback.
NEXT_PUBLIC_FLEX_SSO_PROFILE_SID=
```

- [ ] **Step 8: Type-check and commit**

Run: `npx tsc --noEmit`
Expected: exits 0.

```bash
git add src/lib/flex/types.ts src/app/api/token .env.example package.json package-lock.json
git commit -m "feat(auth): stub-ready /api/token route + shared Flex types"
```

---

### Task 2: Browser-only Flex client singleton

**Files:**
- Create: `src/lib/flex/client.ts`
- Create: `src/lib/flex/__tests__/client.test.ts`
- Modify: `package.json` (adds `@twilio/flex-sdk` dependency)

**Interfaces:**
- Consumes: `FlexClientOptions` from `@/lib/flex/types`.
- Produces:
  - `type FlexClient = Client` (re-exported from `@twilio/flex-sdk`).
  - `initFlexClient(token: string, opts?: FlexClientOptions): Promise<FlexClient>` — creates the client via `createClient` exactly once; concurrent/subsequent calls return the same instance.
  - `getFlexClient(): FlexClient | null` — the current singleton, or `null` before init.
  - `resetFlexClient(): void` — clears the singleton (test-only / logout).

- [ ] **Step 1: Install the Flex SDK**

Run:
```bash
npm i @twilio/flex-sdk@^4.1.0
```
Expected: `@twilio/flex-sdk` added to `dependencies`. (If the peer range forces a React downgrade, follow the resolution and note it in the commit — see spec §13.)

- [ ] **Step 2: Write the failing test `src/lib/flex/__tests__/client.test.ts`**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

const createClient = vi.fn();

vi.mock('@twilio/flex-sdk', () => ({
  createClient: (...args: unknown[]) => createClient(...args),
}));

import { initFlexClient, getFlexClient, resetFlexClient } from '../client';

describe('flex client singleton', () => {
  beforeEach(() => {
    resetFlexClient();
    createClient.mockReset();
  });

  it('returns null before initialization', () => {
    expect(getFlexClient()).toBeNull();
  });

  it('creates the client once and exposes it via getFlexClient', async () => {
    const fake = { id: 'client-1' };
    createClient.mockResolvedValue(fake);

    const c = await initFlexClient('tok-123');

    expect(c).toBe(fake);
    expect(getFlexClient()).toBe(fake);
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledWith(
      'tok-123',
      expect.objectContaining({
        logger: { level: 'info' },
        voiceOptions: { autoAcceptIncomingCalls: false },
        session: expect.objectContaining({ autoUpdateToken: false }),
      }),
    );
  });

  it('does not re-create the client on subsequent calls', async () => {
    const fake = { id: 'client-1' };
    createClient.mockResolvedValue(fake);

    const first = await initFlexClient('tok-123');
    const second = await initFlexClient('tok-456');

    expect(second).toBe(first);
    expect(createClient).toHaveBeenCalledTimes(1);
  });

  it('passes session refresh options through and enables autoUpdateToken with a refresh token', async () => {
    createClient.mockResolvedValue({});
    await initFlexClient('tok', { refreshToken: 'r1', ssoProfileSid: 'sso1' });
    expect(createClient).toHaveBeenCalledWith(
      'tok',
      expect.objectContaining({
        session: { autoUpdateToken: true, refreshToken: 'r1', ssoProfileSid: 'sso1' },
      }),
    );
  });

  it('clears the failed init promise so a later call can retry', async () => {
    createClient.mockRejectedValueOnce(new Error('boom'));
    await expect(initFlexClient('tok')).rejects.toThrow('boom');
    createClient.mockResolvedValue({ id: 'ok' });
    const c = await initFlexClient('tok');
    expect(c).toEqual({ id: 'ok' });
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm run test:run -- client`
Expected: FAIL — cannot resolve `../client`.

- [ ] **Step 4: Implement `src/lib/flex/client.ts`**

```ts
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
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test:run -- client`
Expected: 5 passed.

- [ ] **Step 6: Commit**

```bash
git add src/lib/flex/client.ts src/lib/flex/__tests__/client.test.ts package.json package-lock.json
git commit -m "feat(flex): browser-only Flex client singleton (initFlexClient/getFlexClient)"
```

---

### Task 3: Shared Flex error normalizer

**Files:**
- Create: `src/lib/flex/errors.ts`
- Create: `src/lib/flex/__tests__/errors.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type FlexErrorSeverity = 'info' | 'warning' | 'error'`.
  - `interface NormalizedFlexError { code: string; severity: FlexErrorSeverity; message: string }`.
  - `normalizeFlexError(err: unknown): NormalizedFlexError` — maps a `FlexSdkError`-shaped value (or any thrown value) to the normalized shape used by every action wrapper.

- [ ] **Step 1: Write the failing test `src/lib/flex/__tests__/errors.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { normalizeFlexError } from '../errors';

describe('normalizeFlexError', () => {
  it('maps a FlexSdkError-shaped object', () => {
    const out = normalizeFlexError({ code: 20001, message: 'Nope', severity: 'warning' });
    expect(out).toEqual({ code: '20001', severity: 'warning', message: 'Nope' });
  });

  it('defaults severity to error and code to unknown_error', () => {
    const out = normalizeFlexError({ message: 'Broke' });
    expect(out).toEqual({ code: 'unknown_error', severity: 'error', message: 'Broke' });
  });

  it('handles a plain Error', () => {
    const out = normalizeFlexError(new Error('kaboom'));
    expect(out.code).toBe('unknown_error');
    expect(out.severity).toBe('error');
    expect(out.message).toBe('kaboom');
  });

  it('handles a string and unknown values', () => {
    expect(normalizeFlexError('bad').message).toBe('bad');
    expect(normalizeFlexError(null).message).toBe('An unexpected error occurred.');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- errors`
Expected: FAIL — cannot resolve `../errors`.

- [ ] **Step 3: Implement `src/lib/flex/errors.ts`**

```ts
// Maps any FlexSdkError-shaped value (or arbitrary thrown value) into a stable,
// UI-friendly shape. Every action wrapper funnels failures through here so the app
// handles SDK errors uniformly. No 'use client' needed — pure, isomorphic logic.

export type FlexErrorSeverity = 'info' | 'warning' | 'error';

export interface NormalizedFlexError {
  code: string;
  severity: FlexErrorSeverity;
  message: string;
}

export function normalizeFlexError(err: unknown): NormalizedFlexError {
  if (err && typeof err === 'object') {
    const e = err as { code?: string | number; message?: string; severity?: string };
    const severity: FlexErrorSeverity =
      e.severity === 'warning' || e.severity === 'info' ? e.severity : 'error';
    return {
      code: e.code !== undefined && e.code !== null ? String(e.code) : 'unknown_error',
      severity,
      message: e.message ?? 'An unexpected error occurred.',
    };
  }
  return {
    code: 'unknown_error',
    severity: 'error',
    message: typeof err === 'string' ? err : 'An unexpected error occurred.',
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- errors`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/flex/errors.ts src/lib/flex/__tests__/errors.test.ts
git commit -m "feat(flex): shared FlexSdkError normalizer"
```

---

### Task 4: Zustand store + session slice

**Files:**
- Create: `src/store/slices/session.ts`
- Create: `src/store/index.ts`
- Create: `src/store/slices/__tests__/session.test.ts`
- Modify: `package.json` (adds `zustand` dependency)

**Interfaces:**
- Consumes: `ConnectionState` from `@/lib/flex/types`; `Worker` type from `@twilio/flex-sdk/taskrouter`.
- Produces:
  - `interface SessionSlice { token: string | null; worker: Worker | null; connectionState: ConnectionState; setToken: (t: string | null) => void; setWorker: (w: Worker | null) => void; setConnectionState: (s: ConnectionState) => void }`.
  - `const createSessionSlice: StateCreator<SessionSlice, [], [], SessionSlice>`.
  - `useFlexStore` (from `@/store/index.ts`) with type `FlexStore` (currently `= SessionSlice`), composed by spreading slice creators. **Composition pattern (for later parts):** intersect the new slice type into `FlexStore` and spread its `create<Name>Slice(...a)` into the `create<FlexStore>()` initializer.

- [ ] **Step 1: Install zustand**

Run:
```bash
npm i zustand
```
Expected: `zustand` added to `dependencies`.

- [ ] **Step 2: Write the failing test `src/store/slices/__tests__/session.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useFlexStore } from '@/store';

describe('sessionSlice via useFlexStore', () => {
  beforeEach(() => {
    useFlexStore.setState({ token: null, worker: null, connectionState: 'disconnected' });
  });

  it('starts with sensible defaults', () => {
    const s = useFlexStore.getState();
    expect(s.token).toBeNull();
    expect(s.worker).toBeNull();
    expect(s.connectionState).toBe('disconnected');
  });

  it('setToken updates the token', () => {
    useFlexStore.getState().setToken('tok-1');
    expect(useFlexStore.getState().token).toBe('tok-1');
  });

  it('setConnectionState updates the connection state', () => {
    useFlexStore.getState().setConnectionState('connected');
    expect(useFlexStore.getState().connectionState).toBe('connected');
  });

  it('setWorker updates the worker', () => {
    const worker = { sid: 'WK1' } as unknown as Parameters<
      ReturnType<typeof useFlexStore.getState>['setWorker']
    >[0];
    useFlexStore.getState().setWorker(worker);
    expect(useFlexStore.getState().worker).toBe(worker);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm run test:run -- session`
Expected: FAIL — cannot resolve `@/store`.

- [ ] **Step 4: Implement `src/store/slices/session.ts`**

```ts
import type { StateCreator } from 'zustand';
import type { Worker } from '@twilio/flex-sdk/taskrouter';
import type { ConnectionState } from '@/lib/flex/types';

export interface SessionSlice {
  token: string | null;
  worker: Worker | null;
  connectionState: ConnectionState;
  setToken: (token: string | null) => void;
  setWorker: (worker: Worker | null) => void;
  setConnectionState: (state: ConnectionState) => void;
}

export const createSessionSlice: StateCreator<SessionSlice, [], [], SessionSlice> = (set) => ({
  token: null,
  worker: null,
  connectionState: 'disconnected',
  setToken: (token) => set({ token }),
  setWorker: (worker) => set({ worker }),
  setConnectionState: (connectionState) => set({ connectionState }),
});
```

- [ ] **Step 5: Implement `src/store/index.ts`**

```ts
import { create } from 'zustand';
import { createSessionSlice, type SessionSlice } from './slices/session';

// Composition pattern — later feature parts extend the store like so:
//   1. Add `& <Name>Slice` to FlexStore below.
//   2. Spread `...create<Name>Slice(...a)` into the initializer.
// Slice creators must be typed `StateCreator<TSlice, [], [], TSlice>`.
export type FlexStore = SessionSlice;

export const useFlexStore = create<FlexStore>()((...a) => ({
  ...createSessionSlice(...a),
}));
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm run test:run -- session`
Expected: 4 passed.

- [ ] **Step 7: Commit**

```bash
git add src/store package.json package-lock.json
git commit -m "feat(store): Zustand useFlexStore + sessionSlice"
```

---

### Task 5: SDK event → session-slice bridge

**Files:**
- Create: `src/lib/flex/events.ts`
- Create: `src/lib/flex/__tests__/events.test.ts`

**Interfaces:**
- Consumes: `FlexClient` from `@/lib/flex/client`; `useFlexStore` from `@/store`.
- Produces:
  - `registerSessionListeners(client: FlexClient): () => void` — subscribes the client's `tokenUpdated` event to `useFlexStore.setToken` (this is how `autoUpdateToken` refreshes propagate to app state) and returns an unsubscribe function that removes the listener.

- [ ] **Step 1: Write the failing test `src/lib/flex/__tests__/events.test.ts`**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { useFlexStore } from '@/store';
import type { FlexClient } from '../client';
import { registerSessionListeners } from '../events';

describe('registerSessionListeners', () => {
  beforeEach(() => {
    useFlexStore.setState({ token: null, worker: null, connectionState: 'disconnected' });
  });

  it('pushes tokenUpdated events into the session slice', () => {
    const emitter = new EventEmitter() as unknown as FlexClient;
    registerSessionListeners(emitter);
    (emitter as unknown as EventEmitter).emit('tokenUpdated', 'refreshed-token');
    expect(useFlexStore.getState().token).toBe('refreshed-token');
  });

  it('unsubscribe removes the listener', () => {
    const emitter = new EventEmitter();
    const unsubscribe = registerSessionListeners(emitter as unknown as FlexClient);
    unsubscribe();
    emitter.emit('tokenUpdated', 'ignored');
    expect(useFlexStore.getState().token).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- events`
Expected: FAIL — cannot resolve `../events`.

- [ ] **Step 3: Implement `src/lib/flex/events.ts`**

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- events`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/flex/events.ts src/lib/flex/__tests__/events.test.ts
git commit -m "feat(flex): SDK tokenUpdated -> session slice bridge"
```

---

### Task 6: FlexClientProvider React context

**Files:**
- Create: `src/lib/flex/provider.tsx`
- Create: `src/lib/flex/__tests__/provider.test.tsx`

**Interfaces:**
- Consumes: `initFlexClient`, `FlexClient` from `@/lib/flex/client`; `FlexClientOptions` from `@/lib/flex/types`; `registerSessionListeners` from `@/lib/flex/events`; `normalizeFlexError` from `@/lib/flex/errors`; `useFlexStore` from `@/store`.
- Produces:
  - `FlexClientProvider({ token, options, children }: { token: string | null; options?: FlexClientOptions; children: React.ReactNode })` — when `token` is non-null, sets `connectionState='connecting'`, mirrors the token into the store, calls `initFlexClient`, resolves the worker via `client.getWorker()`, registers session listeners, sets `connectionState='connected'`, and on failure sets `connectionState='error'` with a normalized message. Cleans up listeners on unmount / token change.
  - `useFlexClientContext(): { client: FlexClient | null; error: string | null }`.

- [ ] **Step 1: Write the failing test `src/lib/flex/__tests__/provider.test.tsx`**

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useFlexStore } from '@/store';

const initFlexClient = vi.fn();
const registerSessionListeners = vi.fn(() => vi.fn());

vi.mock('@/lib/flex/client', () => ({
  initFlexClient: (...a: unknown[]) => initFlexClient(...a),
}));
vi.mock('@/lib/flex/events', () => ({
  registerSessionListeners: (...a: unknown[]) => registerSessionListeners(...a),
}));

import { FlexClientProvider, useFlexClientContext } from '../provider';

function Probe() {
  const { client, error } = useFlexClientContext();
  return <div data-testid="probe">{error ?? (client ? 'has-client' : 'no-client')}</div>;
}

describe('FlexClientProvider', () => {
  beforeEach(() => {
    useFlexStore.setState({ token: null, worker: null, connectionState: 'disconnected' });
    initFlexClient.mockReset();
    registerSessionListeners.mockClear();
  });

  it('does nothing without a token', () => {
    render(
      <FlexClientProvider token={null}>
        <Probe />
      </FlexClientProvider>,
    );
    expect(screen.getByTestId('probe').textContent).toBe('no-client');
    expect(initFlexClient).not.toHaveBeenCalled();
  });

  it('creates the client, resolves the worker, and registers listeners', async () => {
    const worker = { sid: 'WK1' };
    const fakeClient = { getWorker: vi.fn().mockResolvedValue(worker) };
    initFlexClient.mockResolvedValue(fakeClient);

    render(
      <FlexClientProvider token="tok-1">
        <Probe />
      </FlexClientProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('probe').textContent).toBe('has-client'));
    expect(initFlexClient).toHaveBeenCalledWith('tok-1', undefined);
    expect(registerSessionListeners).toHaveBeenCalledWith(fakeClient);
    expect(useFlexStore.getState().worker).toBe(worker);
    expect(useFlexStore.getState().connectionState).toBe('connected');
  });

  it('surfaces a normalized error on failure', async () => {
    initFlexClient.mockRejectedValue({ code: 'x', message: 'init failed' });
    render(
      <FlexClientProvider token="tok-1">
        <Probe />
      </FlexClientProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toBe('init failed'));
    expect(useFlexStore.getState().connectionState).toBe('error');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- provider`
Expected: FAIL — cannot resolve `../provider`.

- [ ] **Step 3: Implement `src/lib/flex/provider.tsx`**

```tsx
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- provider`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/flex/provider.tsx src/lib/flex/__tests__/provider.test.tsx
git commit -m "feat(flex): FlexClientProvider context (init + worker + listeners)"
```

---

### Task 7: Worker action wrapper (reference example)

**Files:**
- Create: `src/lib/flex/actions/Worker.ts`
- Create: `src/lib/flex/actions/__tests__/Worker.test.ts`

**Interfaces:**
- Consumes: `getFlexClient` from `@/lib/flex/client`; `SetCurrentActivity`, `SetAttributes` from `@twilio/flex-sdk/actions/Worker`; `normalizeFlexError`, `NormalizedFlexError` from `@/lib/flex/errors`.
- Produces (the canonical wrapper pattern later parts copy):
  - `setCurrentActivity(activitySid: string): Promise<void>` — executes `new SetCurrentActivity({ activitySid })` via the singleton client.
  - `setAttributes(attributes: Record<string, unknown>): Promise<void>` — executes `new SetAttributes({ attributes })`.
  - Both throw a `NormalizedFlexError` (via `normalizeFlexError`) on failure, and throw `{ code: 'client_not_initialized', ... }` when no client exists.

- [ ] **Step 1: Write the failing test `src/lib/flex/actions/__tests__/Worker.test.ts`**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

const getFlexClient = vi.fn();

class SetCurrentActivity {
  constructor(public args: unknown) {}
}
class SetAttributes {
  constructor(public args: unknown) {}
}

vi.mock('@/lib/flex/client', () => ({
  getFlexClient: () => getFlexClient(),
}));
vi.mock('@twilio/flex-sdk/actions/Worker', () => ({ SetCurrentActivity, SetAttributes }));

import { setCurrentActivity, setAttributes } from '../Worker';

describe('Worker action wrappers', () => {
  beforeEach(() => getFlexClient.mockReset());

  it('setCurrentActivity executes SetCurrentActivity via the client', async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    getFlexClient.mockReturnValue({ execute });
    await setCurrentActivity('WA123');
    expect(execute).toHaveBeenCalledTimes(1);
    const action = execute.mock.calls[0][0];
    expect(action).toBeInstanceOf(SetCurrentActivity);
    expect(action.args).toEqual({ activitySid: 'WA123' });
  });

  it('setAttributes executes SetAttributes via the client', async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    getFlexClient.mockReturnValue({ execute });
    await setAttributes({ team: 'blue' });
    const action = execute.mock.calls[0][0];
    expect(action).toBeInstanceOf(SetAttributes);
    expect(action.args).toEqual({ attributes: { team: 'blue' } });
  });

  it('throws a client_not_initialized error when there is no client', async () => {
    getFlexClient.mockReturnValue(null);
    await expect(setCurrentActivity('WA1')).rejects.toMatchObject({
      code: 'client_not_initialized',
      severity: 'error',
    });
  });

  it('normalizes SDK failures', async () => {
    const execute = vi.fn().mockRejectedValue({ code: 42, message: 'denied' });
    getFlexClient.mockReturnValue({ execute });
    await expect(setAttributes({})).rejects.toEqual({
      code: '42',
      severity: 'error',
      message: 'denied',
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- Worker`
Expected: FAIL — cannot resolve `../Worker`.

- [ ] **Step 3: Implement `src/lib/flex/actions/Worker.ts`**

```ts
'use client';

// REFERENCE WRAPPER — later parts add actions/Voice.ts, actions/Task.ts,
// actions/Conversation.ts, actions/Supervisor.ts following this exact shape:
//   1. import the action classes from '@twilio/flex-sdk/actions/<Domain>'
//   2. get the singleton client via getFlexClient()
//   3. client.execute(new <Action>({ ...args }))
//   4. funnel every failure through normalizeFlexError()
import { SetCurrentActivity, SetAttributes } from '@twilio/flex-sdk/actions/Worker';
import { getFlexClient } from '../client';
import { normalizeFlexError, type NormalizedFlexError } from '../errors';

function requireClient() {
  const client = getFlexClient();
  if (!client) {
    const err: NormalizedFlexError = {
      code: 'client_not_initialized',
      severity: 'error',
      message: 'Flex client is not initialized.',
    };
    throw err;
  }
  return client;
}

export async function setCurrentActivity(activitySid: string): Promise<void> {
  const client = requireClient();
  try {
    await client.execute(new SetCurrentActivity({ activitySid }));
  } catch (err) {
    throw normalizeFlexError(err);
  }
}

export async function setAttributes(attributes: Record<string, unknown>): Promise<void> {
  const client = requireClient();
  try {
    await client.execute(new SetAttributes({ attributes }));
  } catch (err) {
    throw normalizeFlexError(err);
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- Worker`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/flex/actions
git commit -m "feat(flex): Worker action wrapper (reference pattern)"
```

---

### Task 8: Login flow (auth helper + login page + session messages)

**Files:**
- Create: `src/lib/flex/auth.ts`
- Create: `src/features/session/messages/en.json`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/login/__tests__/page.test.tsx`

**Interfaces:**
- Consumes: `TokenResponse` from `@/lib/flex/types`; `exchangeToken` from `@twilio/flex-sdk`; `useFlexStore` from `@/store`; `Button`, `Card` from `@/components/ui/*`; `useTranslations` from `next-intl`; `useRouter` from `next/navigation`.
- Produces:
  - `requestToken(identity?: string): Promise<TokenResponse>` — POSTs to `/api/token`.
  - `exchangeSsoToken(params: { ssoProfileSid: string; codeVerifier: string; nonce: string; code: string }): Promise<{ accessToken: string; refreshToken?: string }>` — wraps the SDK `exchangeToken` OAuth-callback exchange.
  - `LoginPage()` default export — client component with a **custom-token** path (fetch stub/live token → store → `/agent-desktop`) and an **SSO** path (detects `?code&state`, calls `exchangeSsoToken`, stores token → `/agent-desktop`). Strings via `useTranslations('session')`.

- [ ] **Step 1: Write the session message catalog `src/features/session/messages/en.json`**

```json
{
  "session": {
    "title": "Sign in to Flex",
    "subtitle": "Authenticate to start your agent session.",
    "demoMode": "Continue in demo mode",
    "ssoSignIn": "Sign in with SSO",
    "identityLabel": "Agent identity",
    "signingIn": "Signing in…",
    "error": "Sign-in failed. Please try again."
  }
}
```

- [ ] **Step 2: Implement `src/lib/flex/auth.ts`**

```ts
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
```

- [ ] **Step 3: Write the failing test `src/app/(auth)/login/__tests__/page.test.tsx`**

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFlexStore } from '@/store';

const push = vi.fn();
const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => new URLSearchParams(''),
}));
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));
// SDK is browser-only — mock it so exchangeToken never touches window.
vi.mock('@twilio/flex-sdk', () => ({ exchangeToken: vi.fn() }));

import LoginPage from '../page';

describe('LoginPage', () => {
  beforeEach(() => {
    useFlexStore.setState({ token: null, worker: null, connectionState: 'disconnected' });
    push.mockReset();
    vi.restoreAllMocks();
  });

  it('demo-mode sign-in fetches a token, stores it, and navigates to the desktop', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ token: 'STUB.abc.STUB', identity: 'demo-agent', stub: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    render(<LoginPage />);
    await userEvent.click(screen.getByRole('button', { name: 'demoMode' }));

    await waitFor(() => expect(useFlexStore.getState().token).toBe('STUB.abc.STUB'));
    expect(push).toHaveBeenCalledWith('/agent-desktop');
  });

  it('shows an error message when the token request fails', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('nope', { status: 500 }));
    render(<LoginPage />);
    await userEvent.click(screen.getByRole('button', { name: 'demoMode' }));
    await waitFor(() => expect(screen.getByText('error')).toBeInTheDocument());
    expect(push).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm run test:run -- login`
Expected: FAIL — cannot resolve `../page`.

- [ ] **Step 5: Implement `src/app/(auth)/login/page.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useFlexStore } from '@/store';
import { requestToken, exchangeSsoToken } from '@/lib/flex/auth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const SSO_PROFILE_SID = process.env.NEXT_PUBLIC_FLEX_SSO_PROFILE_SID ?? '';

export default function LoginPage() {
  const t = useTranslations('session');
  const router = useRouter();
  const searchParams = useSearchParams();
  const setToken = useFlexStore((s) => s.setToken);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  // SSO OAuth callback: exchange ?code&state for an access token, then continue.
  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    if (!code || !state) return;
    const codeVerifier = sessionStorage.getItem('flex.codeVerifier');
    const nonce = sessionStorage.getItem('flex.nonce');
    if (!codeVerifier || !nonce) return;

    setBusy(true);
    exchangeSsoToken({ ssoProfileSid: SSO_PROFILE_SID, codeVerifier, nonce, code })
      .then(({ accessToken }) => {
        sessionStorage.removeItem('flex.codeVerifier');
        sessionStorage.removeItem('flex.nonce');
        setToken(accessToken);
        router.push('/agent-desktop');
      })
      .catch(() => {
        setError(true);
        setBusy(false);
      });
  }, [searchParams, router, setToken]);

  async function handleCustomToken() {
    setBusy(true);
    setError(false);
    try {
      const { token } = await requestToken();
      setToken(token);
      router.push('/agent-desktop');
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg text-text">
      <Card className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-extrabold">{t('title')}</h1>
        <p className="mt-1 text-muted">{t('subtitle')}</p>
        {error && <p className="mt-3 text-danger">{t('error')}</p>}
        <div className="mt-6 flex flex-col gap-3">
          <Button onClick={handleCustomToken} disabled={busy}>
            {busy ? t('signingIn') : t('demoMode')}
          </Button>
        </div>
      </Card>
    </main>
  );
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm run test:run -- login`
Expected: 2 passed.

- [ ] **Step 7: Commit**

```bash
git add src/lib/flex/auth.ts "src/app/(auth)" src/features/session/messages
git commit -m "feat(auth): login flow (custom token + SSO exchangeToken) + session i18n"
```

---

### Task 9: Session-gated agent-desktop shell (dynamic, ssr:false)

**Files:**
- Create: `src/features/session/components/AgentDesktopShell.tsx`
- Create: `src/app/agent-desktop/page.tsx`
- Create: `src/features/session/components/__tests__/AgentDesktopShell.test.tsx`

**Interfaces:**
- Consumes: `useFlexStore` from `@/store`; `FlexClientProvider` from `@/lib/flex/provider`; `useRouter` from `next/navigation`; `next/dynamic`.
- Produces:
  - `AgentDesktopShell()` — client component; redirects to `/login` when there is no session token; otherwise wraps the desktop content in `FlexClientProvider` (token from the store). This is the mount point later feature parts render panels into.
  - `AgentDesktopPage()` default export at `src/app/agent-desktop/page.tsx` — loads `AgentDesktopShell` via `next/dynamic` with `ssr: false` (the SDK boundary must never render on the server).

- [ ] **Step 1: Write the failing test `src/features/session/components/__tests__/AgentDesktopShell.test.tsx`**

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useFlexStore } from '@/store';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
// Keep the SDK boundary out of the shell test — render children directly.
vi.mock('@/lib/flex/provider', () => ({
  FlexClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { AgentDesktopShell } from '../AgentDesktopShell';

describe('AgentDesktopShell', () => {
  beforeEach(() => {
    useFlexStore.setState({ token: null, worker: null, connectionState: 'disconnected' });
    replace.mockReset();
  });

  it('redirects to /login when there is no token', async () => {
    render(<AgentDesktopShell />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
  });

  it('renders the desktop when a token is present', () => {
    useFlexStore.setState({ token: 'tok-1' });
    render(<AgentDesktopShell />);
    expect(screen.getByTestId('agent-desktop')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- AgentDesktopShell`
Expected: FAIL — cannot resolve `../AgentDesktopShell`.

- [ ] **Step 3: Implement `src/features/session/components/AgentDesktopShell.tsx`**

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFlexStore } from '@/store';
import { FlexClientProvider } from '@/lib/flex/provider';

// The session-gated container for the agent desktop. Later feature parts render
// their panels as children here (behind the live FlexClientProvider).
export function AgentDesktopShell() {
  const token = useFlexStore((s) => s.token);
  const router = useRouter();

  useEffect(() => {
    if (!token) router.replace('/login');
  }, [token, router]);

  if (!token) return null;

  return (
    <FlexClientProvider token={token}>
      <main data-testid="agent-desktop" className="min-h-screen bg-bg text-text">
        {/* Feature parts (presence, tasks, voice, conversations, supervisor) mount here. */}
      </main>
    </FlexClientProvider>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- AgentDesktopShell`
Expected: 2 passed.

- [ ] **Step 5: Implement `src/app/agent-desktop/page.tsx`**

```tsx
'use client';

import dynamic from 'next/dynamic';

// ssr:false is mandatory — the Flex SDK requires window/WebRTC/localStorage and must
// never render on the server. The page itself is a client component so dynamic() with
// ssr:false is allowed under Next.js 15.
const AgentDesktopShell = dynamic(
  () => import('@/features/session/components/AgentDesktopShell').then((m) => m.AgentDesktopShell),
  { ssr: false },
);

export default function AgentDesktopPage() {
  return <AgentDesktopShell />;
}
```

- [ ] **Step 6: Full gate — tests, lint, type-check, build**

Run:
```bash
npm run test:run && npm run lint && npx tsc --noEmit && npx next build
```
Expected: all Part-3 suites pass; lint clean; type-check exits 0; build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/features/session/components src/app/agent-desktop
git commit -m "feat(desktop): session-gated agent-desktop shell (next/dynamic ssr:false)"
```

---

## Self-Review

**Spec coverage (Part 3 slice, spec §6–§7 + roadmap Part 3):**
- Stub-ready `/api/token` Route Handler minting a server-side token from env, mock token when creds absent, `.env.example` documents all vars — Task 1 ✓
- Browser-only `initFlexClient`/`getFlexClient` singleton (Fast-Refresh-safe) — Task 2 ✓
- `FlexClientProvider` creating the client once a token exists + registering listeners — Task 6 ✓
- SDK event → Zustand bridge (`tokenUpdated`) — Task 5 ✓
- `useFlexStore` composition pattern + `sessionSlice` `{ token, worker, connectionState, setToken, setWorker, setConnectionState }` — Task 4 ✓
- Login flow: SSO (`exchangeToken` OAuth callback) + custom token; refresh via `autoUpdateToken` (client.ts session opts) + `tokenUpdated` (events.ts) — Tasks 8, 2, 5 ✓
- Agent-desktop shell via `next/dynamic({ ssr:false })`, session-gated — Task 9 ✓
- Canonical action-wrapper pattern + `errors.ts` normalizer + Worker reference wrapper — Tasks 3, 7 ✓
- All SDK code behind `'use client'` — client.ts, events.ts, provider.tsx, actions/Worker.ts, auth.ts all start with `'use client'`; agent-desktop page is `'use client'` and uses `ssr:false` ✓
- Tests mock `@twilio/flex-sdk` (client, login, action-subpath tests) and `@/lib/flex/client` (provider, action, shell tests) ✓

**Placeholder scan:** No TBD/"add error handling"/"similar to". The only literal `TODO` is inside the stub-token code comment (intentional, points to `.env.example`) — it is real shipped content, not a plan gap. Every code step contains full code. ✓

**Type consistency:** `TokenResponse`/`FlexClientOptions`/`ConnectionState` defined once in `types.ts` (Task 1) and consumed by route (T1), client (T2), session slice (T4), provider (T6), auth (T8). `initFlexClient(token, opts?)`/`getFlexClient()` signatures identical across client.ts (T2), events.ts (T5), provider.tsx (T6), Worker.ts (T7). `NormalizedFlexError` `{ code, severity, message }` identical in errors.ts (T3), Worker.ts (T7), provider (via `.message`) (T6). `SessionSlice` setters (`setToken`/`setWorker`/`setConnectionState`) match usage in events.ts, provider.tsx, login page, shell. `registerSessionListeners(client) => () => void` identical in events.ts and provider. ✓

**Notes for executor:**
- Verify the `@twilio/flex-sdk` React peer range at install (spec §13); if it forces React 18.3, apply and note in the Task 2 commit.
- If `next/font/google` or Part 2's `NextIntlClientProvider` are not yet in the root layout when Task 8 runs, the login/​shell tests still pass because they mock `next-intl`; at runtime the provider is supplied by Part 2's layout.
- The exact constructor arg shapes for `SetCurrentActivity`/`SetAttributes` follow the SDK 4.1 `actions/Worker` module; tests mock that subpath so they are contract-anchored here and validated against the live SDK during Part 4.
