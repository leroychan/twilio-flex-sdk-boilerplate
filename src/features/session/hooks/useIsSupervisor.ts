'use client';

import { useFlexStore } from '@/store';

// Flex encodes elevated capability in the worker's `roles` attribute. Either of
// these grants the supervisor console.
const SUPERVISOR_ROLES = ['supervisor', 'admin'];

/**
 * True when the signed-in worker carries a supervisor/admin role in its
 * TaskRouter attributes. Drives whether the supervisor drawer is offered at all.
 */
export function useIsSupervisor(): boolean {
  const worker = useFlexStore((s) => s.worker);
  const roles = (worker?.attributes as { roles?: unknown } | undefined)?.roles;
  if (!Array.isArray(roles)) return false;
  return roles.some((role) => typeof role === 'string' && SUPERVISOR_ROLES.includes(role));
}
