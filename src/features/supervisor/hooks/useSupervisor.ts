'use client';
import { useCallback } from 'react';
import { useFlexStore } from '@/store';
import {
  monitorCall,
  coachCall,
  bargeCall,
  setWorkerActivity,
  setWorkerAttributes,
} from '@/lib/flex/actions/Supervisor';
import type { SupervisorMode } from '@/store/slices/supervisor';

function messageOf(error: unknown): string {
  return (error as { message?: string })?.message ?? 'Unknown error';
}

export function useSupervisor() {
  const workers = useFlexStore((s) => s.workers);
  const monitoredTasks = useFlexStore((s) => s.monitoredTasks);
  const activeMonitorTaskSid = useFlexStore((s) => s.activeMonitorTaskSid);
  const monitorMode = useFlexStore((s) => s.monitorMode);
  const supervisorError = useFlexStore((s) => s.supervisorError);
  const setActiveMonitor = useFlexStore((s) => s.setActiveMonitor);
  const setSupervisorError = useFlexStore((s) => s.setSupervisorError);

  const startMode = useCallback(
    async (taskSid: string, mode: SupervisorMode) => {
      setSupervisorError(null);
      try {
        if (mode === 'monitor') {
          // MonitorCall needs the agent's reservation SID; resolve it from the
          // monitored-task list (seeded by the event bridge / demo data).
          const reservationSid =
            monitoredTasks.find((t) => t.taskSid === taskSid)?.reservationSid ?? '';
          await monitorCall(taskSid, reservationSid);
        } else if (mode === 'coach') {
          await coachCall(taskSid);
        } else {
          await bargeCall(taskSid);
        }
        setActiveMonitor(taskSid, mode);
      } catch (error) {
        setSupervisorError(messageOf(error));
      }
    },
    [monitoredTasks, setActiveMonitor, setSupervisorError],
  );

  const stopMonitoring = useCallback(() => {
    setActiveMonitor(null, null);
  }, [setActiveMonitor]);

  const changeWorkerActivity = useCallback(
    async (workerSid: string, activitySid: string) => {
      setSupervisorError(null);
      try {
        await setWorkerActivity(workerSid, activitySid);
      } catch (error) {
        setSupervisorError(messageOf(error));
      }
    },
    [setSupervisorError],
  );

  const updateWorkerAttributes = useCallback(
    async (workerSid: string, attributes: Record<string, unknown>) => {
      setSupervisorError(null);
      try {
        await setWorkerAttributes(workerSid, attributes);
      } catch (error) {
        setSupervisorError(messageOf(error));
      }
    },
    [setSupervisorError],
  );

  return {
    workers,
    monitoredTasks,
    activeMonitorTaskSid,
    monitorMode,
    supervisorError,
    startMode,
    stopMonitoring,
    changeWorkerActivity,
    updateWorkerAttributes,
  };
}
