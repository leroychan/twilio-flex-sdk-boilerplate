'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Inbox } from 'lucide-react';
import { useFlexStore } from '@/store';
import { Card } from '@/components/ui/Card';
import { TaskWorkspace } from './TaskWorkspace';

/**
 * Middle column entry point: shows the no-selection placeholder, otherwise the
 * tabbed TaskWorkspace. The wired CallPanel is injected from the shell.
 */
export function SelectedTaskDetail({ callPanel }: { callPanel: ReactNode }) {
  const t = useTranslations('session');
  const activeTaskSid = useFlexStore((s) => s.activeTaskSid);
  const tasks = useFlexStore((s) => s.tasks);
  const task = tasks.find((x) => x.taskSid === activeTaskSid);

  if (!task) {
    return (
      <Card className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Inbox className="h-6 w-6" aria-hidden />
        </span>
        <p className="text-muted">{t('desktop.noSelection')}</p>
      </Card>
    );
  }

  return <TaskWorkspace callPanel={callPanel} />;
}
