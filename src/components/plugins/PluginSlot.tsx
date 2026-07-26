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
