import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFlexStore } from '@/store';
import { useIsSupervisor } from '../useIsSupervisor';

function setWorker(attributes: Record<string, unknown> | null) {
  // The store types `worker` as the SDK Worker; a partial stand-in is enough here.
  useFlexStore.setState({ worker: (attributes ? { attributes } : null) as never });
}

describe('useIsSupervisor', () => {
  beforeEach(() => setWorker(null));

  it('is false when there is no worker', () => {
    const { result } = renderHook(() => useIsSupervisor());
    expect(result.current).toBe(false);
  });

  it('is false for a plain agent', () => {
    setWorker({ roles: ['agent'] });
    const { result } = renderHook(() => useIsSupervisor());
    expect(result.current).toBe(false);
  });

  it('is true when roles include supervisor', () => {
    setWorker({ roles: ['agent', 'supervisor'] });
    const { result } = renderHook(() => useIsSupervisor());
    expect(result.current).toBe(true);
  });

  it('is true when roles include admin', () => {
    setWorker({ roles: ['admin'] });
    const { result } = renderHook(() => useIsSupervisor());
    expect(result.current).toBe(true);
  });
});
