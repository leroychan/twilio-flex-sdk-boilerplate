# Sync + Live Transcript — Design

**Date:** 2026-07-28
**Status:** Approved (pending spec review)

## Goal

Subscribe to a Twilio Sync stream keyed `session-{callSid}` and render live voice-call
transcription in a tabbed right-side panel of the agent desktop, degrading gracefully to a
"not configured" state in stub mode.

## Background

`flex-template-builder` renders a live transcript in its right-docked `InfoPanel`. The data is
not a native Flex capability: an external service ("RAMP") publishes messages to a per-call Sync
stream `session-{callSid}` in the shape `{ type: 'transcription', text, role, isFinal }`, and a
client hook (`useFlexTranscript`) subscribes and accumulates the final messages. Its Sync plumbing
lives in `src/lib/sync-client.ts` (singleton client, token refresh, stream cache, strict-mode
double-subscribe guard) fed by `GET /api/flex/sync-token` (mints an AccessToken with a SyncGrant).

This project has no such backend. Per the approved design decisions:

- **Data source:** real `twilio-sync` subscription client only — no stub simulator. In stub mode
  (no creds) the panel shows a graceful "not configured" state. Going live means pointing an
  external transcription publisher at the `session-{callSid}` stream (bring-your-own-publisher).
- **UI placement:** right column, tabbed (**Transcript / CRM**) — the truest port of
  flex-template-builder's `InfoPanel`, keeping the transcript visible beside the live call while
  preserving the CRM panel and its `side-panel` plugin slot.
- **Channel scope:** voice-only. Chat/email already render messages via the conversations feature.

## Global Constraints

- Node 20+; Next.js `^15.5.22` (App Router); React `19.2.4`; TypeScript strict.
- Twilio SDKs already present: `@twilio/flex-sdk ^4.1.0` (browser), `twilio ^6.0.2` (server REST).
  A **new dependency** `twilio-sync` (client) is required.
- Styling: Tailwind semantic tokens only (`bg-surface`, `text-muted`, `bg-primary`, etc.) — no raw
  hex, no new colors.
- i18n: all user-visible strings go through `next-intl`; `react/jsx-no-literals` is an error-level
  rule (a test guards it). New strings live in a `transcript` namespace catalog + reuse of shared
  namespaces for tab labels.
- SDK boundary: browser-only Twilio code is `'use client'`; server routes use the `twilio` REST SDK,
  never `@twilio/flex-sdk` (and never `twilio-sync`). Non-serializable live handles stay OUT of the
  Zustand store.
- TDD: every new module gets a colocated `__tests__/` (Vitest + Testing Library).
- Definition of done gate: `npm run test:run`, `tsc --noEmit`, `npm run lint`, `npm run build` all
  clean.
- Commit messages end with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- SECURITY: never commit real credentials; `.env`/`.env.local` are gitignored. When inspecting env
  files, print key names + char counts only.

## Architecture

Three layers, each honoring an existing boundary in the codebase.

### 1. Sync token route — `src/app/api/sync-token/route.ts`

Mirrors `src/app/api/token/route.ts`'s stub-first pattern and `queue-stats`'s graceful degradation.

- `runtime = 'nodejs'`.
- Reads env: `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY`, `TWILIO_API_SECRET`, and new
  `TWILIO_SYNC_SERVICE_SID`.
- Missing any of the four → `503` with body `{ configured: false, error: string }` listing the
  missing keys (never throws).
- Live → mint an AccessToken with a SyncGrant on `TWILIO_SYNC_SERVICE_SID`, `ttl: 3600`. Identity
  resolution: `body.identity?.trim() || TWILIO_FLEX_USERNAME || 'flex-agent'`. (Stream readability
  is scoped to the Sync service, so identity only labels the token; a stable value suffices.)
- Response shape: `{ token: string, identity: string, syncServiceSid: string }`.
- Method: `POST` (accepts an optional `{ identity }` body), consistent with `/api/token`.

### 2. Sync client boundary — `src/lib/sync/`

Kept separate from `src/lib/flex/` because `twilio-sync` is a distinct SDK from `@twilio/flex-sdk`;
`lib/flex` stays pure to the Flex SDK.

- `src/lib/sync/types.ts` — the message contract this app defines for publishers:
  ```ts
  export interface TranscriptionSyncMessage {
    type: 'transcription';
    text: string;
    role: 'agent' | 'customer' | string;
    isFinal?: boolean;
  }
  export type SyncStreamMessage = TranscriptionSyncMessage | { type: string; [k: string]: unknown };
  export type SyncStreamListener = (msg: SyncStreamMessage) => void;
  ```
- `src/lib/sync/client.ts` — `'use client'`; module-level singleton mirroring `lib/flex/client.ts`.
  Ported (and trimmed) from flex-template-builder's `sync-client.ts`:
  - Lazy `await import('twilio-sync')` so the server bundle isn't polluted and a missing dep
    degrades to no realtime rather than a crash.
  - Token fetch from `POST /api/sync-token`; on non-OK (incl. 503) resolve the client to `null`
    (not configured).
  - `tokenAboutToExpire` / `tokenExpired` handlers + a scheduled refresh (`ttl - 60s`).
  - `subscribeToStream(streamName, listener): Promise<{ unsubscribe: () => void; configured: boolean }>`
    (see Interfaces) with a stream cache, per-stream listener sets, and the strict-mode/concurrent
    double-subscribe guard (re-check the cache after the `await client.stream(...)` resolves).
    Resolves `{ configured: false, unsubscribe: <no-op> }` when not configured. Otherwise
    `unsubscribe` detaches the listener and closes the stream when the last listener leaves.
  - `resetSyncClient()` for teardown/refresh-failure recovery.

  Deliberately dropped vs the original: the `realtimeCintel` operator merge/cache (that's a later
  Operators feature, out of scope here). This client is transcription-agnostic — it just delivers
  raw `SyncStreamMessage`s to listeners.

### 3. Transcript feature — `src/features/transcript/`

Follows the vertical-slice convention (`components/` + `hooks/` + `lib/` + `messages/` + `index.ts`).

- `lib/transcriptMessage.ts` — normalize a raw `SyncStreamMessage` to a serializable view-model:
  ```ts
  export interface TranscriptEntry {
    id: string;              // `${callSid}-${index}`
    role: 'agent' | 'customer' | 'other';
    speaker: string;         // display label, e.g. 'Agent' / 'Customer'
    text: string;
    at: string;              // ISO timestamp, stamped on receipt
  }
  ```
  `toTranscriptEntry(msg, callSid, index): TranscriptEntry | null` returns `null` for
  non-`transcription` types, `isFinal === false`, or empty/whitespace text. Role mapping:
  `assistant|agent → 'agent'`, `customer|user|end-user → 'customer'`, else `'other'`.
- `hooks/useLiveTranscript.ts` — `'use client'`; `useLiveTranscript(callSid: string | null)`:
  - `status: 'idle'` when `callSid` is null.
  - On a callSid, `subscribeToStream('session-' + callSid, handler)`, accumulate non-null
    `TranscriptEntry`s in local state (hook-local — ephemeral per call, no store slice).
  - Reset entries when `callSid` changes or on unmount; call the returned unsubscribe.
  - `status`: `'not_configured'` if the underlying client reported not-configured (subscribe
    resolved to the no-op path), else `'listening'` while subscribed.
  - Returns `{ entries: TranscriptEntry[], status }`.
  - The not-configured signal is surfaced by having `subscribeToStream` resolve to a sentinel; the
    hook distinguishes "subscribed" from "not configured" via a boolean the client exposes
    alongside the unsubscribe (e.g. `subscribeToStream` returns `{ unsubscribe, configured }`).
    See Interfaces below.
- `components/TranscriptPanel.tsx` — `'use client'`; consumes `call.callSid` from the store and
  `useLiveTranscript`. Renders:
  - Header (localized "Transcript" title).
  - Populated: speaker-aligned bubbles (agent right / customer left / other centered), Tailwind
    semantic tokens, auto-scroll to newest.
  - Empty states: no active call → "No active call"; `not_configured` → helper text naming the
    expected stream `session-{callSid}` and the message shape; `listening` + empty →
    "Waiting for transcription…".
- `messages/en.json` — `transcript` namespace strings.
- `index.ts` — barrel exporting `TranscriptPanel` (and `useLiveTranscript` for tests/consumers).

### UI integration — `src/components/layout/RightPanel.tsx`

- Tabbed container using the existing `Tabs` primitive: tabs **Transcript** and **CRM**.
- Auto-selects **Transcript** when a voice call is active (`call.callSid` set AND active voice
  task), **CRM** otherwise; user can override by clicking. Follows the `effectiveTab` fallback
  pattern from `TaskWorkspace`.
- **Both children stay mounted**, hidden via CSS when inactive (same pattern as `ConversationTabView`),
  so the transcript subscription is not torn down on tab switch. Renders `<TranscriptPanel />` and
  `<CrmPanel />`.
- Wire-in: `AgentDesktopShell.tsx` swaps `right={<CrmPanel />}` → `right={<RightPanel />}`. CRM and
  its `side-panel` plugin slot survive unchanged inside the new panel.

## Interfaces

- `subscribeToStream(streamName: string, listener: SyncStreamListener): Promise<{ unsubscribe: () => void; configured: boolean }>`
  - `configured: false` when Sync creds are absent / dep missing / client init failed; `unsubscribe`
    is then a no-op. This is how `useLiveTranscript` derives `not_configured` vs `listening`.
- `getSyncClient(): Promise<SyncClientLike | null>` — internal; `null` when not configured.
- `resetSyncClient(): void` — internal teardown.
- `toTranscriptEntry(msg: SyncStreamMessage, callSid: string, index: number): TranscriptEntry | null`
- `useLiveTranscript(callSid: string | null): { entries: TranscriptEntry[]; status: 'idle' | 'not_configured' | 'listening' }`
- Store dependency (already present): `useFlexStore(s => s.call.callSid)`.

## Data Flow

1. An active voice call sets `call.callSid` in the store (existing voice event bridge — unchanged).
2. `TranscriptPanel` reads `call.callSid` → `useLiveTranscript(callSid)`.
3. Hook calls `subscribeToStream('session-' + callSid, handler)`.
4. Sync client lazy-inits: `POST /api/sync-token`. 503 → `{ configured: false }`, no-op unsubscribe.
5. Live: open stream, attach one `messagePublished` handler; each event's `message.data` is passed
   to listeners.
6. Handler runs `toTranscriptEntry`; non-null entries append to hook state.
7. Panel renders entries (auto-scroll) or the appropriate empty state.

## Error Handling

Every failure degrades silently to an empty / not-configured panel — never throws into the call UI:
- Sync token 503 or fetch failure → `configured: false`.
- Missing `twilio-sync` dependency (import throws) → client resolves `null` → `configured: false`.
- Stream-open failure → listener stays attached for a future retry; no throw.
- Token-refresh failure → `resetSyncClient()`; next subscribe re-inits.

## Testing (Vitest, colocated `__tests__/`)

- `src/app/api/sync-token/__tests__/route.test.ts` — stub 503 (missing each key) / live mint shape /
  identity fallback order.
- `src/lib/sync/__tests__/client.test.ts` — mock `twilio-sync` dynamic import + `fetch`:
  subscribe/unsubscribe lifecycle, double-subscribe guard (one underlying handler), not-configured
  no-op (`configured: false`), token-refresh path.
- `src/features/transcript/__tests__/transcriptMessage.test.ts` — normalization, dropping non-final
  and empty text, role mapping.
- `src/features/transcript/hooks/__tests__/useLiveTranscript.test.tsx` — accumulation, reset on
  callSid change, `idle`/`not_configured`/`listening` transitions (mock `subscribeToStream`).
- `src/features/transcript/components/__tests__/TranscriptPanel.test.tsx` — three empty states +
  populated render + auto-scroll target.
- `src/components/layout/__tests__/RightPanel.test.tsx` — tab switch, auto-select on active call,
  both children remain mounted.

## Docs / Config

- `.env.example` — add `TWILIO_SYNC_SERVICE_SID` with a comment (Sync required only for live
  transcript; app runs without it).
- `package.json` — add `twilio-sync` dependency.
- `README.md` — new "Live transcript" subsection: what it does, the `TWILIO_SYNC_SERVICE_SID` env,
  and the publisher contract (publish `{ type: 'transcription', text, role, isFinal }` to Sync
  stream `session-{callSid}`).

## Out of Scope (explicit)

- Stub/simulated transcript generator.
- Operators / CINTEL results, script adherence, conversation summaries (later features).
- Any transcription-producing backend (TwiML `<Transcription>`, Media Streams, ConversationRelay).
- Transcript for chat/email channels.
- A Zustand transcript slice (hook-local state is sufficient).
- Persisting transcripts across reloads.

## File Summary

**New:**
- `src/app/api/sync-token/route.ts` (+ `__tests__/route.test.ts`)
- `src/lib/sync/types.ts`
- `src/lib/sync/client.ts` (+ `__tests__/client.test.ts`)
- `src/features/transcript/lib/transcriptMessage.ts` (+ `__tests__/transcriptMessage.test.ts`)
- `src/features/transcript/hooks/useLiveTranscript.ts` (+ `__tests__/useLiveTranscript.test.tsx`)
- `src/features/transcript/components/TranscriptPanel.tsx` (+ `__tests__/TranscriptPanel.test.tsx`)
- `src/features/transcript/messages/en.json`
- `src/features/transcript/index.ts`
- `src/components/layout/RightPanel.tsx` (+ `__tests__/RightPanel.test.tsx`)

**Modified:**
- `src/features/session/components/AgentDesktopShell.tsx` (right column → `RightPanel`)
- `.env.example`, `package.json`, `README.md`
