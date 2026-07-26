'use client';
import { useTranslations } from 'next-intl';

export interface ActivityOption {
  sid: string;
  name: string;
}

export function WorkerActivitySelect({
  activities,
  currentActivitySid,
  onChange,
  disabled = false,
}: {
  activities: ActivityOption[];
  currentActivitySid: string;
  onChange: (activitySid: string) => void;
  disabled?: boolean;
}) {
  const t = useTranslations('supervisor');
  return (
    <select
      aria-label={t('workers.changeActivity')}
      value={currentActivitySid}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-text disabled:opacity-50"
    >
      {activities.map((activity) => (
        <option key={activity.sid} value={activity.sid}>
          {activity.name}
        </option>
      ))}
    </select>
  );
}
