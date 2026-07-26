'use client';

import { useTranslations } from 'next-intl';
import { usePresence } from '../hooks/usePresence';

export function ActivitySelector() {
  const t = useTranslations('presence');
  const { activities, currentActivitySid, changeActivity } = usePresence();

  return (
    <label className="flex items-center gap-2 text-sm text-text">
      <span className="sr-only">{t('activityLabel')}</span>
      <select
        aria-label={t('activityLabel')}
        value={currentActivitySid ?? ''}
        onChange={(e) => {
          void changeActivity(e.target.value);
        }}
        className="rounded-md border border-border bg-surface px-3 py-2 text-text"
      >
        {activities.length === 0 && <option value="">{t('noActivities')}</option>}
        {activities.map((activity) => (
          <option key={activity.sid} value={activity.sid}>
            {activity.name}
          </option>
        ))}
      </select>
    </label>
  );
}
