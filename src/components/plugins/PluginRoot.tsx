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
