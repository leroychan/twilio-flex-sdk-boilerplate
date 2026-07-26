'use client';

import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { TaskView } from '@/store/slices/tasks';

export interface TaskCardProps {
  task: TaskView;
  onAccept: (taskSid: string) => void;
  onReject: (taskSid: string) => void;
  onWrapUp: (taskSid: string) => void;
  onComplete: (taskSid: string) => void;
}

export function TaskCard({ task, onAccept, onReject, onWrapUp, onComplete }: TaskCardProps) {
  const t = useTranslations('tasks');

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-text">{task.taskChannelUniqueName}</span>
        <span className="text-xs text-muted">{t(`status.${task.status}`)}</span>
      </div>
      <div className="flex gap-2">
        {task.status === 'pending' && (
          <>
            <Button variant="primary" onClick={() => onAccept(task.taskSid)}>
              {t('accept')}
            </Button>
            <Button variant="danger" onClick={() => onReject(task.taskSid)}>
              {t('reject')}
            </Button>
          </>
        )}
        {task.status === 'accepted' && (
          <Button variant="secondary" onClick={() => onWrapUp(task.taskSid)}>
            {t('wrapUp')}
          </Button>
        )}
        {task.status === 'wrapping' && (
          <Button variant="primary" onClick={() => onComplete(task.taskSid)}>
            {t('complete')}
          </Button>
        )}
      </div>
    </Card>
  );
}
