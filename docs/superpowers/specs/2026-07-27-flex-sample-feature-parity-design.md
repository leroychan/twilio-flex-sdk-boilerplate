# Flex SDK Sample Feature-Parity — Design Spec

**Date:** 2026-07-27
**Status:** Approved design (pending user review of this doc)
**Reference:** [twilio-samples/flex-sdk-demo](https://github.com/twilio-samples/flex-sdk-demo)

## Goal

Bring the four capability groups the reference sample app implements — and this
project currently lacks or stubs — up to working parity, built entirely in this
project's conventions (SDK wrapper → event bridge → Zustand slice → feature hook
→ component; full i18n; TDD; Tailwind + brand tokens; **no Twilio Paste**).

Auth stays on the existing **server-side token minting** path (`/api/token` →
`mintFlexUserToken`). The sample's runtime-domain SSO discovery flow is **not**
ported.

## Background: what's actually missing

This project already wraps *more* SDK surface than the sample (all Voice,
Supervisor, and Conversation actions; audio device picker; content templates;
i18n; theming; plugins). But several features the sample *demonstrates working*
are missing or stubbed here:

1. **Chat/SMS/WhatsApp messaging is non-functional** — `MessageComposer.onSend`
   only appends a local optimistic message; no SDK send. Conversation history is
   never hydrated. `GetConversationByTask` / `GetConversationBySid` /
   `GetConversationsUser` are unwrapped.
2. **Task participants are never fed** — `GetTaskParticipants` and
   `AddTaskParticipantListener` are unwrapped, so `CallPanel`'s hold/kick tiles
   have no live data source.
3. **Email** — outbound task + `To`-only participant exist; no WYSIWYG editor,
   no CC, no inbound-email rendering.
4. **Queues + Workers directory** — absent; transfer modals require a manually
   typed SID; Supervisor roster has no live feed; no last-message preview or
   elapsed timers in the task list.

## Global Constraints

- **SDK is browser-only.** All new SDK code sits behind `'use client'`; never
  imported into a Server Component or route handler.
- **SDK actions are positional classes.** Every constructor below was verified
  against `node_modules/@twilio/flex-sdk/actions/<Domain>/index.d.ts` and the
  re-exported `twilio-taskrouter` / `@twilio/conversations` types. Constructors
  are listed verbatim in each phase; the plan must re-verify before coding.
- **SDK boundary intact.** Feature code calls wrappers in `src/lib/flex/…`, never
  `new`s an Action directly.
- **No hardcoded user-facing strings.** `react/jsx-no-literals` is error-level.
  Every new string goes in the relevant `messages/<locale>.json`.
- **TDD.** Failing test first, minimal implementation, tests in `__tests__/`
  beside the code.
- **Definition of done:** `npm run test:run`, `tsc --noEmit`, `npm run lint`,
  `npm run build` all clean. Stop the dev server before `npm run build`.
- **New dependencies:** `react-simple-wysiwyg` (email HTML editor, per prior
  design spec §5), `date-fns` (elapsed/relative time). Both used by the sample.

## Architecture

### Live-handle registry (new)

The SDK's `Conversation` and `VoiceCall` objects are event-emitting and
non-serializable, so they must not live in Zustand. A module-level registry —
mirroring the `client.ts` singleton pattern — owns them:

```
src/lib/flex/registry.ts
  conversationRegistry: Map<taskSid, Conversation>   // SDK Conversation handle
  voiceCallRegistry:    Map<taskSid, VoiceCall>       // active VoiceCall handle
  get/set/delete/reset helpers per map
```

Zustand slices hold only serializable projections (message view models,
participant view models, flags). Feature hooks read the handle from the registry
to invoke methods (`sendMessage`, `sendTyping`, `pauseRecording`, …) and push
resulting serializable data into the store.

### Data flow (messaging example)

```
reservation.accepted
  → participantEvents: GetTaskParticipants + AddTaskParticipantListener → tasks slice
  → useConversation(taskSid):
       GetConversationByTask → registry.set(taskSid, conversation)
       conversation.getMessages() → map → conversations slice (history)
       conversation.conversation.on('messageAdded', m → slice.appendMessage)
composer.onSend(body)
  → registry.get(taskSid).sendMessage({ body })   // real SDK send
input.onChange
  → registry.get(taskSid).sendTyping()
```

---

## Phase 0 — Shared foundation: Task participants + registry

**Wrappers** (`src/lib/flex/actions/Task.ts`, verified signatures):
- `GetTaskParticipants(taskSid: string)` → `GetTaskParticipantsResponse`
  (`TaskParticipant[]`).
- `AddTaskParticipantListener(taskSid, eventName, listener)` where `eventName ∈
  { 'participantAdded', 'participantModified', 'participantRemoved' }` and
  `listener: (task: Task, participant: TaskParticipant) => void`. **One listener
  Action instance per event type** (per SDK gotchas — never cast to a callback).
- `GetChannelsForTask(taskSid)` → `TaskChannel[]` (wrapped for completeness;
  optional UI).

**Workspace name resolution** (`src/lib/flex/workspace.ts`, see Phase 4):
`fetchWorkerInfo(workerSid)` → `WorkerInfo` (has `.attributes`, `.name`).

**Store:** extend the tasks slice (or a focused `participants` slice) with
`participants: Record<taskSid, TaskParticipantView[]>` and
`workerNames: Record<workerSid, string>`, plus `setParticipants`,
`upsert/removeParticipant`, `setWorkerName`.

**Event bridge** (`src/features/tasks/participantEvents.ts`): on reservation
`accepted`, `GetTaskParticipants` → seed slice; register the three
`AddTaskParticipantListener` instances → slice mutations; for agent participants
whose `routingProperties.workerSid !== self`, `fetchWorkerInfo` → `setWorkerName`.
Cleanup unsubscribes on reservation removal.

**Registry:** `src/lib/flex/registry.ts` as described above.

**Tests:** wrapper arg-shape tests (mock client.execute); participantEvents
bridge test (mock reservation + client); registry get/set/reset.

---

## Phase 1 — Chat / SMS / WhatsApp messaging

**Wrappers** (`src/lib/flex/actions/Conversation.ts`, verified):
- `GetConversationByTask(taskSid: string)` → `Conversation`.
- `GetConversationBySid(conversationSid: string)` → `Conversation`.
- `GetConversationsUser(identity: string)` → `ConversationsUser` (has
  `.isOnline`, `.on('updated', ({ user }) => …)`).

`Conversation` object methods (verified): `sendMessage(SendTextMessageOptions |
SendEmailMessageOptions)`, `getMessages(pageSize?, anchorMessageIndex?,
direction?)` → `Paginator<Message>`, `sendTyping()`, and `.conversation` (the
underlying `@twilio/conversations` Conversation) for `.on('messageAdded', …)`.
`Message`: `.body`, `.author`, `.dateCreated`, `.subject`, `.attachedMedia[]`,
`.getEmailBody('text/html')`. `Media`: `.getContentTemporaryUrl()`, `.filename`,
`.contentType`.

**`useConversation(taskSid)` hook** (`src/features/conversations/hooks/`):
- On mount for an accepted non-voice task: `GetConversationByTask` →
  `registry.set`; `getMessages()` → map to `MessageView[]` → hydrate slice;
  subscribe `.conversation.on('messageAdded', …)`; cleanup `removeListener`.
- Returns `{ send, sendMedia, notifyTyping }` bound to the registry handle.

**Message view model** (serializable): `{ id, body, author, authorLabel,
dateCreated: number, variant: 'inbound'|'outbound', subject?, media?: { url?,
filename?, contentType? } }`. Outbound if `author === worker.friendlyName`.
Anonymous author (`FX…`, length 34) → label "Anonymous".

**UI changes:**
- `MessageComposer`: `onSend` → `send(body)` (real SDK); `onChange` →
  `notifyTyping()`; attach button → media picker → `sendMedia(file)`.
- `MessageList`: render hydrated history; image bubbles fetch
  `getContentTemporaryUrl()`.
- New `MediaPickerModal` (Tailwind): hidden file input + preview + send.
- Task header: customer **Online/Offline** badge via `GetConversationsUser` +
  `on('updated')`.

**Tests:** wrappers; `useConversation` (mock registry + conversation, assert
send/getMessages/subscribe); view-model mapping (author/variant/anonymous);
composer send + typing.

---

## Phase 2 — Voice conference + participant controls

Depends on Phase 0 (participants feed) and the existing Voice wrappers
(`Hold/Unhold/KickVoiceParticipant` already wrapped with the reversed
`(participantSid, taskSid)` arg order).

- **Wire `CallPanel` tiles** to `participants[taskSid]` from the store: one tile
  per non-self participant, name from `workerNames` (agents) or task display name
  (customer), hold state from `participant.isOnHold`.
- **Hold/unhold/kick** buttons call the existing wrappers with the real
  `participantSid` + `taskSid`. Kick hidden for `type === 'customer'`.
- **Recording controls:** new wrapper `getAccountConfig(token)` (top-level SDK
  fn) → `AccountConfigData.callRecordingEnabled`. When enabled, show Pause/Resume
  → `voiceCall.pauseRecording('silence')` / `voiceCall.resumeRecording()` on the
  registry `VoiceCall` handle. `useVoiceEvents` stores the active `VoiceCall` in
  the registry keyed by taskSid.
- **Mute** stays on the existing device-based control (already working); no
  change required.

**Tests:** account-config gate (mock getAccountConfig); CallPanel renders tiles
from store participants; hold/kick call wrappers with correct args; recording
pause/resume calls handle methods.

---

## Phase 3 — Email tasks

- **WYSIWYG editor** (`react-simple-wysiwyg`) in a new `EmailEditor` component,
  swapped into `ConversationPanel` when `task.attributes.channelType === 'email'`.
  Send via `conversation.sendMessage({ htmlBody, plainTextBody: '', subject })`.
- **To/CC participants:** extend `addEmailParticipant(taskSid, email, level)` to
  forward `ParticipantLevel.To | ParticipantLevel.CC` (enum from
  `@twilio/flex-sdk/actions/Conversation`; verified `To='to'`, `CC='cc'`).
  Constructor: `AddEmailParticipant(taskSid, email, level, options?)`. Wire
  `removeEmailParticipant` (`RemoveEmailParticipant(taskSid, participantSid)`).
  Participant pills filtered by `mediaProperties.messagingBinding.level`.
- **Inbound email** rendered in a sandboxed `<iframe>` from
  `message.getEmailBody('text/html').getContentTemporaryUrl()`.

**Tests:** wrapper level forwarding (To/CC); editor send shape; participant
add/remove; inbound-email view model exposes `htmlUrl`.

---

## Phase 4 — Queues + Workers directory

- **New `src/lib/flex/workspace.ts`:** `getWorkspace()` (from `getFlexClient()`)
  → cache the `Workspace`; expose `fetchTaskQueues()` →
  `Map<sid, TaskRouterTaskQueue>`, `fetchWorkersInfo()` → `Map<sid, WorkerInfo>`,
  `fetchWorkerInfo(sid)` → `WorkerInfo`. All are `Workspace` methods, **not**
  Action classes.
- **Directory slice + hooks:** `useQueues()`, `useWorkersInfo()` (fetch on
  demand, cache in a `directory` slice).
- **Transfer-target pickers:** replace manual-SID inputs in `VoiceTransferModal`
  and conversation `TransferModal` with Workers/Queues tabbed selectors populated
  from the directory. Voice keeps WARM/COLD (consult); conversation transfer has
  no mode (SDK `StartConversationTransfer(taskSid, to)` takes none).
- **Task-list niceties:** `useLastMessages` (per non-voice reservation:
  `GetConversationByTask` → `getMessages(1)` → last body, live via
  `messageAdded`); elapsed-time counters via `date-fns` (`useElapsedTime` hook).
- **Supervisor roster (bonus):** feed `fetchWorkersInfo()` into the existing
  supervisor slice so the panel shows a real roster (fills the current empty
  feed). Monitor/coach/barge already wrapped.

**Tests:** workspace wrapper (mock client.getWorkspace); directory hooks; picker
renders queues/workers and calls transfer wrapper with selected sid; last-message
hook; elapsed-time formatting.

---

## File structure (new / modified)

**New:**
- `src/lib/flex/registry.ts`
- `src/lib/flex/workspace.ts`
- `src/features/tasks/participantEvents.ts`
- `src/features/conversations/hooks/useConversation.ts`
- `src/features/conversations/hooks/useLastMessages.ts`
- `src/features/conversations/components/MediaPickerModal.tsx`
- `src/features/conversations/components/EmailEditor.tsx`
- `src/features/directory/` (slice-backed hooks + selectors) or fold into store
- `src/features/session/hooks/useElapsedTime.ts` (shared)

**Modified (representative):**
- `src/lib/flex/actions/Task.ts` (+GetTaskParticipants, +AddTaskParticipantListener, +GetChannelsForTask)
- `src/lib/flex/actions/Conversation.ts` (+GetConversationByTask/BySid/User; addEmailParticipant level param)
- `src/lib/flex/actions/Voice.ts` (surface getAccountConfig via a small helper or new `accountConfig.ts`)
- `src/store/slices/{tasks,conversations,voice,supervisor}.ts`
- `src/store/index.ts` (+ directory slice if added)
- `src/features/tasks/components/{TaskList,TaskCard}.tsx`
- `src/features/voice/components/{CallPanel,VoiceTransferModal}.tsx`
- `src/features/conversations/components/{ConversationPanel,MessageComposer,MessageList,TransferModal}.tsx`
- `src/features/session/components/AgentDesktopShell.tsx` (mount participantEvents; multi-conversation selection if needed)
- `messages/` catalogs across affected features
- `package.json` (+react-simple-wysiwyg, +date-fns)

## Error handling

All new SDK calls funnel through the existing `normalizeFlexError`. User-visible
failures (send failed, transfer failed, participant action failed) surface via
the existing error/notification path — **and this closes the pre-existing
`void accept(sid)` swallow**: accept/reject/send/transfer rejections must be
caught and shown, never discarded. Best-effort background subscriptions
(participant listeners, typing) log and no-op on failure without breaking the UI.

## Testing strategy

Per-layer unit tests (wrapper arg shapes, slice reducers, event-bridge mutations,
hook behavior with mocked registry/SDK). No live-SDK integration tests (SDK is
browser-only and stubbed offline). Maintain the green four-gate bar. Estimated
new tests: ~40–60 across phases.

## Non-goals

- Runtime-domain SSO discovery login (keeping server minting).
- Twilio Paste adoption (Tailwind + brand tokens only).
- Video (no SDK APIs).
- Real business plugins (framework only).
- Multi-session call handoff ("active on another session" is display-only).

## Rollout

Five phases, each independently testable and shippable. Phase 0 first (foundation
for 1 and 2). Recommended order: 0 → 1 → 2 → 4 → 3. Each phase becomes one
implementation plan under `docs/superpowers/plans/` (parts continue the existing
numbering).

## Self-review notes

- Every SDK constructor/method above verified against installed `.d.ts`
  (`@twilio/flex-sdk` 4.1.0, `twilio-taskrouter`, `@twilio/conversations`).
- No placeholders; each phase names exact wrappers, signatures, files, tests.
- Consistent naming: `registry` handles vs slice view-models; `participantSid`/
  `taskSid` arg order matches SDK (reversed for Hold/Unhold/Kick).
- Scope is large but cohesive (shared foundation); split into per-phase plans.
