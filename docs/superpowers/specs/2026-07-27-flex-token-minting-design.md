# Real Flex Token Minting — Design Spec

**Date:** 2026-07-27
**Status:** Approved pending user review
**Author:** pairing session

## Problem

The agent desktop never receives tasks and the activity selector is empty. Root
cause (verified end-to-end against a live account): `@twilio/flex-sdk`'s
`createClient()` calls `session.init()`, which validates the access token via
Flex's `POST /v1/Accounts/{sid}/Tokens/Info`. Our `/api/token` route mints a
**hand-rolled `AccessToken` with a `TaskRouterGrant`**, which Flex rejects with
`20106 Invalid Access Token grants` (even with Voice/Chat/Sync grants added) →
the SDK surfaces this as `48920 Insufficient permissions`. The worker never
connects, so no activities load and no reservations arrive.

A bare TaskRouter token is enough to connect the TaskRouter `Worker` directly
(confirmed in Node: `READY`, 4 activities), but **not** enough for the full Flex
SDK session. Flex only accepts tokens it issued itself.

## Solution

Adopt Flex SDK **Authentication Option 3 ("Build your own authentication")**:
mint the token server-side through Flex's own user-token endpoint. Verified
working with the account's existing API key credentials:

1. `GET  https://flex-api.twilio.com/v4/Instances/{instanceSid}/Users?Username={username}`
   → `users[0].flex_user_sid`
2. `POST https://flex-api.twilio.com/v4/Instances/{instanceSid}/Users/{flexUserSid}/Tokens`
   body `{ "ttl": 3600 }` → `{ access_token, token_info }`
3. Return `access_token` to the browser; `createClient(access_token)` now
   succeeds (validated via `Tokens/Info` → `201`, `roles:["admin"]`,
   `worker_sid` present).

Auth for both v4 calls: HTTP Basic with `TWILIO_API_KEY:TWILIO_API_SECRET`
(confirmed accepted — no Account Auth Token needed, which the Twilio docs warn
must never be exposed).

**Only the server side of `/api/token` changes.** The response contract
(`{ token, identity, stub }`), the `requestToken` client call, `createClient`,
and the presence/task event hooks already wired remain as-is. Stub mode remains
the offline fallback.

## Decisions (agreed)

1. **Instance SID:** auto-discover via `GET /v1/Configuration` →
   `flex_instance_sid` (cached in module memory for the process lifetime).
   `TWILIO_FLEX_INSTANCE_SID` env var overrides the discovery when set.
2. **Missing user:** if `Users?Username=` returns no user, respond with a clear
   error (HTTP 404, machine code `flex_user_not_found`). Never auto-provision.
3. **Username:** add a username input to the login page. The value is sent to
   `/api/token`; the route falls back to `TWILIO_FLEX_USERNAME` when the body
   omits it.

## Architecture

### New: `src/lib/flex/server/flexToken.ts` (server-only)

Pure functions, no Next.js coupling, `fetch`-based so they unit-test with a
mocked `fetch`. Not marked `'use client'`; must never be imported by client code.

```ts
export interface FlexTokenCreds {
  accountSid: string;
  apiKey: string;
  apiSecret: string;
  instanceSid?: string; // explicit override; auto-discovered when absent
}

export interface MintResult {
  token: string;
  identity: string;
}

// Thrown for all failure modes; carries an HTTP status + stable code.
export class FlexTokenError extends Error {
  code:
    | 'flex_config_unavailable'
    | 'flex_user_not_found'
    | 'flex_token_mint_failed';
  status: number; // 502 | 404 | 502
}

// Resolves the Flex instance SID: creds.instanceSid ?? cached ?? GET /v1/Configuration.
export async function resolveInstanceSid(creds: FlexTokenCreds): Promise<string>;

// Full flow: resolve instance → find user → mint token.
export async function mintFlexUserToken(
  creds: FlexTokenCreds,
  username: string,
  ttlSeconds?: number, // default 3600
): Promise<MintResult>;
```

Behavioural contract:
- `resolveInstanceSid`: returns `creds.instanceSid` if set; else returns the
  module-cached value; else `GET https://flex-api.twilio.com/v1/Configuration`
  (Basic auth), reads `flex_instance_sid`, caches it. Missing/!ok →
  `FlexTokenError('flex_config_unavailable', 502)`.
- `mintFlexUserToken`:
  - `GET .../v4/Instances/{instance}/Users?Username={encoded}`. If `users` is
    empty/absent → `FlexTokenError('flex_user_not_found', 404)`.
  - `POST .../v4/Instances/{instance}/Users/{flexUserSid}/Tokens` `{ttl}`.
    Non-ok or no `access_token` → `FlexTokenError('flex_token_mint_failed', 502)`.
  - Returns `{ token: access_token, identity: username }`.
- A small internal `basicAuthHeader(apiKey, apiSecret)` helper.
- `resetInstanceSidCache()` exported for test isolation.

### Modified: `src/app/api/token/route.ts`

```
readEnv():   add flexInstanceSid (TWILIO_FLEX_INSTANCE_SID),
             defaultUsername (TWILIO_FLEX_USERNAME).
hasLiveCreds(): accountSid && apiKey && apiSecret   // workspaceSid no longer required
POST:
  body: { username?: string; identity?: string }
  username = body.username ?? body.identity ?? env.defaultUsername
  if (!hasLiveCreds) → stub token (unchanged)
  if (!username)     → 400 { code: 'username_required' }
  try:
    { token, identity } = await mintFlexUserToken(creds, username)
    return { token, identity, stub: false }
  catch FlexTokenError e:
    return NextResponse.json({ error: e.code }, { status: e.status })
```

The `twilio` package import and the hand-rolled `AccessToken`/`TaskRouterGrant`
code are removed from the live path. Stub token generation stays.

### Modified: `src/lib/flex/auth.ts`

`requestToken(username?: string)` sends `{ username }` (kept backward-compatible:
also send nothing when undefined). Returns `TokenResponse` as today.

### Modified: `src/app/(auth)/login/page.tsx`

- Add a controlled `username` text input (labelled, translated).
- `handleCustomToken` passes `username` to `requestToken`.
- On a non-ok response, show the existing error state (extended to surface
  `flex_user_not_found` / `username_required` with translated copy).
- SSO callback path unchanged.

### i18n

Add keys to `src/i18n/messages/en/session.json` (and the `es` stub if present):
`usernameLabel`, `usernamePlaceholder`, `errors.userNotFound`,
`errors.usernameRequired`. No hardcoded strings (`jsx-no-literals` is
error-level).

### Env

`.env.example` gains, under live config:
- `TWILIO_FLEX_USERNAME=` — default username for token minting (optional; the
  login form overrides it).
- `TWILIO_FLEX_INSTANCE_SID=` — optional; auto-discovered from Flex
  Configuration when blank.
`TWILIO_WORKSPACE_SID` / `TWILIO_WORKER_SID` are no longer required for token
minting (the Flex user is already linked to its worker); left documented as
optional/no longer used by the token route.

## Data flow (live mode)

```
login form (username) → POST /api/token {username}
  → route: hasLiveCreds? → mintFlexUserToken(creds, username)
      → resolveInstanceSid (env | cache | GET /v1/Configuration)
      → GET  /v4/.../Users?Username=…            → flex_user_sid
      → POST /v4/.../Users/{FU}/Tokens {ttl}      → access_token
  → { token, identity, stub:false }
→ setToken → createClient(token) ✓ → getWorker() ready
→ usePresenceEvents seeds activities, useTaskEvents subscribes reservations
→ agent picks "Available" → tasks arrive
```

## Error handling

| Condition | HTTP | Body `code` | UI |
|---|---|---|---|
| No live creds | 200 | (stub token) | desktop in stub/demo mode |
| No username resolved | 400 | `username_required` | translated inline error |
| Username not a Flex user | 404 | `flex_user_not_found` | translated inline error |
| Config fetch failed | 502 | `flex_config_unavailable` | generic sign-in error |
| Token mint failed | 502 | `flex_token_mint_failed` | generic sign-in error |

Secrets are never included in responses or logs.

## Testing (TDD)

`src/lib/flex/server/__tests__/flexToken.test.ts` (mock global `fetch`):
- `resolveInstanceSid` returns env override without fetching.
- `resolveInstanceSid` fetches + caches `flex_instance_sid`; second call no refetch.
- config fetch !ok → `flex_config_unavailable`.
- `mintFlexUserToken` happy path: two fetches, returns `{token, identity}`.
- empty `users` → `flex_user_not_found`.
- token POST !ok / missing `access_token` → `flex_token_mint_failed`.
- Basic auth header is well-formed.

`src/app/api/token/__tests__/route.test.ts` (extend existing; mock `flexToken`):
- creds absent → stub token, `stub:true` (existing behaviour retained).
- creds present, username via body → calls `mintFlexUserToken`, returns
  `stub:false`.
- username missing everywhere → 400 `username_required`.
- `mintFlexUserToken` throws `flex_user_not_found` → 404 passthrough.

Definition of done: `npm run test:run`, `tsc --noEmit`, `npm run lint`,
`npm run build` all green (build run only when the dev server is stopped).

## Out of scope

- User provisioning (create-if-missing).
- SSO redirect login (`getLoginDetails`/`exchangeToken`) — still available for a
  future OAuth path; the callback half already exists in the login page.
- Token auto-refresh (tokens expire per `ttl`; re-login re-mints). Persisting the
  token across reloads is a separate, optional follow-up.
```
