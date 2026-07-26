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
