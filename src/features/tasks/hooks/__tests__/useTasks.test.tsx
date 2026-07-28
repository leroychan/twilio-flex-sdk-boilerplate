import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const { mockState } = vi.hoisted(() => ({
  mockState: {
    tasks: [
      {
        reservationSid: 'WR1',
        taskSid: 'WT1',
        taskChannelUniqueName: 'voice',
        attributes: {},
        status: 'pending',
      },
    ] as unknown[],
  },
}));

vi.mock('@/store', () => ({
  useFlexStore: (selector: (s: typeof mockState) => unknown) => selector(mockState),
}));
vi.mock('@/lib/flex/actions/Task', () => ({
  acceptTask: vi.fn().mockResolvedValue(undefined),
  rejectTask: vi.fn().mockResolvedValue(undefined),
  wrapUpTask: vi.fn().mockResolvedValue(undefined),
  completeTask: vi.fn().mockResolvedValue(undefined),
  endTask: vi.fn().mockResolvedValue(undefined),
  setTaskAttributes: vi.fn().mockResolvedValue(undefined),
}));

import * as TaskActions from '@/lib/flex/actions/Task';
import { useTasks } from '../useTasks';

describe('useTasks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('exposes tasks from the store', () => {
    const { result } = renderHook(() => useTasks());
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0]?.taskSid).toBe('WT1');
  });

  it('delegates each command to its Task action wrapper', async () => {
    const { result } = renderHook(() => useTasks());
    await result.current.accept('WT1');
    await result.current.reject('WT1');
    await result.current.wrapUp('WT1');
    await result.current.complete('WT1');
    await result.current.end('WT1', 'done');
    await result.current.setAttributes('WT1', { priority: 'high' }, { merge: true });

    expect(TaskActions.acceptTask).toHaveBeenCalledWith('WT1');
    expect(TaskActions.rejectTask).toHaveBeenCalledWith('WT1');
    expect(TaskActions.wrapUpTask).toHaveBeenCalledWith('WT1');
    expect(TaskActions.completeTask).toHaveBeenCalledWith('WT1');
    expect(TaskActions.endTask).toHaveBeenCalledWith('WT1', 'done');
    expect(TaskActions.setTaskAttributes).toHaveBeenCalledWith('WT1', { priority: 'high' }, { merge: true });
  });
});
