'use client';

import { useTranslations } from 'next-intl';
import { useFlexStore } from '@/store';
import { useTasks } from '../hooks/useTasks';
import { TaskCard } from './TaskCard';

export function TaskList() {
  const t = useTranslations('tasks');
  const { tasks, accept, reject, wrapUp, complete } = useTasks();
  const conversations = useFlexStore((s) => s.conversations);
  const activeTaskSid = useFlexStore((s) => s.activeTaskSid);
  const setActiveTaskSid = useFlexStore((s) => s.setActiveTaskSid);

  if (tasks.length === 0) {
    return <p className="p-4 text-sm text-muted">{t('empty')}</p>;
  }

  // Last-message preview for messaging tasks, matched by taskSid.
  const previewFor = (taskSid: string): string | undefined => {
    const conv = Object.values(conversations).find((c) => c.taskSid === taskSid);
    return conv?.messages.at(-1)?.body || undefined;
  };

  return (
    <div className="divide-y divide-border" role="list" aria-label={t('listLabel')}>
      {tasks.map((task) => (
        <TaskCard
          key={task.reservationSid}
          task={task}
          preview={previewFor(task.taskSid)}
          selected={activeTaskSid === task.taskSid}
          onSelect={() => setActiveTaskSid(task.taskSid)}
          onAccept={accept}
          onReject={reject}
          onWrapUp={wrapUp}
          onComplete={complete}
        />
      ))}
    </div>
  );
}
