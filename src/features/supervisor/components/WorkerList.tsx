'use client';
import { useTranslations } from 'next-intl';
import type { MonitoredWorker } from '@/store/slices/supervisor';
import { WorkerCard } from './WorkerCard';
import type { ActivityOption } from './WorkerActivitySelect';

export function WorkerList({
  workers,
  activities,
  onActivityChange,
  onAttributesSave,
}: {
  workers: MonitoredWorker[];
  activities: ActivityOption[];
  onActivityChange: (workerSid: string, activitySid: string) => void;
  onAttributesSave: (workerSid: string, attributes: Record<string, unknown>) => void;
}) {
  const t = useTranslations('supervisor');
  if (workers.length === 0) {
    return <p className="text-sm text-muted">{t('workers.empty')}</p>;
  }
  return (
    <div>
      {workers.map((worker) => (
        <WorkerCard
          key={worker.sid}
          worker={worker}
          activities={activities}
          onActivityChange={onActivityChange}
          onAttributesSave={onAttributesSave}
        />
      ))}
    </div>
  );
}
