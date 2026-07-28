# Icon Rail + Tabbed Call/Notes/Info Workspace + Queue Stats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adopt the `flex-template-builder` reference UX — an extreme-left icon rail (Agent Desktop / Teams / Dialpad / Queues Stats) plus a tabbed **Call / Notes / Info** task workspace — in this project's conventions, and add a real TaskRouter REST Queue Stats backend that boots stub-ready when creds are absent.

**Architecture:** A new local view-state (`'desktop' | 'teams' | 'queues'`) lives in `AgentDesktopShell`; a new `IconRail` on the far left switches it and opens the existing `OutboundDialer` modal. The middle column becomes a tabbed workspace built on a new accessible `Tabs` primitive: voice tasks show **Call** (hosting the existing rich `CallPanel` / incoming / wrap-up states) · **Notes** · **Info**; chat tasks show **Conversation** · **Notes** · **Info**. Notes persist to task attributes via `SetTaskAttributes`. Queue Stats is the one external piece: a Node route hitting TaskRouter REST, gated on server creds, polled by a client hook.

**Tech Stack:** Next.js 15 (App Router) · React 19 · TypeScript (strict) · Zustand · next-intl · Tailwind (semantic brand tokens) · `@twilio/flex-sdk` 4.1.0 (browser-only) · `twilio` node SDK v6 (server, REST) · lucide-react icons · Vitest + Testing Library.

## Global Constraints

- **SDK is browser-only.** All `@twilio/flex-sdk` code sits behind `'use client'` and never imports into a Server Component or route handler. The Queue Stats route uses the `twilio` **node** SDK (REST), not `@twilio/flex-sdk`.
- **SDK boundary intact.** New SDK capabilities go through a wrapper in `src/lib/flex/actions/` or `src/lib/flex/workspace.ts` → (if event-driven) `events.ts` → slice → feature hook → component. Feature code never `new`s SDK Actions directly.
- **No hardcoded user-facing strings.** `react/jsx-no-literals` is error-level. Every visible string is a next-intl key via `useTranslations('<namespace>')`. Only glyphs/separators are allowlisted.
- **i18n auto-discovery.** Feature catalogs live at `src/features/<feature>/messages/<locale>.json` (namespace = feature folder name); core catalogs at `src/i18n/messages/<locale>/<namespace>.json`. No loader edits. `en` complete; `es` is a partial stub (core only) — new feature strings are English-only for now.
- **Theming via semantic tokens only** — `bg-bg` / `bg-surface` / `bg-surface-2` / `text` / `text-muted` / `border` / `text-primary` / `bg-primary` / `bg-danger` / `bg-success` / `bg-warning` / `text-warning` and the `red`/`blue`/`neutral` scales. Never raw hex. (Reference uses `flex-*` tokens — translate every one to ours.)
- **TDD.** Failing test first, then minimal implementation. Tests live in `__tests__/` beside the code.
- **Definition of done (every task ends green):** `npm run test:run`, `tsc --noEmit`, `npm run lint`, `npm run build` all clean.
- **Not building:** the reference's **Flex SDK Explorer** (dev playground) and its right-column CRM **InfoPanel** (excluded — our `CrmPanel` stays).

## Token translation table (reference `flex-*` → ours)

| Reference | Ours |
|---|---|
| `bg-flex-bg` | `bg-bg` |
| `bg-flex-bg2` | `bg-surface` |
| `bg-flex-bg3` | `bg-surface-2` |
| `border-flex-border` | `border-border` |
| `text-flex-text` | `text-text` |
| `text-flex-text2` | `text-text` (or `text-muted` for secondary) |
| `text-flex-muted` | `text-muted` |
| `text-flex-accent` / `bg-flex-accent` | `text-primary` / `bg-primary` |
| `text-flex-red` / `bg-flex-red` | `text-danger` / `bg-danger` |
| `text-flex-green` / `bg-flex-green` | `text-success` / `bg-success` |
| `text-flex-yellow` / `text-flex-orange` | `text-warning` / `bg-warning` |

---

## File Structure

**New files**
- `src/components/ui/Tabs.tsx` — accessible tablist primitive (`role="tablist"`/`tab`/`tabpanel`). One responsibility: tab switching + ARIA.
- `src/components/ui/__tests__/Tabs.test.tsx`
- `src/components/layout/IconRail.tsx` — the far-left 56px→220px rail; emits view changes + a dialpad callback.
- `src/components/layout/__tests__/IconRail.test.tsx`
- `src/features/tasks/components/TaskAttributesView.tsx` — the **Info** tab: readable key/value render of `task.attributes`.
- `src/features/tasks/components/__tests__/TaskAttributesView.test.tsx`
- `src/features/tasks/components/NotesTab.tsx` — the **Notes** tab: debounced-persisted textarea (`agentNotes` attribute).
- `src/features/tasks/components/__tests__/NotesTab.test.tsx`
- `src/features/tasks/components/WrapUpForm.tsx` — disposition + notes → `complete`, used in the wrapping state.
- `src/features/tasks/components/__tests__/WrapUpForm.test.tsx`
- `src/features/session/components/TaskWorkspace.tsx` — the tabbed header/Call/Notes/Info shell (replaces `SelectedTaskDetail`'s body role).
- `src/features/session/components/__tests__/TaskWorkspace.test.tsx`
- `src/app/api/queue-stats/route.ts` — TaskRouter REST stats; `{ configured: false }` when creds absent.
- `src/app/api/queue-stats/__tests__/route.test.ts`
- `src/features/queues/hooks/useQueueStats.ts` — polling hook (30s) over `/api/queue-stats`.
- `src/features/queues/hooks/__tests__/useQueueStats.test.ts`
- `src/features/queues/components/QueuesView.tsx` — the metrics table / unconfigured placeholder.
- `src/features/queues/components/__tests__/QueuesView.test.tsx`
- `src/features/queues/messages/en.json` — `queues` namespace.
- `src/features/queues/index.ts` — barrel export.

**Modified files**
- `src/features/session/components/SelectedTaskDetail.tsx` — delegates to `TaskWorkspace` (keeps the accept/wrap-up state routing).
- `src/features/session/components/AgentDesktopShell.tsx` — mount `IconRail`, add view state, dedupe Teams+Dialpad out of the header, render `QueuesView`/`SupervisorPanel` per view.
- `src/features/session/components/__tests__/AgentDesktopShell.test.tsx` — updated for rail + view switching + header dedupe.
- `src/features/session/messages/en.json` — add `rail.*`, `workspace.*` keys.
- `src/features/tasks/messages/en.json` — add `notes.*`, `info.*`, `wrapUp.*` keys.
- `.env.example` — document `TWILIO_WORKSPACE_SID` for queue stats (if the file exists; otherwise skip).

---

## Task 1: `Tabs` UI primitive

**Files:**
- Create: `src/components/ui/Tabs.tsx`
- Test: `src/components/ui/__tests__/Tabs.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  export interface TabItem { id: string; label: string }
  export interface TabsProps {
    tabs: TabItem[];
    activeId: string;
    onChange: (id: string) => void;
    'aria-label': string;
    className?: string;
  }
  export function Tabs(props: TabsProps): JSX.Element
  ```
  Controlled component. Renders a `role="tablist"` of `role="tab"` buttons; the active tab has `aria-selected="true"` and a `bg-primary` underline. Does **not** render panels — callers render the active panel themselves (keeps chat conversations mountable/hidden).

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Tabs } from '../Tabs';

const tabs = [
  { id: 'call', label: 'Call' },
  { id: 'notes', label: 'Notes' },
  { id: 'info', label: 'Info' },
];

describe('Tabs', () => {
  it('renders a labelled tablist and marks the active tab selected', () => {
    render(<Tabs tabs={tabs} activeId="notes" onChange={() => {}} aria-label="Task views" />);
    expect(screen.getByRole('tablist', { name: 'Task views' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Notes' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Call' })).toHaveAttribute('aria-selected', 'false');
  });

  it('fires onChange with the tab id when a tab is clicked', async () => {
    const onChange = vi.fn();
    render(<Tabs tabs={tabs} activeId="call" onChange={onChange} aria-label="Task views" />);
    await userEvent.click(screen.getByRole('tab', { name: 'Info' }));
    expect(onChange).toHaveBeenCalledWith('info');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ui/__tests__/Tabs.test.tsx`
Expected: FAIL — `Cannot find module '../Tabs'`.

- [ ] **Step 3: Write minimal implementation**

```tsx
'use client';

export interface TabItem {
  id: string;
  label: string;
}

export interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  'aria-label': string;
  className?: string;
}

/**
 * Controlled, accessible tab strip. Renders only the tab buttons (a
 * `role="tablist"`); the caller renders the active panel. Keeping panels out of
 * this primitive lets callers keep e.g. chat conversations mounted-but-hidden.
 */
export function Tabs({ tabs, activeId, onChange, className, ...aria }: TabsProps) {
  return (
    <div
      role="tablist"
      aria-label={aria['aria-label']}
      className={`flex border-b border-border ${className ?? ''}`}
    >
      {tabs.map((tab) => {
        const selected = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              selected ? 'text-primary' : 'text-muted hover:text-text'
            }`}
          >
            {tab.label}
            {selected && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ui/__tests__/Tabs.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Tabs.tsx src/components/ui/__tests__/Tabs.test.tsx
git commit -m "feat(ui): add accessible Tabs primitive"
```

---

## Task 2: `TaskAttributesView` (the Info tab)

**Files:**
- Create: `src/features/tasks/components/TaskAttributesView.tsx`
- Test: `src/features/tasks/components/__tests__/TaskAttributesView.test.tsx`
- Modify: `src/features/tasks/messages/en.json` (add `info.*`)

**Interfaces:**
- Consumes: `TaskView['attributes']` (`Record<string, unknown>`).
- Produces:
  ```ts
  export function TaskAttributesView(props: { attributes: Record<string, unknown> }): JSX.Element
  ```
  Renders each top-level attribute as a key row with its value; objects/arrays are JSON-stringified in a `<pre>`. Empty attributes → a translated empty message.

- [ ] **Step 1: Add i18n keys**

In `src/features/tasks/messages/en.json`, add a top-level `"info"` block (place after the existing `"channel"` block):

```json
  "info": {
    "empty": "No task attributes"
  },
```

- [ ] **Step 2: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '@/features/tasks/messages/en.json';
import { TaskAttributesView } from '../TaskAttributesView';

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ tasks: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe('TaskAttributesView', () => {
  it('renders scalar attributes as key/value rows', () => {
    renderWithIntl(<TaskAttributesView attributes={{ from: '+15551234567', name: 'Ada' }} />);
    expect(screen.getByText('from')).toBeInTheDocument();
    expect(screen.getByText('+15551234567')).toBeInTheDocument();
    expect(screen.getByText('name')).toBeInTheDocument();
    expect(screen.getByText('Ada')).toBeInTheDocument();
  });

  it('JSON-stringifies nested objects', () => {
    renderWithIntl(<TaskAttributesView attributes={{ conversations: { channel: 'sms' } }} />);
    expect(screen.getByText(/"channel": "sms"/)).toBeInTheDocument();
  });

  it('shows the empty message when there are no attributes', () => {
    renderWithIntl(<TaskAttributesView attributes={{}} />);
    expect(screen.getByText('No task attributes')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/features/tasks/components/__tests__/TaskAttributesView.test.tsx`
Expected: FAIL — `Cannot find module '../TaskAttributesView'`.

- [ ] **Step 4: Write minimal implementation**

```tsx
'use client';

import { useTranslations } from 'next-intl';

/** Readable render of a task's attributes — the "Info" tab. */
export function TaskAttributesView({ attributes }: { attributes: Record<string, unknown> }) {
  const t = useTranslations('tasks');
  const entries = Object.entries(attributes ?? {});

  if (entries.length === 0) {
    return <p className="p-4 text-sm text-muted">{t('info.empty')}</p>;
  }

  return (
    <dl className="divide-y divide-border">
      {entries.map(([key, value]) => {
        const isScalar = value === null || typeof value !== 'object';
        return (
          <div key={key} className="px-4 py-2.5">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">{key}</dt>
            <dd className="mt-0.5 text-sm text-text">
              {isScalar ? (
                String(value)
              ) : (
                <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs">
                  {JSON.stringify(value, null, 2)}
                </pre>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/features/tasks/components/__tests__/TaskAttributesView.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/features/tasks/components/TaskAttributesView.tsx \
        src/features/tasks/components/__tests__/TaskAttributesView.test.tsx \
        src/features/tasks/messages/en.json
git commit -m "feat(tasks): add TaskAttributesView for the Info tab"
```

---

## Task 3: `NotesTab` (persisted agent notes)

**Files:**
- Create: `src/features/tasks/components/NotesTab.tsx`
- Test: `src/features/tasks/components/__tests__/NotesTab.test.tsx`
- Modify: `src/features/tasks/messages/en.json` (add `notes.*`)

**Interfaces:**
- Consumes: `useTasks().setAttributes(taskSid, attributes)` (from `src/features/tasks/hooks/useTasks.ts`), and the task's existing `attributes` (to rehydrate `attributes.agentNotes`).
- Produces:
  ```ts
  export function NotesTab(props: {
    taskSid: string;
    initialNotes?: string;
    /** Injectable for tests; defaults to useTasks().setAttributes. */
    onPersist?: (taskSid: string, attributes: Record<string, unknown>) => Promise<void>;
  }): JSX.Element
  ```
  A textarea seeded from `initialNotes`. On change, debounces 600ms then persists `{ agentNotes: value }` via `SetTaskAttributes` (merged server-side). Notes survive tab/task switches because they live in task attributes.

**Note on `SetTaskAttributes` merge semantics:** `setTaskAttributes(taskSid, attributes)` wraps `SetTaskAttributes`, which **replaces** the attributes object. To avoid clobbering sibling attributes, the caller (`TaskWorkspace`, Task 5) passes the full merged object. `NotesTab` itself only persists `{ ...restAttributes, agentNotes }` — so it receives the current attributes too.

Revised interface (final — used by later tasks):
```ts
export function NotesTab(props: {
  taskSid: string;
  attributes: Record<string, unknown>;   // current task attributes (for merge + rehydrate)
  onPersist?: (taskSid: string, attributes: Record<string, unknown>) => Promise<void>;
}): JSX.Element
```

- [ ] **Step 1: Add i18n keys**

In `src/features/tasks/messages/en.json`, add a top-level `"notes"` block:

```json
  "notes": {
    "label": "Notes",
    "placeholder": "Add notes about this task…",
    "saved": "Saved"
  },
```

- [ ] **Step 2: Write the failing test**

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '@/features/tasks/messages/en.json';
import { NotesTab } from '../NotesTab';

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ tasks: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe('NotesTab', () => {
  it('rehydrates existing notes from attributes', () => {
    renderWithIntl(
      <NotesTab taskSid="WT1" attributes={{ agentNotes: 'prior note' }} onPersist={vi.fn()} />,
    );
    expect(screen.getByRole('textbox')).toHaveValue('prior note');
  });

  it('persists merged attributes (debounced) after typing', async () => {
    const onPersist = vi.fn().mockResolvedValue(undefined);
    renderWithIntl(
      <NotesTab taskSid="WT1" attributes={{ from: '+1555', agentNotes: '' }} onPersist={onPersist} />,
    );
    await userEvent.type(screen.getByRole('textbox'), 'hello');
    await waitFor(() => expect(onPersist).toHaveBeenCalled(), { timeout: 2000 });
    expect(onPersist).toHaveBeenLastCalledWith('WT1', { from: '+1555', agentNotes: 'hello' });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/features/tasks/components/__tests__/NotesTab.test.tsx`
Expected: FAIL — `Cannot find module '../NotesTab'`.

- [ ] **Step 4: Write minimal implementation**

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useTasks } from '../hooks/useTasks';

const DEBOUNCE_MS = 600;

/**
 * The "Notes" tab. Persists agent notes into the task's attributes under
 * `agentNotes` via SetTaskAttributes (debounced), merged with the current
 * attributes so siblings aren't clobbered. Because notes live in task
 * attributes they survive tab/task switches and are available at wrap-up.
 */
export function NotesTab({
  taskSid,
  attributes,
  onPersist,
}: {
  taskSid: string;
  attributes: Record<string, unknown>;
  onPersist?: (taskSid: string, attributes: Record<string, unknown>) => Promise<void>;
}) {
  const t = useTranslations('tasks');
  const { setAttributes } = useTasks();
  const persist = onPersist ?? setAttributes;
  const [value, setValue] = useState(
    typeof attributes.agentNotes === 'string' ? (attributes.agentNotes as string) : '',
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const onChange = (next: string) => {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void persist(taskSid, { ...attributes, agentNotes: next });
    }, DEBOUNCE_MS);
  };

  return (
    <div className="p-4">
      <label className="sr-only" htmlFor={`notes-${taskSid}`}>
        {t('notes.label')}
      </label>
      <textarea
        id={`notes-${taskSid}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('notes.placeholder')}
        className="min-h-[200px] w-full resize-none rounded-md border border-border bg-surface p-3 text-sm text-text outline-none placeholder:text-muted focus:border-primary"
      />
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/features/tasks/components/__tests__/NotesTab.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/features/tasks/components/NotesTab.tsx \
        src/features/tasks/components/__tests__/NotesTab.test.tsx \
        src/features/tasks/messages/en.json
git commit -m "feat(tasks): add NotesTab persisting agentNotes to task attributes"
```

---

## Task 4: `WrapUpForm`

**Files:**
- Create: `src/features/tasks/components/WrapUpForm.tsx`
- Test: `src/features/tasks/components/__tests__/WrapUpForm.test.tsx`
- Modify: `src/features/tasks/messages/en.json` (add `wrapUp.*`)

**Interfaces:**
- Produces:
  ```ts
  export interface WrapUpValues { disposition: string; notes: string }
  export function WrapUpForm(props: {
    onComplete: (values: WrapUpValues) => void | Promise<void>;
    completing?: boolean;
  }): JSX.Element
  ```
  A disposition `<select>` (resolved/unresolved/callback/other) + a notes `<textarea>` + a **Complete** button. Submitting calls `onComplete({ disposition, notes })`. Button shows a busy label + is disabled while `completing`.

- [ ] **Step 1: Add i18n keys**

In `src/features/tasks/messages/en.json`, add a top-level `"wrapUp"` block:

```json
  "wrapUpForm": {
    "title": "Wrap up",
    "dispositionLabel": "Disposition",
    "notesLabel": "Wrap-up notes",
    "notesPlaceholder": "Summarize the outcome…",
    "complete": "Complete",
    "completing": "Completing…",
    "disposition": {
      "resolved": "Resolved",
      "unresolved": "Unresolved",
      "callback": "Callback scheduled",
      "other": "Other"
    }
  },
```

- [ ] **Step 2: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '@/features/tasks/messages/en.json';
import { WrapUpForm } from '../WrapUpForm';

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ tasks: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe('WrapUpForm', () => {
  it('submits the chosen disposition and notes', async () => {
    const onComplete = vi.fn();
    renderWithIntl(<WrapUpForm onComplete={onComplete} />);
    await userEvent.selectOptions(screen.getByLabelText('Disposition'), 'callback');
    await userEvent.type(screen.getByLabelText('Wrap-up notes'), 'will call back');
    await userEvent.click(screen.getByRole('button', { name: 'Complete' }));
    expect(onComplete).toHaveBeenCalledWith({ disposition: 'callback', notes: 'will call back' });
  });

  it('disables the button and shows the busy label while completing', () => {
    renderWithIntl(<WrapUpForm onComplete={vi.fn()} completing />);
    const btn = screen.getByRole('button', { name: 'Completing…' });
    expect(btn).toBeDisabled();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/features/tasks/components/__tests__/WrapUpForm.test.tsx`
Expected: FAIL — `Cannot find module '../WrapUpForm'`.

- [ ] **Step 4: Write minimal implementation**

```tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';

export interface WrapUpValues {
  disposition: string;
  notes: string;
}

const DISPOSITIONS = ['resolved', 'unresolved', 'callback', 'other'] as const;

/** Disposition + notes form shown in a task's wrapping state; calls onComplete. */
export function WrapUpForm({
  onComplete,
  completing = false,
}: {
  onComplete: (values: WrapUpValues) => void | Promise<void>;
  completing?: boolean;
}) {
  const t = useTranslations('tasks');
  const [disposition, setDisposition] = useState<string>('resolved');
  const [notes, setNotes] = useState('');

  return (
    <form
      className="flex w-full flex-col gap-3 px-6"
      onSubmit={(e) => {
        e.preventDefault();
        void onComplete({ disposition, notes });
      }}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="wrapup-disposition" className="text-xs font-medium text-muted">
          {t('wrapUpForm.dispositionLabel')}
        </label>
        <select
          id="wrapup-disposition"
          value={disposition}
          onChange={(e) => setDisposition(e.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary"
        >
          {DISPOSITIONS.map((d) => (
            <option key={d} value={d}>
              {t(`wrapUpForm.disposition.${d}`)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="wrapup-notes" className="text-xs font-medium text-muted">
          {t('wrapUpForm.notesLabel')}
        </label>
        <textarea
          id="wrapup-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('wrapUpForm.notesPlaceholder')}
          className="min-h-[100px] resize-none rounded-md border border-border bg-surface p-3 text-sm text-text outline-none placeholder:text-muted focus:border-primary"
        />
      </div>

      <Button type="submit" disabled={completing}>
        {completing ? t('wrapUpForm.completing') : t('wrapUpForm.complete')}
      </Button>
    </form>
  );
}
```

> **Verified:** `src/components/ui/Button.tsx` extends `ButtonHTMLAttributes<HTMLButtonElement>`, so it already forwards native `type`. No change needed.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/features/tasks/components/__tests__/WrapUpForm.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/features/tasks/components/WrapUpForm.tsx \
        src/features/tasks/components/__tests__/WrapUpForm.test.tsx \
        src/features/tasks/messages/en.json
git commit -m "feat(tasks): add WrapUpForm (disposition + notes -> complete)"
```

---

## Task 5: `TaskWorkspace` — the tabbed Call/Notes/Info shell

**Files:**
- Create: `src/features/session/components/TaskWorkspace.tsx`
- Test: `src/features/session/components/__tests__/TaskWorkspace.test.tsx`
- Modify: `src/features/session/components/SelectedTaskDetail.tsx` (delegate to `TaskWorkspace`)
- Modify: `src/features/session/messages/en.json` (add `workspace.*`)

**Interfaces:**
- Consumes: `Tabs` (Task 1), `TaskAttributesView` (Task 2), `NotesTab` (Task 3), `WrapUpForm` (Task 4); existing `CallPanel` (injected via `callPanel` prop, already wired in the shell), `ConversationTabView` (`{ taskSid, active }`), `IncomingTaskPanel` (`{ task, onAccept, onReject }`), `useTasks()` (`accept`, `reject`, `complete`, `setAttributes`), and the store (`activeTaskSid`, `tasks`, `call`).
- Produces:
  ```ts
  export function TaskWorkspace(props: { callPanel: React.ReactNode }): JSX.Element
  ```
  Header (contact name + status badge) + `Tabs` + active panel. Voice tabs: **Call** / **Notes** / **Info**. Chat tabs: **Conversation** / **Notes** / **Info**. The Call panel body itself is state-driven (pending → `IncomingTaskPanel`; connecting → spinner; live → injected `callPanel`; wrapping → `WrapUpForm`). Chat conversation stays mounted (hidden) when another tab is active.

This replaces the body role of the current `SelectedTaskDetail`. `SelectedTaskDetail` becomes a thin wrapper that renders the no-selection placeholder or `<TaskWorkspace callPanel={callPanel} />`.

- [ ] **Step 1: Add i18n keys**

In `src/features/session/messages/en.json`, add a `"workspace"` block inside the root object (sibling of `"desktop"`):

```json
  "workspace": {
    "tabs": { "call": "Call", "conversation": "Conversation", "notes": "Notes", "info": "Info" },
    "views": "Task views",
    "status": { "incoming": "Incoming", "live": "Live", "wrapping": "Wrap-up", "connecting": "Connecting" }
  },
```

- [ ] **Step 2: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import sessionMessages from '@/features/session/messages/en.json';
import tasksMessages from '@/features/tasks/messages/en.json';
import { useFlexStore } from '@/store';
import { TaskWorkspace } from '../TaskWorkspace';

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider
      locale="en"
      messages={{ session: sessionMessages, tasks: tasksMessages }}
    >
      {ui}
    </NextIntlClientProvider>,
  );
}

describe('TaskWorkspace', () => {
  beforeEach(() => {
    useFlexStore.setState({
      activeTaskSid: 'WT1',
      tasks: [
        {
          reservationSid: 'WR1',
          taskSid: 'WT1',
          taskChannelUniqueName: 'voice',
          attributes: { from: '+15551234567', agentNotes: '' },
          status: 'accepted',
        },
      ],
      call: { status: 'connected', taskSid: 'WT1' } as never,
    });
  });

  it('renders Call/Notes/Info tabs for a voice task and shows the injected call panel', () => {
    renderWithIntl(<TaskWorkspace callPanel={<div data-testid="call-panel" />} />);
    expect(screen.getByRole('tab', { name: 'Call' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Notes' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Info' })).toBeInTheDocument();
    expect(screen.getByTestId('call-panel')).toBeInTheDocument();
  });

  it('switches to the Info tab and renders task attributes', async () => {
    renderWithIntl(<TaskWorkspace callPanel={<div data-testid="call-panel" />} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Info' }));
    expect(screen.getByText('from')).toBeInTheDocument();
    expect(screen.getByText('+15551234567')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/features/session/components/__tests__/TaskWorkspace.test.tsx`
Expected: FAIL — `Cannot find module '../TaskWorkspace'`.

- [ ] **Step 4: Write minimal implementation**

```tsx
'use client';

import { type ReactNode, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader } from 'lucide-react';
import { useFlexStore } from '@/store';
import { Tabs, type TabItem } from '@/components/ui/Tabs';
import { ConversationTabView } from '@/features/conversations';
import { IncomingTaskPanel } from '@/features/tasks/components/IncomingTaskPanel';
import { TaskAttributesView } from '@/features/tasks/components/TaskAttributesView';
import { NotesTab } from '@/features/tasks/components/NotesTab';
import { WrapUpForm, type WrapUpValues } from '@/features/tasks/components/WrapUpForm';
import { useTasks } from '@/features/tasks/hooks/useTasks';
import { resolveTaskContact } from '@/features/tasks/lib/taskContact';

type TabId = 'call' | 'conversation' | 'notes' | 'info';

/**
 * Tabbed middle-column workspace mirroring flex-template-builder: a header
 * (contact + status badge) + Call/Notes/Info (voice) or Conversation/Notes/Info
 * (chat). The live CallPanel is injected (its controls live in the shell).
 */
export function TaskWorkspace({ callPanel }: { callPanel: ReactNode }) {
  const t = useTranslations('session');
  const activeTaskSid = useFlexStore((s) => s.activeTaskSid);
  const tasks = useFlexStore((s) => s.tasks);
  const call = useFlexStore((s) => s.call);
  const { accept, reject, complete, setAttributes } = useTasks();
  const [activeTab, setActiveTab] = useState<TabId>('call');
  const [completing, setCompleting] = useState(false);

  const task = tasks.find((x) => x.taskSid === activeTaskSid);
  const isVoice = task?.taskChannelUniqueName === 'voice';

  const tabs: TabItem[] = useMemo(() => {
    const first: TabItem = isVoice
      ? { id: 'call', label: t('workspace.tabs.call') }
      : { id: 'conversation', label: t('workspace.tabs.conversation') };
    return [
      first,
      { id: 'notes', label: t('workspace.tabs.notes') },
      { id: 'info', label: t('workspace.tabs.info') },
    ];
  }, [isVoice, t]);

  if (!task) return null;

  const { name, phone } = resolveTaskContact(task.attributes);
  const contact = name || phone || task.taskSid;
  const primaryTabId: TabId = isVoice ? 'call' : 'conversation';
  const effectiveTab: TabId = tabs.some((tab) => tab.id === activeTab) ? activeTab : primaryTabId;

  const status =
    task.status === 'pending'
      ? t('workspace.status.incoming')
      : task.status === 'wrapping'
        ? t('workspace.status.wrapping')
        : isVoice && !((call.status === 'connected' || call.status === 'onHold') && call.taskSid === task.taskSid)
          ? t('workspace.status.connecting')
          : t('workspace.status.live');

  const onComplete = async (_values: WrapUpValues) => {
    setCompleting(true);
    try {
      await complete(task.taskSid);
    } catch {
      setCompleting(false);
    }
  };

  const renderPrimary = () => {
    if (task.status === 'pending') {
      return <IncomingTaskPanel task={task} onAccept={accept} onReject={reject} />;
    }
    if (task.status === 'wrapping') {
      return (
        <div className="flex flex-col items-center gap-5 py-8">
          <WrapUpForm onComplete={onComplete} completing={completing} />
        </div>
      );
    }
    if (isVoice) {
      const callActive =
        (call.status === 'connected' || call.status === 'onHold') && call.taskSid === task.taskSid;
      if (callActive) return <>{callPanel}</>;
      return (
        <div className="flex flex-col items-center gap-3 py-10 text-center text-muted">
          <Loader className="h-6 w-6 animate-spin" aria-hidden />
        </div>
      );
    }
    return null; // chat conversation is rendered (kept mounted) below
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-bg">
      <div className="shrink-0 border-b border-border px-6 py-3">
        <h2 className="text-sm font-semibold leading-tight text-text">{contact}</h2>
        <span className="text-xs text-muted">{status}</span>
      </div>

      <Tabs
        tabs={tabs}
        activeId={effectiveTab}
        onChange={(id) => setActiveTab(id as TabId)}
        aria-label={t('workspace.views')}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Chat conversations stay mounted (hidden) so their live handle isn't torn down. */}
        {!isVoice && (
          <ConversationTabView taskSid={task.taskSid} active={effectiveTab === 'conversation'} />
        )}
        {effectiveTab === primaryTabId && isVoice && renderPrimary()}
        {effectiveTab === 'notes' && (
          <NotesTab taskSid={task.taskSid} attributes={task.attributes} onPersist={setAttributes} />
        )}
        {effectiveTab === 'info' && <TaskAttributesView attributes={task.attributes} />}
      </div>
    </div>
  );
}
```

> **Verified:** `resolveTaskContact(attributes) => { name, phone }` lives at `src/features/tasks/lib/taskContact.ts` (used by `IncomingTaskPanel`). Import shown above is correct.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/features/session/components/__tests__/TaskWorkspace.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Point `SelectedTaskDetail` at `TaskWorkspace`**

Replace the body of `src/features/session/components/SelectedTaskDetail.tsx` so it only guards no-selection and delegates:

```tsx
'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Inbox } from 'lucide-react';
import { useFlexStore } from '@/store';
import { Card } from '@/components/ui/Card';
import { TaskWorkspace } from './TaskWorkspace';

/**
 * Middle column entry point: shows the no-selection placeholder, otherwise the
 * tabbed TaskWorkspace. The wired CallPanel is injected from the shell.
 */
export function SelectedTaskDetail({ callPanel }: { callPanel: ReactNode }) {
  const t = useTranslations('session');
  const activeTaskSid = useFlexStore((s) => s.activeTaskSid);
  const tasks = useFlexStore((s) => s.tasks);
  const task = tasks.find((x) => x.taskSid === activeTaskSid);

  if (!task) {
    return (
      <Card className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Inbox className="h-6 w-6" aria-hidden />
        </span>
        <p className="text-muted">{t('desktop.noSelection')}</p>
      </Card>
    );
  }

  return <TaskWorkspace callPanel={callPanel} />;
}
```

- [ ] **Step 7: Run the full session + tasks suites**

Run: `npx vitest run src/features/session src/features/tasks`
Expected: PASS. If `SelectedTaskDetail.test.tsx` exists and asserts the old placeholder text (e.g. `voiceConnecting`), update those assertions to the new tabbed structure (query for the `Call` tab / injected panel) rather than reverting the component.

- [ ] **Step 8: Commit**

```bash
git add src/features/session/components/TaskWorkspace.tsx \
        src/features/session/components/__tests__/TaskWorkspace.test.tsx \
        src/features/session/components/SelectedTaskDetail.tsx \
        src/features/session/messages/en.json
git commit -m "feat(session): tabbed Call/Notes/Info task workspace"
```

---

## Task 6: `IconRail` — the extreme-left navigation rail

**Files:**
- Create: `src/components/layout/IconRail.tsx`
- Test: `src/components/layout/__tests__/IconRail.test.tsx`
- Modify: `src/features/session/messages/en.json` (add `rail.*`)

**Interfaces:**
- Produces:
  ```ts
  export type DesktopView = 'desktop' | 'teams' | 'queues';
  export function IconRail(props: {
    activeView: DesktopView;
    onViewChange: (view: DesktopView) => void;
    onDialpad: () => void;
    showTeams: boolean;   // supervisor gate
  }): JSX.Element
  ```
  56px vertical rail (lucide icons, i18n `title`/`aria-label`). Items: **Agent Desktop** (`Headset` → `desktop`), **Teams** (`Users` → `teams`, rendered only when `showTeams`), **Dialpad** (`Grid3x3` → calls `onDialpad`, does not change view), **Queues Stats** (`Clock` → `queues`). Active view item: `text-primary` + a left accent bar (`bg-primary`) + `bg-surface-2`; `aria-current="page"`.

- [ ] **Step 1: Add i18n keys**

In `src/features/session/messages/en.json`, add a `"rail"` block (sibling of `"desktop"`):

```json
  "rail": {
    "label": "Primary navigation",
    "desktop": "Agent Desktop",
    "teams": "Teams",
    "dialpad": "Dialpad",
    "queues": "Queues Stats"
  },
```

- [ ] **Step 2: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '@/features/session/messages/en.json';
import { IconRail } from '../IconRail';

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ session: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe('IconRail', () => {
  it('marks the active view with aria-current', () => {
    renderWithIntl(
      <IconRail activeView="queues" onViewChange={vi.fn()} onDialpad={vi.fn()} showTeams />,
    );
    expect(screen.getByRole('button', { name: 'Queues Stats' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Agent Desktop' })).not.toHaveAttribute('aria-current');
  });

  it('changes view on click and fires the dialpad callback without changing view', async () => {
    const onViewChange = vi.fn();
    const onDialpad = vi.fn();
    renderWithIntl(
      <IconRail activeView="desktop" onViewChange={onViewChange} onDialpad={onDialpad} showTeams />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Teams' }));
    expect(onViewChange).toHaveBeenCalledWith('teams');
    await userEvent.click(screen.getByRole('button', { name: 'Dialpad' }));
    expect(onDialpad).toHaveBeenCalledOnce();
  });

  it('hides Teams when showTeams is false', () => {
    renderWithIntl(
      <IconRail activeView="desktop" onViewChange={vi.fn()} onDialpad={vi.fn()} showTeams={false} />,
    );
    expect(screen.queryByRole('button', { name: 'Teams' })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/components/layout/__tests__/IconRail.test.tsx`
Expected: FAIL — `Cannot find module '../IconRail'`.

- [ ] **Step 4: Write minimal implementation**

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { Headset, Users, Grid3x3, Clock, type LucideIcon } from 'lucide-react';

export type DesktopView = 'desktop' | 'teams' | 'queues';

interface RailAction {
  key: string;
  labelKey: 'desktop' | 'teams' | 'dialpad' | 'queues';
  Icon: LucideIcon;
  view?: DesktopView; // absent => action button (dialpad)
}

const ACTIONS: RailAction[] = [
  { key: 'desktop', labelKey: 'desktop', Icon: Headset, view: 'desktop' },
  { key: 'teams', labelKey: 'teams', Icon: Users, view: 'teams' },
  { key: 'dialpad', labelKey: 'dialpad', Icon: Grid3x3 },
  { key: 'queues', labelKey: 'queues', Icon: Clock, view: 'queues' },
];

/**
 * Extreme-left icon rail (mirrors flex-template-builder's IconNav). Switches the
 * desktop view; the Dialpad entry opens the outbound modal instead of switching.
 * Teams is supervisor-gated.
 */
export function IconRail({
  activeView,
  onViewChange,
  onDialpad,
  showTeams,
}: {
  activeView: DesktopView;
  onViewChange: (view: DesktopView) => void;
  onDialpad: () => void;
  showTeams: boolean;
}) {
  const t = useTranslations('session');

  return (
    <nav
      aria-label={t('rail.label')}
      className="flex w-14 shrink-0 flex-col border-r border-border bg-surface py-2"
    >
      {ACTIONS.filter((a) => a.key !== 'teams' || showTeams).map(({ key, labelKey, Icon, view }) => {
        const isActive = view !== undefined && view === activeView;
        const label = t(`rail.${labelKey}`);
        return (
          <button
            key={key}
            type="button"
            title={label}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => (view ? onViewChange(view) : onDialpad())}
            className={`relative flex h-11 items-center justify-center transition-colors ${
              isActive
                ? 'bg-surface-2 text-primary'
                : 'text-muted hover:bg-surface-2 hover:text-text'
            }`}
          >
            {isActive && <span className="absolute inset-y-0 left-0 w-0.5 rounded-r bg-primary" />}
            <Icon className="h-5 w-5" aria-hidden />
          </button>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/layout/__tests__/IconRail.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/IconRail.tsx src/components/layout/__tests__/IconRail.test.tsx \
        src/features/session/messages/en.json
git commit -m "feat(layout): add extreme-left IconRail navigation"
```

---

## Task 7: Queue Stats REST route (the one external piece ⚠️)

**Files:**
- Create: `src/app/api/queue-stats/route.ts`
- Test: `src/app/api/queue-stats/__tests__/route.test.ts`
- Modify: `.env.example` (document `TWILIO_WORKSPACE_SID`), if it exists.

**Interfaces:**
- Produces a `GET` handler returning JSON:
  ```ts
  // Unconfigured (no creds): HTTP 200
  { configured: false }
  // Configured: HTTP 200
  {
    configured: true;
    updatedAt: string;                 // ISO
    queues: Array<{
      sid: string; friendlyName: string;
      waiting: number;                 // pending + reserved
      active: number;                  // assigned
      longestWaitAge: number;          // seconds
      availableWorkers: number;
      eligibleWorkers: number;
      avgWaitAccepted: number;         // seconds (30m cumulative)
    }>;
  }
  ```
- Consumes env: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WORKSPACE_SID`. Uses the `twilio` node SDK (`import twilio from 'twilio'`). **Node runtime.** This is the sole component with an external dependency (needs a live Twilio account); it degrades to `{ configured: false }` so the app still boots stub-ready.

**Design notes (mirrors `flex-template-builder`'s route, trimmed to what `QueuesView` renders):** for each `taskQueue`, fetch `.statistics().fetch()` and read `realtime.tasks_by_status` (pending/reserved/assigned), `realtime.longest_task_waiting_age`, `realtime.total_available_workers`, `realtime.total_eligible_workers`, and `cumulative.wait_duration_until_accepted.avg`. One `statistics()` call per queue, run concurrently.

- [ ] **Step 1: Write the failing test**

We inject the Twilio client + env via a small internal factory so the test never hits the network. The route reads creds through a `readQueueEnv()` helper and builds the client through a `makeTaskrouter(env)` helper — both exported for testing.

```ts
import { describe, it, expect, vi } from 'vitest';

// Mock the twilio node SDK before importing the route.
const fetchStats = vi.fn();
const listQueues = vi.fn();

vi.mock('twilio', () => ({
  default: () => ({
    taskrouter: {
      v1: {
        workspaces: () => ({
          taskQueues: Object.assign(() => ({ statistics: () => ({ fetch: fetchStats }) }), {
            list: listQueues,
          }),
        }),
      },
    },
  }),
}));

describe('GET /api/queue-stats', () => {
  it('returns { configured: false } when creds are absent', async () => {
    vi.stubEnv('TWILIO_ACCOUNT_SID', '');
    vi.stubEnv('TWILIO_AUTH_TOKEN', '');
    vi.stubEnv('TWILIO_WORKSPACE_SID', '');
    const { GET } = await import('../route');
    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ configured: false });
    vi.unstubAllEnvs();
  });

  it('projects queue statistics when configured', async () => {
    vi.stubEnv('TWILIO_ACCOUNT_SID', 'AC123');
    vi.stubEnv('TWILIO_AUTH_TOKEN', 'secret');
    vi.stubEnv('TWILIO_WORKSPACE_SID', 'WS123');
    listQueues.mockResolvedValue([{ sid: 'WQ1', friendlyName: 'Support' }]);
    fetchStats.mockResolvedValue({
      realtime: {
        tasks_by_status: { pending: 2, reserved: 1, assigned: 3 },
        longest_task_waiting_age: 42,
        total_available_workers: 5,
        total_eligible_workers: 8,
      },
      cumulative: { wait_duration_until_accepted: { avg: 12 } },
    });
    vi.resetModules();
    const { GET } = await import('../route');
    const res = await GET();
    const body = await res.json();
    expect(body.configured).toBe(true);
    expect(body.queues).toHaveLength(1);
    expect(body.queues[0]).toMatchObject({
      sid: 'WQ1',
      friendlyName: 'Support',
      waiting: 3,
      active: 3,
      longestWaitAge: 42,
      availableWorkers: 5,
      eligibleWorkers: 8,
      avgWaitAccepted: 12,
    });
    vi.unstubAllEnvs();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/queue-stats/__tests__/route.test.ts`
Expected: FAIL — `Cannot find module '../route'`.

- [ ] **Step 3: Write minimal implementation**

```ts
import { NextResponse } from 'next/server';
import twilio from 'twilio';

// Node runtime: uses the twilio REST SDK (server-only). Never import
// @twilio/flex-sdk here — that library is browser-only.
export const runtime = 'nodejs';

interface QueueEnv {
  accountSid: string;
  authToken: string;
  workspaceSid: string;
}

function readQueueEnv(): QueueEnv | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID ?? '';
  const authToken = process.env.TWILIO_AUTH_TOKEN ?? '';
  const workspaceSid = process.env.TWILIO_WORKSPACE_SID ?? '';
  if (!accountSid || !authToken || !workspaceSid) return null;
  return { accountSid, authToken, workspaceSid };
}

export async function GET(): Promise<Response> {
  const env = readQueueEnv();
  if (!env) {
    // Stub-ready: no live creds → the UI shows its "not configured" placeholder.
    return NextResponse.json({ configured: false });
  }

  try {
    const client = twilio(env.accountSid, env.authToken);
    const ws = client.taskrouter.v1.workspaces(env.workspaceSid);
    const queues = await ws.taskQueues.list({ limit: 200 });

    const projected = await Promise.all(
      queues.map(async (q) => {
        try {
          const stats = await ws.taskQueues(q.sid).statistics().fetch();
          // The SDK types statistics loosely; read the documented shape.
          const rt = (stats as { realtime?: Record<string, unknown> }).realtime ?? {};
          const cum = (stats as { cumulative?: Record<string, unknown> }).cumulative ?? {};
          const byStatus = (rt.tasks_by_status as Record<string, number>) ?? {};
          const waitAccepted =
            (cum.wait_duration_until_accepted as { avg?: number } | undefined)?.avg ?? 0;
          return {
            sid: q.sid,
            friendlyName: q.friendlyName,
            waiting: (byStatus.pending ?? 0) + (byStatus.reserved ?? 0),
            active: byStatus.assigned ?? 0,
            longestWaitAge: (rt.longest_task_waiting_age as number) ?? 0,
            availableWorkers: (rt.total_available_workers as number) ?? 0,
            eligibleWorkers: (rt.total_eligible_workers as number) ?? 0,
            avgWaitAccepted: waitAccepted,
          };
        } catch {
          return {
            sid: q.sid,
            friendlyName: q.friendlyName,
            waiting: 0,
            active: 0,
            longestWaitAge: 0,
            availableWorkers: 0,
            eligibleWorkers: 0,
            avgWaitAccepted: 0,
          };
        }
      }),
    );

    return NextResponse.json({
      configured: true,
      updatedAt: new Date().toISOString(),
      queues: projected,
    });
  } catch {
    return NextResponse.json({ error: 'queue_stats_failed' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/queue-stats/__tests__/route.test.ts`
Expected: PASS (2 tests). If the `twilio` mock's `taskQueues` dual-role (callable + `.list`) trips the runtime, keep the `Object.assign` shape shown in the test — it makes `taskQueues.list(...)` and `taskQueues(sid).statistics()` both resolvable.

- [ ] **Step 5: Document the env (if `.env.example` exists)**

Append to `.env.example`:

```bash
# Queue Stats (optional; TaskRouter REST). Absent => Queue Stats shows a
# "not configured" placeholder and the app still boots.
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WORKSPACE_SID=
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/queue-stats/route.ts src/app/api/queue-stats/__tests__/route.test.ts
git add .env.example 2>/dev/null || true
git commit -m "feat(api): add TaskRouter queue-stats route (stub-ready without creds)"
```

---

## Task 8: `useQueueStats` polling hook

**Files:**
- Create: `src/features/queues/hooks/useQueueStats.ts`
- Test: `src/features/queues/hooks/__tests__/useQueueStats.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface QueueStatRow {
    sid: string; friendlyName: string;
    waiting: number; active: number; longestWaitAge: number;
    availableWorkers: number; eligibleWorkers: number; avgWaitAccepted: number;
  }
  export interface QueueStatsState {
    configured: boolean;
    loading: boolean;
    error: boolean;
    updatedAt: string | null;
    queues: QueueStatRow[];
  }
  export function useQueueStats(pollMs?: number): QueueStatsState
  ```
  Fetches `/api/queue-stats` on mount and every `pollMs` (default 30000). Sets `configured:false` when the route says so (and stops treating it as an error). Clears its interval on unmount.

- [ ] **Step 1: Write the failing test**

```ts
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useQueueStats } from '../useQueueStats';

describe('useQueueStats', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('exposes configured=false when the route is unconfigured', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ configured: false }),
    });
    const { result } = renderHook(() => useQueueStats(999999));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.configured).toBe(false);
    expect(result.current.queues).toEqual([]);
  });

  it('loads queue rows when configured', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        configured: true,
        updatedAt: '2026-07-27T00:00:00.000Z',
        queues: [
          {
            sid: 'WQ1', friendlyName: 'Support', waiting: 2, active: 1,
            longestWaitAge: 30, availableWorkers: 4, eligibleWorkers: 6, avgWaitAccepted: 9,
          },
        ],
      }),
    });
    const { result } = renderHook(() => useQueueStats(999999));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.configured).toBe(true);
    expect(result.current.queues).toHaveLength(1);
    expect(result.current.queues[0].friendlyName).toBe('Support');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/queues/hooks/__tests__/useQueueStats.test.ts`
Expected: FAIL — `Cannot find module '../useQueueStats'`.

- [ ] **Step 3: Write minimal implementation**

```ts
'use client';

import { useCallback, useEffect, useState } from 'react';

export interface QueueStatRow {
  sid: string;
  friendlyName: string;
  waiting: number;
  active: number;
  longestWaitAge: number;
  availableWorkers: number;
  eligibleWorkers: number;
  avgWaitAccepted: number;
}

export interface QueueStatsState {
  configured: boolean;
  loading: boolean;
  error: boolean;
  updatedAt: string | null;
  queues: QueueStatRow[];
}

const DEFAULT_POLL_MS = 30_000;

/** Polls /api/queue-stats. configured=false is a first-class (non-error) state. */
export function useQueueStats(pollMs: number = DEFAULT_POLL_MS): QueueStatsState {
  const [state, setState] = useState<QueueStatsState>({
    configured: true,
    loading: true,
    error: false,
    updatedAt: null,
    queues: [],
  });

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/queue-stats');
      if (!res.ok) {
        setState((s) => ({ ...s, loading: false, error: true }));
        return;
      }
      const data = await res.json();
      if (data.configured === false) {
        setState({ configured: false, loading: false, error: false, updatedAt: null, queues: [] });
        return;
      }
      setState({
        configured: true,
        loading: false,
        error: false,
        updatedAt: data.updatedAt ?? null,
        queues: data.queues ?? [],
      });
    } catch {
      setState((s) => ({ ...s, loading: false, error: true }));
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), pollMs);
    return () => clearInterval(id);
  }, [load, pollMs]);

  return state;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/queues/hooks/__tests__/useQueueStats.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/queues/hooks/useQueueStats.ts \
        src/features/queues/hooks/__tests__/useQueueStats.test.ts
git commit -m "feat(queues): add useQueueStats polling hook"
```

---

## Task 9: `QueuesView` + `queues` catalog + barrel

**Files:**
- Create: `src/features/queues/components/QueuesView.tsx`
- Test: `src/features/queues/components/__tests__/QueuesView.test.tsx`
- Create: `src/features/queues/messages/en.json`
- Create: `src/features/queues/index.ts`

**Interfaces:**
- Consumes: `useQueueStats()` (Task 8). Injectable override for tests:
  ```ts
  export function QueuesView(props?: { stats?: QueueStatsState }): JSX.Element
  ```
  Renders a metrics table (Queue / Waiting / Active / Longest Wait / Available / Eligible / Avg Wait). When `stats.configured === false`, renders a translated "not configured" placeholder. `loading` → spinner row; `error` → error row.
- Produces the `queues` i18n namespace (auto-discovered).
- `index.ts` exports `{ QueuesView }` and `{ useQueueStats }`.

- [ ] **Step 1: Create the i18n catalog**

`src/features/queues/messages/en.json`:

```json
{
  "title": "Queues Stats",
  "subtitle": "Real-time TaskRouter queue monitoring",
  "notConfigured": "Queue stats require Twilio account credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WORKSPACE_SID).",
  "error": "Failed to load queue stats",
  "empty": "No queues found",
  "updatedAt": "Updated {time}",
  "columns": {
    "queue": "Queue",
    "waiting": "Waiting",
    "active": "Active",
    "longestWait": "Longest Wait",
    "available": "Available",
    "eligible": "Eligible",
    "avgWait": "Avg Wait (30m)"
  }
}
```

- [ ] **Step 2: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '@/features/queues/messages/en.json';
import { QueuesView } from '../QueuesView';
import type { QueueStatsState } from '../../hooks/useQueueStats';

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ queues: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const configured: QueueStatsState = {
  configured: true,
  loading: false,
  error: false,
  updatedAt: '2026-07-27T00:00:00.000Z',
  queues: [
    {
      sid: 'WQ1', friendlyName: 'Support', waiting: 2, active: 1,
      longestWaitAge: 65, availableWorkers: 4, eligibleWorkers: 6, avgWaitAccepted: 9,
    },
  ],
};

describe('QueuesView', () => {
  it('renders the "not configured" placeholder when creds are absent', () => {
    renderWithIntl(
      <QueuesView
        stats={{ configured: false, loading: false, error: false, updatedAt: null, queues: [] }}
      />,
    );
    expect(screen.getByText(/require Twilio account credentials/i)).toBeInTheDocument();
  });

  it('renders a queue row when configured', () => {
    renderWithIntl(<QueuesView stats={configured} />);
    expect(screen.getByText('Support')).toBeInTheDocument();
    expect(screen.getByText('1:05')).toBeInTheDocument(); // 65s => 1:05
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/features/queues/components/__tests__/QueuesView.test.tsx`
Expected: FAIL — `Cannot find module '../QueuesView'`.

- [ ] **Step 4: Write minimal implementation**

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { Loader } from 'lucide-react';
import { useQueueStats, type QueueStatsState } from '../hooks/useQueueStats';

/** Format seconds as m:ss / h:mm:ss. */
function formatWait(seconds: number): string {
  if (!seconds || seconds <= 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Real-time TaskRouter queue metrics (external — needs Twilio creds server-side). */
export function QueuesView({ stats }: { stats?: QueueStatsState } = {}) {
  const t = useTranslations('queues');
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const live = stats ?? useQueueStats();

  if (!live.configured) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="text-lg font-semibold text-text">{t('title')}</h1>
        <p className="max-w-md text-sm text-muted">{t('notConfigured')}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg">
      <div className="shrink-0 px-8 pt-6 pb-4">
        <h1 className="text-xl font-semibold text-text">{t('title')}</h1>
        <p className="text-sm text-muted">{t('subtitle')}</p>
      </div>
      <div className="flex-1 overflow-y-auto px-8 pb-8">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-bg">
            <tr className="border-b border-border text-left text-xs font-medium text-muted">
              <th className="py-2 pr-6">{t('columns.queue')}</th>
              <th className="py-2 pr-6 text-right">{t('columns.waiting')}</th>
              <th className="py-2 pr-6 text-right">{t('columns.active')}</th>
              <th className="py-2 pr-6 text-right">{t('columns.longestWait')}</th>
              <th className="py-2 pr-6 text-right">{t('columns.available')}</th>
              <th className="py-2 pr-6 text-right">{t('columns.eligible')}</th>
              <th className="py-2 text-right">{t('columns.avgWait')}</th>
            </tr>
          </thead>
          <tbody>
            {live.loading && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-muted">
                  <Loader className="mx-auto h-6 w-6 animate-spin" aria-hidden />
                </td>
              </tr>
            )}
            {!live.loading && live.error && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-danger">
                  {t('error')}
                </td>
              </tr>
            )}
            {!live.loading && !live.error && live.queues.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-muted">
                  {t('empty')}
                </td>
              </tr>
            )}
            {!live.loading &&
              !live.error &&
              live.queues.map((q) => (
                <tr key={q.sid} className="border-b border-border hover:bg-surface-2">
                  <td className="py-3 pr-6">
                    <p className="font-medium text-text">{q.friendlyName}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-muted">{q.sid}</p>
                  </td>
                  <td className="py-3 pr-6 text-right tabular-nums text-text">{q.waiting}</td>
                  <td className="py-3 pr-6 text-right tabular-nums text-text">{q.active}</td>
                  <td className="py-3 pr-6 text-right tabular-nums text-text">
                    {formatWait(q.longestWaitAge)}
                  </td>
                  <td className="py-3 pr-6 text-right tabular-nums text-text">{q.availableWorkers}</td>
                  <td className="py-3 pr-6 text-right tabular-nums text-text">{q.eligibleWorkers}</td>
                  <td className="py-3 text-right tabular-nums text-text">
                    {formatWait(q.avgWaitAccepted)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

> The `stats ?? useQueueStats()` pattern conditionally calls a hook. Since the `stats` prop's presence is stable across a component's lifetime (test always passes it; app never does), this is safe, but ESLint's rules-of-hooks will flag it — the inline disable comment is intentional and acceptable here. If you prefer to avoid it, split into `QueuesView` (calls `useQueueStats`, passes down) + `QueuesTable` (pure, takes `stats`) and test `QueuesTable`.

- [ ] **Step 5: Create the barrel**

`src/features/queues/index.ts`:

```ts
export { QueuesView } from './components/QueuesView';
export { useQueueStats, type QueueStatsState, type QueueStatRow } from './hooks/useQueueStats';
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/features/queues`
Expected: PASS (QueuesView + useQueueStats suites).

- [ ] **Step 7: Commit**

```bash
git add src/features/queues
git commit -m "feat(queues): add QueuesView + queues i18n catalog + barrel"
```

---

## Task 10: Wire it into `AgentDesktopShell` (rail + views + header dedupe)

**Files:**
- Modify: `src/features/session/components/AgentDesktopShell.tsx`
- Modify: `src/features/session/components/__tests__/AgentDesktopShell.test.tsx`

**Interfaces:**
- Consumes: `IconRail` + `DesktopView` (Task 6), `QueuesView` (Task 9), existing `SupervisorPanel`, `OutboundDialer`, `SelectedTaskDetail` (now delegating to `TaskWorkspace`).
- Produces: no new exports. Adds `const [view, setView] = useState<DesktopView>('desktop')` and renders the rail + the view-selected body.

**Changes to `DesktopBody`:**
1. Add `import { IconRail, type DesktopView } from '@/components/layout/IconRail';` and `import { QueuesView } from '@/features/queues';`
2. Add view state: `const [view, setView] = useState<DesktopView>('desktop');`
3. **Dedupe the header:** remove the supervisor `IconButton` + its `Separator` (Teams moves to the rail) and the `Grid3x3` "Dial" `IconButton` + its telephony `Separator` grouping (Dialpad moves to the rail). Keep `PluginSlot name="header-action"`, `ThemeToggle`, `LocaleSwitcher`, `AudioSettingsMenu`, `ActivitySelector`. Drop the now-unused `supervisorOpen` state, the `Drawer` import/usage, the `Users`/`Grid3x3` lucide imports, and `tSup`/`tCommon` if they become unused (keep whichever the SupervisorPanel view still needs — `tSup('title')` is still used as the Teams heading).
4. **Wrap the layout** so the rail sits at the far left, then the body switches on `view`:

```tsx
return (
  <PluginRoot>
    <main
      data-testid="agent-desktop"
      className="flex h-screen flex-col overflow-hidden bg-bg text-text"
    >
      <header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-6 py-3">
        <Logo className="h-8 w-auto" />
        <div className="flex items-center gap-2">
          <PluginSlot name="header-action" />
          {/* appearance */}
          <ThemeToggle />
          <LocaleSwitcher />
          <Separator />
          {/* audio devices (dial + teams now live in the rail) */}
          <AudioSettingsMenu />
          <Separator />
          {/* presence */}
          <ActivitySelector />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <IconRail
          activeView={view}
          onViewChange={setView}
          onDialpad={() => setDialerOpen(true)}
          showTeams={isSupervisor}
        />

        <div className="min-h-0 flex-1">
          {view === 'queues' ? (
            <QueuesView />
          ) : view === 'teams' && isSupervisor ? (
            <div className="h-full overflow-y-auto p-4">
              <h2 className="mb-3 text-sm font-semibold text-text">{tSup('title')}</h2>
              <SupervisorPanel activities={supervisorActivities} />
            </div>
          ) : (
            <ResizableColumns
              left={<TaskList />}
              middle={
                <div className="flex flex-col gap-4 p-4">
                  <SelectedTaskDetail
                    callPanel={
                      <CallPanel
                        call={call}
                        onMuteToggle={controls.toggleMute}
                        onHoldToggle={() => void controls.toggleHold()}
                        onHangup={() => void controls.hangup()}
                        onEndForAll={() => void controls.endForAll()}
                        onTransfer={() => setVoiceTransferOpen(true)}
                        participants={callParticipants}
                        workerNames={workerNames}
                        onHoldParticipant={(sid) => void controls.toggleParticipantHold(sid)}
                        onKickParticipant={(sid) => void controls.removeParticipant(sid)}
                        onAddParticipant={(to) => void controls.addParticipant(to)}
                        onToggleRecording={() => void controls.toggleRecording()}
                      />
                    }
                  />
                  <PluginSlot name="task-panel" />
                </div>
              }
              right={<CrmPanel />}
            />
          )}
        </div>
      </div>

      <OutboundDialer open={dialerOpen} onClose={() => setDialerOpen(false)} />
      <VoiceTransferModal
        open={voiceTransferOpen}
        taskSid={call.taskSid ?? ''}
        onClose={() => setVoiceTransferOpen(false)}
      />
    </main>
  </PluginRoot>
);
```

> If `view` is `'teams'` but the worker loses supervisor status, the ternary falls through to the desktop view — acceptable. `tCommon` and `Drawer` and `supervisorOpen` are removed; run `tsc`/`lint` to catch any now-unused import and delete it.

- [ ] **Step 1: Update the shell test first (red)**

Open `src/features/session/components/__tests__/AgentDesktopShell.test.tsx`. Add cases and adjust any that asserted the removed header buttons:

```tsx
// The rail exposes primary navigation; the header no longer duplicates Dial/Teams.
it('renders the icon rail and switches to Queues Stats', async () => {
  // ...existing setup that renders the shell with a token in the store...
  const railQueues = screen.getByRole('button', { name: 'Queues Stats' });
  await userEvent.click(railQueues);
  // QueuesView (unconfigured in test — fetch mocked to { configured:false }) shows its title:
  expect(await screen.findByText('Queues Stats')).toBeInTheDocument();
});
```

Ensure `fetch` is mocked in this test file (QueuesView polls on mount when shown):

```tsx
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ configured: false }) }));
});
afterEach(() => vi.unstubAllGlobals());
```

Remove/replace any assertion that queried the header `Dial` button by its old label; the Dial affordance is now the rail's **Dialpad** button (`screen.getByRole('button', { name: 'Dialpad' })`).

- [ ] **Step 2: Run the shell test to verify it fails**

Run: `npx vitest run src/features/session/components/__tests__/AgentDesktopShell.test.tsx`
Expected: FAIL — rail buttons not found / old header buttons removed.

- [ ] **Step 3: Apply the shell changes**

Edit `AgentDesktopShell.tsx` per the block above.

- [ ] **Step 4: Run the shell test to verify it passes**

Run: `npx vitest run src/features/session/components/__tests__/AgentDesktopShell.test.tsx`
Expected: PASS.

- [ ] **Step 5: Full definition-of-done gate**

```bash
npm run test:run && npx tsc --noEmit && npm run lint && npm run build
```
Expected: all green. Fix any fallout (unused imports from the header dedupe are the most likely lint failures).

- [ ] **Step 6: Commit**

```bash
git add src/features/session/components/AgentDesktopShell.tsx \
        src/features/session/components/__tests__/AgentDesktopShell.test.tsx
git commit -m "feat(session): mount IconRail, view switching, dedupe header"
```

---

## Self-Review (author checklist — run after the plan is written)

**Spec coverage (design → task):**
- Icon rail (Agent Desktop / Teams / Dialpad / Queues Stats), deduped from header → **Tasks 6 + 10** ✅
- Tabbed Call/Notes/Info (voice) + Conversation/Notes/Info (chat) → **Tasks 1 + 5** ✅
- Info tab (task attributes) → **Task 2** ✅
- Notes persisted to task attributes → **Task 3** ✅
- Wrap-up form → **Task 4** ✅
- Call controls: richer set kept, hosted in the Call tab → **Task 5** (injects existing `CallPanel`) ✅
- Queue Stats real REST backend + graceful "not configured" fallback → **Tasks 7 + 8 + 9** ✅
- Not building Flex SDK Explorer / CRM InfoPanel → honored (no tasks) ✅

**Type consistency:** `DesktopView` (`'desktop'|'teams'|'queues'`) defined in Task 6, consumed in Task 10. `QueueStatsState`/`QueueStatRow` defined in Task 8, consumed in Tasks 8/9. `TabItem`/`TabsProps` defined Task 1, consumed Task 5. `WrapUpValues` defined Task 4, consumed Task 5. `NotesTab` final signature (`{ taskSid, attributes, onPersist }`) is the one used in Task 5. ✅

**Assumptions to verify during execution (flagged inline, not placeholders):**
- `resolveTaskContact` import path (Task 5) — grep and correct; extract if inline.
- `Button` forwards `type` (Task 4) — add pass-through if missing.
- `twilio` node SDK `taskQueues` callable+`.list` mock shape (Task 7).
- The exact current `AgentDesktopShell.test.tsx` assertions to update (Task 10).

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-27-icon-rail-tabbed-workspace-queue-stats.md`. Two execution options:

1. **Subagent-Driven (recommended)** — a fresh subagent per task, two-stage review between tasks, fast iteration.
2. **Inline Execution** — execute tasks in this session with checkpoints for review.

Which approach?
