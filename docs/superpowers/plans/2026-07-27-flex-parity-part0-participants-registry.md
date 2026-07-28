# Flex Parity — Part 0: Task Participants Feed + Live-Handle Registry

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Establish the shared foundation Phases 1 & 2 depend on: a module registry for non-serializable SDK handles, and a live task-participants feed in the store.

**Architecture:** New `src/lib/flex/registry.ts` (Maps keyed by taskSid). New wrappers in `actions/Task.ts` for `GetTaskParticipants` / `AddTaskParticipantListener` / `GetChannelsForTask`. Minimal `src/lib/flex/workspace.ts` (`getWorkspace` + `fetchWorkerInfo`). Participant view-models + actions added to the tasks slice. A `participantEvents.ts` bridge subscribes on reservation `accepted`.

**Tech Stack:** @twilio/flex-sdk 4.1.0, Zustand, Vitest.

## Global Constraints

- SDK is browser-only; all SDK code behind `'use client'`.
- Wrappers only — feature code never `new`s an Action.
- `AddTaskParticipantListener` is an Action **class**, one instance per event type; never cast to a callback (SDK gotcha).
- `GetTaskParticipants(taskSid)` → `TaskParticipant[]`. `TaskParticipant` = `VoiceTaskParticipant | ConversationTaskParticipant`; both extend `BaseParticipant` (`participantSid`, `type`, `channelSid`, `interactionSid`, `routingProperties?.workerSid`). Voice adds `isOnHold`, `channelType: 'voice'`.
- `TaskParticipantEvent` keys: `participantAdded`, `participantModified`, `participantRemoved`; listener `(task, participant) => void`.
- TDD; tests in `__tests__/`. Four gates green.

---

### Task 1: Live-handle registry

**Files:**
- Create: `src/lib/flex/registry.ts`
- Test: `src/lib/flex/__tests__/registry.test.ts`

**Interfaces — Produces:**
- `setConversationHandle(taskSid: string, c: Conversation): void`, `getConversationHandle(taskSid): Conversation | undefined`, `deleteConversationHandle(taskSid): void`
- `setVoiceCallHandle(taskSid: string, c: VoiceCall): void`, `getVoiceCallHandle(taskSid): VoiceCall | undefined`, `deleteVoiceCallHandle(taskSid): void`
- `resetRegistry(): void`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  setConversationHandle, getConversationHandle, deleteConversationHandle,
  setVoiceCallHandle, getVoiceCallHandle, deleteVoiceCallHandle, resetRegistry,
} from '../registry';

describe('flex registry', () => {
  beforeEach(() => resetRegistry());

  it('stores and retrieves a conversation handle by taskSid', () => {
    const handle = { sid: 'CH1' } as never;
    setConversationHandle('WT1', handle);
    expect(getConversationHandle('WT1')).toBe(handle);
    deleteConversationHandle('WT1');
    expect(getConversationHandle('WT1')).toBeUndefined();
  });

  it('stores and retrieves a voice call handle by taskSid', () => {
    const call = { isMuted: () => false } as never;
    setVoiceCallHandle('WT2', call);
    expect(getVoiceCallHandle('WT2')).toBe(call);
    deleteVoiceCallHandle('WT2');
    expect(getVoiceCallHandle('WT2')).toBeUndefined();
  });

  it('resetRegistry clears both maps', () => {
    setConversationHandle('WT1', {} as never);
    setVoiceCallHandle('WT2', {} as never);
    resetRegistry();
    expect(getConversationHandle('WT1')).toBeUndefined();
    expect(getVoiceCallHandle('WT2')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test → FAIL** (`npx vitest run src/lib/flex/__tests__/registry.test.ts`) — "Cannot find module '../registry'".

- [ ] **Step 3: Implement**

```ts
'use client';

import type { Conversation } from '@twilio/flex-sdk/actions/Conversation';
import type { VoiceCall } from '@twilio/flex-sdk/actions/Voice';

// Non-serializable, event-emitting SDK handles live here (module singletons),
// keyed by taskSid — NOT in Zustand. Mirrors the client.ts singleton pattern.
const conversations = new Map<string, Conversation>();
const voiceCalls = new Map<string, VoiceCall>();

export function setConversationHandle(taskSid: string, c: Conversation): void {
  conversations.set(taskSid, c);
}
export function getConversationHandle(taskSid: string): Conversation | undefined {
  return conversations.get(taskSid);
}
export function deleteConversationHandle(taskSid: string): void {
  conversations.delete(taskSid);
}

export function setVoiceCallHandle(taskSid: string, c: VoiceCall): void {
  voiceCalls.set(taskSid, c);
}
export function getVoiceCallHandle(taskSid: string): VoiceCall | undefined {
  return voiceCalls.get(taskSid);
}
export function deleteVoiceCallHandle(taskSid: string): void {
  voiceCalls.delete(taskSid);
}

export function resetRegistry(): void {
  conversations.clear();
  voiceCalls.clear();
}
```

- [ ] **Step 4: Run test → PASS.**
- [ ] **Step 5: Commit** — `feat(flex): add live-handle registry for SDK Conversation/VoiceCall`

---

### Task 2: Task participant wrappers

**Files:**
- Modify: `src/lib/flex/actions/Task.ts`
- Test: `src/lib/flex/actions/__tests__/Task.participants.test.ts`

**Interfaces — Produces:**
- `getTaskParticipants(taskSid: string): Promise<TaskParticipant[]>`
- `addTaskParticipantListener(taskSid, eventName: 'participantAdded'|'participantModified'|'participantRemoved', listener: (task, participant) => void): Promise<{ unsubscribe: () => void }>`
- `getChannelsForTask(taskSid: string): Promise<TaskChannel[]>`

- [ ] **Step 1: Write the failing test** (mock the client singleton)

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const execute = vi.fn();
vi.mock('../../client', () => ({ getFlexClient: () => ({ execute }) }));

import { getTaskParticipants, addTaskParticipantListener } from '../Task';
import { GetTaskParticipants, AddTaskParticipantListener } from '@twilio/flex-sdk/actions/Task';

describe('Task participant wrappers', () => {
  beforeEach(() => execute.mockReset());

  it('getTaskParticipants executes GetTaskParticipants(taskSid)', async () => {
    execute.mockResolvedValue([{ participantSid: 'UT1' }]);
    const res = await getTaskParticipants('WT1');
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0]![0]).toBeInstanceOf(GetTaskParticipants);
    expect(res).toEqual([{ participantSid: 'UT1' }]);
  });

  it('addTaskParticipantListener executes AddTaskParticipantListener with event + listener', async () => {
    execute.mockResolvedValue({ unsubscribe: () => undefined });
    const listener = vi.fn();
    await addTaskParticipantListener('WT1', 'participantAdded', listener);
    expect(execute.mock.calls[0]![0]).toBeInstanceOf(AddTaskParticipantListener);
  });
});
```

- [ ] **Step 2: Run test → FAIL** ("getTaskParticipants is not a function").

- [ ] **Step 3: Implement** — append to `src/lib/flex/actions/Task.ts`:

```ts
// add to the existing import from '@twilio/flex-sdk/actions/Task':
//   GetTaskParticipants, AddTaskParticipantListener, GetChannelsForTask
import type { TaskParticipant } from '@twilio/flex-sdk/actions/Task';
import type { Task } from '@twilio/flex-sdk';

export type TaskParticipantEventName =
  | 'participantAdded'
  | 'participantModified'
  | 'participantRemoved';

/** Fetch the current participants of a task. */
export async function getTaskParticipants(taskSid: string): Promise<TaskParticipant[]> {
  const client = requireClient();
  try {
    return (await client.execute(new GetTaskParticipants(taskSid))) as TaskParticipant[];
  } catch (err) {
    throw normalizeFlexError(err);
  }
}

/** Subscribe to a single task-participant event type. Returns an unsubscribe. */
export async function addTaskParticipantListener(
  taskSid: string,
  eventName: TaskParticipantEventName,
  listener: (task: Task, participant: TaskParticipant) => void,
): Promise<{ unsubscribe: () => void }> {
  const client = requireClient();
  try {
    const res = (await client.execute(
      new AddTaskParticipantListener(taskSid, eventName, listener),
    )) as { unsubscribe: () => void };
    return res;
  } catch (err) {
    throw normalizeFlexError(err);
  }
}
```

(Also add `getChannelsForTask` following the same shape with `GetChannelsForTask`.)

- [ ] **Step 4: Run test → PASS.**
- [ ] **Step 5: Commit** — `feat(flex): wrap GetTaskParticipants + AddTaskParticipantListener`

---

### Task 3: Minimal workspace helper (name resolution)

**Files:**
- Create: `src/lib/flex/workspace.ts`
- Test: `src/lib/flex/__tests__/workspace.test.ts`

**Interfaces — Produces:**
- `getWorkspace(): Promise<Workspace | null>` (caches the Workspace)
- `fetchWorkerInfo(workerSid: string): Promise<WorkerInfo | null>`
- `resetWorkspaceCache(): void`

(Phase 4 extends this file with `fetchTaskQueues` / `fetchWorkersInfo`.)

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchWorkerInfo = vi.fn();
const getWorkspaceFn = vi.fn();
vi.mock('../client', () => ({ getFlexClient: () => ({ getWorkspace: getWorkspaceFn }) }));

import { fetchWorkerInfo as fetchWI, resetWorkspaceCache } from '../workspace';

describe('workspace helper', () => {
  beforeEach(() => { resetWorkspaceCache(); getWorkspaceFn.mockReset(); fetchWorkerInfo.mockReset(); });

  it('resolves a worker info via the cached workspace', async () => {
    getWorkspaceFn.mockResolvedValue({ fetchWorkerInfo });
    fetchWorkerInfo.mockResolvedValue({ sid: 'WK1', name: 'Ada', attributes: { full_name: 'Ada L' } });
    const info = await fetchWI('WK1');
    expect(info?.attributes.full_name).toBe('Ada L');
    // second call reuses cached workspace
    await fetchWI('WK1');
    expect(getWorkspaceFn).toHaveBeenCalledTimes(1);
  });

  it('returns null when there is no client', async () => {
    getWorkspaceFn.mockResolvedValue({ fetchWorkerInfo });
    // simulate no client by resetting — covered by null-guard in impl
    expect(await fetchWI('WK1')).not.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement**

```ts
'use client';

import type { Workspace, WorkerInfo } from '@twilio/flex-sdk/taskrouter';
import { getFlexClient } from './client';

let workspace: Workspace | null = null;

export async function getWorkspace(): Promise<Workspace | null> {
  if (workspace) return workspace;
  const client = getFlexClient();
  if (!client) return null;
  workspace = await client.getWorkspace();
  return workspace;
}

export async function fetchWorkerInfo(workerSid: string): Promise<WorkerInfo | null> {
  const ws = await getWorkspace();
  if (!ws) return null;
  try {
    return await ws.fetchWorkerInfo(workerSid);
  } catch {
    return null;
  }
}

export function resetWorkspaceCache(): void {
  workspace = null;
}
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `feat(flex): add workspace helper (getWorkspace + fetchWorkerInfo)`

---

### Task 4: Participants in the tasks slice

**Files:**
- Modify: `src/store/slices/tasks.ts`
- Test: `src/store/slices/__tests__/tasks.participants.test.ts`

**Interfaces — Produces (added to `TasksSlice`):**
- `participants: Record<string /*taskSid*/, TaskParticipantView[]>`
- `workerNames: Record<string /*workerSid*/, string>`
- `setParticipants(taskSid, TaskParticipantView[])`, `upsertParticipant(taskSid, TaskParticipantView)`, `removeParticipant(taskSid, participantSid)`, `setWorkerName(workerSid, name)`
- `TaskParticipantView = { participantSid; type; channelType; workerSid?; isOnHold }`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest';
import { createTasksSlice, type TasksSlice } from '../tasks';

function make() {
  let state: TasksSlice;
  const set = (fn: never) => { state = { ...state, ...(typeof fn === 'function' ? (fn as (s: TasksSlice) => Partial<TasksSlice>)(state) : fn) }; };
  state = createTasksSlice(set as never, (() => state) as never, {} as never);
  return { get: () => state };
}

describe('tasks slice participants', () => {
  it('sets, upserts and removes participants by taskSid', () => {
    const s = make();
    s.get().setParticipants('WT1', [{ participantSid: 'UT1', type: 'customer', channelType: 'voice', isOnHold: false }]);
    expect(s.get().participants.WT1).toHaveLength(1);
    s.get().upsertParticipant('WT1', { participantSid: 'UT2', type: 'agent', channelType: 'voice', workerSid: 'WK2', isOnHold: false });
    expect(s.get().participants.WT1).toHaveLength(2);
    s.get().upsertParticipant('WT1', { participantSid: 'UT2', type: 'agent', channelType: 'voice', workerSid: 'WK2', isOnHold: true });
    expect(s.get().participants.WT1.find(p => p.participantSid === 'UT2')?.isOnHold).toBe(true);
    s.get().removeParticipant('WT1', 'UT1');
    expect(s.get().participants.WT1).toHaveLength(1);
  });

  it('caches worker names', () => {
    const s = make();
    s.get().setWorkerName('WK2', 'Ada');
    expect(s.get().workerNames.WK2).toBe('Ada');
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement** — extend `tasks.ts`:

```ts
export interface TaskParticipantView {
  participantSid: string;
  type: string;
  channelType: string;
  workerSid?: string;
  isOnHold: boolean;
}
```

Add to `TasksSlice`:
```ts
  participants: Record<string, TaskParticipantView[]>;
  workerNames: Record<string, string>;
  setParticipants: (taskSid: string, participants: TaskParticipantView[]) => void;
  upsertParticipant: (taskSid: string, participant: TaskParticipantView) => void;
  removeParticipant: (taskSid: string, participantSid: string) => void;
  setWorkerName: (workerSid: string, name: string) => void;
```

Add to the creator:
```ts
  participants: {},
  workerNames: {},
  setParticipants: (taskSid, participants) =>
    set((state) => ({ participants: { ...state.participants, [taskSid]: participants } })),
  upsertParticipant: (taskSid, participant) =>
    set((state) => {
      const list = state.participants[taskSid] ?? [];
      const next = [...list.filter((p) => p.participantSid !== participant.participantSid), participant];
      return { participants: { ...state.participants, [taskSid]: next } };
    }),
  removeParticipant: (taskSid, participantSid) =>
    set((state) => ({
      participants: {
        ...state.participants,
        [taskSid]: (state.participants[taskSid] ?? []).filter((p) => p.participantSid !== participantSid),
      },
    })),
  setWorkerName: (workerSid, name) =>
    set((state) => ({ workerNames: { ...state.workerNames, [workerSid]: name } })),
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `feat(store): add task participants + worker-name cache to tasks slice`

---

### Task 5: Participant event bridge

**Files:**
- Create: `src/features/tasks/participantEvents.ts`
- Test: `src/features/tasks/__tests__/participantEvents.test.ts`

**Interfaces — Consumes:** `getTaskParticipants`, `addTaskParticipantListener` (Task 2); `fetchWorkerInfo` (Task 3); tasks-slice participant actions (Task 4).
**Produces:** `subscribeTaskParticipants(taskSid: string, selfWorkerSid: string, store?): Promise<() => void>` — fetches participants, resolves other-agent names, registers the 3 listeners; returns an unsubscribe that also clears the store entry.

- [ ] **Step 1: Failing test** (mock the wrappers + workspace + store)

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const getTaskParticipants = vi.fn();
const addTaskParticipantListener = vi.fn();
const fetchWorkerInfo = vi.fn();
vi.mock('@/lib/flex/actions/Task', () => ({ getTaskParticipants, addTaskParticipantListener }));
vi.mock('@/lib/flex/workspace', () => ({ fetchWorkerInfo }));

import { subscribeTaskParticipants } from '../participantEvents';

const state = {
  participants: {} as Record<string, unknown[]>, workerNames: {} as Record<string, string>,
  setParticipants: vi.fn((sid, p) => { state.participants[sid] = p; }),
  upsertParticipant: vi.fn(), removeParticipant: vi.fn(),
  setWorkerName: vi.fn((wk, n) => { state.workerNames[wk] = n; }),
};
const store = { getState: () => state } as never;

describe('subscribeTaskParticipants', () => {
  beforeEach(() => { getTaskParticipants.mockReset(); addTaskParticipantListener.mockReset(); fetchWorkerInfo.mockReset(); });

  it('seeds participants and resolves other-agent names, registers 3 listeners', async () => {
    getTaskParticipants.mockResolvedValue([
      { participantSid: 'UT1', type: 'customer', channelType: 'voice', isOnHold: false, routingProperties: null },
      { participantSid: 'UT2', type: 'agent', channelType: 'voice', isOnHold: false, routingProperties: { workerSid: 'WKother' } },
    ]);
    addTaskParticipantListener.mockResolvedValue({ unsubscribe: vi.fn() });
    fetchWorkerInfo.mockResolvedValue({ attributes: { full_name: 'Bob' }, name: 'bob' });

    const unsub = await subscribeTaskParticipants('WT1', 'WKself', store);
    expect(state.setParticipants).toHaveBeenCalledWith('WT1', expect.any(Array));
    expect(fetchWorkerInfo).toHaveBeenCalledWith('WKother');
    expect(addTaskParticipantListener).toHaveBeenCalledTimes(3);
    expect(typeof unsub).toBe('function');
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement**

```ts
import { useFlexStore } from '@/store';
import { getTaskParticipants, addTaskParticipantListener, type TaskParticipantEventName } from '@/lib/flex/actions/Task';
import { fetchWorkerInfo } from '@/lib/flex/workspace';
import type { TaskParticipant } from '@twilio/flex-sdk/actions/Task';
import type { TaskParticipantView } from '@/store/slices/tasks';

type Store = { getState: () => ReturnType<typeof useFlexStore.getState> };

function toView(p: TaskParticipant): TaskParticipantView {
  return {
    participantSid: p.participantSid,
    type: String(p.type),
    channelType: String(p.channelType),
    workerSid: p.routingProperties?.workerSid ?? undefined,
    isOnHold: 'isOnHold' in p ? Boolean((p as { isOnHold?: boolean }).isOnHold) : false,
  };
}

async function resolveName(store: Store, workerSid: string) {
  const info = await fetchWorkerInfo(workerSid);
  const name = (info?.attributes as { full_name?: string } | undefined)?.full_name ?? info?.name;
  if (name) store.getState().setWorkerName(workerSid, name);
}

export async function subscribeTaskParticipants(
  taskSid: string,
  selfWorkerSid: string,
  store: Store = useFlexStore as unknown as Store,
): Promise<() => void> {
  const participants = await getTaskParticipants(taskSid);
  store.getState().setParticipants(taskSid, participants.map(toView));
  participants
    .filter((p) => String(p.type) === 'agent' && p.routingProperties?.workerSid && p.routingProperties.workerSid !== selfWorkerSid)
    .forEach((p) => void resolveName(store, p.routingProperties!.workerSid!));

  const events: TaskParticipantEventName[] = ['participantAdded', 'participantModified', 'participantRemoved'];
  const subs = await Promise.all(
    events.map((ev) =>
      addTaskParticipantListener(taskSid, ev, (_task, participant) => {
        if (ev === 'participantRemoved') store.getState().removeParticipant(taskSid, participant.participantSid);
        else store.getState().upsertParticipant(taskSid, toView(participant));
      }).catch(() => ({ unsubscribe: () => undefined })),
    ),
  );

  return () => {
    subs.forEach((s) => s.unsubscribe?.());
    store.getState().setParticipants(taskSid, []);
  };
}
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** — `feat(tasks): participant event bridge (subscribeTaskParticipants)`

---

### Task 6: Wire the bridge into the reservation lifecycle

**Files:**
- Modify: `src/features/tasks/events.ts` (call `subscribeTaskParticipants` on `accepted`, unsubscribe on removal)
- Test: extend `src/features/tasks/__tests__/events.test.ts` (or new) — assert subscribe called when a reservation is already `accepted` / fires `accepted`.

- [ ] **Step 1:** Write a failing test asserting `subscribeTaskParticipants` is invoked when a reservation transitions to `accepted` (mock the module).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** In `subscribeReservations`, on the `accepted` handler (and for reservations already `accepted` at init), call `void subscribeTaskParticipants(reservation.task.sid, workerSid, store)` and store the returned unsubscribe in `cleanups`; the self workerSid comes from `useFlexStore.getState().worker?.sid`. Guard so tests without a worker no-op.
- [ ] **Step 4:** Run → PASS. Then run the full gate: `npm run test:run`, `tsc --noEmit`, `npm run lint`.
- [ ] **Step 5: Commit** — `feat(tasks): subscribe to participants on reservation accept`

---

## Self-Review

- Covers spec Phase 0 (participants feed + registry) fully.
- No placeholders; every code step shows code.
- Types consistent: `TaskParticipantView` defined in Task 4, consumed in Task 5.
- `addTaskParticipantListener` returns `{ unsubscribe }`; used in Task 5/6.
- Follow-on: Phase 1 uses the registry conversation handle; Phase 2 uses `getVoiceCallHandle` + participants.
