'use client';

import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { usePresence } from '../hooks/usePresence';

export function ActivitySelector() {
  const t = useTranslations('presence');
  const { activities, currentActivitySid, changeActivity } = usePresence();

  const current = activities.find((a) => a.sid === currentActivitySid);
  const available = current?.available ?? false;
  const dotColor = available ? 'bg-success' : 'bg-neutral-400';

  return (
    <div className="relative flex items-center gap-2 rounded-full border border-border bg-surface py-1.5 pl-3 pr-2 shadow-sm">
      <span className="relative flex h-2.5 w-2.5" aria-hidden>
        {available && (
          <span className="absolute inline-flex h-full w-full animate-status-ping rounded-full bg-success opacity-75" />
        )}
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dotColor}`} />
      </span>
      <span className="sr-only">{t('activityLabel')}</span>
      <select
        aria-label={t('activityLabel')}
        value={currentActivitySid ?? ''}
        onChange={(e) => {
          void changeActivity(e.target.value);
        }}
        className="appearance-none bg-transparent pr-5 text-sm font-medium text-text focus-visible:outline-none"
      >
        {activities.length === 0 && <option value="">{t('noActivities')}</option>}
        {activities.map((activity) => (
          <option key={activity.sid} value={activity.sid}>
            {activity.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 h-4 w-4 text-muted" aria-hidden />
    </div>
  );
}
