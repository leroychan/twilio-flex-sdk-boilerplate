import { useCallback } from 'react';
import { useFlexStore } from '@/store';
import type { TaskView, TasksSlice } from '@/store/slices/tasks';
import * as TaskActions from '@/lib/flex/actions/Task';

export interface UseTasksResult {
  tasks: TaskView[];
  accept: (taskSid: string) => Promise<void>;
  reject: (taskSid: string) => Promise<void>;
  wrapUp: (taskSid: string) => Promise<void>;
  complete: (taskSid: string) => Promise<void>;
  end: (taskSid: string, reason?: string) => Promise<void>;
  setAttributes: (taskSid: string, attributes: Record<string, unknown>) => Promise<void>;
}

export function useTasks(): UseTasksResult {
  const tasks = useFlexStore((s: TasksSlice) => s.tasks);

  const accept = useCallback((taskSid: string) => TaskActions.acceptTask(taskSid), []);
  const reject = useCallback((taskSid: string) => TaskActions.rejectTask(taskSid), []);
  const wrapUp = useCallback((taskSid: string) => TaskActions.wrapUpTask(taskSid), []);
  const complete = useCallback((taskSid: string) => TaskActions.completeTask(taskSid), []);
  const end = useCallback(
    (taskSid: string, reason?: string) => TaskActions.endTask(taskSid, reason),
    [],
  );
  const setAttributes = useCallback(
    (taskSid: string, attributes: Record<string, unknown>) =>
      TaskActions.setTaskAttributes(taskSid, attributes),
    [],
  );

  return { tasks, accept, reject, wrapUp, complete, end, setAttributes };
}
