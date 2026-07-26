'use client';

import { useTranslations } from 'next-intl';
import { useTasks } from '../hooks/useTasks';
import { TaskCard } from './TaskCard';

export function TaskList() {
  const t = useTranslations('tasks');
  const { tasks, accept, reject, wrapUp, complete } = useTasks();

  if (tasks.length === 0) {
    return <p className="p-4 text-sm text-muted">{t('empty')}</p>;
  }

  return (
    <div className="flex flex-col gap-3 p-4" role="list" aria-label={t('listLabel')}>
      {tasks.map((task) => (
        <div role="listitem" key={task.reservationSid}>
          <TaskCard
            task={task}
            onAccept={(sid) => void accept(sid)}
            onReject={(sid) => void reject(sid)}
            onWrapUp={(sid) => void wrapUp(sid)}
            onComplete={(sid) => void complete(sid)}
          />
        </div>
      ))}
    </div>
  );
}
