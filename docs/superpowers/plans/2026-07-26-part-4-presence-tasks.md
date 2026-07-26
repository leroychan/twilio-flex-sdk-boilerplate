# Part 4 — Presence & Tasks — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an agent set their worker activity (presence) and handle task reservations — list tasks, accept/reject, wrap-up/complete/end, and edit task attributes — all driven by mocked-in-test Flex SDK actions and live SDK events mirrored into Zustand.

**Architecture:** Thin typed action wrappers (`lib/flex/actions/Worker.ts`, `lib/flex/actions/Task.ts`) wrap the SDK action classes and run them through the Part 3 client + error normalizer. Two Zustand slices (`presence`, `tasks`) hold mirrored state. Event-subscription modules under each feature translate SDK worker/reservation events into slice mutations via dependency-injected store access (so they are testable without the real store). Feature hooks read the slices and call the wrappers; presentational components (`ActivitySelector`, `TaskList`, `TaskCard`) consume the hooks and the Part 1 UI primitives. All wiring into shared files is deferred to the coordinator via **Integration hooks** subsections — this part edits none of them.

**Tech Stack:** Next.js 15, React, TypeScript (strict, `noUncheckedIndexedAccess`), Zustand, next-intl, Vitest + @testing-library/react, `@twilio/flex-sdk/actions/Worker`, `@twilio/flex-sdk/actions/Task`.

## Global Constraints

- Package manager: **npm**. Tests run with `npm run test:run` (Vitest, jsdom, globals on). Path alias `@/` → `src/`.
- All SDK-touching code sits behind a `'use client'` boundary; components in this part that use hooks are `'use client'`.
- Styling = Tailwind + Twilio brand tokens only (**no Twilio Paste**). Use existing primitives `@/components/ui/Button` and `@/components/ui/Card` and tokens (`bg-surface`, `text-text`, `text-muted`, `border-border`, `bg-primary`, `bg-danger`).
- Every user-facing string is translated via `useTranslations`. This part owns namespaces `presence` and `tasks` only; **no edits to global message catalogs**.
- **File ownership — this part CREATES only:** `src/features/presence/**`, `src/features/tasks/**`, `src/lib/flex/actions/Worker.ts`, `src/lib/flex/actions/Task.ts`, `src/store/slices/presence.ts`, `src/store/slices/tasks.ts`. It MUST NOT edit `src/store/index.ts`, the agent-desktop page, `AppHeader`, or any Part 3 provider/events file — those edits live in **Integration hooks** subsections for the coordinator.
- Tests mock the SDK at its boundaries only: `vi.mock('@twilio/flex-sdk/actions/Worker')`, `vi.mock('@twilio/flex-sdk/actions/Task')`, `vi.mock('@/lib/flex/client')`. Hook/component tests may additionally mock `@/store`, the feature's own hook, or a wrapper module to stay independent of coordinator wiring.
- Dependencies already present from Parts 1–3: `zustand`, `next-intl`, `@twilio/flex-sdk`, Vitest + Testing Library. No new dependencies are installed in this part.

**Consumed contracts (from Parts 1–3 — conform exactly, do not redefine):**

- `@/lib/flex/client.ts` exports `getFlexClient(): Client` where `Client` has `execute<T>(action): Promise<T>`. (Also `initFlexClient()`, unused here.)
- `@/lib/flex/errors.ts` exports `normalizeError(error: unknown): FlexError` (an `Error` subclass carrying a `code: string`). Wrappers rethrow `normalizeError(err)` on failure.
- `@/store` exports the bound store hook `useFlexStore` (a Zustand `UseBoundStore`; supports `useFlexStore(selector)` and `useFlexStore.getState()`). Slice creators are named `create<Name>Slice` and live at `@/store/slices/<name>.ts`. The coordinator composes them in `@/store/index.ts`.
- `@/components/ui/Button` exports `Button({ variant?: 'primary'|'secondary'|'danger'|'ghost', ...ButtonHTMLAttributes })`. `@/components/ui/Card` exports `Card({ children, className? })`.

---

### Task 1: Worker action wrapper — `setCurrentActivity`

**Files:**
- Create: `src/lib/flex/actions/Worker.ts`
- Test: `src/lib/flex/actions/__tests__/Worker.test.ts`

**Interfaces:**
- Consumes: `getFlexClient(): Client` from `@/lib/flex/client`; `normalizeError(error: unknown): FlexError` from `@/lib/flex/errors`; `SetCurrentActivity` from `@twilio/flex-sdk/actions/Worker` (constructor `new SetCurrentActivity(activitySid: string)`).
- Produces: `setCurrentActivity(activitySid: string): Promise<void>`.

- [ ] **Step 1: Write the failing test `src/lib/flex/actions/__tests__/Worker.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SetCurrentActivity } from '@twilio/flex-sdk/actions/Worker';
import { getFlexClient } from '@/lib/flex/client';
import { setCurrentActivity } from '../Worker';

vi.mock('@twilio/flex-sdk/actions/Worker');
vi.mock('@/lib/flex/client');

describe('setCurrentActivity', () => {
  const execute = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getFlexClient).mockReturnValue({ execute } as unknown as ReturnType<typeof getFlexClient>);
  });

  it('executes SetCurrentActivity with the activity sid', async () => {
    execute.mockResolvedValue(undefined);
    await setCurrentActivity('WA123');
    expect(SetCurrentActivity).toHaveBeenCalledWith('WA123');
    expect(execute).toHaveBeenCalledWith(expect.any(SetCurrentActivity));
  });

  it('rethrows a normalized error when execute rejects', async () => {
    execute.mockRejectedValue(new Error('boom'));
    await expect(setCurrentActivity('WA123')).rejects.toBeInstanceOf(Error);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- Worker`
Expected: FAIL — cannot resolve `../Worker` (module not found).

- [ ] **Step 3: Write `src/lib/flex/actions/Worker.ts`**

```ts
import { SetCurrentActivity } from '@twilio/flex-sdk/actions/Worker';
import { getFlexClient } from '@/lib/flex/client';
import { normalizeError } from '@/lib/flex/errors';

/**
 * Sets the current worker's activity (presence) by activity SID.
 * Mirrors the SDK `SetCurrentActivity` action executed via the shared client.
 */
export async function setCurrentActivity(activitySid: string): Promise<void> {
  try {
    const client = getFlexClient();
    await client.execute(new SetCurrentActivity(activitySid));
  } catch (err) {
    throw normalizeError(err);
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- Worker`
Expected: PASS (2 passed).

- [ ] **Step 5: Commit**

```bash
git add src/lib/flex/actions/Worker.ts src/lib/flex/actions/__tests__/Worker.test.ts
git commit -m "feat(flex): add Worker action wrapper (setCurrentActivity)"
```

---

### Task 2: Task action wrappers

**Files:**
- Create: `src/lib/flex/actions/Task.ts`
- Test: `src/lib/flex/actions/__tests__/Task.test.ts`

**Interfaces:**
- Consumes: `getFlexClient()` from `@/lib/flex/client`; `normalizeError` from `@/lib/flex/errors`; from `@twilio/flex-sdk/actions/Task` the classes `AcceptTask(taskSid: string)`, `RejectTask(taskSid: string)`, `WrapUpTask(taskSid: string)`, `CompleteTask(taskSid: string)`, `EndTask(taskSid: string, reason?: string)`, `SetTaskAttributes(taskSid: string, attributes: Record<string, unknown>)`.
- Produces:
  - `acceptTask(taskSid: string): Promise<void>`
  - `rejectTask(taskSid: string): Promise<void>`
  - `wrapUpTask(taskSid: string): Promise<void>`
  - `completeTask(taskSid: string): Promise<void>`
  - `endTask(taskSid: string, reason?: string): Promise<void>`
  - `setTaskAttributes(taskSid: string, attributes: Record<string, unknown>): Promise<void>`

- [ ] **Step 1: Write the failing test `src/lib/flex/actions/__tests__/Task.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AcceptTask,
  RejectTask,
  WrapUpTask,
  CompleteTask,
  EndTask,
  SetTaskAttributes,
} from '@twilio/flex-sdk/actions/Task';
import { getFlexClient } from '@/lib/flex/client';
import {
  acceptTask,
  rejectTask,
  wrapUpTask,
  completeTask,
  endTask,
  setTaskAttributes,
} from '../Task';

vi.mock('@twilio/flex-sdk/actions/Task');
vi.mock('@/lib/flex/client');

describe('Task action wrappers', () => {
  const execute = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    execute.mockResolvedValue(undefined);
    vi.mocked(getFlexClient).mockReturnValue({ execute } as unknown as ReturnType<typeof getFlexClient>);
  });

  it('acceptTask executes AcceptTask with the task sid', async () => {
    await acceptTask('WT1');
    expect(AcceptTask).toHaveBeenCalledWith('WT1');
    expect(execute).toHaveBeenCalledWith(expect.any(AcceptTask));
  });

  it('rejectTask executes RejectTask with the task sid', async () => {
    await rejectTask('WT1');
    expect(RejectTask).toHaveBeenCalledWith('WT1');
    expect(execute).toHaveBeenCalledWith(expect.any(RejectTask));
  });

  it('wrapUpTask executes WrapUpTask with the task sid', async () => {
    await wrapUpTask('WT1');
    expect(WrapUpTask).toHaveBeenCalledWith('WT1');
    expect(execute).toHaveBeenCalledWith(expect.any(WrapUpTask));
  });

  it('completeTask executes CompleteTask with the task sid', async () => {
    await completeTask('WT1');
    expect(CompleteTask).toHaveBeenCalledWith('WT1');
    expect(execute).toHaveBeenCalledWith(expect.any(CompleteTask));
  });

  it('endTask executes EndTask with the task sid and optional reason', async () => {
    await endTask('WT1', 'customer_hangup');
    expect(EndTask).toHaveBeenCalledWith('WT1', 'customer_hangup');
    expect(execute).toHaveBeenCalledWith(expect.any(EndTask));
  });

  it('setTaskAttributes executes SetTaskAttributes with sid and attributes', async () => {
    await setTaskAttributes('WT1', { priority: 'high' });
    expect(SetTaskAttributes).toHaveBeenCalledWith('WT1', { priority: 'high' });
    expect(execute).toHaveBeenCalledWith(expect.any(SetTaskAttributes));
  });

  it('rethrows a normalized error when execute rejects', async () => {
    execute.mockRejectedValue(new Error('boom'));
    await expect(acceptTask('WT1')).rejects.toBeInstanceOf(Error);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- Task`
Expected: FAIL — cannot resolve `../Task` (module not found).

- [ ] **Step 3: Write `src/lib/flex/actions/Task.ts`**

```ts
import {
  AcceptTask,
  RejectTask,
  WrapUpTask,
  CompleteTask,
  EndTask,
  SetTaskAttributes,
} from '@twilio/flex-sdk/actions/Task';
import { getFlexClient } from '@/lib/flex/client';
import { normalizeError } from '@/lib/flex/errors';

/** Accept the reservation's task. */
export async function acceptTask(taskSid: string): Promise<void> {
  try {
    await getFlexClient().execute(new AcceptTask(taskSid));
  } catch (err) {
    throw normalizeError(err);
  }
}

/** Reject the reservation's task. */
export async function rejectTask(taskSid: string): Promise<void> {
  try {
    await getFlexClient().execute(new RejectTask(taskSid));
  } catch (err) {
    throw normalizeError(err);
  }
}

/** Move an accepted task into wrap-up. */
export async function wrapUpTask(taskSid: string): Promise<void> {
  try {
    await getFlexClient().execute(new WrapUpTask(taskSid));
  } catch (err) {
    throw normalizeError(err);
  }
}

/** Complete a wrapping-up task. */
export async function completeTask(taskSid: string): Promise<void> {
  try {
    await getFlexClient().execute(new CompleteTask(taskSid));
  } catch (err) {
    throw normalizeError(err);
  }
}

/** End a task, optionally with a reason. */
export async function endTask(taskSid: string, reason?: string): Promise<void> {
  try {
    await getFlexClient().execute(new EndTask(taskSid, reason));
  } catch (err) {
    throw normalizeError(err);
  }
}

/** Replace the task's attributes. */
export async function setTaskAttributes(
  taskSid: string,
  attributes: Record<string, unknown>,
): Promise<void> {
  try {
    await getFlexClient().execute(new SetTaskAttributes(taskSid, attributes));
  } catch (err) {
    throw normalizeError(err);
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- Task`
Expected: PASS (7 passed).

- [ ] **Step 5: Commit**

```bash
git add src/lib/flex/actions/Task.ts src/lib/flex/actions/__tests__/Task.test.ts
git commit -m "feat(flex): add Task action wrappers (accept/reject/wrapup/complete/end/attributes)"
```

---

### Task 3: Presence store slice

**Files:**
- Create: `src/store/slices/presence.ts`
- Test: `src/store/slices/__tests__/presence.test.ts`

**Interfaces:**
- Consumes: `StateCreator` type from `zustand`.
- Produces:
  - `interface ActivityView { sid: string; name: string; available: boolean }`
  - `interface PresenceSlice { activities: ActivityView[]; currentActivitySid: string | null; setActivities(activities: ActivityView[]): void; setCurrentActivitySid(activitySid: string | null): void }`
  - `createPresenceSlice: StateCreator<PresenceSlice>`

- [ ] **Step 1: Write the failing test `src/store/slices/__tests__/presence.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { create } from 'zustand';
import { createPresenceSlice, type PresenceSlice } from '../presence';

function makeStore() {
  return create<PresenceSlice>()(createPresenceSlice);
}

describe('presence slice', () => {
  it('starts empty', () => {
    const store = makeStore();
    expect(store.getState().activities).toEqual([]);
    expect(store.getState().currentActivitySid).toBeNull();
  });

  it('setActivities replaces the activities list', () => {
    const store = makeStore();
    store.getState().setActivities([{ sid: 'WA1', name: 'Available', available: true }]);
    expect(store.getState().activities).toEqual([
      { sid: 'WA1', name: 'Available', available: true },
    ]);
  });

  it('setCurrentActivitySid updates the current activity', () => {
    const store = makeStore();
    store.getState().setCurrentActivitySid('WA1');
    expect(store.getState().currentActivitySid).toBe('WA1');
    store.getState().setCurrentActivitySid(null);
    expect(store.getState().currentActivitySid).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- presence`
Expected: FAIL — cannot resolve `../presence`.

- [ ] **Step 3: Write `src/store/slices/presence.ts`**

```ts
import type { StateCreator } from 'zustand';

/** A worker activity as mirrored from the SDK worker.activities map. */
export interface ActivityView {
  sid: string;
  name: string;
  available: boolean;
}

export interface PresenceSlice {
  activities: ActivityView[];
  currentActivitySid: string | null;
  setActivities: (activities: ActivityView[]) => void;
  setCurrentActivitySid: (activitySid: string | null) => void;
}

export const createPresenceSlice: StateCreator<PresenceSlice> = (set) => ({
  activities: [],
  currentActivitySid: null,
  setActivities: (activities) => set({ activities }),
  setCurrentActivitySid: (activitySid) => set({ currentActivitySid: activitySid }),
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- presence`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add src/store/slices/presence.ts src/store/slices/__tests__/presence.test.ts
git commit -m "feat(store): add presence slice"
```

**Integration hooks (coordinator — edits to `src/store/index.ts`, do NOT make in this part):**
- Add import: `import { createPresenceSlice, type PresenceSlice } from '@/store/slices/presence';`
- Add `PresenceSlice` to the composed `FlexStore` type intersection, e.g. `type FlexStore = SessionSlice & PresenceSlice & TasksSlice /* & ... */;`
- Spread the creator into the store initializer alongside existing slices: `...createPresenceSlice(...a),` (inside `create<FlexStore>()((...a) => ({ ...createSessionSlice(...a), ...createPresenceSlice(...a) }))`).

---

### Task 4: Tasks store slice

**Files:**
- Create: `src/store/slices/tasks.ts`
- Test: `src/store/slices/__tests__/tasks.test.ts`

**Interfaces:**
- Consumes: `StateCreator` from `zustand`.
- Produces:
  - `type ReservationStatus = 'pending' | 'accepted' | 'wrapping' | 'completed' | 'rejected' | 'canceled' | 'rescinded' | 'timeout'`
  - `interface TaskView { reservationSid: string; taskSid: string; taskChannelUniqueName: string; attributes: Record<string, unknown>; status: ReservationStatus }`
  - `interface TasksSlice { tasks: TaskView[]; upsertTask(task: TaskView): void; updateTaskStatus(reservationSid: string, status: ReservationStatus): void; updateTaskAttributes(taskSid: string, attributes: Record<string, unknown>): void; removeTask(reservationSid: string): void }`
  - `createTasksSlice: StateCreator<TasksSlice>`

- [ ] **Step 1: Write the failing test `src/store/slices/__tests__/tasks.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { create } from 'zustand';
import { createTasksSlice, type TasksSlice, type TaskView } from '../tasks';

const baseTask: TaskView = {
  reservationSid: 'WR1',
  taskSid: 'WT1',
  taskChannelUniqueName: 'voice',
  attributes: { name: 'Ada' },
  status: 'pending',
};

function makeStore() {
  return create<TasksSlice>()(createTasksSlice);
}

describe('tasks slice', () => {
  it('starts empty', () => {
    expect(makeStore().getState().tasks).toEqual([]);
  });

  it('upsertTask adds then replaces by reservationSid', () => {
    const store = makeStore();
    store.getState().upsertTask(baseTask);
    expect(store.getState().tasks).toHaveLength(1);
    store.getState().upsertTask({ ...baseTask, taskChannelUniqueName: 'chat' });
    expect(store.getState().tasks).toHaveLength(1);
    expect(store.getState().tasks.find((t) => t.reservationSid === 'WR1')?.taskChannelUniqueName).toBe('chat');
  });

  it('updateTaskStatus changes a task status by reservationSid', () => {
    const store = makeStore();
    store.getState().upsertTask(baseTask);
    store.getState().updateTaskStatus('WR1', 'accepted');
    expect(store.getState().tasks.find((t) => t.reservationSid === 'WR1')?.status).toBe('accepted');
  });

  it('updateTaskAttributes replaces attributes by taskSid', () => {
    const store = makeStore();
    store.getState().upsertTask(baseTask);
    store.getState().updateTaskAttributes('WT1', { priority: 'high' });
    expect(store.getState().tasks.find((t) => t.taskSid === 'WT1')?.attributes).toEqual({ priority: 'high' });
  });

  it('removeTask drops a task by reservationSid', () => {
    const store = makeStore();
    store.getState().upsertTask(baseTask);
    store.getState().removeTask('WR1');
    expect(store.getState().tasks).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- tasks`
Expected: FAIL — cannot resolve `../tasks`.

- [ ] **Step 3: Write `src/store/slices/tasks.ts`**

```ts
import type { StateCreator } from 'zustand';

export type ReservationStatus =
  | 'pending'
  | 'accepted'
  | 'wrapping'
  | 'completed'
  | 'rejected'
  | 'canceled'
  | 'rescinded'
  | 'timeout';

/** A task/reservation as mirrored from SDK reservation events. */
export interface TaskView {
  reservationSid: string;
  taskSid: string;
  taskChannelUniqueName: string;
  attributes: Record<string, unknown>;
  status: ReservationStatus;
}

export interface TasksSlice {
  tasks: TaskView[];
  upsertTask: (task: TaskView) => void;
  updateTaskStatus: (reservationSid: string, status: ReservationStatus) => void;
  updateTaskAttributes: (taskSid: string, attributes: Record<string, unknown>) => void;
  removeTask: (reservationSid: string) => void;
}

export const createTasksSlice: StateCreator<TasksSlice> = (set) => ({
  tasks: [],
  upsertTask: (task) =>
    set((state) => ({
      tasks: [...state.tasks.filter((t) => t.reservationSid !== task.reservationSid), task],
    })),
  updateTaskStatus: (reservationSid, status) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.reservationSid === reservationSid ? { ...t, status } : t)),
    })),
  updateTaskAttributes: (taskSid, attributes) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.taskSid === taskSid ? { ...t, attributes } : t)),
    })),
  removeTask: (reservationSid) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.reservationSid !== reservationSid),
    })),
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- tasks`
Expected: PASS (5 passed).

- [ ] **Step 5: Commit**

```bash
git add src/store/slices/tasks.ts src/store/slices/__tests__/tasks.test.ts
git commit -m "feat(store): add tasks slice"
```

**Integration hooks (coordinator — edits to `src/store/index.ts`, do NOT make in this part):**
- Add import: `import { createTasksSlice, type TasksSlice } from '@/store/slices/tasks';`
- Add `TasksSlice` to the `FlexStore` type intersection.
- Spread `...createTasksSlice(...a),` into the store initializer.

---

### Task 5: Presence event subscription

**Files:**
- Create: `src/features/presence/events.ts`
- Test: `src/features/presence/__tests__/events.test.ts`

**Interfaces:**
- Consumes: `useFlexStore` from `@/store`; `PresenceSlice` (for the injected store shape) from `@/store/slices/presence`.
- Produces:
  - `interface ActivityLike { sid: string; name: string; available: boolean }`
  - `interface PresenceWorkerLike { activities: Map<string, ActivityLike>; activity: { sid: string } | null; on(event: 'activityUpdated', listener: () => void): void; off(event: 'activityUpdated', listener: () => void): void }`
  - `subscribePresence(worker: PresenceWorkerLike, store?): () => void` — seeds `activities` + `currentActivitySid`, subscribes to `activityUpdated`, returns an unsubscribe function. `store` defaults to `useFlexStore` and is typed as `{ getState: () => Pick<PresenceSlice, 'setActivities' | 'setCurrentActivitySid'> }`.

- [ ] **Step 1: Write the failing test `src/features/presence/__tests__/events.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { create } from 'zustand';
import { createPresenceSlice, type PresenceSlice } from '@/store/slices/presence';
import { subscribePresence, type PresenceWorkerLike } from '../events';

function makeEmitter() {
  const listeners: Record<string, Array<(...args: unknown[]) => void>> = {};
  return {
    on(event: string, cb: (...args: unknown[]) => void) {
      (listeners[event] ??= []).push(cb);
    },
    off(event: string, cb: (...args: unknown[]) => void) {
      listeners[event] = (listeners[event] ?? []).filter((f) => f !== cb);
    },
    emit(event: string, ...args: unknown[]) {
      (listeners[event] ?? []).forEach((f) => f(...args));
    },
  };
}

describe('subscribePresence', () => {
  it('seeds activities and current activity, then tracks activityUpdated', () => {
    const emitter = makeEmitter();
    const worker: PresenceWorkerLike = {
      activities: new Map([['WA1', { sid: 'WA1', name: 'Available', available: true }]]),
      activity: { sid: 'WA1' },
      on: emitter.on,
      off: emitter.off,
    };
    const store = create<PresenceSlice>()(createPresenceSlice);

    const unsubscribe = subscribePresence(worker, store);

    expect(store.getState().activities).toEqual([{ sid: 'WA1', name: 'Available', available: true }]);
    expect(store.getState().currentActivitySid).toBe('WA1');

    worker.activity = { sid: 'WA2' };
    emitter.emit('activityUpdated');
    expect(store.getState().currentActivitySid).toBe('WA2');

    unsubscribe();
    worker.activity = { sid: 'WA1' };
    emitter.emit('activityUpdated');
    expect(store.getState().currentActivitySid).toBe('WA2');
  });

  it('handles a null current activity', () => {
    const emitter = makeEmitter();
    const worker: PresenceWorkerLike = {
      activities: new Map(),
      activity: null,
      on: emitter.on,
      off: emitter.off,
    };
    const store = create<PresenceSlice>()(createPresenceSlice);
    subscribePresence(worker, store);
    expect(store.getState().currentActivitySid).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- presence/__tests__/events`
Expected: FAIL — cannot resolve `../events`.

- [ ] **Step 3: Write `src/features/presence/events.ts`**

```ts
import { useFlexStore } from '@/store';
import type { PresenceSlice } from '@/store/slices/presence';

export interface ActivityLike {
  sid: string;
  name: string;
  available: boolean;
}

export interface PresenceWorkerLike {
  activities: Map<string, ActivityLike>;
  activity: { sid: string } | null;
  on: (event: 'activityUpdated', listener: () => void) => void;
  off: (event: 'activityUpdated', listener: () => void) => void;
}

type PresenceStore = {
  getState: () => Pick<PresenceSlice, 'setActivities' | 'setCurrentActivitySid'>;
};

/**
 * Seeds presence state from the worker and keeps `currentActivitySid` in sync
 * with the SDK `activityUpdated` event. Returns an unsubscribe function.
 */
export function subscribePresence(
  worker: PresenceWorkerLike,
  store: PresenceStore = useFlexStore,
): () => void {
  const { setActivities, setCurrentActivitySid } = store.getState();

  setActivities(
    Array.from(worker.activities.values()).map((a) => ({
      sid: a.sid,
      name: a.name,
      available: a.available,
    })),
  );
  setCurrentActivitySid(worker.activity?.sid ?? null);

  const onActivityUpdated = () => {
    store.getState().setCurrentActivitySid(worker.activity?.sid ?? null);
  };
  worker.on('activityUpdated', onActivityUpdated);

  return () => worker.off('activityUpdated', onActivityUpdated);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- presence/__tests__/events`
Expected: PASS (2 passed).

- [ ] **Step 5: Commit**

```bash
git add src/features/presence/events.ts src/features/presence/__tests__/events.test.ts
git commit -m "feat(presence): subscribe worker activity events into the store"
```

**Integration hooks (coordinator — in the Part 3 provider/events bootstrap, after the worker is ready):**
- Import: `import { subscribePresence } from '@/features/presence/events';`
- Call once the SDK worker exists: `const unsubPresence = subscribePresence(worker);` and invoke `unsubPresence()` in the provider's cleanup. `worker` is the TaskRouter worker exposed by the Part 3 client (`@twilio/flex-sdk/taskrouter` `Worker`), which structurally satisfies `PresenceWorkerLike`.

---

### Task 6: Reservation event subscription

**Files:**
- Create: `src/features/tasks/events.ts`
- Test: `src/features/tasks/__tests__/events.test.ts`

**Interfaces:**
- Consumes: `useFlexStore` from `@/store`; `ReservationStatus`, `TaskView`, `TasksSlice` from `@/store/slices/tasks`.
- Produces:
  - `interface ReservationLike { sid: string; status: string; task: { sid: string; taskChannelUniqueName: string; attributes: Record<string, unknown> | string }; on(event: string, listener: () => void): void; off(event: string, listener: () => void): void }`
  - `interface TasksWorkerLike { reservations: Map<string, ReservationLike>; on(event: 'reservationCreated', listener: (reservation: ReservationLike) => void): void; off(event: 'reservationCreated', listener: (reservation: ReservationLike) => void): void }`
  - `subscribeReservations(worker: TasksWorkerLike, store?): () => void` — registers existing reservations + future `reservationCreated`, maps per-reservation events (`accepted`→status `accepted`, `wrapup`→`wrapping`, `completed`/`rejected`/`canceled`/`rescinded`/`timeout`→remove), returns an unsubscribe. `store` defaults to `useFlexStore`, typed `{ getState: () => Pick<TasksSlice, 'upsertTask' | 'updateTaskStatus' | 'removeTask'> }`.

- [ ] **Step 1: Write the failing test `src/features/tasks/__tests__/events.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { create } from 'zustand';
import { createTasksSlice, type TasksSlice } from '@/store/slices/tasks';
import { subscribeReservations, type ReservationLike, type TasksWorkerLike } from '../events';

function makeEmitter() {
  const listeners: Record<string, Array<(...args: unknown[]) => void>> = {};
  return {
    on(event: string, cb: (...args: unknown[]) => void) {
      (listeners[event] ??= []).push(cb);
    },
    off(event: string, cb: (...args: unknown[]) => void) {
      listeners[event] = (listeners[event] ?? []).filter((f) => f !== cb);
    },
    emit(event: string, ...args: unknown[]) {
      (listeners[event] ?? []).forEach((f) => f(...args));
    },
  };
}

function makeReservation(overrides: Partial<ReservationLike> = {}): ReservationLike {
  const emitter = makeEmitter();
  return {
    sid: 'WR1',
    status: 'pending',
    task: { sid: 'WT1', taskChannelUniqueName: 'voice', attributes: { name: 'Ada' } },
    on: emitter.on,
    off: emitter.off,
    ...overrides,
    // expose emit for the test via a cast below
  } as ReservationLike & { emit?: (e: string, ...a: unknown[]) => void };
}

describe('subscribeReservations', () => {
  it('registers a new reservation and maps its lifecycle events', () => {
    const workerEmitter = makeEmitter();
    const worker: TasksWorkerLike = {
      reservations: new Map(),
      on: workerEmitter.on,
      off: workerEmitter.off,
    };
    const store = create<TasksSlice>()(createTasksSlice);
    subscribeReservations(worker, store);

    const resEmitter = makeEmitter();
    const reservation: ReservationLike = {
      sid: 'WR1',
      status: 'pending',
      task: { sid: 'WT1', taskChannelUniqueName: 'voice', attributes: { name: 'Ada' } },
      on: resEmitter.on,
      off: resEmitter.off,
    };

    workerEmitter.emit('reservationCreated', reservation);
    expect(store.getState().tasks).toHaveLength(1);
    expect(store.getState().tasks[0]).toMatchObject({
      reservationSid: 'WR1',
      taskSid: 'WT1',
      taskChannelUniqueName: 'voice',
      status: 'pending',
      attributes: { name: 'Ada' },
    });

    resEmitter.emit('accepted');
    expect(store.getState().tasks.find((t) => t.reservationSid === 'WR1')?.status).toBe('accepted');

    resEmitter.emit('wrapup');
    expect(store.getState().tasks.find((t) => t.reservationSid === 'WR1')?.status).toBe('wrapping');

    resEmitter.emit('completed');
    expect(store.getState().tasks).toHaveLength(0);
  });

  it('parses string task attributes as JSON', () => {
    const workerEmitter = makeEmitter();
    const worker: TasksWorkerLike = {
      reservations: new Map(),
      on: workerEmitter.on,
      off: workerEmitter.off,
    };
    const store = create<TasksSlice>()(createTasksSlice);
    subscribeReservations(worker, store);

    const resEmitter = makeEmitter();
    workerEmitter.emit('reservationCreated', {
      sid: 'WR2',
      status: 'pending',
      task: { sid: 'WT2', taskChannelUniqueName: 'chat', attributes: '{"channel":"web"}' },
      on: resEmitter.on,
      off: resEmitter.off,
    } satisfies ReservationLike);

    expect(store.getState().tasks.find((t) => t.reservationSid === 'WR2')?.attributes).toEqual({ channel: 'web' });
  });

  it('seeds reservations already present on the worker', () => {
    const resEmitter = makeEmitter();
    const existing: ReservationLike = {
      sid: 'WR3',
      status: 'accepted',
      task: { sid: 'WT3', taskChannelUniqueName: 'voice', attributes: {} },
      on: resEmitter.on,
      off: resEmitter.off,
    };
    const workerEmitter = makeEmitter();
    const worker: TasksWorkerLike = {
      reservations: new Map([['WR3', existing]]),
      on: workerEmitter.on,
      off: workerEmitter.off,
    };
    const store = create<TasksSlice>()(createTasksSlice);
    subscribeReservations(worker, store);

    expect(store.getState().tasks.find((t) => t.reservationSid === 'WR3')?.status).toBe('accepted');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- tasks/__tests__/events`
Expected: FAIL — cannot resolve `../events`.

- [ ] **Step 3: Write `src/features/tasks/events.ts`**

```ts
import { useFlexStore } from '@/store';
import type { ReservationStatus, TaskView, TasksSlice } from '@/store/slices/tasks';

export interface ReservationLike {
  sid: string;
  status: string;
  task: {
    sid: string;
    taskChannelUniqueName: string;
    attributes: Record<string, unknown> | string;
  };
  on: (event: string, listener: () => void) => void;
  off: (event: string, listener: () => void) => void;
}

export interface TasksWorkerLike {
  reservations: Map<string, ReservationLike>;
  on: (event: 'reservationCreated', listener: (reservation: ReservationLike) => void) => void;
  off: (event: 'reservationCreated', listener: (reservation: ReservationLike) => void) => void;
}

type TasksStore = {
  getState: () => Pick<TasksSlice, 'upsertTask' | 'updateTaskStatus' | 'removeTask'>;
};

function parseAttributes(raw: Record<string, unknown> | string): Record<string, unknown> {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return raw ?? {};
}

function toStatus(raw: string): ReservationStatus {
  switch (raw) {
    case 'accepted':
      return 'accepted';
    case 'wrapping':
    case 'wrapup':
      return 'wrapping';
    case 'completed':
      return 'completed';
    case 'rejected':
      return 'rejected';
    case 'canceled':
      return 'canceled';
    case 'rescinded':
      return 'rescinded';
    case 'timeout':
      return 'timeout';
    default:
      return 'pending';
  }
}

function toTaskView(reservation: ReservationLike): TaskView {
  return {
    reservationSid: reservation.sid,
    taskSid: reservation.task.sid,
    taskChannelUniqueName: reservation.task.taskChannelUniqueName,
    attributes: parseAttributes(reservation.task.attributes),
    status: toStatus(reservation.status),
  };
}

/**
 * Mirrors current + future reservations into the tasks slice and maps each
 * reservation's lifecycle events onto slice mutations. Returns an unsubscribe.
 */
export function subscribeReservations(
  worker: TasksWorkerLike,
  store: TasksStore = useFlexStore,
): () => void {
  const cleanups: Array<() => void> = [];

  const register = (reservation: ReservationLike) => {
    store.getState().upsertTask(toTaskView(reservation));

    const onAccepted = () => store.getState().updateTaskStatus(reservation.sid, 'accepted');
    const onWrapup = () => store.getState().updateTaskStatus(reservation.sid, 'wrapping');
    const onRemove = () => store.getState().removeTask(reservation.sid);

    reservation.on('accepted', onAccepted);
    reservation.on('wrapup', onWrapup);
    reservation.on('completed', onRemove);
    reservation.on('rejected', onRemove);
    reservation.on('canceled', onRemove);
    reservation.on('rescinded', onRemove);
    reservation.on('timeout', onRemove);

    cleanups.push(() => {
      reservation.off('accepted', onAccepted);
      reservation.off('wrapup', onWrapup);
      reservation.off('completed', onRemove);
      reservation.off('rejected', onRemove);
      reservation.off('canceled', onRemove);
      reservation.off('rescinded', onRemove);
      reservation.off('timeout', onRemove);
    });
  };

  worker.reservations.forEach(register);

  const onCreated = (reservation: ReservationLike) => register(reservation);
  worker.on('reservationCreated', onCreated);
  cleanups.push(() => worker.off('reservationCreated', onCreated));

  return () => cleanups.forEach((fn) => fn());
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- tasks/__tests__/events`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add src/features/tasks/events.ts src/features/tasks/__tests__/events.test.ts
git commit -m "feat(tasks): subscribe reservation lifecycle events into the store"
```

**Integration hooks (coordinator — in the Part 3 provider/events bootstrap, after the worker is ready):**
- Import: `import { subscribeReservations } from '@/features/tasks/events';`
- Call once the SDK worker exists: `const unsubTasks = subscribeReservations(worker);` and invoke `unsubTasks()` in cleanup. The TaskRouter `Worker` structurally satisfies `TasksWorkerLike`.

---

### Task 7: Presence hook + i18n

**Files:**
- Create: `src/features/presence/hooks/usePresence.ts`
- Create: `src/features/presence/messages/en.json`
- Test: `src/features/presence/hooks/__tests__/usePresence.test.tsx`

**Interfaces:**
- Consumes: `useFlexStore` from `@/store`; `ActivityView`, `PresenceSlice` from `@/store/slices/presence`; `setCurrentActivity` from `@/lib/flex/actions/Worker`.
- Produces:
  - `interface UsePresenceResult { activities: ActivityView[]; currentActivitySid: string | null; changeActivity(activitySid: string): Promise<void> }`
  - `usePresence(): UsePresenceResult`
  - `en.json` namespace keys: `activityLabel`, `noActivities`.

- [ ] **Step 1: Write `src/features/presence/messages/en.json`**

```json
{
  "activityLabel": "Set your activity",
  "noActivities": "No activities available"
}
```

- [ ] **Step 2: Write the failing test `src/features/presence/hooks/__tests__/usePresence.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const { mockState } = vi.hoisted(() => ({
  mockState: {
    activities: [{ sid: 'WA1', name: 'Available', available: true }],
    currentActivitySid: 'WA1',
  } as { activities: unknown[]; currentActivitySid: string | null },
}));

vi.mock('@/store', () => ({
  useFlexStore: (selector: (s: typeof mockState) => unknown) => selector(mockState),
}));
vi.mock('@/lib/flex/actions/Worker', () => ({
  setCurrentActivity: vi.fn().mockResolvedValue(undefined),
}));

import { setCurrentActivity } from '@/lib/flex/actions/Worker';
import { usePresence } from '../usePresence';

describe('usePresence', () => {
  beforeEach(() => vi.clearAllMocks());

  it('exposes activities and current activity from the store', () => {
    const { result } = renderHook(() => usePresence());
    expect(result.current.activities).toHaveLength(1);
    expect(result.current.currentActivitySid).toBe('WA1');
  });

  it('changeActivity delegates to the Worker action wrapper', async () => {
    const { result } = renderHook(() => usePresence());
    await result.current.changeActivity('WA2');
    expect(setCurrentActivity).toHaveBeenCalledWith('WA2');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm run test:run -- usePresence`
Expected: FAIL — cannot resolve `../usePresence`.

- [ ] **Step 4: Write `src/features/presence/hooks/usePresence.ts`**

```ts
import { useCallback } from 'react';
import { useFlexStore } from '@/store';
import type { ActivityView, PresenceSlice } from '@/store/slices/presence';
import { setCurrentActivity } from '@/lib/flex/actions/Worker';

export interface UsePresenceResult {
  activities: ActivityView[];
  currentActivitySid: string | null;
  changeActivity: (activitySid: string) => Promise<void>;
}

export function usePresence(): UsePresenceResult {
  const activities = useFlexStore((s: PresenceSlice) => s.activities);
  const currentActivitySid = useFlexStore((s: PresenceSlice) => s.currentActivitySid);

  const changeActivity = useCallback(
    (activitySid: string) => setCurrentActivity(activitySid),
    [],
  );

  return { activities, currentActivitySid, changeActivity };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test:run -- usePresence`
Expected: PASS (2 passed).

- [ ] **Step 6: Commit**

```bash
git add src/features/presence/hooks/usePresence.ts src/features/presence/messages/en.json src/features/presence/hooks/__tests__/usePresence.test.tsx
git commit -m "feat(presence): add usePresence hook + en messages"
```

**Integration hooks (coordinator):** merge `src/features/presence/messages/en.json` into the app catalog under the `presence` namespace (i.e. global `en` messages gain `"presence": <this file>`), matching `useTranslations('presence')`.

---

### Task 8: ActivitySelector component

**Files:**
- Create: `src/features/presence/components/ActivitySelector.tsx`
- Test: `src/features/presence/components/__tests__/ActivitySelector.test.tsx`

**Interfaces:**
- Consumes: `usePresence` from `../hooks/usePresence`; `useTranslations` from `next-intl`.
- Produces: `ActivitySelector()` — a `<select>` labelled by `t('activityLabel')`, value bound to `currentActivitySid`, options from `activities`, `onChange` calling `changeActivity(sid)`; renders `t('noActivities')` when empty.

- [ ] **Step 1: Write the failing test `src/features/presence/components/__tests__/ActivitySelector.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import messages from '@/features/presence/messages/en.json';
import { usePresence } from '../../hooks/usePresence';
import { ActivitySelector } from '../ActivitySelector';

vi.mock('../../hooks/usePresence', () => ({ usePresence: vi.fn() }));

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ presence: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe('ActivitySelector', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders an option per activity and reflects the current activity', () => {
    vi.mocked(usePresence).mockReturnValue({
      activities: [
        { sid: 'WA1', name: 'Available', available: true },
        { sid: 'WA2', name: 'Offline', available: false },
      ],
      currentActivitySid: 'WA1',
      changeActivity: vi.fn().mockResolvedValue(undefined),
    });
    renderWithIntl(<ActivitySelector />);
    const select = screen.getByRole('combobox', { name: 'Set your activity' }) as HTMLSelectElement;
    expect(select.value).toBe('WA1');
    expect(screen.getByRole('option', { name: 'Available' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Offline' })).toBeInTheDocument();
  });

  it('calls changeActivity when a new activity is selected', async () => {
    const changeActivity = vi.fn().mockResolvedValue(undefined);
    vi.mocked(usePresence).mockReturnValue({
      activities: [
        { sid: 'WA1', name: 'Available', available: true },
        { sid: 'WA2', name: 'Offline', available: false },
      ],
      currentActivitySid: 'WA1',
      changeActivity,
    });
    renderWithIntl(<ActivitySelector />);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Set your activity' }), 'WA2');
    expect(changeActivity).toHaveBeenCalledWith('WA2');
  });

  it('shows a placeholder option when there are no activities', () => {
    vi.mocked(usePresence).mockReturnValue({
      activities: [],
      currentActivitySid: null,
      changeActivity: vi.fn().mockResolvedValue(undefined),
    });
    renderWithIntl(<ActivitySelector />);
    expect(screen.getByRole('option', { name: 'No activities available' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- ActivitySelector`
Expected: FAIL — cannot resolve `../ActivitySelector`.

- [ ] **Step 3: Write `src/features/presence/components/ActivitySelector.tsx`**

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { usePresence } from '../hooks/usePresence';

export function ActivitySelector() {
  const t = useTranslations('presence');
  const { activities, currentActivitySid, changeActivity } = usePresence();

  return (
    <label className="flex items-center gap-2 text-sm text-text">
      <span className="sr-only">{t('activityLabel')}</span>
      <select
        aria-label={t('activityLabel')}
        value={currentActivitySid ?? ''}
        onChange={(e) => {
          void changeActivity(e.target.value);
        }}
        className="rounded-md border border-border bg-surface px-3 py-2 text-text"
      >
        {activities.length === 0 && <option value="">{t('noActivities')}</option>}
        {activities.map((activity) => (
          <option key={activity.sid} value={activity.sid}>
            {activity.name}
          </option>
        ))}
      </select>
    </label>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- ActivitySelector`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add src/features/presence/components/ActivitySelector.tsx src/features/presence/components/__tests__/ActivitySelector.test.tsx
git commit -m "feat(presence): add ActivitySelector component"
```

**Integration hooks (coordinator — `src/components/layout/AppHeader.tsx`):**
- Import: `import { ActivitySelector } from '@/features/presence/components/ActivitySelector';`
- Render `<ActivitySelector />` in the header action group (e.g. before `<ThemeToggle />`). The header remains a client component or wraps this in one, since `ActivitySelector` is `'use client'`.

---

### Task 9: Tasks hook + i18n

**Files:**
- Create: `src/features/tasks/hooks/useTasks.ts`
- Create: `src/features/tasks/messages/en.json`
- Test: `src/features/tasks/hooks/__tests__/useTasks.test.tsx`

**Interfaces:**
- Consumes: `useFlexStore` from `@/store`; `TaskView`, `TasksSlice` from `@/store/slices/tasks`; the wrapper module `@/lib/flex/actions/Task` (functions `acceptTask`, `rejectTask`, `wrapUpTask`, `completeTask`, `endTask`, `setTaskAttributes`).
- Produces:
  - `interface UseTasksResult { tasks: TaskView[]; accept(taskSid: string): Promise<void>; reject(taskSid: string): Promise<void>; wrapUp(taskSid: string): Promise<void>; complete(taskSid: string): Promise<void>; end(taskSid: string, reason?: string): Promise<void>; setAttributes(taskSid: string, attributes: Record<string, unknown>): Promise<void> }`
  - `useTasks(): UseTasksResult`
  - `en.json` namespace keys: `empty`, `listLabel`, `accept`, `reject`, `wrapUp`, `complete`, `status.{pending,accepted,wrapping,completed,rejected,canceled,rescinded,timeout}`.

- [ ] **Step 1: Write `src/features/tasks/messages/en.json`**

```json
{
  "empty": "No active tasks",
  "listLabel": "Task list",
  "accept": "Accept",
  "reject": "Reject",
  "wrapUp": "Wrap up",
  "complete": "Complete",
  "status": {
    "pending": "Pending",
    "accepted": "Accepted",
    "wrapping": "Wrapping up",
    "completed": "Completed",
    "rejected": "Rejected",
    "canceled": "Canceled",
    "rescinded": "Rescinded",
    "timeout": "Timed out"
  }
}
```

- [ ] **Step 2: Write the failing test `src/features/tasks/hooks/__tests__/useTasks.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const { mockState } = vi.hoisted(() => ({
  mockState: {
    tasks: [
      {
        reservationSid: 'WR1',
        taskSid: 'WT1',
        taskChannelUniqueName: 'voice',
        attributes: {},
        status: 'pending',
      },
    ] as unknown[],
  },
}));

vi.mock('@/store', () => ({
  useFlexStore: (selector: (s: typeof mockState) => unknown) => selector(mockState),
}));
vi.mock('@/lib/flex/actions/Task', () => ({
  acceptTask: vi.fn().mockResolvedValue(undefined),
  rejectTask: vi.fn().mockResolvedValue(undefined),
  wrapUpTask: vi.fn().mockResolvedValue(undefined),
  completeTask: vi.fn().mockResolvedValue(undefined),
  endTask: vi.fn().mockResolvedValue(undefined),
  setTaskAttributes: vi.fn().mockResolvedValue(undefined),
}));

import * as TaskActions from '@/lib/flex/actions/Task';
import { useTasks } from '../useTasks';

describe('useTasks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('exposes tasks from the store', () => {
    const { result } = renderHook(() => useTasks());
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0]?.taskSid).toBe('WT1');
  });

  it('delegates each command to its Task action wrapper', async () => {
    const { result } = renderHook(() => useTasks());
    await result.current.accept('WT1');
    await result.current.reject('WT1');
    await result.current.wrapUp('WT1');
    await result.current.complete('WT1');
    await result.current.end('WT1', 'done');
    await result.current.setAttributes('WT1', { priority: 'high' });

    expect(TaskActions.acceptTask).toHaveBeenCalledWith('WT1');
    expect(TaskActions.rejectTask).toHaveBeenCalledWith('WT1');
    expect(TaskActions.wrapUpTask).toHaveBeenCalledWith('WT1');
    expect(TaskActions.completeTask).toHaveBeenCalledWith('WT1');
    expect(TaskActions.endTask).toHaveBeenCalledWith('WT1', 'done');
    expect(TaskActions.setTaskAttributes).toHaveBeenCalledWith('WT1', { priority: 'high' });
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm run test:run -- useTasks`
Expected: FAIL — cannot resolve `../useTasks`.

- [ ] **Step 4: Write `src/features/tasks/hooks/useTasks.ts`**

```ts
import { useCallback } from 'react';
import { useFlexStore } from '@/store';
import type { TaskView, TasksSlice } from '@/store/slices/tasks';
import * as TaskActions from '@/lib/flex/actions/Task';

export interface UseTasksResult {
  tasks: TaskView[];
  accept: (taskSid: string) => Promise<void>;
  reject: (taskSid: string) => Promise<void>;
  wrapUp: (taskSid: string) => Promise<void>;
  complete: (taskSid: string) => Promise<void>;
  end: (taskSid: string, reason?: string) => Promise<void>;
  setAttributes: (taskSid: string, attributes: Record<string, unknown>) => Promise<void>;
}

export function useTasks(): UseTasksResult {
  const tasks = useFlexStore((s: TasksSlice) => s.tasks);

  const accept = useCallback((taskSid: string) => TaskActions.acceptTask(taskSid), []);
  const reject = useCallback((taskSid: string) => TaskActions.rejectTask(taskSid), []);
  const wrapUp = useCallback((taskSid: string) => TaskActions.wrapUpTask(taskSid), []);
  const complete = useCallback((taskSid: string) => TaskActions.completeTask(taskSid), []);
  const end = useCallback(
    (taskSid: string, reason?: string) => TaskActions.endTask(taskSid, reason),
    [],
  );
  const setAttributes = useCallback(
    (taskSid: string, attributes: Record<string, unknown>) =>
      TaskActions.setTaskAttributes(taskSid, attributes),
    [],
  );

  return { tasks, accept, reject, wrapUp, complete, end, setAttributes };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test:run -- useTasks`
Expected: PASS (2 passed).

- [ ] **Step 6: Commit**

```bash
git add src/features/tasks/hooks/useTasks.ts src/features/tasks/messages/en.json src/features/tasks/hooks/__tests__/useTasks.test.tsx
git commit -m "feat(tasks): add useTasks hook + en messages"
```

**Integration hooks (coordinator):** merge `src/features/tasks/messages/en.json` into the app catalog under the `tasks` namespace, matching `useTranslations('tasks')`.

---

### Task 10: TaskCard + TaskList components

**Files:**
- Create: `src/features/tasks/components/TaskCard.tsx`
- Create: `src/features/tasks/components/TaskList.tsx`
- Test: `src/features/tasks/components/__tests__/TaskCard.test.tsx`
- Test: `src/features/tasks/components/__tests__/TaskList.test.tsx`

**Interfaces:**
- Consumes: `Card`, `Button` from `@/components/ui/*`; `TaskView` from `@/store/slices/tasks`; `useTasks` from `../hooks/useTasks`; `useTranslations` from `next-intl`.
- Produces:
  - `interface TaskCardProps { task: TaskView; onAccept(taskSid: string): void; onReject(taskSid: string): void; onWrapUp(taskSid: string): void; onComplete(taskSid: string): void }`
  - `TaskCard(props: TaskCardProps)` — shows `task.taskChannelUniqueName` + translated status; renders Accept/Reject when `pending`, Wrap up when `accepted`, Complete when `wrapping`.
  - `TaskList()` — reads `useTasks()`, renders a `TaskCard` per task (list semantics), or `t('empty')` when none.

- [ ] **Step 1: Write the failing test `src/features/tasks/components/__tests__/TaskCard.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import messages from '@/features/tasks/messages/en.json';
import type { TaskView } from '@/store/slices/tasks';
import { TaskCard } from '../TaskCard';

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ tasks: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const base: TaskView = {
  reservationSid: 'WR1',
  taskSid: 'WT1',
  taskChannelUniqueName: 'voice',
  attributes: {},
  status: 'pending',
};

function handlers() {
  return {
    onAccept: vi.fn(),
    onReject: vi.fn(),
    onWrapUp: vi.fn(),
    onComplete: vi.fn(),
  };
}

describe('TaskCard', () => {
  it('shows the channel and translated status', () => {
    renderWithIntl(<TaskCard task={base} {...handlers()} />);
    expect(screen.getByText('voice')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('renders Accept/Reject for pending and fires callbacks', async () => {
    const h = handlers();
    renderWithIntl(<TaskCard task={base} {...h} />);
    await userEvent.click(screen.getByRole('button', { name: 'Accept' }));
    await userEvent.click(screen.getByRole('button', { name: 'Reject' }));
    expect(h.onAccept).toHaveBeenCalledWith('WT1');
    expect(h.onReject).toHaveBeenCalledWith('WT1');
  });

  it('renders Wrap up for accepted tasks', async () => {
    const h = handlers();
    renderWithIntl(<TaskCard task={{ ...base, status: 'accepted' }} {...h} />);
    await userEvent.click(screen.getByRole('button', { name: 'Wrap up' }));
    expect(h.onWrapUp).toHaveBeenCalledWith('WT1');
  });

  it('renders Complete for wrapping tasks', async () => {
    const h = handlers();
    renderWithIntl(<TaskCard task={{ ...base, status: 'wrapping' }} {...h} />);
    await userEvent.click(screen.getByRole('button', { name: 'Complete' }));
    expect(h.onComplete).toHaveBeenCalledWith('WT1');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- TaskCard`
Expected: FAIL — cannot resolve `../TaskCard`.

- [ ] **Step 3: Write `src/features/tasks/components/TaskCard.tsx`**

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { TaskView } from '@/store/slices/tasks';

export interface TaskCardProps {
  task: TaskView;
  onAccept: (taskSid: string) => void;
  onReject: (taskSid: string) => void;
  onWrapUp: (taskSid: string) => void;
  onComplete: (taskSid: string) => void;
}

export function TaskCard({ task, onAccept, onReject, onWrapUp, onComplete }: TaskCardProps) {
  const t = useTranslations('tasks');

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-text">{task.taskChannelUniqueName}</span>
        <span className="text-xs text-muted">{t(`status.${task.status}`)}</span>
      </div>
      <div className="flex gap-2">
        {task.status === 'pending' && (
          <>
            <Button variant="primary" onClick={() => onAccept(task.taskSid)}>
              {t('accept')}
            </Button>
            <Button variant="danger" onClick={() => onReject(task.taskSid)}>
              {t('reject')}
            </Button>
          </>
        )}
        {task.status === 'accepted' && (
          <Button variant="secondary" onClick={() => onWrapUp(task.taskSid)}>
            {t('wrapUp')}
          </Button>
        )}
        {task.status === 'wrapping' && (
          <Button variant="primary" onClick={() => onComplete(task.taskSid)}>
            {t('complete')}
          </Button>
        )}
      </div>
    </Card>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- TaskCard`
Expected: PASS (4 passed).

- [ ] **Step 5: Write the failing test `src/features/tasks/components/__tests__/TaskList.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import messages from '@/features/tasks/messages/en.json';
import type { TaskView } from '@/store/slices/tasks';
import { useTasks } from '../../hooks/useTasks';
import { TaskList } from '../TaskList';

vi.mock('../../hooks/useTasks', () => ({ useTasks: vi.fn() }));

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ tasks: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

function noopCommands() {
  return {
    accept: vi.fn().mockResolvedValue(undefined),
    reject: vi.fn().mockResolvedValue(undefined),
    wrapUp: vi.fn().mockResolvedValue(undefined),
    complete: vi.fn().mockResolvedValue(undefined),
    end: vi.fn().mockResolvedValue(undefined),
    setAttributes: vi.fn().mockResolvedValue(undefined),
  };
}

const task: TaskView = {
  reservationSid: 'WR1',
  taskSid: 'WT1',
  taskChannelUniqueName: 'chat',
  attributes: {},
  status: 'pending',
};

describe('TaskList', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the empty state when there are no tasks', () => {
    vi.mocked(useTasks).mockReturnValue({ tasks: [], ...noopCommands() });
    renderWithIntl(<TaskList />);
    expect(screen.getByText('No active tasks')).toBeInTheDocument();
  });

  it('renders a list item per task', () => {
    vi.mocked(useTasks).mockReturnValue({ tasks: [task], ...noopCommands() });
    renderWithIntl(<TaskList />);
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('chat')).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npm run test:run -- TaskList`
Expected: FAIL — cannot resolve `../TaskList`.

- [ ] **Step 7: Write `src/features/tasks/components/TaskList.tsx`**

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { useTasks } from '../hooks/useTasks';
import { TaskCard } from './TaskCard';

export function TaskList() {
  const t = useTranslations('tasks');
  const { tasks, accept, reject, wrapUp, complete } = useTasks();

  if (tasks.length === 0) {
    return <p className="p-4 text-sm text-muted">{t('empty')}</p>;
  }

  return (
    <div className="flex flex-col gap-3 p-4" role="list" aria-label={t('listLabel')}>
      {tasks.map((task) => (
        <div role="listitem" key={task.reservationSid}>
          <TaskCard
            task={task}
            onAccept={(sid) => void accept(sid)}
            onReject={(sid) => void reject(sid)}
            onWrapUp={(sid) => void wrapUp(sid)}
            onComplete={(sid) => void complete(sid)}
          />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npm run test:run -- TaskList`
Expected: PASS (2 passed).

- [ ] **Step 9: Full verification — tests + lint + type-check**

Run: `npm run test:run && npm run lint && npx tsc --noEmit`
Expected: all pass (all Part 4 suites green; no lint or type errors).

- [ ] **Step 10: Commit**

```bash
git add src/features/tasks/components/TaskCard.tsx src/features/tasks/components/TaskList.tsx src/features/tasks/components/__tests__/TaskCard.test.tsx src/features/tasks/components/__tests__/TaskList.test.tsx
git commit -m "feat(tasks): add TaskCard + TaskList components"
```

**Integration hooks (coordinator — agent-desktop page, e.g. `src/app/agent-desktop/page.tsx` or its client shell):**
- Import: `import { TaskList } from '@/features/tasks/components/TaskList';`
- Render `<TaskList />` in the task column of the desktop layout. It is `'use client'` and reads live task state from the store via `useTasks`; no props required.

---

## Integration Hooks — consolidated (coordinator reference)

All edits below touch shared files this part does not own. Apply them after Part 4 lands.

1. **`src/store/index.ts`** — compose both slices:
   ```ts
   import { createPresenceSlice, type PresenceSlice } from '@/store/slices/presence';
   import { createTasksSlice, type TasksSlice } from '@/store/slices/tasks';
   // type FlexStore = SessionSlice & PresenceSlice & TasksSlice /* & ... */;
   // inside create<FlexStore>()((...a) => ({ ...createSessionSlice(...a),
   //   ...createPresenceSlice(...a), ...createTasksSlice(...a) }))
   ```
2. **Part 3 provider/events bootstrap** — after the TaskRouter worker is ready:
   ```ts
   import { subscribePresence } from '@/features/presence/events';
   import { subscribeReservations } from '@/features/tasks/events';
   const unsubPresence = subscribePresence(worker);
   const unsubTasks = subscribeReservations(worker);
   // call unsubPresence() and unsubTasks() in the provider cleanup
   ```
3. **App message catalog (Part 2 loader)** — merge feature namespaces:
   `en` messages gain `"presence": <src/features/presence/messages/en.json>` and `"tasks": <src/features/tasks/messages/en.json>`.
4. **`src/components/layout/AppHeader.tsx`** — render `<ActivitySelector />` in the header actions.
5. **Agent-desktop page** — render `<TaskList />` in the task column.

---

## Self-Review

**1. Spec coverage (Part 4 slice):**
- Presence: `ActivitySelector` dropdown (T8) sets activity via `SetCurrentActivity` wrapper (T1), reflects current activity from worker/session state via the presence slice (T3) seeded by `activityUpdated` events (T5). ✓
- Tasks/reservations: `TaskList` + `TaskCard` (T10); accept/reject (`AcceptTask`/`RejectTask`), wrap-up/complete/end (`WrapUpTask`/`CompleteTask`/`EndTask`), attributes (`SetTaskAttributes`) all wrapped (T2) and surfaced via `useTasks` (T9). ✓
- Subscribe to reservation events: `subscribeReservations` handles `reservationCreated` + per-reservation `accepted`/`wrapup`/`completed`/`rejected`/`canceled`/`rescinded`/`timeout` (T6). ✓
- Show task channel/type: `TaskCard` renders `task.taskChannelUniqueName` (T10). ✓
- SDK modules `@twilio/flex-sdk/actions/Worker` and `.../Task` are the only SDK imports, mocked in tests as required. ✓
- Deferred by design: conference/voice-specific `AcceptTask` options (Part 5), supervisor `SetWorkerActivity` (Part 7).

**2. Placeholder scan:** No TBD/TODO; every code step contains full code; every test has real assertions; no "similar to Task N" references. ✓

**3. Type consistency:**
- `ActivityView` (T3) is produced by the presence slice and consumed unchanged by `subscribePresence` (T5), `usePresence` (T7).
- `TaskView`/`ReservationStatus`/`TasksSlice` (T4) are consumed unchanged by `subscribeReservations` (T6), `useTasks` (T9), `TaskCard`/`TaskList` (T10).
- Slice creators are named `createPresenceSlice`/`createTasksSlice` per the `create<Name>Slice` contract; both typed `StateCreator<Slice>` and instantiated in tests via `create<Slice>()(creator)`.
- Wrapper signatures (`setCurrentActivity`, `acceptTask`, `rejectTask`, `wrapUpTask`, `completeTask`, `endTask`, `setTaskAttributes`) match their consumers in the hooks exactly, including `endTask(taskSid, reason?)`.
- i18n keys used in components (`activityLabel`, `noActivities`, `empty`, `listLabel`, `accept`, `reject`, `wrapUp`, `complete`, `status.*`) all exist in the respective `en.json`.
- Status strings in the slice union, the `toStatus` mapper, and the `status.*` message keys are the same eight values.

**4. Ownership check:** Every created path is under `src/features/presence/**`, `src/features/tasks/**`, `src/lib/flex/actions/Worker.ts`, `src/lib/flex/actions/Task.ts`, `src/store/slices/presence.ts`, or `src/store/slices/tasks.ts`. All shared-file wiring is confined to Integration hooks subsections. `src/store/index.ts` is never edited by a task. ✓
