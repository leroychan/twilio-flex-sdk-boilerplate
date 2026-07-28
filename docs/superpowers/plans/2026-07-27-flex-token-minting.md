# Real Flex Token Minting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `POST /api/token` mint a real, Flex-issued access token (SDK Auth Option 3) so `createClient` connects the worker and tasks flow — replacing the hand-rolled TaskRouter AccessToken that Flex rejects (48920).

**Architecture:** A new server-only module (`src/lib/flex/server/flexToken.ts`) calls Flex's v4 user-token endpoints (resolve instance SID → find user by username → mint token). The `/api/token` route calls it on the live path and keeps stub mode as the offline fallback. The login page gains a username field. Frontend flow, `createClient`, and the presence/task event hooks are unchanged.

**Tech Stack:** Next.js 15 App Router route handler (Node runtime), TypeScript strict, Vitest, next-intl, global `fetch`.

## Global Constraints

- Definition of done: `npm run test:run`, `tsc --noEmit`, `npm run lint`, `npm run build` all green. **Do not run `npm run build` while the dev server is running** (shared `.next` corrupts it) — stop the dev server first.
- No hardcoded user-facing strings — `react/jsx-no-literals` is error-level. Use `useTranslations('session')`.
- TDD: failing test first, then minimal implementation. Tests live in `__tests__/` beside the code.
- `src/lib/flex/server/**` is server-only — never import it from client (`'use client'`) code.
- Flex API base: `https://flex-api.twilio.com`. Basic auth = base64(`TWILIO_API_KEY:TWILIO_API_SECRET`).

---

### Task 1: Server token-minting module

**Files:**
- Create: `src/lib/flex/server/flexToken.ts`
- Test: `src/lib/flex/server/__tests__/flexToken.test.ts`

**Interfaces:**
- Produces:
  - `FlexTokenCreds { accountSid: string; apiKey: string; apiSecret: string; instanceSid?: string }`
  - `MintResult { token: string; identity: string }`
  - `class FlexTokenError extends Error { code: 'flex_config_unavailable'|'flex_user_not_found'|'flex_token_mint_failed'; status: number }`
  - `resolveInstanceSid(creds): Promise<string>`
  - `mintFlexUserToken(creds, username, ttlSeconds?=3600): Promise<MintResult>`
  - `resetInstanceSidCache(): void` (test isolation)

- [ ] **Step 1: Write the failing test**

Create `src/lib/flex/server/__tests__/flexToken.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  resolveInstanceSid,
  mintFlexUserToken,
  resetInstanceSidCache,
  FlexTokenError,
} from '../flexToken';

const CREDS = { accountSid: 'AC1', apiKey: 'SK1', apiSecret: 'secret' };

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

describe('flexToken', () => {
  beforeEach(() => {
    resetInstanceSidCache();
    vi.restoreAllMocks();
  });
  afterEach(() => vi.restoreAllMocks());

  it('uses the explicit instanceSid without fetching', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const sid = await resolveInstanceSid({ ...CREDS, instanceSid: 'GOexplicit' });
    expect(sid).toBe('GOexplicit');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('auto-discovers and caches the instance SID from Configuration', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse(200, { flex_instance_sid: 'GOdiscovered' }));
    const first = await resolveInstanceSid(CREDS);
    const second = await resolveInstanceSid(CREDS);
    expect(first).toBe('GOdiscovered');
    expect(second).toBe('GOdiscovered');
    expect(fetchSpy).toHaveBeenCalledTimes(1); // cached
    const url = String(fetchSpy.mock.calls[0][0]);
    expect(url).toContain('/v1/Configuration');
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Basic ' + Buffer.from('SK1:secret').toString('base64'),
    );
  });

  it('throws flex_config_unavailable when Configuration fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(403, {}));
    await expect(resolveInstanceSid(CREDS)).rejects.toMatchObject({
      code: 'flex_config_unavailable',
      status: 502,
    });
  });

  it('mints a token: resolves user then posts to Tokens', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse(200, { users: [{ flex_user_sid: 'FU9' }] }))
      .mockResolvedValueOnce(jsonResponse(200, { access_token: 'REAL.flex.jwt' }));
    const result = await mintFlexUserToken({ ...CREDS, instanceSid: 'GO1' }, 'lechan');
    expect(result).toEqual({ token: 'REAL.flex.jwt', identity: 'lechan' });
    expect(String(fetchSpy.mock.calls[0][0])).toContain(
      '/v4/Instances/GO1/Users?Username=lechan',
    );
    expect(String(fetchSpy.mock.calls[1][0])).toContain(
      '/v4/Instances/GO1/Users/FU9/Tokens',
    );
    expect((fetchSpy.mock.calls[1][1] as RequestInit).method).toBe('POST');
  });

  it('throws flex_user_not_found when no user matches', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(200, { users: [] }));
    await expect(
      mintFlexUserToken({ ...CREDS, instanceSid: 'GO1' }, 'ghost'),
    ).rejects.toMatchObject({ code: 'flex_user_not_found', status: 404 });
  });

  it('throws flex_token_mint_failed when token POST has no access_token', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse(200, { users: [{ flex_user_sid: 'FU9' }] }))
      .mockResolvedValueOnce(jsonResponse(200, {}));
    await expect(
      mintFlexUserToken({ ...CREDS, instanceSid: 'GO1' }, 'lechan'),
    ).rejects.toMatchObject({ code: 'flex_token_mint_failed', status: 502 });
  });

  it('FlexTokenError is instanceof Error', () => {
    const e = new FlexTokenError('flex_user_not_found', 404);
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe('flex_user_not_found');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/flex/server/__tests__/flexToken.test.ts`
Expected: FAIL — cannot resolve `../flexToken`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/flex/server/flexToken.ts`:

```ts
// Server-only. Mints a real Flex access token via Flex SDK Authentication
// "Option 3" (build-your-own-authentication) user-token endpoints.
// NEVER import this from client ('use client') code.

const FLEX_API = 'https://flex-api.twilio.com';

export interface FlexTokenCreds {
  accountSid: string;
  apiKey: string;
  apiSecret: string;
  /** Explicit Flex instance SID (GO…). Auto-discovered from Configuration when absent. */
  instanceSid?: string;
}

export interface MintResult {
  token: string;
  identity: string;
}

export type FlexTokenErrorCode =
  | 'flex_config_unavailable'
  | 'flex_user_not_found'
  | 'flex_token_mint_failed';

export class FlexTokenError extends Error {
  code: FlexTokenErrorCode;
  status: number;
  constructor(code: FlexTokenErrorCode, status: number, message?: string) {
    super(message ?? code);
    this.name = 'FlexTokenError';
    this.code = code;
    this.status = status;
  }
}

function basicAuthHeader(apiKey: string, apiSecret: string): string {
  return 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
}

let cachedInstanceSid: string | null = null;

export function resetInstanceSidCache(): void {
  cachedInstanceSid = null;
}

export async function resolveInstanceSid(creds: FlexTokenCreds): Promise<string> {
  if (creds.instanceSid) return creds.instanceSid;
  if (cachedInstanceSid) return cachedInstanceSid;

  const res = await fetch(`${FLEX_API}/v1/Configuration`, {
    headers: { Authorization: basicAuthHeader(creds.apiKey, creds.apiSecret) },
  });
  if (!res.ok) {
    throw new FlexTokenError(
      'flex_config_unavailable',
      502,
      `Flex Configuration fetch failed (${res.status})`,
    );
  }
  const json = (await res.json()) as { flex_instance_sid?: string };
  if (!json.flex_instance_sid) {
    throw new FlexTokenError(
      'flex_config_unavailable',
      502,
      'flex_instance_sid missing from Configuration',
    );
  }
  cachedInstanceSid = json.flex_instance_sid;
  return cachedInstanceSid;
}

export async function mintFlexUserToken(
  creds: FlexTokenCreds,
  username: string,
  ttlSeconds = 3600,
): Promise<MintResult> {
  const instanceSid = await resolveInstanceSid(creds);
  const auth = basicAuthHeader(creds.apiKey, creds.apiSecret);

  const userRes = await fetch(
    `${FLEX_API}/v4/Instances/${instanceSid}/Users?Username=${encodeURIComponent(username)}`,
    { headers: { Authorization: auth } },
  );
  if (!userRes.ok) {
    throw new FlexTokenError(
      'flex_user_not_found',
      404,
      `Flex user lookup failed (${userRes.status})`,
    );
  }
  const userJson = (await userRes.json()) as {
    users?: Array<{ flex_user_sid?: string }>;
  };
  const flexUserSid = userJson.users?.[0]?.flex_user_sid;
  if (!flexUserSid) {
    throw new FlexTokenError(
      'flex_user_not_found',
      404,
      `No Flex user for username "${username}"`,
    );
  }

  const tokenRes = await fetch(
    `${FLEX_API}/v4/Instances/${instanceSid}/Users/${flexUserSid}/Tokens`,
    {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: ttlSeconds }),
    },
  );
  if (!tokenRes.ok) {
    throw new FlexTokenError(
      'flex_token_mint_failed',
      502,
      `Flex token mint failed (${tokenRes.status})`,
    );
  }
  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  if (!tokenJson.access_token) {
    throw new FlexTokenError(
      'flex_token_mint_failed',
      502,
      'access_token missing from mint response',
    );
  }
  return { token: tokenJson.access_token, identity: username };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/flex/server/__tests__/flexToken.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/flex/server/flexToken.ts src/lib/flex/server/__tests__/flexToken.test.ts
git commit -m "feat: add server-side Flex user-token minting (Auth Option 3)"
```

---

### Task 2: Rewrite the `/api/token` route + env

**Files:**
- Modify: `src/app/api/token/route.ts` (full rewrite of the live path)
- Modify: `src/app/api/token/__tests__/route.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `mintFlexUserToken`, `FlexTokenError` from Task 1.
- Produces: `POST /api/token` → `TokenResponse { token, identity, stub }` on success; `{ error: code }` with status 400/404/502 on failure.

- [ ] **Step 1: Rewrite the route test (failing)**

Replace `src/app/api/token/__tests__/route.test.ts` with:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { mintFlexUserToken } = vi.hoisted(() => ({ mintFlexUserToken: vi.fn() }));
vi.mock('@/lib/flex/server/flexToken', () => {
  class FlexTokenError extends Error {
    code: string;
    status: number;
    constructor(code: string, status: number) {
      super(code);
      this.code = code;
      this.status = status;
    }
  }
  return { mintFlexUserToken, FlexTokenError };
});

import { POST } from '../route';
import { FlexTokenError } from '@/lib/flex/server/flexToken';

const ENV_KEYS = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_API_KEY',
  'TWILIO_API_SECRET',
  'TWILIO_WORKSPACE_SID',
  'TWILIO_WORKER_SID',
  'TWILIO_FLEX_INSTANCE_SID',
  'TWILIO_FLEX_USERNAME',
] as const;

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function setLiveCreds() {
  process.env.TWILIO_ACCOUNT_SID = 'ACxxxx';
  process.env.TWILIO_API_KEY = 'SKxxxx';
  process.env.TWILIO_API_SECRET = 'secret';
}

describe('POST /api/token', () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const k of ENV_KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
    mintFlexUserToken.mockReset();
  });
  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it('returns a stub token when creds are absent', async () => {
    const res = await POST(makeRequest({ username: 'alice' }));
    const json = await res.json();
    expect(json.stub).toBe(true);
    expect(json.identity).toBe('alice');
    expect(json.token.startsWith('STUB.')).toBe(true);
  });

  it('defaults the identity in stub mode when none supplied', async () => {
    const res = await POST(makeRequest({}));
    const json = await res.json();
    expect(json.identity).toBe('demo-agent');
    expect(json.stub).toBe(true);
  });

  it('mints a live Flex token when creds present and username supplied', async () => {
    setLiveCreds();
    mintFlexUserToken.mockResolvedValue({ token: 'REAL.jwt', identity: 'bob' });
    const res = await POST(makeRequest({ username: 'bob' }));
    const json = await res.json();
    expect(json.stub).toBe(false);
    expect(json.token).toBe('REAL.jwt');
    expect(json.identity).toBe('bob');
    expect(mintFlexUserToken).toHaveBeenCalledWith(
      expect.objectContaining({ accountSid: 'ACxxxx', apiKey: 'SKxxxx', apiSecret: 'secret' }),
      'bob',
    );
  });

  it('falls back to TWILIO_FLEX_USERNAME when body omits username', async () => {
    setLiveCreds();
    process.env.TWILIO_FLEX_USERNAME = 'lechan';
    mintFlexUserToken.mockResolvedValue({ token: 'REAL.jwt', identity: 'lechan' });
    const res = await POST(makeRequest({}));
    const json = await res.json();
    expect(json.identity).toBe('lechan');
    expect(mintFlexUserToken).toHaveBeenCalledWith(expect.anything(), 'lechan');
  });

  it('returns 400 username_required when no username anywhere', async () => {
    setLiveCreds();
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('username_required');
    expect(mintFlexUserToken).not.toHaveBeenCalled();
  });

  it('passes through FlexTokenError status/code', async () => {
    setLiveCreds();
    mintFlexUserToken.mockRejectedValue(new FlexTokenError('flex_user_not_found', 404));
    const res = await POST(makeRequest({ username: 'ghost' }));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('flex_user_not_found');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/token/__tests__/route.test.ts`
Expected: FAIL — route still uses the old twilio path / new assertions unmet.

- [ ] **Step 3: Rewrite the route**

Replace `src/app/api/token/route.ts` with:

```ts
import { NextResponse } from 'next/server';
import type { TokenResponse } from '@/lib/flex/types';
import { mintFlexUserToken, FlexTokenError } from '@/lib/flex/server/flexToken';

// Runs on the server. Live mode mints a real Flex-issued token via Flex SDK
// Authentication Option 3 (see src/lib/flex/server/flexToken.ts). When live
// creds are absent it returns a clearly-marked STUB token so the UI is
// developable offline.
export const runtime = 'nodejs';

function readEnv() {
  return {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    apiKey: process.env.TWILIO_API_KEY,
    apiSecret: process.env.TWILIO_API_SECRET,
    instanceSid: process.env.TWILIO_FLEX_INSTANCE_SID,
    defaultUsername: process.env.TWILIO_FLEX_USERNAME,
  };
}

function hasLiveCreds(env: ReturnType<typeof readEnv>): boolean {
  return Boolean(env.accountSid && env.apiKey && env.apiSecret);
}

function stubToken(identity: string): string {
  const payload = Buffer.from(
    JSON.stringify({ identity, stub: true, iat: Date.now() }),
  ).toString('base64url');
  return `STUB.${payload}.STUB`;
}

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as {
    username?: string;
    identity?: string;
  };
  const env = readEnv();
  const requested = (body.username ?? body.identity ?? '').trim();

  if (!hasLiveCreds(env)) {
    const identity = requested || 'demo-agent';
    const stub: TokenResponse = { token: stubToken(identity), identity, stub: true };
    return NextResponse.json(stub);
  }

  const username = requested || (env.defaultUsername ?? '').trim();
  if (!username) {
    return NextResponse.json({ error: 'username_required' }, { status: 400 });
  }

  try {
    const { token, identity } = await mintFlexUserToken(
      {
        accountSid: env.accountSid!,
        apiKey: env.apiKey!,
        apiSecret: env.apiSecret!,
        instanceSid: env.instanceSid,
      },
      username,
    );
    const live: TokenResponse = { token, identity, stub: false };
    return NextResponse.json(live);
  } catch (err) {
    if (err instanceof FlexTokenError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    return NextResponse.json({ error: 'flex_token_mint_failed' }, { status: 502 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/token/__tests__/route.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Update `.env.example`**

Replace the body of `.env.example` with:

```dotenv
# Twilio Flex SDK boilerplate — environment variables.
# Copy to .env.local and fill in to switch from stub mode to a live Flex account.
# When required live vars are missing, /api/token returns a clearly-marked STUB
# token and the app runs offline (no live SDK session).

# --- Required for a LIVE token (all three) ---
TWILIO_ACCOUNT_SID=
TWILIO_API_KEY=
TWILIO_API_SECRET=

# --- Live Flex token minting (SDK Auth Option 3) ---
# Default Flex username to mint the token for. The login form can override it.
TWILIO_FLEX_USERNAME=
# Flex instance SID (GOxxxx). Optional — auto-discovered from the Flex
# Configuration API when left blank.
TWILIO_FLEX_INSTANCE_SID=

# --- Optional / legacy ---
# No longer required for token minting (the Flex user is linked to its worker),
# kept for reference / other tooling.
TWILIO_WORKSPACE_SID=
TWILIO_WORKER_SID=

# --- Enhanced SSO (OAuth) login, client-side (NEXT_PUBLIC_*) ---
# SSO connection / profile SID used by the exchangeToken OAuth callback.
NEXT_PUBLIC_FLEX_SSO_PROFILE_SID=
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/token/route.ts src/app/api/token/__tests__/route.test.ts .env.example
git commit -m "feat: mint real Flex tokens in /api/token, keep stub fallback"
```

---

### Task 3: Login page username field + client wiring

**Files:**
- Modify: `src/lib/flex/auth.ts`
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/features/session/messages/en.json`

**Interfaces:**
- Consumes: `POST /api/token` accepting `{ username }` and returning `{ error }` on failure.
- Produces: `requestToken(username?: string): Promise<TokenResponse>` that throws `Error(code)` on failure.

- [ ] **Step 1: Update `requestToken` to send username and surface error codes**

In `src/lib/flex/auth.ts`, replace the `requestToken` function with:

```ts
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
```

- [ ] **Step 2: Add i18n keys**

In `src/features/session/messages/en.json`, add these keys (alongside the existing ones, keep `error` as the generic fallback):

```json
{
  "title": "Sign in to Flex",
  "subtitle": "Authenticate to start your agent session.",
  "demoMode": "Continue in demo mode",
  "ssoSignIn": "Sign in with SSO",
  "identityLabel": "Agent identity",
  "usernameLabel": "Flex username",
  "usernamePlaceholder": "Your Flex username",
  "signingIn": "Signing in…",
  "signIn": "Sign in",
  "error": "Sign-in failed. Please try again.",
  "errors": {
    "userNotFound": "No Flex user found with that username.",
    "usernameRequired": "Please enter your Flex username."
  },
  "desktop": {
    "dial": "Dial",
    "signOut": "Sign out"
  }
}
```

(No `es` change: the `session` feature ships only an `en` catalog.)

- [ ] **Step 3: Add the username field + error mapping to the login page**

In `src/app/(auth)/login/page.tsx`:

Add `useState` fields near the existing ones:

```tsx
const [username, setUsername] = useState('');
const [errorCode, setErrorCode] = useState<string | null>(null);
```

Remove the old `const [error, setError] = useState(false);` and replace its two SSO-callback uses (`setError(true)`) with `setErrorCode('token_request_failed')`.

Replace `handleCustomToken` with:

```tsx
async function handleCustomToken() {
  setBusy(true);
  setErrorCode(null);
  try {
    const { token } = await requestToken(username.trim() || undefined);
    setToken(token);
    router.push('/agent-desktop');
  } catch (e) {
    setErrorCode((e as Error).message || 'token_request_failed');
    setBusy(false);
  }
}
```

Just before the `return (`, derive the message:

```tsx
const errorText =
  errorCode === 'flex_user_not_found'
    ? t('errors.userNotFound')
    : errorCode === 'username_required'
      ? t('errors.usernameRequired')
      : errorCode
        ? t('error')
        : null;
```

In the JSX, replace `{error && <p ...>{t('error')}</p>}` with `{errorText && <p className="mt-3 text-danger">{errorText}</p>}`, and add the username input inside the `<div className="mt-6 flex flex-col gap-3">` block, above the sign-in button:

```tsx
<label className="flex flex-col gap-1 text-sm text-text">
  <span>{t('usernameLabel')}</span>
  <input
    type="text"
    value={username}
    onChange={(e) => setUsername(e.target.value)}
    placeholder={t('usernamePlaceholder')}
    className="rounded-md border border-border bg-surface px-3 py-2 text-text"
  />
</label>
```

Keep the existing button; its label logic stays (`busy ? t('signingIn') : t('demoMode')`).

- [ ] **Step 4: Typecheck + lint + full test run**

Run: `npx tsc --noEmit && npm run lint && npm run test:run`
Expected: all clean; 173+ prior tests plus the new ones pass.

- [ ] **Step 5: Build (dev server stopped)**

Stop the dev server first, then run: `npm run build`
Expected: compiles successfully.

- [ ] **Step 6: Commit**

```bash
git add src/lib/flex/auth.ts "src/app/(auth)/login/page.tsx" src/features/session/messages/en.json
git commit -m "feat: username field on login, mint real Flex token end-to-end"
```

---

## Manual verification (after Task 3)

1. Ensure `.env` has `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY`, `TWILIO_API_SECRET` (and `TWILIO_FLEX_USERNAME=lechan` or type it in the form).
2. Start dev, go to `/login`, enter the Flex username, sign in.
3. Expect redirect to `/agent-desktop`, the activity selector populated (4 activities), and no 48920. Pick **Available**; route a task and confirm it appears in the TaskList.

## Self-Review

- **Spec coverage:** instance-SID auto-discover + override (Task 1 `resolveInstanceSid`), missing-user 404 (Task 1 + route passthrough), username field + env fallback (Tasks 2–3), stub fallback retained (Task 2), error table (route + login mapping), tests (Tasks 1–2). ✔
- **Placeholder scan:** none.
- **Type consistency:** `FlexTokenError.code`/`status`, `MintResult { token, identity }`, `TokenResponse { token, identity, stub }`, `requestToken(username?)` all consistent across tasks. ✔
