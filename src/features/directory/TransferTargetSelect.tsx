'use client';
import { useTranslations } from 'next-intl';
import type { QueueInfo, WorkerDirectoryInfo } from '@/lib/flex/workspace';

interface Props {
  queues: QueueInfo[];
  workers: WorkerDirectoryInfo[];
  value: string;
  onChange: (sid: string) => void;
}

/** A grouped dropdown of transfer targets: task queues and individual agents. */
export function TransferTargetSelect({ queues, workers, value, onChange }: Props) {
  const t = useTranslations('directory');
  return (
    <select
      aria-label={t('selectTarget')}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text"
    >
      <option value="">{t('selectTarget')}</option>
      {queues.length > 0 && (
        <optgroup label={t('queues')}>
          {queues.map((q) => (
            <option key={q.sid} value={q.sid}>
              {q.name}
            </option>
          ))}
        </optgroup>
      )}
      {workers.length > 0 && (
        <optgroup label={t('agents')}>
          {workers.map((w) => (
            <option key={w.sid} value={w.sid}>
              {w.name}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}
