import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  monitorCall,
  coachCall,
  bargeCall,
  setWorkerActivity,
  setWorkerAttributes,
} from '@/lib/flex/actions/Supervisor';
import { useSupervisor } from '../useSupervisor';
import { fetchWorkersList } from '@/lib/flex/workspace';

const { store } = vi.hoisted(() => ({
  store: {
    workers: [] as unknown[],
    monitoredTasks: [] as Array<{ taskSid: string; reservationSid: string }>,
    activeMonitorTaskSid: null as string | null,
    monitorMode: null as string | null,
    supervisorError: null as string | null,
    setActiveMonitor: vi.fn(),
    setSupervisorError: vi.fn(),
    setWorkers: vi.fn(),
  },
}));

vi.mock('@/store', () => ({
  useFlexStore: (selector: (s: typeof store) => unknown) => selector(store),
}));
vi.mock('@/lib/flex/actions/Supervisor', () => ({
  monitorCall: vi.fn(),
  coachCall: vi.fn(),
  bargeCall: vi.fn(),
  setWorkerActivity: vi.fn(),
  setWorkerAttributes: vi.fn(),
}));
vi.mock('@/lib/flex/workspace', () => ({
  fetchWorkersList: vi.fn().mockResolvedValue([]),
}));

beforeEach(() => {
  vi.clearAllMocks();
  store.monitoredTasks = [];
});

describe('useSupervisor', () => {
  it('startMode("monitor") looks up the reservation, calls monitorCall, then records the session', async () => {
    store.monitoredTasks = [{ taskSid: 'WT1', reservationSid: 'WR1' }];
    const { result } = renderHook(() => useSupervisor());
    await act(async () => {
      await result.current.startMode('WT1', 'monitor');
    });
    expect(monitorCall).toHaveBeenCalledWith('WT1', 'WR1');
    expect(store.setSupervisorError).toHaveBeenCalledWith(null);
    expect(store.setActiveMonitor).toHaveBeenCalledWith('WT1', 'monitor');
  });

  it('startMode routes coach and barge to their wrappers', async () => {
    const { result } = renderHook(() => useSupervisor());
    await act(async () => {
      await result.current.startMode('WT2', 'coach');
      await result.current.startMode('WT3', 'barge');
    });
    expect(coachCall).toHaveBeenCalledWith('WT2');
    expect(bargeCall).toHaveBeenCalledWith('WT3');
  });

  it('startMode writes the error message and skips setActiveMonitor on failure', async () => {
    store.monitoredTasks = [{ taskSid: 'WT1', reservationSid: 'WR1' }];
    vi.mocked(monitorCall).mockRejectedValueOnce({ code: 'x', message: 'denied' });
    const { result } = renderHook(() => useSupervisor());
    await act(async () => {
      await result.current.startMode('WT1', 'monitor');
    });
    expect(store.setSupervisorError).toHaveBeenLastCalledWith('denied');
    expect(store.setActiveMonitor).not.toHaveBeenCalled();
  });

  it('stopMonitoring clears the active session', () => {
    const { result } = renderHook(() => useSupervisor());
    act(() => {
      result.current.stopMonitoring();
    });
    expect(store.setActiveMonitor).toHaveBeenCalledWith(null, null);
  });

  it('changeWorkerActivity delegates to setWorkerActivity', async () => {
    const { result } = renderHook(() => useSupervisor());
    await act(async () => {
      await result.current.changeWorkerActivity('WK1', 'WA1');
    });
    expect(setWorkerActivity).toHaveBeenCalledWith('WK1', 'WA1');
  });

  it('updateWorkerAttributes delegates to setWorkerAttributes', async () => {
    const { result } = renderHook(() => useSupervisor());
    await act(async () => {
      await result.current.updateWorkerAttributes('WK1', { role: 'lead' });
    });
    expect(setWorkerAttributes).toHaveBeenCalledWith('WK1', { role: 'lead' });
  });

  it('loads the worker roster on mount and maps it to MonitoredWorker', async () => {
    vi.mocked(fetchWorkersList).mockResolvedValueOnce([
      { sid: 'WK1', name: 'Ada', activitySid: 'WA1', activityName: 'Available', available: true, attributes: { role: 'lead' } },
    ]);
    await act(async () => {
      renderHook(() => useSupervisor());
    });
    expect(store.setWorkers).toHaveBeenCalledWith([
      { sid: 'WK1', friendlyName: 'Ada', activitySid: 'WA1', activityName: 'Available', available: true, attributes: { role: 'lead' } },
    ]);
  });
});
