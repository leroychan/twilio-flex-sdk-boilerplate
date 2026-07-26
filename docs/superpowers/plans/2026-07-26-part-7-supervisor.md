# Part 7 — Supervisor / Monitoring — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the demo-gap supervisor features — real-time call monitoring (silent Monitor, whisper Coach, join Barge) and management of *other* workers (set activity, set attributes) — surfaced through a self-contained `SupervisorPanel`.

**Architecture:** A thin action wrapper (`@/lib/flex/actions/Supervisor.ts`) normalizes `MonitorCall`/`CoachCall`/`BargeCall` (from `@twilio/flex-sdk/actions/Voice`) and `SetWorkerActivity`/`SetWorkerAttributes` (from `@twilio/flex-sdk/actions/Supervisor`) over the shared `getFlexClient()` singleton, rethrowing via the shared error normalizer. A Zustand slice (`@/store/slices/supervisor.ts`) holds worker/monitored-task lists and the active monitor session. A `useSupervisor` hook binds slice state to the wrappers. Prop-driven presentational components compose into `SupervisorPanel`. Every shared file (`@/store/index.ts`, the Part-3 event bridge, the Part-2 i18n config, the desktop page, and Part-5's `Voice.ts`) is left untouched — wiring is delegated to the coordinator via **Integration hooks** subsections.

**Tech Stack:** Next.js 15 (App Router) + TypeScript (strict, `noUncheckedIndexedAccess`), Zustand, next-intl, Tailwind (Twilio brand tokens), Vitest + @testing-library/react (jsdom), `@twilio/flex-sdk` v4.1.x.

## Global Constraints

- Next.js 15 App Router + TypeScript; strict mode on; `noUncheckedIndexedAccess` on.
- All SDK-touching code sits behind a `'use client'` boundary; the SDK is reached only through `@/lib/flex/client.ts`'s `getFlexClient()` singleton and typed wrappers under `@/lib/flex/actions/`.
- Styling = Tailwind + Twilio brand tokens only (`bg-surface`, `text-text`, `text-muted`, `border-border`, `bg-primary`, `text-danger`, `text-success`, etc.). **No Twilio Paste.**
- Every user-facing string is translated via next-intl `useTranslations('supervisor')`; no literal JSX text.
- Package manager: **npm**. Tests: `npm run test:run` (Vitest, jsdom). Alias `@/` → `src/`.
- **File ownership (Part 7 creates ONLY these):** `src/features/supervisor/**`, `src/lib/flex/actions/Supervisor.ts`, `src/store/slices/supervisor.ts`. Never edit shared files inline — all shared-file changes are emitted as **Integration hooks** for the coordinator. In particular: do NOT edit Part 5's `@/lib/flex/actions/Voice.ts`; do NOT edit `@/store/index.ts`.
- Test mocking convention: `vi.mock('@twilio/flex-sdk/actions/Supervisor')`, `vi.mock('@twilio/flex-sdk/actions/Voice')`, `vi.mock('@/lib/flex/client')` (plus `vi.mock('@/store')` / `vi.mock` of the hook where a unit needs isolation).

### Interfaces CONSUMED from Parts 1–3 (conform — do NOT redefine)

- `@/lib/flex/client.ts` → `getFlexClient(): unknown` — returns the initialized browser SDK client singleton (throws if not initialized). Called for readiness; return value is not used by Part 7 wrappers.
- `@/lib/flex/errors.ts` → `normalizeFlexError(error: unknown): { code: string; message: string }` — maps any thrown SDK/JS error to a stable shape.
- `@/store` → `useFlexStore` — the combined Zustand hook. Its state includes the supervisor slice **after** the coordinator applies Task 2's Integration hooks. Slice-creator convention is `create<Name>Slice`.
- `@/components/ui/Button` → `Button({ variant?: 'primary'|'secondary'|'danger'|'ghost', ...ButtonHTMLAttributes })`.
- `@/components/ui/Card` → `Card({ children, className? })`.
- `next-intl` → `useTranslations(namespace)` returns `t(key: string) => string`; `NextIntlClientProvider` for tests.
- SDK action modules (mocked in tests):
  - `@twilio/flex-sdk/actions/Voice` → `MonitorCall(opts: { taskSid: string }): Promise<void>`, `CoachCall(opts: { taskSid: string }): Promise<void>`, `BargeCall(opts: { taskSid: string }): Promise<void>`.
  - `@twilio/flex-sdk/actions/Supervisor` → `SetWorkerActivity(opts: { workerSid: string; activitySid: string; rejectPendingReservations?: boolean }): Promise<void>`, `SetWorkerAttributes(opts: { workerSid: string; attributes: Record<string, unknown> }): Promise<void>`.

---

### Task 1: Supervisor action wrappers

**Files:**
- Create: `src/lib/flex/actions/Supervisor.ts`
- Test: `src/lib/flex/actions/__tests__/Supervisor.test.ts`

**Interfaces:**
- Consumes: `getFlexClient()` from `@/lib/flex/client`; `normalizeFlexError()` from `@/lib/flex/errors`; `MonitorCall`/`CoachCall`/`BargeCall` from `@twilio/flex-sdk/actions/Voice`; `SetWorkerActivity`/`SetWorkerAttributes` from `@twilio/flex-sdk/actions/Supervisor`.
- Produces:
  - `monitorCall(taskSid: string): Promise<void>`
  - `coachCall(taskSid: string): Promise<void>`
  - `bargeCall(taskSid: string): Promise<void>`
  - `setWorkerActivity(workerSid: string, activitySid: string, rejectPendingReservations?: boolean): Promise<void>`
  - `setWorkerAttributes(workerSid: string, attributes: Record<string, unknown>): Promise<void>`
  - Each asserts client readiness via `getFlexClient()`, invokes the SDK action, and on failure `throw`s `normalizeFlexError(error)`.

- [ ] **Step 1: Write the failing test `src/lib/flex/actions/__tests__/Supervisor.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MonitorCall, CoachCall, BargeCall } from '@twilio/flex-sdk/actions/Voice';
import { SetWorkerActivity, SetWorkerAttributes } from '@twilio/flex-sdk/actions/Supervisor';
import { getFlexClient } from '@/lib/flex/client';
import {
  monitorCall,
  coachCall,
  bargeCall,
  setWorkerActivity,
  setWorkerAttributes,
} from '../Supervisor';

vi.mock('@twilio/flex-sdk/actions/Voice', () => ({
  MonitorCall: vi.fn(),
  CoachCall: vi.fn(),
  BargeCall: vi.fn(),
}));
vi.mock('@twilio/flex-sdk/actions/Supervisor', () => ({
  SetWorkerActivity: vi.fn(),
  SetWorkerAttributes: vi.fn(),
}));
vi.mock('@/lib/flex/client', () => ({ getFlexClient: vi.fn(() => ({})) }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Supervisor action wrappers', () => {
  it('monitorCall asserts client readiness and passes taskSid', async () => {
    await monitorCall('WT1');
    expect(getFlexClient).toHaveBeenCalledOnce();
    expect(MonitorCall).toHaveBeenCalledWith({ taskSid: 'WT1' });
  });

  it('coachCall passes taskSid', async () => {
    await coachCall('WT2');
    expect(CoachCall).toHaveBeenCalledWith({ taskSid: 'WT2' });
  });

  it('bargeCall passes taskSid', async () => {
    await bargeCall('WT3');
    expect(BargeCall).toHaveBeenCalledWith({ taskSid: 'WT3' });
  });

  it('setWorkerActivity passes worker/activity with default rejectPendingReservations=false', async () => {
    await setWorkerActivity('WK1', 'WA1');
    expect(SetWorkerActivity).toHaveBeenCalledWith({
      workerSid: 'WK1',
      activitySid: 'WA1',
      rejectPendingReservations: false,
    });
  });

  it('setWorkerAttributes passes worker and attributes', async () => {
    await setWorkerAttributes('WK1', { role: 'lead' });
    expect(SetWorkerAttributes).toHaveBeenCalledWith({
      workerSid: 'WK1',
      attributes: { role: 'lead' },
    });
  });

  it('rethrows a normalized error when the SDK action fails', async () => {
    vi.mocked(MonitorCall).mockRejectedValueOnce(new Error('boom'));
    await expect(monitorCall('WT1')).rejects.toHaveProperty('message');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- Supervisor`
Expected: FAIL — `Cannot find module '../Supervisor'` (or "monitorCall is not a function").

- [ ] **Step 3: Write `src/lib/flex/actions/Supervisor.ts`**

```ts
import { MonitorCall, CoachCall, BargeCall } from '@twilio/flex-sdk/actions/Voice';
import { SetWorkerActivity, SetWorkerAttributes } from '@twilio/flex-sdk/actions/Supervisor';
import { getFlexClient } from '@/lib/flex/client';
import { normalizeFlexError } from '@/lib/flex/errors';

/**
 * Real-time call monitoring. `MonitorCall` starts a silent listen; `CoachCall`
 * transitions to whisper (only the agent hears the supervisor); `BargeCall`
 * joins the supervisor into the call for everyone. All target a task by SID and
 * use the current worker (the supervisor) implied by the SDK client singleton.
 */
export async function monitorCall(taskSid: string): Promise<void> {
  getFlexClient();
  try {
    await MonitorCall({ taskSid });
  } catch (error) {
    throw normalizeFlexError(error);
  }
}

export async function coachCall(taskSid: string): Promise<void> {
  getFlexClient();
  try {
    await CoachCall({ taskSid });
  } catch (error) {
    throw normalizeFlexError(error);
  }
}

export async function bargeCall(taskSid: string): Promise<void> {
  getFlexClient();
  try {
    await BargeCall({ taskSid });
  } catch (error) {
    throw normalizeFlexError(error);
  }
}

/** Set the activity (presence) of ANOTHER worker — a supervisor capability. */
export async function setWorkerActivity(
  workerSid: string,
  activitySid: string,
  rejectPendingReservations = false,
): Promise<void> {
  getFlexClient();
  try {
    await SetWorkerActivity({ workerSid, activitySid, rejectPendingReservations });
  } catch (error) {
    throw normalizeFlexError(error);
  }
}

/** Overwrite the attributes of ANOTHER worker — a supervisor capability. */
export async function setWorkerAttributes(
  workerSid: string,
  attributes: Record<string, unknown>,
): Promise<void> {
  getFlexClient();
  try {
    await SetWorkerAttributes({ workerSid, attributes });
  } catch (error) {
    throw normalizeFlexError(error);
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- Supervisor`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/flex/actions/Supervisor.ts src/lib/flex/actions/__tests__/Supervisor.test.ts
git commit -m "feat(supervisor): add monitor/coach/barge + worker-management action wrappers"
```

---

### Task 2: Supervisor store slice

**Files:**
- Create: `src/store/slices/supervisor.ts`
- Test: `src/store/slices/__tests__/supervisor.test.ts`

**Interfaces:**
- Consumes: `zustand` `StateCreator`.
- Produces:
  - `interface MonitoredWorker { sid: string; friendlyName: string; activitySid: string; activityName: string; available: boolean; attributes: Record<string, unknown> }`
  - `interface MonitoredTask { taskSid: string; workerSid: string; workerName: string; queueName: string; channelType: string }`
  - `type SupervisorMode = 'monitor' | 'coach' | 'barge'` (single source of truth for the mode union)
  - `interface SupervisorSlice { workers; monitoredTasks; activeMonitorTaskSid: string | null; monitorMode: SupervisorMode | null; supervisorError: string | null; setWorkers; upsertWorker; setMonitoredTasks; setActiveMonitor; setSupervisorError }`
  - `createSupervisorSlice: StateCreator<SupervisorSlice>` — the slice creator.

- [ ] **Step 1: Write the failing test `src/store/slices/__tests__/supervisor.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { create } from 'zustand';
import { createSupervisorSlice, type SupervisorSlice, type MonitoredWorker } from '../supervisor';

const makeStore = () => create<SupervisorSlice>()((...a) => createSupervisorSlice(...a));

const worker = (sid: string, activityName = 'Offline', available = false): MonitoredWorker => ({
  sid,
  friendlyName: `Agent ${sid}`,
  activitySid: 'WA0',
  activityName,
  available,
  attributes: {},
});

describe('supervisor slice', () => {
  let store: ReturnType<typeof makeStore>;
  beforeEach(() => {
    store = makeStore();
  });

  it('starts empty', () => {
    const s = store.getState();
    expect(s.workers).toEqual([]);
    expect(s.monitoredTasks).toEqual([]);
    expect(s.activeMonitorTaskSid).toBeNull();
    expect(s.monitorMode).toBeNull();
    expect(s.supervisorError).toBeNull();
  });

  it('setWorkers replaces the list', () => {
    store.getState().setWorkers([worker('WK1'), worker('WK2')]);
    expect(store.getState().workers).toHaveLength(2);
  });

  it('upsertWorker inserts a new worker and updates an existing one', () => {
    store.getState().upsertWorker(worker('WK1', 'Offline'));
    store.getState().upsertWorker(worker('WK1', 'Available', true));
    const { workers } = store.getState();
    expect(workers).toHaveLength(1);
    expect(workers[0]?.activityName).toBe('Available');
    expect(workers[0]?.available).toBe(true);
  });

  it('setActiveMonitor sets task + mode, and clears mode when task is null', () => {
    store.getState().setActiveMonitor('WT1', 'coach');
    expect(store.getState().activeMonitorTaskSid).toBe('WT1');
    expect(store.getState().monitorMode).toBe('coach');
    store.getState().setActiveMonitor(null, 'coach');
    expect(store.getState().activeMonitorTaskSid).toBeNull();
    expect(store.getState().monitorMode).toBeNull();
  });

  it('setSupervisorError stores and clears the message', () => {
    store.getState().setSupervisorError('nope');
    expect(store.getState().supervisorError).toBe('nope');
    store.getState().setSupervisorError(null);
    expect(store.getState().supervisorError).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- supervisor`
Expected: FAIL — `Cannot find module '../supervisor'`.

- [ ] **Step 3: Write `src/store/slices/supervisor.ts`**

```ts
import type { StateCreator } from 'zustand';

export interface MonitoredWorker {
  sid: string;
  friendlyName: string;
  activitySid: string;
  activityName: string;
  available: boolean;
  attributes: Record<string, unknown>;
}

export interface MonitoredTask {
  taskSid: string;
  workerSid: string;
  workerName: string;
  queueName: string;
  channelType: string;
}

export type SupervisorMode = 'monitor' | 'coach' | 'barge';

export interface SupervisorSlice {
  workers: MonitoredWorker[];
  monitoredTasks: MonitoredTask[];
  activeMonitorTaskSid: string | null;
  monitorMode: SupervisorMode | null;
  supervisorError: string | null;
  setWorkers: (workers: MonitoredWorker[]) => void;
  upsertWorker: (worker: MonitoredWorker) => void;
  setMonitoredTasks: (tasks: MonitoredTask[]) => void;
  setActiveMonitor: (taskSid: string | null, mode: SupervisorMode | null) => void;
  setSupervisorError: (message: string | null) => void;
}

export const createSupervisorSlice: StateCreator<SupervisorSlice> = (set) => ({
  workers: [],
  monitoredTasks: [],
  activeMonitorTaskSid: null,
  monitorMode: null,
  supervisorError: null,
  setWorkers: (workers) => set({ workers }),
  upsertWorker: (worker) =>
    set((state) => {
      const index = state.workers.findIndex((w) => w.sid === worker.sid);
      if (index === -1) {
        return { workers: [...state.workers, worker] };
      }
      const next = state.workers.slice();
      next[index] = worker;
      return { workers: next };
    }),
  setMonitoredTasks: (monitoredTasks) => set({ monitoredTasks }),
  setActiveMonitor: (taskSid, mode) =>
    set({ activeMonitorTaskSid: taskSid, monitorMode: taskSid ? mode : null }),
  setSupervisorError: (supervisorError) => set({ supervisorError }),
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- supervisor`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/store/slices/supervisor.ts src/store/slices/__tests__/supervisor.test.ts
git commit -m "feat(supervisor): add supervisor Zustand slice (workers, monitored tasks, monitor session)"
```

#### Integration hooks (for the coordinator — do NOT edit `@/store/index.ts` in this part)

In `src/store/index.ts`, merge the slice into the combined store. Exact lines:

```ts
// 1. Add to the imports block:
import { createSupervisorSlice, type SupervisorSlice } from './slices/supervisor';

// 2. Add SupervisorSlice to the combined store type (intersection with the other slices):
//    export type FlexStore = SessionSlice & TasksSlice & PresenceSlice &
//      VoiceSlice & ConversationsSlice & SupervisorSlice;

// 3. Spread the slice into the create() body alongside the existing slices:
//    export const useFlexStore = create<FlexStore>()((set, get, api) => ({
//      ...createSessionSlice(set, get, api),
//      /* ...other slices... */
//      ...createSupervisorSlice(set as Parameters<typeof createSupervisorSlice>[0], get, api),
//    }));
```

Note: `createSupervisorSlice` is typed `StateCreator<SupervisorSlice>`; its `set`/`get` only ever touch supervisor fields, so the `set as ...` cast above keeps the combined-store typing sound. If the codebase types slices as `StateCreator<FlexStore, [], [], SupervisorSlice>`, re-annotate the export in `supervisor.ts` to match that convention and drop the cast.

Optional (for a live demo): the Part-3 event bridge (`@/lib/flex/events.ts`) can populate the slice by calling `useFlexStore.getState().setWorkers(...)`, `.upsertWorker(...)`, and `.setMonitoredTasks(...)` when TaskRouter worker/task events arrive. Part 7 renders whatever the store holds; tests seed it directly.

---

### Task 3: i18n namespace + `useSupervisor` hook

**Files:**
- Create: `src/features/supervisor/messages/en.json`
- Create: `src/features/supervisor/hooks/useSupervisor.ts`
- Test: `src/features/supervisor/hooks/__tests__/useSupervisor.test.ts`

**Interfaces:**
- Consumes: `useFlexStore` from `@/store`; wrappers from `@/lib/flex/actions/Supervisor`; `SupervisorMode` from `@/store/slices/supervisor`.
- Produces: `useSupervisor()` returning
  `{ workers, monitoredTasks, activeMonitorTaskSid, monitorMode, supervisorError, startMode(taskSid: string, mode: SupervisorMode): Promise<void>, stopMonitoring(): void, changeWorkerActivity(workerSid: string, activitySid: string): Promise<void>, updateWorkerAttributes(workerSid: string, attributes: Record<string, unknown>): Promise<void> }`.
  Any wrapper rejection is caught and its `message` written to `supervisorError`; on success `startMode` records the active session via `setActiveMonitor`.
- Produces: the `supervisor` message namespace (`en.json`) consumed by all Part-7 components.

- [ ] **Step 1: Write `src/features/supervisor/messages/en.json`**

```json
{
  "title": "Supervisor",
  "workers": {
    "heading": "Workers",
    "empty": "No workers to display.",
    "available": "Available",
    "unavailable": "Unavailable",
    "changeActivity": "Change activity",
    "attributes": "Attributes",
    "saveAttributes": "Save attributes",
    "invalidJson": "Attributes must be valid JSON."
  },
  "tasks": {
    "heading": "Live tasks",
    "empty": "No live tasks to monitor.",
    "queue": "Queue",
    "agent": "Agent"
  },
  "controls": {
    "monitor": "Monitor",
    "coach": "Coach",
    "barge": "Barge",
    "stop": "Stop"
  }
}
```

- [ ] **Step 2: Write the failing test `src/features/supervisor/hooks/__tests__/useSupervisor.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { monitorCall, coachCall, bargeCall, setWorkerActivity, setWorkerAttributes } from '@/lib/flex/actions/Supervisor';
import { useSupervisor } from '../useSupervisor';

const { store } = vi.hoisted(() => ({
  store: {
    workers: [],
    monitoredTasks: [],
    activeMonitorTaskSid: null as string | null,
    monitorMode: null as string | null,
    supervisorError: null as string | null,
    setActiveMonitor: vi.fn(),
    setSupervisorError: vi.fn(),
  },
}));

vi.mock('@/store', () => ({
  useFlexStore: (selector: (s: typeof store) => unknown) => selector(store),
}));
vi.mock('@/lib/flex/actions/Supervisor', () => ({
  monitorCall: vi.fn(),
  coachCall: vi.fn(),
  bargeCall: vi.fn(),
  setWorkerActivity: vi.fn(),
  setWorkerAttributes: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useSupervisor', () => {
  it('startMode("monitor") calls monitorCall then records the active session', async () => {
    const { result } = renderHook(() => useSupervisor());
    await act(async () => {
      await result.current.startMode('WT1', 'monitor');
    });
    expect(monitorCall).toHaveBeenCalledWith('WT1');
    expect(store.setSupervisorError).toHaveBeenCalledWith(null);
    expect(store.setActiveMonitor).toHaveBeenCalledWith('WT1', 'monitor');
  });

  it('startMode routes coach and barge to their wrappers', async () => {
    const { result } = renderHook(() => useSupervisor());
    await act(async () => {
      await result.current.startMode('WT2', 'coach');
      await result.current.startMode('WT3', 'barge');
    });
    expect(coachCall).toHaveBeenCalledWith('WT2');
    expect(bargeCall).toHaveBeenCalledWith('WT3');
  });

  it('startMode writes the error message and skips setActiveMonitor on failure', async () => {
    vi.mocked(monitorCall).mockRejectedValueOnce({ code: 'x', message: 'denied' });
    const { result } = renderHook(() => useSupervisor());
    await act(async () => {
      await result.current.startMode('WT1', 'monitor');
    });
    expect(store.setSupervisorError).toHaveBeenLastCalledWith('denied');
    expect(store.setActiveMonitor).not.toHaveBeenCalled();
  });

  it('stopMonitoring clears the active session', () => {
    const { result } = renderHook(() => useSupervisor());
    act(() => {
      result.current.stopMonitoring();
    });
    expect(store.setActiveMonitor).toHaveBeenCalledWith(null, null);
  });

  it('changeWorkerActivity delegates to setWorkerActivity', async () => {
    const { result } = renderHook(() => useSupervisor());
    await act(async () => {
      await result.current.changeWorkerActivity('WK1', 'WA1');
    });
    expect(setWorkerActivity).toHaveBeenCalledWith('WK1', 'WA1');
  });

  it('updateWorkerAttributes delegates to setWorkerAttributes', async () => {
    const { result } = renderHook(() => useSupervisor());
    await act(async () => {
      await result.current.updateWorkerAttributes('WK1', { role: 'lead' });
    });
    expect(setWorkerAttributes).toHaveBeenCalledWith('WK1', { role: 'lead' });
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm run test:run -- useSupervisor`
Expected: FAIL — `Cannot find module '../useSupervisor'`.

- [ ] **Step 4: Write `src/features/supervisor/hooks/useSupervisor.ts`**

```ts
'use client';
import { useCallback } from 'react';
import { useFlexStore } from '@/store';
import {
  monitorCall,
  coachCall,
  bargeCall,
  setWorkerActivity,
  setWorkerAttributes,
} from '@/lib/flex/actions/Supervisor';
import type { SupervisorMode } from '@/store/slices/supervisor';

function messageOf(error: unknown): string {
  return (error as { message?: string })?.message ?? 'Unknown error';
}

export function useSupervisor() {
  const workers = useFlexStore((s) => s.workers);
  const monitoredTasks = useFlexStore((s) => s.monitoredTasks);
  const activeMonitorTaskSid = useFlexStore((s) => s.activeMonitorTaskSid);
  const monitorMode = useFlexStore((s) => s.monitorMode);
  const supervisorError = useFlexStore((s) => s.supervisorError);
  const setActiveMonitor = useFlexStore((s) => s.setActiveMonitor);
  const setSupervisorError = useFlexStore((s) => s.setSupervisorError);

  const startMode = useCallback(
    async (taskSid: string, mode: SupervisorMode) => {
      setSupervisorError(null);
      try {
        if (mode === 'monitor') {
          await monitorCall(taskSid);
        } else if (mode === 'coach') {
          await coachCall(taskSid);
        } else {
          await bargeCall(taskSid);
        }
        setActiveMonitor(taskSid, mode);
      } catch (error) {
        setSupervisorError(messageOf(error));
      }
    },
    [setActiveMonitor, setSupervisorError],
  );

  const stopMonitoring = useCallback(() => {
    setActiveMonitor(null, null);
  }, [setActiveMonitor]);

  const changeWorkerActivity = useCallback(
    async (workerSid: string, activitySid: string) => {
      setSupervisorError(null);
      try {
        await setWorkerActivity(workerSid, activitySid);
      } catch (error) {
        setSupervisorError(messageOf(error));
      }
    },
    [setSupervisorError],
  );

  const updateWorkerAttributes = useCallback(
    async (workerSid: string, attributes: Record<string, unknown>) => {
      setSupervisorError(null);
      try {
        await setWorkerAttributes(workerSid, attributes);
      } catch (error) {
        setSupervisorError(messageOf(error));
      }
    },
    [setSupervisorError],
  );

  return {
    workers,
    monitoredTasks,
    activeMonitorTaskSid,
    monitorMode,
    supervisorError,
    startMode,
    stopMonitoring,
    changeWorkerActivity,
    updateWorkerAttributes,
  };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test:run -- useSupervisor`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add src/features/supervisor/messages/en.json src/features/supervisor/hooks/useSupervisor.ts src/features/supervisor/hooks/__tests__/useSupervisor.test.ts
git commit -m "feat(supervisor): add supervisor i18n namespace + useSupervisor hook"
```

---

### Task 4: Worker input components (activity select + attributes editor)

**Files:**
- Create: `src/features/supervisor/components/WorkerActivitySelect.tsx`
- Create: `src/features/supervisor/components/WorkerAttributesEditor.tsx`
- Test: `src/features/supervisor/components/__tests__/WorkerActivitySelect.test.tsx`
- Test: `src/features/supervisor/components/__tests__/WorkerAttributesEditor.test.tsx`

**Interfaces:**
- Consumes: `useTranslations('supervisor')`; `Button` from `@/components/ui/Button`.
- Produces:
  - `interface ActivityOption { sid: string; name: string }` (exported from `WorkerActivitySelect.tsx`)
  - `WorkerActivitySelect({ activities: ActivityOption[]; currentActivitySid: string; onChange(activitySid: string): void; disabled?: boolean })`
  - `WorkerAttributesEditor({ attributes: Record<string, unknown>; onSave(attributes: Record<string, unknown>): void; busy?: boolean })` — edits JSON; on invalid JSON shows an inline `role="alert"` and does not call `onSave`.

- [ ] **Step 1: Write the failing test `WorkerActivitySelect.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/en.json';
import { WorkerActivitySelect } from '../WorkerActivitySelect';

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ supervisor: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const activities = [
  { sid: 'WA0', name: 'Offline' },
  { sid: 'WA1', name: 'Available' },
];

describe('WorkerActivitySelect', () => {
  it('renders options and reflects the current activity', () => {
    renderWithIntl(
      <WorkerActivitySelect activities={activities} currentActivitySid="WA0" onChange={vi.fn()} />,
    );
    const select = screen.getByLabelText('Change activity') as HTMLSelectElement;
    expect(select.value).toBe('WA0');
    expect(screen.getByRole('option', { name: 'Available' })).toBeInTheDocument();
  });

  it('calls onChange with the selected activity sid', async () => {
    const onChange = vi.fn();
    renderWithIntl(
      <WorkerActivitySelect activities={activities} currentActivitySid="WA0" onChange={onChange} />,
    );
    await userEvent.selectOptions(screen.getByLabelText('Change activity'), 'WA1');
    expect(onChange).toHaveBeenCalledWith('WA1');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- WorkerActivitySelect`
Expected: FAIL — `Cannot find module '../WorkerActivitySelect'`.

- [ ] **Step 3: Write `src/features/supervisor/components/WorkerActivitySelect.tsx`**

```tsx
'use client';
import { useTranslations } from 'next-intl';

export interface ActivityOption {
  sid: string;
  name: string;
}

export function WorkerActivitySelect({
  activities,
  currentActivitySid,
  onChange,
  disabled = false,
}: {
  activities: ActivityOption[];
  currentActivitySid: string;
  onChange: (activitySid: string) => void;
  disabled?: boolean;
}) {
  const t = useTranslations('supervisor');
  return (
    <select
      aria-label={t('workers.changeActivity')}
      value={currentActivitySid}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-text disabled:opacity-50"
    >
      {activities.map((activity) => (
        <option key={activity.sid} value={activity.sid}>
          {activity.name}
        </option>
      ))}
    </select>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- WorkerActivitySelect`
Expected: PASS (2 tests).

- [ ] **Step 5: Write the failing test `WorkerAttributesEditor.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/en.json';
import { WorkerAttributesEditor } from '../WorkerAttributesEditor';

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ supervisor: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe('WorkerAttributesEditor', () => {
  it('saves parsed JSON when valid', async () => {
    const onSave = vi.fn();
    renderWithIntl(<WorkerAttributesEditor attributes={{ role: 'agent' }} onSave={onSave} />);
    const textarea = screen.getByLabelText('Attributes');
    await userEvent.clear(textarea);
    await userEvent.type(textarea, '{{"role":"lead"}');
    await userEvent.click(screen.getByRole('button', { name: 'Save attributes' }));
    expect(onSave).toHaveBeenCalledWith({ role: 'lead' });
  });

  it('shows an alert and does not save when JSON is invalid', async () => {
    const onSave = vi.fn();
    renderWithIntl(<WorkerAttributesEditor attributes={{}} onSave={onSave} />);
    const textarea = screen.getByLabelText('Attributes');
    await userEvent.clear(textarea);
    await userEvent.type(textarea, 'not json');
    await userEvent.click(screen.getByRole('button', { name: 'Save attributes' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Attributes must be valid JSON.');
  });
});
```

Note: `userEvent.type` treats `{{` as a literal `{` (curly braces are special in user-event). The doubled brace above types a single `{`.

- [ ] **Step 6: Run the test to verify it fails**

Run: `npm run test:run -- WorkerAttributesEditor`
Expected: FAIL — `Cannot find module '../WorkerAttributesEditor'`.

- [ ] **Step 7: Write `src/features/supervisor/components/WorkerAttributesEditor.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';

export function WorkerAttributesEditor({
  attributes,
  onSave,
  busy = false,
}: {
  attributes: Record<string, unknown>;
  onSave: (attributes: Record<string, unknown>) => void;
  busy?: boolean;
}) {
  const t = useTranslations('supervisor');
  const [draft, setDraft] = useState(() => JSON.stringify(attributes, null, 2));
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    try {
      const parsed = JSON.parse(draft) as Record<string, unknown>;
      setError(null);
      onSave(parsed);
    } catch {
      setError(t('workers.invalidJson'));
    }
  };

  return (
    <div className="mt-2">
      <label htmlFor="worker-attributes" className="block text-xs font-medium text-muted">
        {t('workers.attributes')}
      </label>
      <textarea
        id="worker-attributes"
        aria-label={t('workers.attributes')}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        rows={4}
        className="mt-1 w-full rounded-md border border-border bg-surface p-2 font-mono text-xs text-text"
      />
      {error ? (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      ) : null}
      <Button variant="secondary" className="mt-2" onClick={handleSave} disabled={busy}>
        {t('workers.saveAttributes')}
      </Button>
    </div>
  );
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npm run test:run -- WorkerAttributesEditor`
Expected: PASS (2 tests).

- [ ] **Step 9: Commit**

```bash
git add src/features/supervisor/components/WorkerActivitySelect.tsx src/features/supervisor/components/WorkerAttributesEditor.tsx src/features/supervisor/components/__tests__/WorkerActivitySelect.test.tsx src/features/supervisor/components/__tests__/WorkerAttributesEditor.test.tsx
git commit -m "feat(supervisor): add worker activity select + attributes editor inputs"
```

---

### Task 5: Worker card + worker list

**Files:**
- Create: `src/features/supervisor/components/WorkerCard.tsx`
- Create: `src/features/supervisor/components/WorkerList.tsx`
- Test: `src/features/supervisor/components/__tests__/WorkerCard.test.tsx`
- Test: `src/features/supervisor/components/__tests__/WorkerList.test.tsx`

**Interfaces:**
- Consumes: `MonitoredWorker` from `@/store/slices/supervisor`; `ActivityOption`, `WorkerActivitySelect` from `./WorkerActivitySelect`; `WorkerAttributesEditor` from `./WorkerAttributesEditor`; `Card` from `@/components/ui/Card`; `useTranslations('supervisor')`.
- Produces:
  - `WorkerCard({ worker: MonitoredWorker; activities: ActivityOption[]; onActivityChange(workerSid: string, activitySid: string): void; onAttributesSave(workerSid: string, attributes: Record<string, unknown>): void })`
  - `WorkerList({ workers: MonitoredWorker[]; activities: ActivityOption[]; onActivityChange; onAttributesSave })` — renders the empty-state message when `workers` is empty.

- [ ] **Step 1: Write the failing test `WorkerCard.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/en.json';
import { WorkerCard } from '../WorkerCard';
import type { MonitoredWorker } from '@/store/slices/supervisor';

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ supervisor: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const worker: MonitoredWorker = {
  sid: 'WK1',
  friendlyName: 'Ada Lovelace',
  activitySid: 'WA0',
  activityName: 'Offline',
  available: false,
  attributes: { role: 'agent' },
};

const activities = [
  { sid: 'WA0', name: 'Offline' },
  { sid: 'WA1', name: 'Available' },
];

describe('WorkerCard', () => {
  it('renders the worker name and activity', () => {
    renderWithIntl(
      <WorkerCard worker={worker} activities={activities} onActivityChange={vi.fn()} onAttributesSave={vi.fn()} />,
    );
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText(/Offline/)).toBeInTheDocument();
  });

  it('forwards activity changes with the worker sid', async () => {
    const onActivityChange = vi.fn();
    renderWithIntl(
      <WorkerCard worker={worker} activities={activities} onActivityChange={onActivityChange} onAttributesSave={vi.fn()} />,
    );
    await userEvent.selectOptions(screen.getByLabelText('Change activity'), 'WA1');
    expect(onActivityChange).toHaveBeenCalledWith('WK1', 'WA1');
  });

  it('forwards attribute saves with the worker sid', async () => {
    const onAttributesSave = vi.fn();
    renderWithIntl(
      <WorkerCard worker={worker} activities={activities} onActivityChange={vi.fn()} onAttributesSave={onAttributesSave} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save attributes' }));
    expect(onAttributesSave).toHaveBeenCalledWith('WK1', { role: 'agent' });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- WorkerCard`
Expected: FAIL — `Cannot find module '../WorkerCard'`.

- [ ] **Step 3: Write `src/features/supervisor/components/WorkerCard.tsx`**

```tsx
'use client';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/Card';
import type { MonitoredWorker } from '@/store/slices/supervisor';
import { WorkerActivitySelect, type ActivityOption } from './WorkerActivitySelect';
import { WorkerAttributesEditor } from './WorkerAttributesEditor';

export function WorkerCard({
  worker,
  activities,
  onActivityChange,
  onAttributesSave,
}: {
  worker: MonitoredWorker;
  activities: ActivityOption[];
  onActivityChange: (workerSid: string, activitySid: string) => void;
  onAttributesSave: (workerSid: string, attributes: Record<string, unknown>) => void;
}) {
  const t = useTranslations('supervisor');
  return (
    <Card className="mb-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-text">{worker.friendlyName}</p>
          <span className={`text-xs ${worker.available ? 'text-success' : 'text-muted'}`}>
            {worker.activityName} · {worker.available ? t('workers.available') : t('workers.unavailable')}
          </span>
        </div>
        <WorkerActivitySelect
          activities={activities}
          currentActivitySid={worker.activitySid}
          onChange={(activitySid) => onActivityChange(worker.sid, activitySid)}
        />
      </div>
      <WorkerAttributesEditor
        attributes={worker.attributes}
        onSave={(attributes) => onAttributesSave(worker.sid, attributes)}
      />
    </Card>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- WorkerCard`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the failing test `WorkerList.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/en.json';
import { WorkerList } from '../WorkerList';
import type { MonitoredWorker } from '@/store/slices/supervisor';

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ supervisor: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const worker = (sid: string, name: string): MonitoredWorker => ({
  sid,
  friendlyName: name,
  activitySid: 'WA0',
  activityName: 'Offline',
  available: false,
  attributes: {},
});

describe('WorkerList', () => {
  it('shows the empty state when there are no workers', () => {
    renderWithIntl(<WorkerList workers={[]} activities={[]} onActivityChange={vi.fn()} onAttributesSave={vi.fn()} />);
    expect(screen.getByText('No workers to display.')).toBeInTheDocument();
  });

  it('renders one card per worker', () => {
    renderWithIntl(
      <WorkerList
        workers={[worker('WK1', 'Ada'), worker('WK2', 'Grace')]}
        activities={[{ sid: 'WA0', name: 'Offline' }]}
        onActivityChange={vi.fn()}
        onAttributesSave={vi.fn()}
      />,
    );
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByText('Grace')).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npm run test:run -- WorkerList`
Expected: FAIL — `Cannot find module '../WorkerList'`.

- [ ] **Step 7: Write `src/features/supervisor/components/WorkerList.tsx`**

```tsx
'use client';
import { useTranslations } from 'next-intl';
import type { MonitoredWorker } from '@/store/slices/supervisor';
import { WorkerCard } from './WorkerCard';
import type { ActivityOption } from './WorkerActivitySelect';

export function WorkerList({
  workers,
  activities,
  onActivityChange,
  onAttributesSave,
}: {
  workers: MonitoredWorker[];
  activities: ActivityOption[];
  onActivityChange: (workerSid: string, activitySid: string) => void;
  onAttributesSave: (workerSid: string, attributes: Record<string, unknown>) => void;
}) {
  const t = useTranslations('supervisor');
  if (workers.length === 0) {
    return <p className="text-sm text-muted">{t('workers.empty')}</p>;
  }
  return (
    <div>
      {workers.map((worker) => (
        <WorkerCard
          key={worker.sid}
          worker={worker}
          activities={activities}
          onActivityChange={onActivityChange}
          onAttributesSave={onAttributesSave}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npm run test:run -- WorkerList`
Expected: PASS (2 tests).

- [ ] **Step 9: Commit**

```bash
git add src/features/supervisor/components/WorkerCard.tsx src/features/supervisor/components/WorkerList.tsx src/features/supervisor/components/__tests__/WorkerCard.test.tsx src/features/supervisor/components/__tests__/WorkerList.test.tsx
git commit -m "feat(supervisor): add worker card + worker list"
```

---

### Task 6: Monitored-task list + monitor/coach/barge controls

**Files:**
- Create: `src/features/supervisor/components/MonitoredTaskList.tsx`
- Create: `src/features/supervisor/components/MonitorControls.tsx`
- Test: `src/features/supervisor/components/__tests__/MonitoredTaskList.test.tsx`
- Test: `src/features/supervisor/components/__tests__/MonitorControls.test.tsx`

**Interfaces:**
- Consumes: `MonitoredTask`, `SupervisorMode` from `@/store/slices/supervisor`; `Button` from `@/components/ui/Button`; `useTranslations('supervisor')`.
- Produces:
  - `MonitoredTaskList({ tasks: MonitoredTask[]; activeTaskSid: string | null; onSelect(taskSid: string): void })` — empty-state when no tasks; each row is a button with `aria-pressed` reflecting selection.
  - `MonitorControls({ disabled?: boolean; activeMode: SupervisorMode | null; onStart(mode: SupervisorMode): void; onStop(): void })` — Monitor/Coach/Barge buttons (active one uses `variant="primary"`, `aria-pressed`) plus a Stop button (disabled when `activeMode` is null).

- [ ] **Step 1: Write the failing test `MonitoredTaskList.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/en.json';
import { MonitoredTaskList } from '../MonitoredTaskList';
import type { MonitoredTask } from '@/store/slices/supervisor';

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ supervisor: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const task: MonitoredTask = {
  taskSid: 'WT1',
  workerSid: 'WK1',
  workerName: 'Ada',
  queueName: 'Sales',
  channelType: 'voice',
};

describe('MonitoredTaskList', () => {
  it('shows the empty state when there are no tasks', () => {
    renderWithIntl(<MonitoredTaskList tasks={[]} activeTaskSid={null} onSelect={vi.fn()} />);
    expect(screen.getByText('No live tasks to monitor.')).toBeInTheDocument();
  });

  it('marks the active task as pressed and fires onSelect', async () => {
    const onSelect = vi.fn();
    renderWithIntl(<MonitoredTaskList tasks={[task]} activeTaskSid="WT1" onSelect={onSelect} />);
    const button = screen.getByRole('button', { name: /Ada/ });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(button);
    expect(onSelect).toHaveBeenCalledWith('WT1');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- MonitoredTaskList`
Expected: FAIL — `Cannot find module '../MonitoredTaskList'`.

- [ ] **Step 3: Write `src/features/supervisor/components/MonitoredTaskList.tsx`**

```tsx
'use client';
import { useTranslations } from 'next-intl';
import type { MonitoredTask } from '@/store/slices/supervisor';

export function MonitoredTaskList({
  tasks,
  activeTaskSid,
  onSelect,
}: {
  tasks: MonitoredTask[];
  activeTaskSid: string | null;
  onSelect: (taskSid: string) => void;
}) {
  const t = useTranslations('supervisor');
  if (tasks.length === 0) {
    return <p className="text-sm text-muted">{t('tasks.empty')}</p>;
  }
  return (
    <ul className="space-y-1">
      {tasks.map((task) => {
        const active = activeTaskSid === task.taskSid;
        return (
          <li key={task.taskSid}>
            <button
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(task.taskSid)}
              className={`w-full rounded-md border border-border px-3 py-2 text-left text-sm ${
                active ? 'bg-surface-2 text-text' : 'bg-surface text-text hover:bg-surface-2'
              }`}
            >
              <span className="font-medium">{task.workerName}</span>
              <span className="ml-2 text-xs text-muted">
                {t('tasks.queue')}: {task.queueName}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- MonitoredTaskList`
Expected: PASS (2 tests).

- [ ] **Step 5: Write the failing test `MonitorControls.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/en.json';
import { MonitorControls } from '../MonitorControls';

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ supervisor: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe('MonitorControls', () => {
  it('fires onStart with the chosen mode', async () => {
    const onStart = vi.fn();
    renderWithIntl(<MonitorControls activeMode={null} onStart={onStart} onStop={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Coach' }));
    expect(onStart).toHaveBeenCalledWith('coach');
  });

  it('marks the active mode as pressed', () => {
    renderWithIntl(<MonitorControls activeMode="barge" onStart={vi.fn()} onStop={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Barge' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('disables Stop when no mode is active and fires onStop otherwise', async () => {
    const onStop = vi.fn();
    const { rerender } = renderWithIntl(
      <MonitorControls activeMode={null} onStart={vi.fn()} onStop={onStop} />,
    );
    expect(screen.getByRole('button', { name: 'Stop' })).toBeDisabled();

    rerender(
      <NextIntlClientProvider locale="en" messages={{ supervisor: messages }}>
        <MonitorControls activeMode="monitor" onStart={vi.fn()} onStop={onStop} />
      </NextIntlClientProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(onStop).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npm run test:run -- MonitorControls`
Expected: FAIL — `Cannot find module '../MonitorControls'`.

- [ ] **Step 7: Write `src/features/supervisor/components/MonitorControls.tsx`**

```tsx
'use client';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import type { SupervisorMode } from '@/store/slices/supervisor';

const MODES: SupervisorMode[] = ['monitor', 'coach', 'barge'];

export function MonitorControls({
  disabled = false,
  activeMode,
  onStart,
  onStop,
}: {
  disabled?: boolean;
  activeMode: SupervisorMode | null;
  onStart: (mode: SupervisorMode) => void;
  onStop: () => void;
}) {
  const t = useTranslations('supervisor');
  return (
    <div className="flex flex-wrap gap-2">
      {MODES.map((mode) => (
        <Button
          key={mode}
          variant={activeMode === mode ? 'primary' : 'secondary'}
          aria-pressed={activeMode === mode}
          disabled={disabled}
          onClick={() => onStart(mode)}
        >
          {t(`controls.${mode}`)}
        </Button>
      ))}
      <Button variant="danger" disabled={disabled || activeMode === null} onClick={onStop}>
        {t('controls.stop')}
      </Button>
    </div>
  );
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npm run test:run -- MonitorControls`
Expected: PASS (3 tests).

- [ ] **Step 9: Commit**

```bash
git add src/features/supervisor/components/MonitoredTaskList.tsx src/features/supervisor/components/MonitorControls.tsx src/features/supervisor/components/__tests__/MonitoredTaskList.test.tsx src/features/supervisor/components/__tests__/MonitorControls.test.tsx
git commit -m "feat(supervisor): add monitored-task list + monitor/coach/barge controls"
```

---

### Task 7: SupervisorPanel (composition) + verification

**Files:**
- Create: `src/features/supervisor/components/SupervisorPanel.tsx`
- Create: `src/features/supervisor/index.ts`
- Test: `src/features/supervisor/components/__tests__/SupervisorPanel.test.tsx`

**Interfaces:**
- Consumes: `useSupervisor` from `../hooks/useSupervisor`; `WorkerList`, `MonitoredTaskList`, `MonitorControls`; `ActivityOption` from `./WorkerActivitySelect`; `Card` from `@/components/ui/Card`; `useTranslations('supervisor')`.
- Produces:
  - `SupervisorPanel({ activities?: ActivityOption[] })` — renders the live-tasks card (list + controls when a task is active), the workers card, and an inline `role="alert"` when `supervisorError` is set. Selecting a task starts `monitor` mode; the controls switch modes / stop.
  - `src/features/supervisor/index.ts` re-exports `SupervisorPanel` and `useSupervisor` as the feature's public surface.

- [ ] **Step 1: Write the failing test `SupervisorPanel.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/en.json';
import { SupervisorPanel } from '../SupervisorPanel';

const { hook } = vi.hoisted(() => ({
  hook: {
    workers: [] as unknown[],
    monitoredTasks: [] as unknown[],
    activeMonitorTaskSid: null as string | null,
    monitorMode: null as string | null,
    supervisorError: null as string | null,
    startMode: vi.fn(),
    stopMonitoring: vi.fn(),
    changeWorkerActivity: vi.fn(),
    updateWorkerAttributes: vi.fn(),
  },
}));

vi.mock('../../hooks/useSupervisor', () => ({ useSupervisor: () => hook }));

function renderPanel() {
  return render(
    <NextIntlClientProvider locale="en" messages={{ supervisor: messages }}>
      <SupervisorPanel activities={[{ sid: 'WA0', name: 'Offline' }]} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  hook.workers = [];
  hook.monitoredTasks = [];
  hook.activeMonitorTaskSid = null;
  hook.monitorMode = null;
  hook.supervisorError = null;
});

describe('SupervisorPanel', () => {
  it('renders the section heading and empty states', () => {
    renderPanel();
    expect(screen.getByRole('heading', { name: 'Supervisor' })).toBeInTheDocument();
    expect(screen.getByText('No live tasks to monitor.')).toBeInTheDocument();
    expect(screen.getByText('No workers to display.')).toBeInTheDocument();
  });

  it('shows the error alert when supervisorError is set', () => {
    hook.supervisorError = 'boom';
    renderPanel();
    expect(screen.getByRole('alert')).toHaveTextContent('boom');
  });

  it('starts monitor mode when a task is selected', async () => {
    hook.monitoredTasks = [
      { taskSid: 'WT1', workerSid: 'WK1', workerName: 'Ada', queueName: 'Sales', channelType: 'voice' },
    ];
    renderPanel();
    await userEvent.click(screen.getByRole('button', { name: /Ada/ }));
    expect(hook.startMode).toHaveBeenCalledWith('WT1', 'monitor');
  });

  it('renders monitor controls for the active task and switches to coach', async () => {
    hook.monitoredTasks = [
      { taskSid: 'WT1', workerSid: 'WK1', workerName: 'Ada', queueName: 'Sales', channelType: 'voice' },
    ];
    hook.activeMonitorTaskSid = 'WT1';
    hook.monitorMode = 'monitor';
    renderPanel();
    await userEvent.click(screen.getByRole('button', { name: 'Coach' }));
    expect(hook.startMode).toHaveBeenCalledWith('WT1', 'coach');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- SupervisorPanel`
Expected: FAIL — `Cannot find module '../SupervisorPanel'`.

- [ ] **Step 3: Write `src/features/supervisor/components/SupervisorPanel.tsx`**

```tsx
'use client';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/Card';
import { useSupervisor } from '../hooks/useSupervisor';
import type { ActivityOption } from './WorkerActivitySelect';
import { WorkerList } from './WorkerList';
import { MonitoredTaskList } from './MonitoredTaskList';
import { MonitorControls } from './MonitorControls';

export function SupervisorPanel({ activities = [] }: { activities?: ActivityOption[] }) {
  const t = useTranslations('supervisor');
  const {
    workers,
    monitoredTasks,
    activeMonitorTaskSid,
    monitorMode,
    supervisorError,
    startMode,
    stopMonitoring,
    changeWorkerActivity,
    updateWorkerAttributes,
  } = useSupervisor();

  return (
    <section aria-label={t('title')} className="space-y-4 p-4">
      <h2 className="font-display text-xl font-bold text-text">{t('title')}</h2>
      {supervisorError ? (
        <p role="alert" className="text-sm text-danger">
          {supervisorError}
        </p>
      ) : null}

      <Card>
        <h3 className="mb-2 font-semibold text-text">{t('tasks.heading')}</h3>
        <MonitoredTaskList
          tasks={monitoredTasks}
          activeTaskSid={activeMonitorTaskSid}
          onSelect={(taskSid) => startMode(taskSid, 'monitor')}
        />
        {activeMonitorTaskSid ? (
          <div className="mt-3">
            <MonitorControls
              activeMode={monitorMode}
              onStart={(mode) => startMode(activeMonitorTaskSid, mode)}
              onStop={stopMonitoring}
            />
          </div>
        ) : null}
      </Card>

      <Card>
        <h3 className="mb-2 font-semibold text-text">{t('workers.heading')}</h3>
        <WorkerList
          workers={workers}
          activities={activities}
          onActivityChange={changeWorkerActivity}
          onAttributesSave={updateWorkerAttributes}
        />
      </Card>
    </section>
  );
}
```

- [ ] **Step 4: Write `src/features/supervisor/index.ts`**

```ts
export { SupervisorPanel } from './components/SupervisorPanel';
export { useSupervisor } from './hooks/useSupervisor';
export type { ActivityOption } from './components/WorkerActivitySelect';
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test:run -- SupervisorPanel`
Expected: PASS (4 tests).

- [ ] **Step 6: Run the full Part-7 suite + lint + type-check**

Run: `npm run test:run -- supervisor Supervisor Worker Monitor && npm run lint && npx tsc --noEmit`
Expected: all Part-7 tests pass; lint clean; type-check exits 0 with no errors.

- [ ] **Step 7: Commit**

```bash
git add src/features/supervisor/components/SupervisorPanel.tsx src/features/supervisor/index.ts src/features/supervisor/components/__tests__/SupervisorPanel.test.tsx
git commit -m "feat(supervisor): add SupervisorPanel composing monitoring + worker management"
```

#### Integration hooks (for the coordinator — do NOT edit these shared files in this part)

1. **i18n message loader** (Part 2 next-intl request config, e.g. `src/i18n/request.ts` or `i18n.ts`): merge the supervisor namespace so `useTranslations('supervisor')` resolves at runtime. Exact lines:

```ts
import supervisorEn from '@/features/supervisor/messages/en.json';
// inside the returned config, under `messages`:
//   messages: { ...otherNamespaces, supervisor: supervisorEn },
```
(Add a matching import per additional locale as those message files are created.)

2. **Desktop mount** (the shared agent-desktop shell, e.g. `src/app/agent-desktop/...` or a desktop layout component): render the panel. Because it touches the SDK, keep it behind the existing client-only boundary. Exact lines:

```tsx
import { SupervisorPanel } from '@/features/supervisor';
// pass the presence activities so supervisors can reassign them:
//   <SupervisorPanel activities={activityOptions} />
// where `activityOptions` is derived from the Part-4 presence slice
// (map each activity to { sid, name }); omit the prop to render workers read-only.
```

3. **Store wiring:** apply Task 2's Integration hooks in `@/store/index.ts` (slice import, `FlexStore` type intersection, spread into `create`). Without this, `useSupervisor`/`SupervisorPanel` will read `undefined` state at runtime.

4. **Optional live data:** in the Part-3 event bridge (`@/lib/flex/events.ts`), call `useFlexStore.getState().setWorkers(...)` / `.upsertWorker(...)` / `.setMonitoredTasks(...)` when worker and task events arrive, so the panel reflects live TaskRouter state.

---

## Self-Review

**1. Spec coverage (Part 7 slice):**
- `MonitorCall` / `CoachCall` / `BargeCall` (silent listen / whisper / join) via `@twilio/flex-sdk/actions/Voice` → Task 1 wrappers `monitorCall`/`coachCall`/`bargeCall`; hook `startMode`; UI `MonitorControls` (T6) + `SupervisorPanel` (T7). ✓
- `SetWorkerActivity` / `SetWorkerAttributes` on OTHER workers via `@twilio/flex-sdk/actions/Supervisor` → Task 1 wrappers `setWorkerActivity`/`setWorkerAttributes`; hook `changeWorkerActivity`/`updateWorkerAttributes`; UI `WorkerActivitySelect` + `WorkerAttributesEditor` (T4) → `WorkerCard`/`WorkerList` (T5). ✓
- SupervisorPanel: worker list + activity, monitored-tasks view, monitor/coach/barge controls → T7 composition. ✓
- File ownership honored: creates only under `src/features/supervisor/**`, `src/lib/flex/actions/Supervisor.ts`, `src/store/slices/supervisor.ts`. Part 5's `Voice.ts` and `@/store/index.ts` are untouched; all shared wiring is in **Integration hooks** (T2 store; T7 i18n/mount/store/events). ✓
- Consumes-only from Parts 1–3: `getFlexClient`, `normalizeFlexError`, `useFlexStore`, `Button`/`Card`, `useTranslations`, `create<Name>Slice` convention. ✓
- Test mocking convention applied: `@twilio/flex-sdk/actions/Supervisor`, `@twilio/flex-sdk/actions/Voice`, `@/lib/flex/client` mocked in the wrapper test (T1); `@/store` and the hook isolated with focused mocks in T3/T7. ✓

**2. Placeholder scan:** No TBD/TODO/"handle edge cases"/"similar to". Every code step contains full code; every command lists expected output. ✓

**3. Type consistency:**
- `SupervisorMode = 'monitor' | 'coach' | 'barge'` is defined once (slice, T2) and imported by the hook (T3) and `MonitorControls` (T6). ✓
- `MonitoredWorker` / `MonitoredTask` shapes defined in T2 are the exact shapes used in T5/T6/T7 tests and props. ✓
- `ActivityOption` defined once in `WorkerActivitySelect.tsx` (T4), imported by `WorkerCard`/`WorkerList` (T5), `SupervisorPanel` (T7), and re-exported from `index.ts` (T7). ✓
- Wrapper signatures (`monitorCall(taskSid)`, `setWorkerActivity(workerSid, activitySid, rejectPendingReservations?)`, `setWorkerAttributes(workerSid, attributes)`) in T1 match the mock factory and the hook call sites in T3. ✓
- Store methods (`setActiveMonitor(taskSid, mode)`, `setSupervisorError`, `upsertWorker`, `setWorkers`, `setMonitoredTasks`) used by the hook (T3) and event-bridge Integration hook match their definitions in T2. ✓
- i18n keys used in components (`workers.*`, `tasks.*`, `controls.monitor|coach|barge|stop`, `title`) all exist in `en.json` (T3). ✓

**Notes for executor:**
- `getFlexClient()` return value is intentionally unused in wrappers — it exists to assert client readiness and to give `vi.mock('@/lib/flex/client')` something to observe.
- In `WorkerAttributesEditor.test.tsx`, `{{` in `userEvent.type` is the escaped literal `{` (curly braces are user-event control characters) — the resulting typed text is valid JSON.
- If the codebase's slice convention is `StateCreator<FlexStore, [], [], SupervisorSlice>`, re-annotate `createSupervisorSlice` accordingly and drop the `set as ...` cast noted in the Task 2 Integration hooks.
