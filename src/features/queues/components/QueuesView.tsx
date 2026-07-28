'use client';

import { useTranslations } from 'next-intl';
import { Loader } from 'lucide-react';
import { useQueueStats, type QueueStatsState } from '../hooks/useQueueStats';

/** Format seconds as m:ss / h:mm:ss. */
function formatWait(seconds: number): string {
  if (!seconds || seconds <= 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Real-time TaskRouter queue metrics (external — needs Twilio creds server-side). */
export function QueuesView({ stats }: { stats?: QueueStatsState } = {}) {
  const t = useTranslations('queues');
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const live = stats ?? useQueueStats();

  if (!live.configured) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="text-lg font-semibold text-text">{t('title')}</h1>
        <p className="max-w-md text-sm text-muted">{t('notConfigured')}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg">
      <div className="shrink-0 px-8 pt-6 pb-4">
        <h1 className="text-xl font-semibold text-text">{t('title')}</h1>
        <p className="text-sm text-muted">{t('subtitle')}</p>
      </div>
      <div className="flex-1 overflow-y-auto px-8 pb-8">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-bg">
            <tr className="border-b border-border text-left text-xs font-medium text-muted">
              <th className="py-2 pr-6">{t('columns.queue')}</th>
              <th className="py-2 pr-6 text-right">{t('columns.waiting')}</th>
              <th className="py-2 pr-6 text-right">{t('columns.active')}</th>
              <th className="py-2 pr-6 text-right">{t('columns.longestWait')}</th>
              <th className="py-2 pr-6 text-right">{t('columns.available')}</th>
              <th className="py-2 pr-6 text-right">{t('columns.eligible')}</th>
              <th className="py-2 text-right">{t('columns.avgWait')}</th>
            </tr>
          </thead>
          <tbody>
            {live.loading && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-muted">
                  <Loader className="mx-auto h-6 w-6 animate-spin" aria-hidden />
                </td>
              </tr>
            )}
            {!live.loading && live.error && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-danger">
                  {t('error')}
                </td>
              </tr>
            )}
            {!live.loading && !live.error && live.queues.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-muted">
                  {t('empty')}
                </td>
              </tr>
            )}
            {!live.loading &&
              !live.error &&
              live.queues.map((q) => (
                <tr key={q.sid} className="border-b border-border hover:bg-surface-2">
                  <td className="py-3 pr-6">
                    <p className="font-medium text-text">{q.friendlyName}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-muted">{q.sid}</p>
                  </td>
                  <td className="py-3 pr-6 text-right tabular-nums text-text">{q.waiting}</td>
                  <td className="py-3 pr-6 text-right tabular-nums text-text">{q.active}</td>
                  <td className="py-3 pr-6 text-right tabular-nums text-text">
                    {formatWait(q.longestWaitAge)}
                  </td>
                  <td className="py-3 pr-6 text-right tabular-nums text-text">{q.availableWorkers}</td>
                  <td className="py-3 pr-6 text-right tabular-nums text-text">{q.eligibleWorkers}</td>
                  <td className="py-3 text-right tabular-nums text-text">
                    {formatWait(q.avgWaitAccepted)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
