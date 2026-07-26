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
