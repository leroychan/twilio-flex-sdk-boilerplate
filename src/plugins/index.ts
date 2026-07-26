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
