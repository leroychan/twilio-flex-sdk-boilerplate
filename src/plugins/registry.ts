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
