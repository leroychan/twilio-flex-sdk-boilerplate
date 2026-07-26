# Part 8 — Plugin System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a lightweight plugin registry + extension-point system for the agent desktop that lets plugins contribute nav items, side panels, task-context panels, header actions, and settings pages with zero core changes — shipping with ZERO active plugins but a documented, DISABLED example skeleton.

**Architecture:** A plugin is a TS module exporting a `PluginManifest`. At app start, a static list of enabled manifests (`plugins/index.ts`, empty by default) is registered into a `PluginRegistry`, which implements the `PluginHost` interface handed to each manifest's `register()`. Contributions are collected per named slot; host UI renders them through a `<PluginSlot name="…" />` component that reads the registry from React context. Plugins never import the Zustand store directly — they get a read-only store accessor through the host (surfaced to components via a `usePluginStore` hook).

**Tech Stack:** TypeScript, React (client components), Zustand `@/store` (read-only, via accessor), next-intl (per-plugin i18n namespace), Vitest + @testing-library/react (jsdom).

## Global Constraints

- npm; tests run with `npm run test:run` (Vitest, jsdom, globals on); alias `@/` → `src/`.
- TypeScript strict mode + `noUncheckedIndexedAccess` are on (from Part 1) — index access is possibly `undefined`; guard with `?.`.
- **File ownership:** Part 8 owns `src/plugins/**` and `src/components/plugins/**` only. Do NOT edit `layout.tsx`, the agent-desktop shell, or any other shared file inline — slot placements are done by the coordinator (see "Integration hooks" near the end).
- Do NOT edit `src/store/index.ts`. `useFlexStore` already exists (built in Part 3+). If a plugin needs store data, expose it through `PluginHost` — never `import { useFlexStore }` inside a plugin.
- UI uses `@/components/ui/*` + Tailwind brand tokens (`bg-surface`, `text-text`, `text-muted`, `border-border`, `font-display`) from Part 1. No Twilio Paste.
- i18n: a plugin's `i18nNamespace` maps to its own `messages/<locale>.json`, merged by the Part 2 loader. The example plugin owns `src/plugins/example/messages/en.json` and uses namespace `example`.
- `PluginManifest` is exactly: `{ id: string; name: string; version: string; i18nNamespace?: string; register(host: PluginHost): void }`.
- The five extension-point slot names are exactly: `nav-item`, `side-panel`, `task-panel`, `header-action`, `settings-page`.
- Ships with zero enabled plugins. The example skeleton exists but is commented out in `plugins/index.ts`.

---

### Task 1: Plugin core types + `PluginRegistry`

**Files:**
- Create: `src/plugins/types.ts`
- Create: `src/plugins/registry.ts`
- Test: `src/plugins/__tests__/registry.test.ts`

**Interfaces:**
- Consumes: nothing (foundation task).
- Produces:
  - `type SlotName = 'nav-item' | 'side-panel' | 'task-panel' | 'header-action' | 'settings-page'`
  - `type PluginStoreState = Readonly<Record<string, unknown>>`
  - `interface PluginStoreAccessor { getState: () => PluginStoreState; subscribe: (listener: () => void) => () => void }`
  - `interface SlotContribution { id: string; component: ComponentType; order?: number; title?: string }`
  - `interface PluginHost { contributeNavItem(c: SlotContribution): void; contributeSidePanel(c: SlotContribution): void; contributeTaskPanel(c: SlotContribution): void; contributeHeaderAction(c: SlotContribution): void; contributeSettingsPage(c: SlotContribution): void; readonly store: PluginStoreAccessor }`
  - `interface PluginManifest { id: string; name: string; version: string; i18nNamespace?: string; register(host: PluginHost): void }`
  - `class PluginRegistry implements PluginHost` with `constructor(store: PluginStoreAccessor)`, `register(manifest: PluginManifest): void`, `getContributions(slot: SlotName): readonly SlotContribution[]`, `get registered(): readonly PluginManifest[]`. Contribution ids are namespaced as `` `${pluginId}.${id}` ``. `getContributions` returns a copy sorted by `order` ascending (default `0`).

- [ ] **Step 1: Write the failing test `src/plugins/__tests__/registry.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { PluginRegistry } from '../registry';
import type { PluginManifest, PluginStoreAccessor } from '../types';

const fakeStore: PluginStoreAccessor = {
  getState: () => ({ session: {}, tasks: {} }),
  subscribe: () => () => {},
};

function panelManifest(id: string, order?: number): PluginManifest {
  return {
    id,
    name: id,
    version: '1.0.0',
    register(host) {
      host.contributeTaskPanel({ id: 'panel', order, component: () => null });
    },
  };
}

describe('PluginRegistry', () => {
  it('exposes a registered manifest', () => {
    const r = new PluginRegistry(fakeStore);
    r.register(panelManifest('a'));
    expect(r.registered.map((m) => m.id)).toEqual(['a']);
  });

  it('retrieves contributions by slot with plugin-scoped ids', () => {
    const r = new PluginRegistry(fakeStore);
    r.register(panelManifest('a'));
    const items = r.getContributions('task-panel');
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe('a.panel');
  });

  it('returns nothing for an empty slot', () => {
    const r = new PluginRegistry(fakeStore);
    expect(r.getContributions('nav-item')).toHaveLength(0);
  });

  it('sorts contributions by order ascending', () => {
    const r = new PluginRegistry(fakeStore);
    r.register(panelManifest('a', 2));
    r.register(panelManifest('b', 1));
    expect(r.getContributions('task-panel').map((c) => c.id)).toEqual(['b.panel', 'a.panel']);
  });

  it('rejects a duplicate plugin id', () => {
    const r = new PluginRegistry(fakeStore);
    r.register(panelManifest('a'));
    expect(() => r.register(panelManifest('a'))).toThrow(/already registered/);
  });

  it('gives plugins read-only store access via the host', () => {
    const r = new PluginRegistry(fakeStore);
    let seen: unknown;
    r.register({
      id: 'reader',
      name: 'reader',
      version: '1.0.0',
      register(host) {
        seen = Object.keys(host.store.getState());
      },
    });
    expect(seen).toEqual(['session', 'tasks']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- registry`
Expected: FAIL — `Cannot find module '../registry'` (and `../types`).

- [ ] **Step 3: Write `src/plugins/types.ts`**

```ts
import type { ComponentType } from 'react';

/** The five host-rendered extension points. */
export type SlotName =
  | 'nav-item'
  | 'side-panel'
  | 'task-panel'
  | 'header-action'
  | 'settings-page';

/** Read-only view of app state exposed to plugins (they never import the store). */
export type PluginStoreState = Readonly<Record<string, unknown>>;

/** Read-only accessor to the app store, handed to plugins via the host. */
export interface PluginStoreAccessor {
  getState: () => PluginStoreState;
  subscribe: (listener: () => void) => () => void;
}

/** A single contribution the host renders in one slot. */
export interface SlotContribution {
  /** Unique within a plugin+slot; the registry namespaces it as `${pluginId}.${id}`. */
  id: string;
  /** Component the host renders in the slot. */
  component: ComponentType;
  /** Lower renders first. Default 0. */
  order?: number;
  /** Human label (nav item text, tab title, settings page name). */
  title?: string;
}

/** The only surface a plugin's register() may touch. */
export interface PluginHost {
  contributeNavItem(contribution: SlotContribution): void;
  contributeSidePanel(contribution: SlotContribution): void;
  contributeTaskPanel(contribution: SlotContribution): void;
  contributeHeaderAction(contribution: SlotContribution): void;
  contributeSettingsPage(contribution: SlotContribution): void;
  /** Read-only store access; plugins must NOT import `@/store` directly. */
  readonly store: PluginStoreAccessor;
}

/** A plugin is a module exporting one of these. */
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  /** Optional i18n namespace; its messages/<locale>.json is merged by the Part 2 loader. */
  i18nNamespace?: string;
  /** Called once at registration to contribute into the host. */
  register(host: PluginHost): void;
}
```

- [ ] **Step 4: Write `src/plugins/registry.ts`**

```ts
import type {
  PluginHost,
  PluginManifest,
  PluginStoreAccessor,
  SlotContribution,
  SlotName,
} from './types';

/**
 * Collects plugin contributions per slot and hands each plugin a read-only host.
 * Contribution ids are namespaced with the contributing plugin's id to avoid collisions.
 */
export class PluginRegistry implements PluginHost {
  readonly store: PluginStoreAccessor;
  private readonly manifests: PluginManifest[] = [];
  private readonly slots = new Map<SlotName, SlotContribution[]>();
  private currentPluginId: string | null = null;

  constructor(store: PluginStoreAccessor) {
    this.store = store;
  }

  register(manifest: PluginManifest): void {
    if (this.manifests.some((m) => m.id === manifest.id)) {
      throw new Error(`Plugin "${manifest.id}" is already registered`);
    }
    this.manifests.push(manifest);
    this.currentPluginId = manifest.id;
    try {
      manifest.register(this);
    } finally {
      this.currentPluginId = null;
    }
  }

  get registered(): readonly PluginManifest[] {
    return this.manifests;
  }

  getContributions(slot: SlotName): readonly SlotContribution[] {
    const list = this.slots.get(slot) ?? [];
    return [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  contributeNavItem(contribution: SlotContribution): void {
    this.add('nav-item', contribution);
  }

  contributeSidePanel(contribution: SlotContribution): void {
    this.add('side-panel', contribution);
  }

  contributeTaskPanel(contribution: SlotContribution): void {
    this.add('task-panel', contribution);
  }

  contributeHeaderAction(contribution: SlotContribution): void {
    this.add('header-action', contribution);
  }

  contributeSettingsPage(contribution: SlotContribution): void {
    this.add('settings-page', contribution);
  }

  private add(slot: SlotName, contribution: SlotContribution): void {
    const scopedId = this.currentPluginId
      ? `${this.currentPluginId}.${contribution.id}`
      : contribution.id;
    const list = this.slots.get(slot) ?? [];
    if (list.some((c) => c.id === scopedId)) {
      throw new Error(`Contribution "${scopedId}" already exists in slot "${slot}"`);
    }
    list.push({ ...contribution, id: scopedId });
    this.slots.set(slot, list);
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test:run -- registry`
Expected: PASS — 6 passed.

- [ ] **Step 6: Commit**

```bash
git add src/plugins/types.ts src/plugins/registry.ts src/plugins/__tests__/registry.test.ts
git commit -m "feat(plugins): add plugin types + PluginRegistry"
```

---

### Task 2: `PluginProvider`, `usePluginStore`, and `PluginSlot`

**Files:**
- Create: `src/components/plugins/PluginProvider.tsx`
- Create: `src/components/plugins/usePluginStore.ts`
- Create: `src/components/plugins/PluginSlot.tsx`
- Test: `src/components/plugins/__tests__/PluginSlot.test.tsx`

**Interfaces:**
- Consumes: `PluginRegistry` from `@/plugins/registry`; `SlotName`, `PluginStoreState` from `@/plugins/types` (Task 1).
- Produces:
  - `PluginProvider({ registry: PluginRegistry; children: React.ReactNode }): JSX.Element`
  - `usePluginRegistry(): PluginRegistry` (throws if used outside a provider)
  - `usePluginStore<T>(selector: (state: PluginStoreState) => T): T` (reactive read via `useSyncExternalStore`)
  - `PluginSlot({ name: SlotName }): JSX.Element` — renders each contributed component for `name` in order.

- [ ] **Step 1: Write the failing test `src/components/plugins/__tests__/PluginSlot.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PluginRegistry } from '@/plugins/registry';
import type { PluginStoreAccessor } from '@/plugins/types';
import { PluginProvider } from '../PluginProvider';
import { PluginSlot } from '../PluginSlot';

const fakeStore: PluginStoreAccessor = { getState: () => ({}), subscribe: () => () => {} };

describe('PluginSlot', () => {
  it('renders components contributed to its slot', () => {
    const registry = new PluginRegistry(fakeStore);
    registry.register({
      id: 'demo',
      name: 'demo',
      version: '1.0.0',
      register(host) {
        host.contributeTaskPanel({ id: 'hello', component: () => <div>hello plugin</div> });
      },
    });
    render(
      <PluginProvider registry={registry}>
        <PluginSlot name="task-panel" />
      </PluginProvider>,
    );
    expect(screen.getByText('hello plugin')).toBeInTheDocument();
  });

  it('renders nothing for a slot with no contributions', () => {
    const registry = new PluginRegistry(fakeStore);
    const { container } = render(
      <PluginProvider registry={registry}>
        <PluginSlot name="nav-item" />
      </PluginProvider>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- PluginSlot`
Expected: FAIL — `Cannot find module '../PluginProvider'` (and `../PluginSlot`).

- [ ] **Step 3: Write `src/components/plugins/PluginProvider.tsx`**

```tsx
'use client';

import { createContext, useContext } from 'react';
import type { PluginRegistry } from '@/plugins/registry';

const PluginRegistryContext = createContext<PluginRegistry | null>(null);

export function PluginProvider({
  registry,
  children,
}: {
  registry: PluginRegistry;
  children: React.ReactNode;
}) {
  return (
    <PluginRegistryContext.Provider value={registry}>{children}</PluginRegistryContext.Provider>
  );
}

export function usePluginRegistry(): PluginRegistry {
  const registry = useContext(PluginRegistryContext);
  if (registry === null) {
    throw new Error('usePluginRegistry must be used within a <PluginProvider>');
  }
  return registry;
}
```

- [ ] **Step 4: Write `src/components/plugins/usePluginStore.ts`**

```ts
'use client';

import { useSyncExternalStore } from 'react';
import type { PluginStoreState } from '@/plugins/types';
import { usePluginRegistry } from './PluginProvider';

/**
 * Reactive, read-only access to app state for plugin components. Select a PRIMITIVE (or a
 * memoized value) — returning a fresh object each call would loop. Plugins use this instead
 * of importing `@/store` directly.
 */
export function usePluginStore<T>(selector: (state: PluginStoreState) => T): T {
  const { store } = usePluginRegistry();
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState()),
  );
}
```

- [ ] **Step 5: Write `src/components/plugins/PluginSlot.tsx`**

```tsx
'use client';

import type { SlotName } from '@/plugins/types';
import { usePluginRegistry } from './PluginProvider';

/** Renders every plugin contribution for `name`, in ascending `order`. */
export function PluginSlot({ name }: { name: SlotName }) {
  const registry = usePluginRegistry();
  const contributions = registry.getContributions(name);
  return (
    <>
      {contributions.map((contribution) => {
        const Contributed = contribution.component;
        return <Contributed key={contribution.id} />;
      })}
    </>
  );
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm run test:run -- PluginSlot`
Expected: PASS — 2 passed.

- [ ] **Step 7: Commit**

```bash
git add src/components/plugins/PluginProvider.tsx src/components/plugins/usePluginStore.ts src/components/plugins/PluginSlot.tsx src/components/plugins/__tests__/PluginSlot.test.tsx
git commit -m "feat(plugins): add PluginProvider, usePluginStore, and PluginSlot"
```

---

### Task 3: Example skeleton plugin (disabled)

**Files:**
- Create: `src/plugins/example/TaskPanel.tsx`
- Create: `src/plugins/example/index.ts`
- Create: `src/plugins/example/messages/en.json`
- Test: `src/plugins/__tests__/example.test.ts`

**Interfaces:**
- Consumes: `PluginManifest` from `@/plugins/types`; `usePluginStore` from `@/components/plugins/usePluginStore`; `useTranslations` from `next-intl`.
- Produces: `export const exampleCrmPlugin: PluginManifest` with `id: 'example'`, `i18nNamespace: 'example'`, contributing a `task-panel` (contribution id `task-panel`, so scoped id `example.task-panel`). `export function ExampleTaskPanel(): JSX.Element`.

- [ ] **Step 1: Write the failing test `src/plugins/__tests__/example.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { PluginRegistry } from '../registry';
import type { PluginStoreAccessor } from '../types';
import { exampleCrmPlugin } from '../example';

const fakeStore: PluginStoreAccessor = { getState: () => ({}), subscribe: () => () => {} };

describe('exampleCrmPlugin', () => {
  it('has a well-formed manifest', () => {
    expect(exampleCrmPlugin.id).toBe('example');
    expect(exampleCrmPlugin.i18nNamespace).toBe('example');
    expect(typeof exampleCrmPlugin.register).toBe('function');
  });

  it('contributes a task-panel when registered', () => {
    const r = new PluginRegistry(fakeStore);
    r.register(exampleCrmPlugin);
    const panels = r.getContributions('task-panel');
    expect(panels.map((p) => p.id)).toContain('example.task-panel');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- example`
Expected: FAIL — `Cannot find module '../example'`.

- [ ] **Step 3: Write `src/plugins/example/TaskPanel.tsx`**

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { usePluginStore } from '@/components/plugins/usePluginStore';

/**
 * Example task-side-panel — the template for a real plugin (e.g. a CRM panel).
 * Read task/session state via usePluginStore (never import `@/store`), and render
 * translated copy from the plugin's own i18n namespace ("example").
 * Disabled by default — see plugins/README.md to enable.
 */
export function ExampleTaskPanel() {
  const t = useTranslations('example');
  const sliceCount = usePluginStore((state) => Object.keys(state).length);
  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <h3 className="font-display text-lg font-bold text-text">{t('title')}</h3>
      <p className="mt-1 text-sm text-muted">{t('description')}</p>
      <p className="mt-2 text-xs text-muted">{t('storeKeys', { count: sliceCount })}</p>
    </section>
  );
}
```

- [ ] **Step 4: Write `src/plugins/example/index.ts`**

```ts
import type { PluginManifest } from '../types';
import { ExampleTaskPanel } from './TaskPanel';

/** Disabled example plugin — the template for building your own (see plugins/README.md). */
export const exampleCrmPlugin: PluginManifest = {
  id: 'example',
  name: 'Example CRM Plugin',
  version: '0.0.0',
  i18nNamespace: 'example',
  register(host) {
    host.contributeTaskPanel({
      id: 'task-panel',
      title: 'Example',
      order: 100,
      component: ExampleTaskPanel,
    });
  },
};
```

- [ ] **Step 5: Write `src/plugins/example/messages/en.json`**

```json
{
  "title": "Example CRM Panel",
  "description": "Disabled example plugin. Copy src/plugins/example to build your own.",
  "storeKeys": "Store slices available: {count}"
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm run test:run -- example`
Expected: PASS — 2 passed.

- [ ] **Step 7: Commit**

```bash
git add src/plugins/example/TaskPanel.tsx src/plugins/example/index.ts src/plugins/example/messages/en.json src/plugins/__tests__/example.test.ts
git commit -m "feat(plugins): add disabled example skeleton plugin"
```

---

### Task 4: Static loader (`plugins/index.ts`) + app-start `PluginRoot`

**Files:**
- Create: `src/plugins/index.ts`
- Create: `src/components/plugins/PluginRoot.tsx`
- Test: `src/plugins/__tests__/index.test.ts`

**Interfaces:**
- Consumes: `PluginRegistry` from `@/plugins/registry`; `PluginManifest`, `PluginStoreAccessor` from `@/plugins/types`; `useFlexStore` from `@/store` (read-only, existing); `PluginProvider` from `@/components/plugins/PluginProvider`.
- Produces:
  - `export const enabledPlugins: PluginManifest[]` (empty by default).
  - `export function initPlugins(store: PluginStoreAccessor): PluginRegistry` — builds a registry and registers every enabled plugin.
  - `PluginRoot({ children }): JSX.Element` — client component that initializes the registry once (wiring the read-only store accessor from `useFlexStore`) and renders `PluginProvider`.

- [ ] **Step 1: Write the failing test `src/plugins/__tests__/index.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import type { PluginStoreAccessor } from '../types';
import { enabledPlugins, initPlugins } from '../index';

const fakeStore: PluginStoreAccessor = { getState: () => ({}), subscribe: () => () => {} };

describe('plugin loader', () => {
  it('ships with zero enabled plugins by default', () => {
    expect(enabledPlugins).toHaveLength(0);
  });

  it('initPlugins returns a registry with no contributions by default', () => {
    const r = initPlugins(fakeStore);
    expect(r.registered).toHaveLength(0);
    expect(r.getContributions('task-panel')).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- index`
Expected: FAIL — `Cannot find module '../index'`.

- [ ] **Step 3: Write `src/plugins/index.ts`**

```ts
import { PluginRegistry } from './registry';
import type { PluginManifest, PluginStoreAccessor } from './types';
// DISABLED example plugin. Uncomment the import AND the array entry below to enable it.
// See ./README.md for the full walkthrough.
// import { exampleCrmPlugin } from './example';

/**
 * Statically-listed manifests loaded at app start. Empty by default.
 * Add your plugin's manifest here (with its import above) to enable it — no core changes.
 */
export const enabledPlugins: PluginManifest[] = [
  // exampleCrmPlugin,
];

/** Create the registry, wire the read-only store accessor, register enabled plugins. */
export function initPlugins(store: PluginStoreAccessor): PluginRegistry {
  const registry = new PluginRegistry(store);
  for (const manifest of enabledPlugins) {
    registry.register(manifest);
  }
  return registry;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- index`
Expected: PASS — 2 passed.

- [ ] **Step 5: Write `src/components/plugins/PluginRoot.tsx`**

```tsx
'use client';

import { useRef } from 'react';
import { useFlexStore } from '@/store';
import { initPlugins } from '@/plugins';
import { PluginRegistry } from '@/plugins/registry';
import { PluginProvider } from './PluginProvider';

/**
 * App-start plugin initialization. Wraps the agent-desktop shell so <PluginSlot> can render
 * contributions. Builds the read-only store accessor from useFlexStore — plugins never import
 * the store directly. The coordinator mounts this (see "Integration hooks" in the plan).
 */
export function PluginRoot({ children }: { children: React.ReactNode }) {
  const registryRef = useRef<PluginRegistry | null>(null);
  if (registryRef.current === null) {
    registryRef.current = initPlugins({
      getState: () => useFlexStore.getState() as Readonly<Record<string, unknown>>,
      subscribe: (listener) => useFlexStore.subscribe(listener),
    });
  }
  return <PluginProvider registry={registryRef.current}>{children}</PluginProvider>;
}
```

- [ ] **Step 6: Type-check the package**

Run: `npx tsc --noEmit`
Expected: exits 0, no errors. (`@/store` and `useFlexStore` exist from Part 3+; if this errors with "Cannot find module '@/store'", Part 3 has not been merged yet — do not stub it here; flag to the coordinator.)

- [ ] **Step 7: Commit**

```bash
git add src/plugins/index.ts src/components/plugins/PluginRoot.tsx src/plugins/__tests__/index.test.ts
git commit -m "feat(plugins): add static loader + app-start PluginRoot"
```

---

### Task 5: Plugin author docs (`plugins/README.md`) + final verification

**Files:**
- Create: `src/plugins/README.md`

**Interfaces:**
- Consumes: everything above (documents the public surface).
- Produces: `src/plugins/README.md` — the "how to add a plugin" guide.

- [ ] **Step 1: Write `src/plugins/README.md`**

````markdown
# Plugins

A lightweight extension-point system for the Flex agent desktop. A plugin contributes React
components into named **slots** the host renders — with **zero changes to core code**. The app
ships with zero enabled plugins; `src/plugins/example` is a disabled skeleton you copy.

## Concepts

- **`PluginManifest`** (`types.ts`) — what a plugin exports:

  ```ts
  interface PluginManifest {
    id: string;            // unique, e.g. "crm"
    name: string;          // human name
    version: string;       // semver
    i18nNamespace?: string; // messages namespace; owns messages/<locale>.json
    register(host: PluginHost): void; // contribute here
  }
  ```

- **`PluginHost`** — the only surface a plugin may touch. Typed `contribute*` methods plus a
  read-only `store` accessor.

- **`PluginRegistry`** — collects contributions and exposes them per slot. Built once at app
  start by `initPlugins()`.

- **`<PluginSlot name="…" />`** — the host renders contributions for a slot here.

## Slots

| Slot name        | Contribute with           | Rendered in                         |
| ---------------- | ------------------------- | ----------------------------------- |
| `nav-item`       | `contributeNavItem`       | Desktop navigation / sidebar        |
| `side-panel`     | `contributeSidePanel`     | Agent-desktop side panel region     |
| `task-panel`     | `contributeTaskPanel`     | Active-task context panel / tabs    |
| `header-action`  | `contributeHeaderAction`  | Header actions area                 |
| `settings-page`  | `contributeSettingsPage`  | Settings route                      |

Each contribution is `{ id, component, order?, title? }`. Lower `order` renders first. The
registry namespaces your id as `${pluginId}.${id}` to avoid collisions.

## Reading app state

Plugins must NOT `import { useFlexStore } from '@/store'`. Read state through the provided
accessor via the `usePluginStore` hook — select a primitive (or a memoized value):

```tsx
import { usePluginStore } from '@/components/plugins/usePluginStore';
const activeTaskCount = usePluginStore((state) => (state.tasks as { list?: unknown[] })?.list?.length ?? 0);
```

## Internationalization

Set `i18nNamespace` on your manifest and put `messages/<locale>.json` in your plugin folder
(e.g. `messages/en.json`). The Part 2 i18n loader merges these files under your namespace, so
`useTranslations('<i18nNamespace>')` works inside your components. If you enable a plugin
before its namespace is wired into the loader, `useTranslations` will throw for missing keys.

## Add a plugin (walkthrough)

1. Copy `src/plugins/example` to `src/plugins/<your-id>`.
2. Edit the manifest in `index.ts`: set `id`, `name`, `version`, `i18nNamespace`.
3. Replace `TaskPanel.tsx` with your component(s); contribute them in `register(host)` using
   the `contribute*` methods for the slots you target.
4. Add `messages/<locale>.json` for each supported locale.
5. Enable it in `src/plugins/index.ts`: import your manifest and add it to `enabledPlugins`.
6. Run `npm run test:run` and the app — your contributions appear in their slots.

## Enable the example

In `src/plugins/index.ts`, uncomment:

```ts
import { exampleCrmPlugin } from './example';

export const enabledPlugins: PluginManifest[] = [exampleCrmPlugin];
```

Ensure the Part 2 loader merges `src/plugins/example/messages/en.json` under the `example`
namespace, then the example task panel renders in the `task-panel` slot.
````

- [ ] **Step 2: Run the full plugin test suite**

Run: `npm run test:run -- plugins`
Expected: PASS — all plugin tests green (registry, PluginSlot, example, index).

- [ ] **Step 3: Run lint + full type-check**

Run: `npm run lint && npx tsc --noEmit`
Expected: both exit 0, no errors.

- [ ] **Step 4: Commit**

```bash
git add src/plugins/README.md
git commit -m "docs(plugins): add plugin authoring guide"
```

---

## Integration hooks

These placements are performed by the **coordinator** (not in Part 8 — do NOT edit shared
shell files here). All symbols are exported by Part 8.

- **Mount once, around the agent-desktop shell** (e.g. `src/app/agent-desktop/layout.tsx` or
  the client desktop root), inside the existing providers (must be under the store + i18n
  providers, since plugins read the store and use translations):
  ```tsx
  import { PluginRoot } from '@/components/plugins/PluginRoot';
  // …
  <PluginRoot>{children}</PluginRoot>
  ```
- **Slot placements** (`import { PluginSlot } from '@/components/plugins/PluginSlot';`) — drop
  each where the corresponding host UI lives:
  - Navigation / sidebar: `<PluginSlot name="nav-item" />`
  - Header actions area (near the theme/locale controls in `AppHeader`): `<PluginSlot name="header-action" />`
  - Agent-desktop side panel region: `<PluginSlot name="side-panel" />`
  - Active-task context panel / task tabs: `<PluginSlot name="task-panel" />`
  - Settings route/page: `<PluginSlot name="settings-page" />`
- **Part 2 i18n loader:** extend the message loader to glob `src/plugins/*/messages/<locale>.json`
  and merge each under the owning plugin's `i18nNamespace`. Only needed once any plugin (e.g.
  the example) is enabled.

---

## Self-Review

**1. Spec coverage (§10 Plugin system):**
- `PluginManifest { id, name, version, i18nNamespace?, register(host) }` — Task 1 (`types.ts`), verbatim. ✓
- Extension points: nav items, side panels, task-context tabs, header actions, settings pages — five `SlotName`s + five `contribute*` methods, Task 1. ✓
- `PluginHost` with typed `contribute*` methods — Task 1. ✓
- `PluginRegistry` collecting contributions, exposed to slot components — Task 1 + Task 2 (`PluginSlot` via context). ✓
- `<PluginSlot name="task-panel" />` renders contributed components — Task 2 test. ✓
- Disabled `plugins/example/` contributing a sample task-side-panel — Task 3. ✓
- Static `plugins/index.ts` list (empty/example-commented), initialized at app start — Task 4 (`enabledPlugins` empty, `initPlugins`, `PluginRoot`). ✓
- `plugins/README.md` — Task 5. ✓
- Read-only store access through the host, no direct `@/store` import — Task 1 (`PluginStoreAccessor` on host) + Task 2 (`usePluginStore`) + Task 4 (`PluginRoot` wires accessor). ✓
- Per-plugin i18n namespace + `messages/<locale>.json` — Task 3 (`example/messages/en.json`, namespace `example`), documented in README + Integration hooks. ✓
- Unit tests (Vitest + Testing Library): registry register→retrieve-by-slot, PluginSlot renders contributions — Tasks 1–4. ✓
- File ownership respected: only `src/plugins/**` and `src/components/plugins/**` created; slot placement deferred to coordinator via "Integration hooks". ✓

**2. Placeholder scan:** No TBD/TODO-as-work. The commented `// exampleCrmPlugin` in `index.ts` and the `// import` are intentional DISABLED wiring per the spec, not placeholders. Every code step contains full code. ✓

**3. Type consistency:** `SlotName` (`nav-item|side-panel|task-panel|header-action|settings-page`) is used identically across `types.ts`, `registry.ts`, `PluginSlot`, tests, README, and Integration hooks. `SlotContribution` shape (`id/component/order?/title?`) matches every `contribute*` call and the example manifest. `PluginStoreAccessor` (`getState`/`subscribe`) is consistent across `types.ts`, `usePluginStore`, `PluginRoot`, and all test fakes. Namespaced id convention `${pluginId}.${id}` is asserted in the registry test (`a.panel`) and the example test (`example.task-panel`) and matches `registry.add`. `initPlugins(store)` signature matches `PluginRoot`'s call and `index.test.ts`. ✓

**Notes for executor:** Task 4 Step 6 and Task 5 Step 3 assume `@/store` (with `useFlexStore`) from Part 3+ is present — Part 8 is last in the roadmap. If `@/store` is missing, do NOT stub it; flag to the coordinator. The `usePluginStore` selector must return a primitive/memoized value (documented) to avoid `useSyncExternalStore` re-render loops.
