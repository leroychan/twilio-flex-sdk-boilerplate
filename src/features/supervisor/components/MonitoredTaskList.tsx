'use client';
import { useTranslations } from 'next-intl';
import type { MonitoredTask } from '@/store/slices/supervisor';

export function MonitoredTaskList({
  tasks,
  activeTaskSid,
  onSelect,
}: {
  tasks: MonitoredTask[];
  activeTaskSid: string | null;
  onSelect: (taskSid: string) => void;
}) {
  const t = useTranslations('supervisor');
  if (tasks.length === 0) {
    return <p className="text-sm text-muted">{t('tasks.empty')}</p>;
  }
  return (
    <ul className="space-y-1">
      {tasks.map((task) => {
        const active = activeTaskSid === task.taskSid;
        return (
          <li key={task.taskSid}>
            <button
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(task.taskSid)}
              className={`w-full rounded-md border border-border px-3 py-2 text-left text-sm ${
                active ? 'bg-surface-2 text-text' : 'bg-surface text-text hover:bg-surface-2'
              }`}
            >
              <span className="font-medium">{task.workerName}</span>
              <span className="ml-2 text-xs text-muted">
                {t('tasks.queue')}: {task.queueName}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
