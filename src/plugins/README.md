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
