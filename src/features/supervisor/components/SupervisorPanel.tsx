'use client';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/Card';
import { useSupervisor } from '../hooks/useSupervisor';
import type { ActivityOption } from './WorkerActivitySelect';
import { WorkerList } from './WorkerList';
import { MonitoredTaskList } from './MonitoredTaskList';
import { MonitorControls } from './MonitorControls';

export function SupervisorPanel({ activities = [] }: { activities?: ActivityOption[] }) {
  const t = useTranslations('supervisor');
  const {
    workers,
    monitoredTasks,
    activeMonitorTaskSid,
    monitorMode,
    supervisorError,
    startMode,
    stopMonitoring,
    changeWorkerActivity,
    updateWorkerAttributes,
  } = useSupervisor();

  return (
    <section aria-label={t('title')} className="space-y-4 p-4">
      <h2 className="font-display text-xl font-bold text-text">{t('title')}</h2>
      {supervisorError ? (
        <p role="alert" className="text-sm text-danger">
          {supervisorError}
        </p>
      ) : null}

      <Card>
        <h3 className="mb-2 font-semibold text-text">{t('tasks.heading')}</h3>
        <MonitoredTaskList
          tasks={monitoredTasks}
          activeTaskSid={activeMonitorTaskSid}
          onSelect={(taskSid) => startMode(taskSid, 'monitor')}
        />
        {activeMonitorTaskSid ? (
          <div className="mt-3">
            <MonitorControls
              activeMode={monitorMode}
              onStart={(mode) => startMode(activeMonitorTaskSid, mode)}
              onStop={stopMonitoring}
            />
          </div>
        ) : null}
      </Card>

      <Card>
        <h3 className="mb-2 font-semibold text-text">{t('workers.heading')}</h3>
        <WorkerList
          workers={workers}
          activities={activities}
          onActivityChange={changeWorkerActivity}
          onAttributesSave={updateWorkerAttributes}
        />
      </Card>
    </section>
  );
}
