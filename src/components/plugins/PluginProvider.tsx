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
