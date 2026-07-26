# Part 6 — Conversations (chat + email) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Flex conversation handling — chat message list + composer, outbound email tasks with a WYSIWYG editor, pause/resume/park, conversation transfer, and content-template messaging — as a self-contained feature module.

**Architecture:** All conversation SDK calls go through thin wrappers in `@/lib/flex/actions/Conversation.ts` that execute via `getFlexClient().execute(new <Action>(...))` and normalize errors through `@/lib/flex/errors.ts`. Live conversation state lives in a Zustand `conversationsSlice`; a `useConversationEvents` hook bridges `AddConversationEventListener` events into that slice. UI (panel, composer, modals) is prop/store-driven and fully translated. Message send/typing use the underlying Conversations data-client conversation object exposed by the active task.

**Tech Stack:** Next.js 15 App Router, TypeScript (strict), `@twilio/flex-sdk` 4.1.x (`actions/Conversation`), Zustand, next-intl, `react-simple-wysiwyg`, Vitest + @testing-library/react (jsdom).

## Global Constraints

- Next.js 15 App Router + TypeScript strict; import alias `@/` → `src/`. Package manager: **npm**; tests via `npm run test:run`.
- The Flex SDK is **browser-only**: every module importing `@twilio/flex-sdk` (or a subpath) starts with `'use client'`. Tests mock `vi.mock('@twilio/flex-sdk/actions/Conversation')` and `vi.mock('@/lib/flex/client')` (factory-form mocks).
- **Consumes from Parts 1–3 (do not redefine):** `getFlexClient()`/`initFlexClient()` from `@/lib/flex/client`; `normalizeFlexError(err): { code, severity, message }` from `@/lib/flex/errors`; `useFlexStore` + `create<Name>Slice` pattern from `@/store`; `@/components/ui/{Button,Card}`; `useTranslations('conversations')` (Part 2 loader). Action-wrapper pattern: `getFlexClient()!.execute(new <Action>(...))`.
- **Owns (creates only):** `src/features/conversations/**`, `src/lib/flex/actions/Conversation.ts`, `src/store/slices/conversations.ts`, `src/features/conversations/messages/<locale>.json`. All shared-file wiring (`store/index.ts`, agent-desktop composition, provider event bootstrap) is delegated via the **Integration hooks** section — never edit shared files inline.
- i18n: Part 6 owns namespace `conversations` at `src/features/conversations/messages/en.json`; the Part 2 loader merges it automatically.

---

### Task 1: Conversation action wrappers

**Files:**
- Create: `src/lib/flex/actions/Conversation.ts`
- Create: `src/lib/flex/actions/__tests__/Conversation.test.ts`

**Interfaces:**
- Consumes: `getFlexClient` from `@/lib/flex/client`; `normalizeFlexError` from `@/lib/flex/errors`.
- Produces (all async, all normalize errors via `normalizeFlexError` on throw):
  - `pauseConversation(conversationSid: string): Promise<void>`
  - `resumeConversation(conversationSid: string): Promise<void>`
  - `getPausedConversations(): Promise<PausedConversation[]>`
  - `leaveConversation(conversationSid: string): Promise<void>`
  - `startConversationTransfer(conversationSid: string, targetSid: string, mode: 'WARM' | 'COLD'): Promise<void>`
  - `getConversationTransfers(conversationSid: string): Promise<ConversationTransfer[]>`
  - `getContentTemplates(): Promise<ContentTemplate[]>`
  - `startOutboundEmailTask(input: OutboundEmailInput): Promise<{ taskSid: string }>`
  - `addEmailParticipant(conversationSid: string, address: string): Promise<void>`
  - `removeEmailParticipant(conversationSid: string, participantSid: string): Promise<void>`
  - Types: `interface PausedConversation { sid: string; friendlyName: string; pausedAt: string }`, `interface ConversationTransfer { sid: string; to: string; mode: 'WARM'|'COLD'; status: string }`, `interface ContentTemplate { sid: string; friendlyName: string; body: string }`, `interface OutboundEmailInput { to: string; subject: string; body: string }`.

- [ ] **Step 1: Write the failing test `src/lib/flex/actions/__tests__/Conversation.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const execute = vi.fn();
vi.mock('@/lib/flex/client', () => ({ getFlexClient: () => ({ execute }) }));
vi.mock('@twilio/flex-sdk/actions/Conversation', () => ({
  PauseConversation: class { constructor(public sid: string) {} },
  ResumeConversation: class { constructor(public sid: string) {} },
  GetPausedConversations: class {},
  LeaveConversation: class { constructor(public sid: string) {} },
  StartConversationTransfer: class { constructor(public sid: string, public target: string, public mode: string) {} },
  GetConversationTransfers: class { constructor(public sid: string) {} },
  GetContentTemplates: class {},
  StartOutboundEmailTask: class { constructor(public input: unknown) {} },
  AddEmailParticipant: class { constructor(public sid: string, public address: string) {} },
  RemoveEmailParticipant: class { constructor(public sid: string, public participantSid: string) {} },
}));

import * as C from '../Conversation';

beforeEach(() => execute.mockReset());

describe('Conversation action wrappers', () => {
  it('pauseConversation executes a PauseConversation action', async () => {
    execute.mockResolvedValue(undefined);
    await C.pauseConversation('CH1');
    expect(execute).toHaveBeenCalledOnce();
  });

  it('getPausedConversations returns the executed result', async () => {
    execute.mockResolvedValue([{ sid: 'CH1', friendlyName: 'Chat', pausedAt: '2026-01-01' }]);
    const out = await C.getPausedConversations();
    expect(out[0]!.sid).toBe('CH1');
  });

  it('normalizes errors on failure', async () => {
    execute.mockRejectedValue({ code: 500, message: 'boom', severity: 'error' });
    await expect(C.resumeConversation('CH1')).rejects.toMatchObject({ code: 500, message: 'boom' });
  });

  it('startOutboundEmailTask returns the task sid', async () => {
    execute.mockResolvedValue({ taskSid: 'WT1' });
    const out = await C.startOutboundEmailTask({ to: 'a@b.com', subject: 'Hi', body: '<p>x</p>' });
    expect(out.taskSid).toBe('WT1');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- Conversation`
Expected: FAIL (module `../Conversation` not found).

- [ ] **Step 3: Write `src/lib/flex/actions/Conversation.ts`**

```ts
'use client';
import {
  PauseConversation,
  ResumeConversation,
  GetPausedConversations,
  LeaveConversation,
  StartConversationTransfer,
  GetConversationTransfers,
  GetContentTemplates,
  StartOutboundEmailTask,
  AddEmailParticipant,
  RemoveEmailParticipant,
} from '@twilio/flex-sdk/actions/Conversation';
import { getFlexClient } from '@/lib/flex/client';
import { normalizeFlexError } from '@/lib/flex/errors';

export interface PausedConversation { sid: string; friendlyName: string; pausedAt: string }
export interface ConversationTransfer { sid: string; to: string; mode: 'WARM' | 'COLD'; status: string }
export interface ContentTemplate { sid: string; friendlyName: string; body: string }
export interface OutboundEmailInput { to: string; subject: string; body: string }

function client() {
  const c = getFlexClient();
  if (!c) throw normalizeFlexError({ message: 'Flex client not initialized.' });
  return c;
}

async function run<T>(action: unknown): Promise<T> {
  try {
    return (await client().execute(action as never)) as T;
  } catch (err) {
    throw normalizeFlexError(err);
  }
}

export const pauseConversation = (sid: string) => run<void>(new PauseConversation(sid));
export const resumeConversation = (sid: string) => run<void>(new ResumeConversation(sid));
export const getPausedConversations = () => run<PausedConversation[]>(new GetPausedConversations());
export const leaveConversation = (sid: string) => run<void>(new LeaveConversation(sid));
export const startConversationTransfer = (sid: string, target: string, mode: 'WARM' | 'COLD') =>
  run<void>(new StartConversationTransfer(sid, target, mode));
export const getConversationTransfers = (sid: string) => run<ConversationTransfer[]>(new GetConversationTransfers(sid));
export const getContentTemplates = () => run<ContentTemplate[]>(new GetContentTemplates());
export const startOutboundEmailTask = (input: OutboundEmailInput) =>
  run<{ taskSid: string }>(new StartOutboundEmailTask(input));
export const addEmailParticipant = (sid: string, address: string) => run<void>(new AddEmailParticipant(sid, address));
export const removeEmailParticipant = (sid: string, participantSid: string) =>
  run<void>(new RemoveEmailParticipant(sid, participantSid));
```

> Note for executor: verify each action's constructor arity against the installed `@twilio/flex-sdk` 4.1.x typings; the demo uses the `client.execute(new <Action>(...))` pattern. Adjust arg order only if the typings differ — keep the exported wrapper signatures unchanged.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- Conversation`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/flex/actions/Conversation.ts src/lib/flex/actions/__tests__/Conversation.test.ts
git commit -m "feat(conversations): add Conversation SDK action wrappers"
```

---

### Task 2: Conversations store slice

**Files:**
- Create: `src/store/slices/conversations.ts`
- Create: `src/store/slices/__tests__/conversations.test.ts`

**Interfaces:**
- Consumes: the `create<Name>Slice` pattern + `useFlexStore` from `@/store`.
- Produces:
  - `interface ConversationMessage { sid: string; author: string; body: string; dateCreated: string; isMine: boolean }`
  - `interface ActiveConversation { sid: string; friendlyName: string; messages: ConversationMessage[]; type: 'chat' | 'email' }`
  - `interface ConversationsSlice { conversations: Record<string, ActiveConversation>; pausedConversations: PausedConversation[]; upsertConversation(c: ActiveConversation): void; addMessage(sid: string, m: ConversationMessage): void; removeConversation(sid: string): void; setPausedConversations(list: PausedConversation[]): void }`
  - `const createConversationsSlice: StateCreator<ConversationsSlice, [], [], ConversationsSlice>`

- [ ] **Step 1: Write the failing test `src/store/slices/__tests__/conversations.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { create } from 'zustand';
import { createConversationsSlice, type ConversationsSlice } from '../conversations';

const useTest = create<ConversationsSlice>()((...a) => ({ ...createConversationsSlice(...a) }));

beforeEach(() => useTest.setState({ conversations: {}, pausedConversations: [] }));

describe('conversationsSlice', () => {
  it('upserts a conversation and adds messages', () => {
    useTest.getState().upsertConversation({ sid: 'CH1', friendlyName: 'Chat', messages: [], type: 'chat' });
    useTest.getState().addMessage('CH1', { sid: 'M1', author: 'cust', body: 'hi', dateCreated: 'now', isMine: false });
    expect(useTest.getState().conversations['CH1']!.messages).toHaveLength(1);
  });

  it('removes a conversation', () => {
    useTest.getState().upsertConversation({ sid: 'CH1', friendlyName: 'Chat', messages: [], type: 'chat' });
    useTest.getState().removeConversation('CH1');
    expect(useTest.getState().conversations['CH1']).toBeUndefined();
  });

  it('stores paused conversations', () => {
    useTest.getState().setPausedConversations([{ sid: 'CH2', friendlyName: 'Parked', pausedAt: 'x' }]);
    expect(useTest.getState().pausedConversations).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- slices/conversations` — Expected: FAIL (module not found).

- [ ] **Step 3: Write `src/store/slices/conversations.ts`**

```ts
import type { StateCreator } from 'zustand';
import type { PausedConversation } from '@/lib/flex/actions/Conversation';

export interface ConversationMessage {
  sid: string; author: string; body: string; dateCreated: string; isMine: boolean;
}
export interface ActiveConversation {
  sid: string; friendlyName: string; messages: ConversationMessage[]; type: 'chat' | 'email';
}
export interface ConversationsSlice {
  conversations: Record<string, ActiveConversation>;
  pausedConversations: PausedConversation[];
  upsertConversation(c: ActiveConversation): void;
  addMessage(sid: string, m: ConversationMessage): void;
  removeConversation(sid: string): void;
  setPausedConversations(list: PausedConversation[]): void;
}

export const createConversationsSlice: StateCreator<ConversationsSlice, [], [], ConversationsSlice> = (set) => ({
  conversations: {},
  pausedConversations: [],
  upsertConversation: (c) => set((s) => ({ conversations: { ...s.conversations, [c.sid]: c } })),
  addMessage: (sid, m) =>
    set((s) => {
      const conv = s.conversations[sid];
      if (!conv) return s;
      return { conversations: { ...s.conversations, [sid]: { ...conv, messages: [...conv.messages, m] } } };
    }),
  removeConversation: (sid) =>
    set((s) => {
      const next = { ...s.conversations };
      delete next[sid];
      return { conversations: next };
    }),
  setPausedConversations: (list) => set({ pausedConversations: list }),
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- slices/conversations` — Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/store/slices/conversations.ts src/store/slices/__tests__/conversations.test.ts
git commit -m "feat(conversations): add conversations store slice"
```

---

### Task 3: i18n catalog + event-bridge hook

**Files:**
- Create: `src/features/conversations/messages/en.json`
- Create: `src/features/conversations/hooks/useConversationEvents.ts`
- Create: `src/features/conversations/hooks/__tests__/useConversationEvents.test.tsx`

**Interfaces:**
- Consumes: `useFlexStore` from `@/store`; `AddConversationEventListener` from `@twilio/flex-sdk/actions/Conversation`.
- Produces: `useConversationEvents(): void` — a hook that registers a conversation event listener on mount and pushes `messageAdded` / `conversationJoined` / `conversationRemoved` events into the store, cleaning up on unmount.

- [ ] **Step 1: Write `src/features/conversations/messages/en.json`**

```json
{
  "title": "Conversations",
  "composerPlaceholder": "Type a message…",
  "send": "Send",
  "pause": "Park",
  "resume": "Resume",
  "leave": "Leave",
  "transfer": "Transfer",
  "pausedTitle": "Parked conversations",
  "noPaused": "No parked conversations",
  "templates": "Templates",
  "email": {
    "new": "New email",
    "to": "To",
    "subject": "Subject",
    "body": "Message",
    "send": "Send email",
    "addParticipant": "Add participant"
  },
  "empty": "No active conversation"
}
```

- [ ] **Step 2: Write the failing test `.../hooks/__tests__/useConversationEvents.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const addListener = vi.fn();
vi.mock('@twilio/flex-sdk/actions/Conversation', () => ({
  AddConversationEventListener: (cb: (e: unknown) => void) => { addListener(cb); return () => {}; },
}));
import { useConversationEvents } from '../useConversationEvents';

beforeEach(() => addListener.mockReset());

describe('useConversationEvents', () => {
  it('registers a conversation event listener on mount', () => {
    renderHook(() => useConversationEvents());
    expect(addListener).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm run test:run -- useConversationEvents` — Expected: FAIL (module not found).

- [ ] **Step 4: Write `src/features/conversations/hooks/useConversationEvents.ts`**

```ts
'use client';
import { useEffect } from 'react';
import { AddConversationEventListener } from '@twilio/flex-sdk/actions/Conversation';
import { useFlexStore } from '@/store';

interface RawConvEvent {
  type: string;
  conversationSid: string;
  friendlyName?: string;
  message?: { sid: string; author: string; body: string; dateCreated: string; isMine: boolean };
}

export function useConversationEvents(): void {
  const upsertConversation = useFlexStore((s) => s.upsertConversation);
  const addMessage = useFlexStore((s) => s.addMessage);
  const removeConversation = useFlexStore((s) => s.removeConversation);

  useEffect(() => {
    const unsubscribe = AddConversationEventListener((e: RawConvEvent) => {
      switch (e.type) {
        case 'conversationJoined':
          upsertConversation({ sid: e.conversationSid, friendlyName: e.friendlyName ?? e.conversationSid, messages: [], type: 'chat' });
          break;
        case 'messageAdded':
          if (e.message) addMessage(e.conversationSid, e.message);
          break;
        case 'conversationRemoved':
          removeConversation(e.conversationSid);
          break;
      }
    });
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, [upsertConversation, addMessage, removeConversation]);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test:run -- useConversationEvents` — Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/conversations/messages/en.json src/features/conversations/hooks/
git commit -m "feat(conversations): add i18n catalog + event-bridge hook"
```

---

### Task 4: Message list + composer

**Files:**
- Create: `src/features/conversations/components/MessageList.tsx`
- Create: `src/features/conversations/components/MessageComposer.tsx`
- Create: `src/features/conversations/components/__tests__/MessageComposer.test.tsx`

**Interfaces:**
- Consumes: `useTranslations('conversations')`; `@/components/ui/Button`.
- Produces:
  - `MessageList({ messages }: { messages: ConversationMessage[] })` — renders messages, right-aligning `isMine`.
  - `MessageComposer({ onSend }: { onSend: (body: string) => void })` — textarea + Send button; clears on send; disables Send when empty.

- [ ] **Step 1: Write the failing test `.../components/__tests__/MessageComposer.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/en.json';
import { MessageComposer } from '../MessageComposer';

function wrap(ui: React.ReactNode) {
  return <NextIntlClientProvider locale="en" messages={{ conversations: messages }}>{ui}</NextIntlClientProvider>;
}

describe('MessageComposer', () => {
  it('sends typed text and clears the field', async () => {
    const onSend = vi.fn();
    render(wrap(<MessageComposer onSend={onSend} />));
    const input = screen.getByPlaceholderText('Type a message…');
    await userEvent.type(input, 'hello');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(onSend).toHaveBeenCalledWith('hello');
    expect((input as HTMLTextAreaElement).value).toBe('');
  });

  it('disables Send when empty', () => {
    render(wrap(<MessageComposer onSend={vi.fn()} />));
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- MessageComposer` — Expected: FAIL (module not found).

- [ ] **Step 3: Write `src/features/conversations/components/MessageList.tsx`**

```tsx
'use client';
import type { ConversationMessage } from '@/store/slices/conversations';

export function MessageList({ messages }: { messages: ConversationMessage[] }) {
  return (
    <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3" role="log" aria-live="polite">
      {messages.map((m) => (
        <div key={m.sid} className={`flex ${m.isMine ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${m.isMine ? 'bg-primary text-white' : 'bg-surface-2 text-text'}`}>
            {m.body}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Write `src/features/conversations/components/MessageComposer.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';

export function MessageComposer({ onSend }: { onSend: (body: string) => void }) {
  const t = useTranslations('conversations');
  const [value, setValue] = useState('');
  const submit = () => {
    const body = value.trim();
    if (!body) return;
    onSend(body);
    setValue('');
  };
  return (
    <div className="flex items-end gap-2 border-t border-border p-3">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t('composerPlaceholder')}
        rows={2}
        className="flex-1 resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm text-text"
      />
      <Button onClick={submit} disabled={!value.trim()}>{t('send')}</Button>
    </div>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test:run -- MessageComposer` — Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/features/conversations/components/MessageList.tsx src/features/conversations/components/MessageComposer.tsx src/features/conversations/components/__tests__/MessageComposer.test.tsx
git commit -m "feat(conversations): add message list + composer"
```

---

### Task 5: ConversationPanel (compose list + composer + header actions)

**Files:**
- Create: `src/features/conversations/components/ConversationPanel.tsx`
- Create: `src/features/conversations/components/__tests__/ConversationPanel.test.tsx`

**Interfaces:**
- Consumes: `MessageList`, `MessageComposer`, `useTranslations('conversations')`, `@/components/ui/{Button,Card}`.
- Produces: `ConversationPanel({ conversation, onSend, onPause, onLeave, onTransfer }: { conversation: ActiveConversation | null; onSend: (b: string) => void; onPause: () => void; onLeave: () => void; onTransfer: () => void })`. Renders empty state when `conversation` is null.

- [ ] **Step 1: Write the failing test `.../components/__tests__/ConversationPanel.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/en.json';
import { ConversationPanel } from '../ConversationPanel';

const noop = () => {};
function wrap(ui: React.ReactNode) {
  return <NextIntlClientProvider locale="en" messages={{ conversations: messages }}>{ui}</NextIntlClientProvider>;
}

describe('ConversationPanel', () => {
  it('shows empty state with no conversation', () => {
    render(wrap(<ConversationPanel conversation={null} onSend={noop} onPause={noop} onLeave={noop} onTransfer={noop} />));
    expect(screen.getByText('No active conversation')).toBeInTheDocument();
  });

  it('renders messages and action buttons for an active conversation', () => {
    const conv = { sid: 'CH1', friendlyName: 'Chat', type: 'chat' as const, messages: [{ sid: 'M1', author: 'c', body: 'hi', dateCreated: 'n', isMine: false }] };
    render(wrap(<ConversationPanel conversation={conv} onSend={vi.fn()} onPause={vi.fn()} onLeave={vi.fn()} onTransfer={vi.fn()} />));
    expect(screen.getByText('hi')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Park' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- ConversationPanel` — Expected: FAIL (module not found).

- [ ] **Step 3: Write `src/features/conversations/components/ConversationPanel.tsx`**

```tsx
'use client';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { MessageList } from './MessageList';
import { MessageComposer } from './MessageComposer';
import type { ActiveConversation } from '@/store/slices/conversations';

interface Props {
  conversation: ActiveConversation | null;
  onSend: (body: string) => void;
  onPause: () => void;
  onLeave: () => void;
  onTransfer: () => void;
}

export function ConversationPanel({ conversation, onSend, onPause, onLeave, onTransfer }: Props) {
  const t = useTranslations('conversations');
  if (!conversation) {
    return <Card><p className="text-muted">{t('empty')}</p></Card>;
  }
  return (
    <Card className="flex h-full flex-col p-0">
      <header className="flex items-center justify-between border-b border-border p-3">
        <h2 className="font-semibold text-text">{conversation.friendlyName}</h2>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onTransfer}>{t('transfer')}</Button>
          <Button variant="secondary" onClick={onPause}>{t('pause')}</Button>
          <Button variant="danger" onClick={onLeave}>{t('leave')}</Button>
        </div>
      </header>
      <MessageList messages={conversation.messages} />
      <MessageComposer onSend={onSend} />
    </Card>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- ConversationPanel` — Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/conversations/components/ConversationPanel.tsx src/features/conversations/components/__tests__/ConversationPanel.test.tsx
git commit -m "feat(conversations): add ConversationPanel"
```

---

### Task 6: Paused-conversations modal (pause/resume/park)

**Files:**
- Create: `src/features/conversations/components/PausedConversationsModal.tsx`
- Create: `src/features/conversations/components/__tests__/PausedConversationsModal.test.tsx`

**Interfaces:**
- Consumes: `getPausedConversations`, `resumeConversation` from `@/lib/flex/actions/Conversation`; `useFlexStore`; `useTranslations('conversations')`.
- Produces: `PausedConversationsModal({ open, onClose }: { open: boolean; onClose: () => void })` — lists paused conversations from the store, each with a Resume button that calls `resumeConversation` and refreshes.

- [ ] **Step 1: Write the failing test `.../components/__tests__/PausedConversationsModal.test.tsx`**

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/en.json';

const resumeConversation = vi.fn();
const getPausedConversations = vi.fn();
vi.mock('@/lib/flex/actions/Conversation', () => ({ resumeConversation: (...a: unknown[]) => resumeConversation(...a), getPausedConversations: () => getPausedConversations() }));

import { useFlexStore } from '@/store';
import { PausedConversationsModal } from '../PausedConversationsModal';

function wrap(ui: React.ReactNode) {
  return <NextIntlClientProvider locale="en" messages={{ conversations: messages }}>{ui}</NextIntlClientProvider>;
}

beforeEach(() => {
  resumeConversation.mockReset().mockResolvedValue(undefined);
  getPausedConversations.mockReset().mockResolvedValue([]);
  useFlexStore.setState({ pausedConversations: [{ sid: 'CH9', friendlyName: 'Parked chat', pausedAt: 'x' }] });
});

describe('PausedConversationsModal', () => {
  it('lists paused conversations and resumes one', async () => {
    render(wrap(<PausedConversationsModal open onClose={vi.fn()} />));
    expect(screen.getByText('Parked chat')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Resume' }));
    await waitFor(() => expect(resumeConversation).toHaveBeenCalledWith('CH9'));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- PausedConversationsModal` — Expected: FAIL (module not found).

- [ ] **Step 3: Write `src/features/conversations/components/PausedConversationsModal.tsx`**

```tsx
'use client';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { useFlexStore } from '@/store';
import { getPausedConversations, resumeConversation } from '@/lib/flex/actions/Conversation';

export function PausedConversationsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations('conversations');
  const paused = useFlexStore((s) => s.pausedConversations);
  const setPaused = useFlexStore((s) => s.setPausedConversations);

  useEffect(() => {
    if (open) getPausedConversations().then(setPaused).catch(() => {});
  }, [open, setPaused]);

  if (!open) return null;

  const resume = async (sid: string) => {
    await resumeConversation(sid);
    setPaused(await getPausedConversations());
  };

  return (
    <div role="dialog" aria-label={t('pausedTitle')} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-text">{t('pausedTitle')}</h2>
          <Button variant="ghost" onClick={onClose} aria-label="close">✕</Button>
        </div>
        {paused.length === 0 ? (
          <p className="text-muted">{t('noPaused')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {paused.map((c) => (
              <li key={c.sid} className="flex items-center justify-between rounded-md border border-border p-2">
                <span className="text-text">{c.friendlyName}</span>
                <Button onClick={() => resume(c.sid)}>{t('resume')}</Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- PausedConversationsModal` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/conversations/components/PausedConversationsModal.tsx src/features/conversations/components/__tests__/PausedConversationsModal.test.tsx
git commit -m "feat(conversations): add paused conversations modal"
```

---

### Task 7: Content-template picker + transfer modal

**Files:**
- Create: `src/features/conversations/components/ContentTemplatePicker.tsx`
- Create: `src/features/conversations/components/TransferModal.tsx`
- Create: `src/features/conversations/components/__tests__/ContentTemplatePicker.test.tsx`

**Interfaces:**
- Consumes: `getContentTemplates`, `startConversationTransfer` from `@/lib/flex/actions/Conversation`; `useTranslations('conversations')`; `@/components/ui/Button`.
- Produces:
  - `ContentTemplatePicker({ onPick }: { onPick: (body: string) => void })` — loads templates on mount, renders a button per template that calls `onPick(template.body)`.
  - `TransferModal({ open, conversationSid, onClose }: { open: boolean; conversationSid: string; onClose: () => void })` — target input + WARM/COLD toggle, calls `startConversationTransfer`.

- [ ] **Step 1: Write the failing test `.../components/__tests__/ContentTemplatePicker.test.tsx`**

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/en.json';

const getContentTemplates = vi.fn();
vi.mock('@/lib/flex/actions/Conversation', () => ({ getContentTemplates: () => getContentTemplates() }));
import { ContentTemplatePicker } from '../ContentTemplatePicker';

function wrap(ui: React.ReactNode) {
  return <NextIntlClientProvider locale="en" messages={{ conversations: messages }}>{ui}</NextIntlClientProvider>;
}
beforeEach(() => getContentTemplates.mockReset().mockResolvedValue([{ sid: 'HX1', friendlyName: 'Greeting', body: 'Hello!' }]));

describe('ContentTemplatePicker', () => {
  it('loads templates and picks one', async () => {
    const onPick = vi.fn();
    render(wrap(<ContentTemplatePicker onPick={onPick} />));
    const btn = await screen.findByRole('button', { name: 'Greeting' });
    await userEvent.click(btn);
    await waitFor(() => expect(onPick).toHaveBeenCalledWith('Hello!'));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- ContentTemplatePicker` — Expected: FAIL (module not found).

- [ ] **Step 3: Write `src/features/conversations/components/ContentTemplatePicker.tsx`**

```tsx
'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { getContentTemplates, type ContentTemplate } from '@/lib/flex/actions/Conversation';

export function ContentTemplatePicker({ onPick }: { onPick: (body: string) => void }) {
  const t = useTranslations('conversations');
  const [templates, setTemplates] = useState<ContentTemplate[]>([]);
  useEffect(() => { getContentTemplates().then(setTemplates).catch(() => {}); }, []);
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase text-muted">{t('templates')}</p>
      <div className="flex flex-wrap gap-2">
        {templates.map((tpl) => (
          <Button key={tpl.sid} variant="secondary" onClick={() => onPick(tpl.body)}>{tpl.friendlyName}</Button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write `src/features/conversations/components/TransferModal.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { startConversationTransfer } from '@/lib/flex/actions/Conversation';

export function TransferModal({ open, conversationSid, onClose }: { open: boolean; conversationSid: string; onClose: () => void }) {
  const t = useTranslations('conversations');
  const [target, setTarget] = useState('');
  const [mode, setMode] = useState<'WARM' | 'COLD'>('WARM');
  if (!open) return null;
  const submit = async () => {
    if (!target.trim()) return;
    await startConversationTransfer(conversationSid, target.trim(), mode);
    onClose();
  };
  return (
    <div role="dialog" aria-label={t('transfer')} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-3 font-semibold text-text">{t('transfer')}</h2>
        <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="worker or queue SID"
          className="mb-3 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text" />
        <div className="mb-3 flex gap-2">
          <Button variant={mode === 'WARM' ? 'primary' : 'secondary'} onClick={() => setMode('WARM')}>WARM</Button>
          <Button variant={mode === 'COLD' ? 'primary' : 'secondary'} onClick={() => setMode('COLD')}>COLD</Button>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>✕</Button>
          <Button onClick={submit} disabled={!target.trim()}>{t('transfer')}</Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test:run -- ContentTemplatePicker` — Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/conversations/components/ContentTemplatePicker.tsx src/features/conversations/components/TransferModal.tsx src/features/conversations/components/__tests__/ContentTemplatePicker.test.tsx
git commit -m "feat(conversations): add content-template picker + transfer modal"
```

---

### Task 8: Outbound email task modal (WYSIWYG)

**Files:**
- Create: `src/features/conversations/components/OutboundEmailModal.tsx`
- Create: `src/features/conversations/components/__tests__/OutboundEmailModal.test.tsx`
- Modify: `package.json` (add `react-simple-wysiwyg`)

**Interfaces:**
- Consumes: `startOutboundEmailTask` from `@/lib/flex/actions/Conversation`; `useTranslations('conversations')`; `@/components/ui/Button`; `react-simple-wysiwyg` default `Editor`.
- Produces: `OutboundEmailModal({ open, onClose }: { open: boolean; onClose: () => void })` — to/subject inputs + WYSIWYG body; Send calls `startOutboundEmailTask` then `onClose`.

- [ ] **Step 1: Install the editor**

Run: `npm i react-simple-wysiwyg`
Expected: added to `dependencies`.

- [ ] **Step 2: Write the failing test `.../components/__tests__/OutboundEmailModal.test.tsx`**

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/en.json';

const startOutboundEmailTask = vi.fn();
vi.mock('@/lib/flex/actions/Conversation', () => ({ startOutboundEmailTask: (...a: unknown[]) => startOutboundEmailTask(...a) }));
// react-simple-wysiwyg renders a contentEditable; stub to a textarea for deterministic tests.
vi.mock('react-simple-wysiwyg', () => ({
  __esModule: true,
  default: ({ value, onChange }: { value: string; onChange: (e: { target: { value: string } }) => void }) => (
    <textarea aria-label="body" value={value} onChange={(e) => onChange({ target: { value: e.target.value } })} />
  ),
}));
import { OutboundEmailModal } from '../OutboundEmailModal';

function wrap(ui: React.ReactNode) {
  return <NextIntlClientProvider locale="en" messages={{ conversations: messages }}>{ui}</NextIntlClientProvider>;
}
beforeEach(() => startOutboundEmailTask.mockReset().mockResolvedValue({ taskSid: 'WT1' }));

describe('OutboundEmailModal', () => {
  it('submits an outbound email task', async () => {
    render(wrap(<OutboundEmailModal open onClose={vi.fn()} />));
    await userEvent.type(screen.getByLabelText('To'), 'a@b.com');
    await userEvent.type(screen.getByLabelText('Subject'), 'Hi');
    await userEvent.type(screen.getByLabelText('body'), 'Hello');
    await userEvent.click(screen.getByRole('button', { name: 'Send email' }));
    await waitFor(() => expect(startOutboundEmailTask).toHaveBeenCalledWith({ to: 'a@b.com', subject: 'Hi', body: 'Hello' }));
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm run test:run -- OutboundEmailModal` — Expected: FAIL (module not found).

- [ ] **Step 4: Write `src/features/conversations/components/OutboundEmailModal.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Editor from 'react-simple-wysiwyg';
import { Button } from '@/components/ui/Button';
import { startOutboundEmailTask } from '@/lib/flex/actions/Conversation';

export function OutboundEmailModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations('conversations');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  if (!open) return null;
  const submit = async () => {
    if (!to.trim() || !subject.trim()) return;
    await startOutboundEmailTask({ to: to.trim(), subject: subject.trim(), body });
    onClose();
  };
  const field = 'mb-3 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text';
  return (
    <div role="dialog" aria-label={t('email.new')} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-3 font-semibold text-text">{t('email.new')}</h2>
        <label className="block text-sm text-muted">{t('email.to')}
          <input aria-label={t('email.to')} value={to} onChange={(e) => setTo(e.target.value)} className={field} />
        </label>
        <label className="block text-sm text-muted">{t('email.subject')}
          <input aria-label={t('email.subject')} value={subject} onChange={(e) => setSubject(e.target.value)} className={field} />
        </label>
        <label className="mb-3 block text-sm text-muted">{t('email.body')}
          <div className="rounded-md border border-border bg-surface"><Editor value={body} onChange={(e) => setBody(e.target.value)} /></div>
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>✕</Button>
          <Button onClick={submit} disabled={!to.trim() || !subject.trim()}>{t('email.send')}</Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test:run -- OutboundEmailModal` — Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/conversations/components/OutboundEmailModal.tsx src/features/conversations/components/__tests__/OutboundEmailModal.test.tsx package.json package-lock.json
git commit -m "feat(conversations): add outbound email task modal (WYSIWYG)"
```

---

### Task 9: Feature barrel + full verification

**Files:**
- Create: `src/features/conversations/index.ts`

**Interfaces:**
- Produces: barrel re-exporting `ConversationPanel`, `PausedConversationsModal`, `TransferModal`, `ContentTemplatePicker`, `OutboundEmailModal`, `useConversationEvents`, and the action module — so the coordinator can mount them from one path.

- [ ] **Step 1: Write `src/features/conversations/index.ts`**

```ts
export { ConversationPanel } from './components/ConversationPanel';
export { PausedConversationsModal } from './components/PausedConversationsModal';
export { TransferModal } from './components/TransferModal';
export { ContentTemplatePicker } from './components/ContentTemplatePicker';
export { OutboundEmailModal } from './components/OutboundEmailModal';
export { useConversationEvents } from './hooks/useConversationEvents';
export * as conversationActions from '@/lib/flex/actions/Conversation';
```

- [ ] **Step 2: Run the full feature test suite + type-check**

Run: `npm run test:run -- conversations && npx tsc --noEmit`
Expected: all conversation tests pass; type-check exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/features/conversations/index.ts
git commit -m "feat(conversations): add feature barrel"
```

---

## Integration hooks (applied by the coordinator — NOT edited by this part)

**1. Compose the slice into `src/store/index.ts`:**
- Add import: `import { createConversationsSlice, type ConversationsSlice } from './slices/conversations';`
- Intersect the type: `type FlexStore = SessionSlice & ConversationsSlice & /* …other slices… */;`
- Spread in the initializer: `...createConversationsSlice(...a),`

**2. Bootstrap events in the Flex provider (`src/lib/flex/provider.tsx`):**
- After the client connects, mount `useConversationEvents()` from a client component rendered inside the provider tree (e.g. an `<AgentDesktopEvents />` aggregator the coordinator owns), so conversation events populate the store.

**3. Merge the i18n namespace:** none needed — the Part 2 loader auto-discovers `src/features/conversations/messages/<locale>.json` under namespace `conversations`.

**4. Mount in the agent desktop (`src/app/agent-desktop/page.tsx` composition):**
- Render `<ConversationPanel …/>` in the active-task area when the selected task's channel is `chat` or `email`.
- Add header actions to open `<PausedConversationsModal/>` and `<OutboundEmailModal/>`.
- Wire `onSend` to send via the active conversation's data-client object; `onPause`→`pauseConversation`, `onLeave`→`leaveConversation`, `onTransfer`→open `<TransferModal/>`.

---

## Self-Review

**Spec coverage (Part 6 slice):** chat list + composer + send (T4, T5) ✓ · outbound email + WYSIWYG + participants wrappers (T1, T8) ✓ · pause/resume/park + paused modal (T1, T6) ✓ · leave (T1) ✓ · conversation transfer (T1, T7) ✓ · content templates — demo-gap feature (T1, T7) ✓ · event bridge via `AddConversationEventListener` (T3) ✓ · own i18n namespace (T3) ✓ · own store slice (T2) ✓.

**Placeholder scan:** No TBD/TODO; every code step has full code; commands have expected output. The single executor note (Task 1 Step 3) is a verification instruction against installed typings, not a placeholder — wrapper signatures are fixed.

**Type consistency:** `ConversationMessage`/`ActiveConversation`/`ConversationsSlice` defined in T2 are consumed unchanged in T3/T4/T5. `PausedConversation`/`ContentTemplate`/`OutboundEmailInput` defined in T1 are reused in T2/T6/T7/T8. Wrapper names (`pauseConversation`, `resumeConversation`, `getPausedConversations`, `leaveConversation`, `startConversationTransfer`, `getConversationTransfers`, `getContentTemplates`, `startOutboundEmailTask`, `addEmailParticipant`, `removeEmailParticipant`) are identical across the plan and match the "Produces" block. Store access uses `useFlexStore` and the `create<Name>Slice` pattern from Part 3. File ownership respected; all shared edits deferred to Integration hooks.
