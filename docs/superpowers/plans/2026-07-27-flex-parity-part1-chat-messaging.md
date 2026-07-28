# Flex Parity — Part 1: Chat / SMS / WhatsApp Real Messaging

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace the local-only chat stub with real SDK messaging: send, history hydration, typing, media, customer online/offline, and per-conversation tabs.

**Depends on:** Part 0 (registry).

**Split:** 1a (wrappers + `useConversation` hook + real send/history/typing), 1b (media attach + image render), 1c (customer online/offline + conversation tabs).

## Global Constraints

- Verified SDK surface: `GetConversationByTask(taskSid)` / `GetConversationBySid(sid)` / `GetConversationsUser(identity)` → resolve to `Conversation` / `ConversationsUser`. `Conversation`: `sendMessage(SendTextMessageOptions|SendEmailMessageOptions) → Promise<number|null>`, `getMessages(pageSize?, anchorMessageIndex?, direction?) → Paginator<Message>`, `sendTyping()`, `.sid`, `.conversation` (underlying, for `.on('messageAdded', (m)=>…)`). `Message`: `.body`, `.author`, `.dateCreated: Date`, `.subject`, `.attachedMedia: Media[]`, `.getEmailBody('text/html'): Media|null`. `Media`: `.getContentTemporaryUrl(): Promise<string|null>`, `.filename`, `.contentType`. `SendTextMessageOptions { body; attachedFiles?: File[] }`.
- Live `Conversation` handle stored in the Part 0 registry keyed by **taskSid**; store holds only serializable `ConversationMessage`.
- Conversations are linked to tasks: `GetConversationByTask(task.taskSid)`. The conversations slice keys by conversation `sid`; add a `taskSid` field to link them.
- No hardcoded strings; TDD; four gates green.

---

## Part 1a — Wrappers + useConversation hook + real send

### Task 1: Conversation fetch wrappers

**Files:** Modify `src/lib/flex/actions/Conversation.ts`; Test `src/lib/flex/actions/__tests__/Conversation.fetch.test.ts`.

**Produces:**
- `getConversationByTask(taskSid: string): Promise<Conversation>`
- `getConversationBySid(conversationSid: string): Promise<Conversation>`
- `getConversationsUser(identity: string): Promise<ConversationsUser>`
- Re-export SDK types `Conversation`, `ConversationsUser` (type-only).

- [ ] Write failing test (mock client.execute; assert instance of `GetConversationByTask` etc. and args). Use the existing `run<T>` pattern.
- [ ] Run → FAIL.
- [ ] Implement: add to the import from `@twilio/flex-sdk/actions/Conversation`: `GetConversationByTask, GetConversationBySid, GetConversationsUser`; add `import type { Conversation, User as ConversationsUser } from '@twilio/flex-sdk/actions/Conversation';`. Then:
  ```ts
  export const getConversationByTask = (taskSid: string) =>
    run<Conversation>(new GetConversationByTask(taskSid));
  export const getConversationBySid = (sid: string) =>
    run<Conversation>(new GetConversationBySid(sid));
  export const getConversationsUser = (identity: string) =>
    run<ConversationsUser>(new GetConversationsUser(identity));
  export type { Conversation, ConversationsUser };
  ```
- [ ] Run → PASS. Commit `feat(flex): wrap GetConversationByTask/BySid/ConversationsUser`.

### Task 2: Message view-model mapping

**Files:** Create `src/features/conversations/messageView.ts`; Test beside it.

**Produces:** `toMessageView(m: Message, selfIdentity: string): ConversationMessage` — maps SDK Message → slice `ConversationMessage` (`sid`, `author`, `body`, `dateCreated: ISO string`, `isMine: author === selfIdentity`). Anonymous author (`author` starts with `FX`, length 34) → `author: 'Anonymous'`. (Media added in 1b.)

- [ ] Failing test (inbound/outbound/anonymous). → FAIL → implement → PASS. Commit.

### Task 3: `useConversation(taskSid)` hook

**Files:** Create `src/features/conversations/hooks/useConversation.ts`; Test beside it.

**Consumes:** Task 1 wrappers, Task 2 mapper, Part 0 registry (`setConversationHandle`/`getConversationHandle`/`deleteConversationHandle`), conversations slice (`upsertConversation`, `addMessage`), session slice (`worker` for self identity).

**Produces:** `useConversation(taskSid: string | null): { send(body): Promise<void>; notifyTyping(): void }`. On mount for a non-null taskSid: `getConversationByTask` → `setConversationHandle(taskSid, conv)` → `upsertConversation({ sid: conv.sid, taskSid, friendlyName, messages: [], type })` → `conv.getMessages()` → map → `addMessage` each (hydrate) → subscribe `conv.conversation.on('messageAdded', m => addMessage(conv.sid, toMessageView(m, self)))`. Cleanup: remove listener + `deleteConversationHandle`. `send` calls the registry handle's `sendMessage({ body })`; `notifyTyping` calls `sendTyping()` (best-effort). No-ops without a handle.

- [ ] Failing test with a mock conversation handle (getMessages returns items; send calls sendMessage; messageAdded pushes to store). → FAIL → implement → PASS. Commit.

### Task 4: Wire real send/typing into the shell

**Files:** Modify `src/store/slices/conversations.ts` (add `taskSid` to `ActiveConversation`); modify `AgentDesktopShell.tsx` (replace local-append `onSend` with `useConversation(activeTaskSid).send`; pass `notifyTyping` to composer); modify `MessageComposer.tsx` (call `onTyping` on change). Update tests.

- [ ] Failing test / adjust existing shell + composer tests. → implement → full gate green. Commit `feat(conversations): real SDK send + history + typing`.

---

## Part 1b — Media attachments

### Task 5: Media in the view-model + wrapper send
- Extend `ConversationMessage` with `media?: { url?: string; filename?: string; contentType?: string }`. `toMessageView` reads `m.attachedMedia?.[0]` (filename/contentType); URL resolved lazily in the UI via `getContentTemporaryUrl()`.
- `useConversation` gains `sendMedia(file: File)` → handle `sendMessage({ attachedFiles: [file], body: '' })`.

### Task 6: MediaPickerModal + image render
- New `src/features/conversations/components/MediaPickerModal.tsx` (Tailwind; hidden file input + preview + send). Attach button in `MessageComposer`.
- `MessageList` image bubble: resolve `getContentTemporaryUrl()` (store handle exposes media; or view-model carries a resolver). Render `<img>` for image content types.

---

## Part 1c — Customer online/offline + conversation tabs

### Task 7: Customer presence
- `useCustomerPresence(taskSid)`: `getTaskParticipants` (Part 0) → find `type === 'customer'` → `getConversationsUser(identity)` → `.isOnline` + subscribe `.on('updated', ({user}) => setOnline(user.isOnline))`. Badge in the conversation header.

### Task 8: Conversation tabs
- Shell renders a tab strip over active conversations (from `conversations` map). Selecting a tab sets `activeTaskSid`; `useConversation(activeTaskSid)` drives the panel. Tab label = friendlyName + channel icon; unread indicator optional.

---

## Self-Review
- Covers spec Phase 1 (send, history, typing, media, online/offline, tabs).
- Types: `ConversationMessage` extended once (1b) and consumed consistently.
- `useConversation` keyed by taskSid; handle in registry; store serializable only.
- Order: 1a (core) → 1b (media) → 1c (presence + tabs). Each sub-part independently testable.
