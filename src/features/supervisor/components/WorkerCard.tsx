'use client';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/Card';
import type { MonitoredWorker } from '@/store/slices/supervisor';
import { WorkerActivitySelect, type ActivityOption } from './WorkerActivitySelect';
import { WorkerAttributesEditor } from './WorkerAttributesEditor';

export function WorkerCard({
  worker,
  activities,
  onActivityChange,
  onAttributesSave,
}: {
  worker: MonitoredWorker;
  activities: ActivityOption[];
  onActivityChange: (workerSid: string, activitySid: string) => void;
  onAttributesSave: (workerSid: string, attributes: Record<string, unknown>) => void;
}) {
  const t = useTranslations('supervisor');
  return (
    <Card className="mb-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-text">{worker.friendlyName}</p>
          <span className={`text-xs ${worker.available ? 'text-success' : 'text-muted'}`}>
            {worker.activityName} ·{' '}
            {worker.available ? t('workers.available') : t('workers.unavailable')}
          </span>
        </div>
        <WorkerActivitySelect
          activities={activities}
          currentActivitySid={worker.activitySid}
          onChange={(activitySid) => onActivityChange(worker.sid, activitySid)}
        />
      </div>
      <WorkerAttributesEditor
        attributes={worker.attributes}
        onSave={(attributes) => onAttributesSave(worker.sid, attributes)}
      />
    </Card>
  );
}
