'use client';

import { useTranslations } from 'next-intl';

/** Readable render of a task's attributes — the "Info" tab. */
export function TaskAttributesView({ attributes }: { attributes: Record<string, unknown> }) {
  const t = useTranslations('tasks');
  const entries = Object.entries(attributes ?? {});

  if (entries.length === 0) {
    return <p className="p-4 text-sm text-muted">{t('info.empty')}</p>;
  }

  return (
    <dl className="divide-y divide-border">
      {entries.map(([key, value]) => {
        const isScalar = value === null || typeof value !== 'object';
        return (
          <div key={key} className="px-4 py-2.5">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">{key}</dt>
            <dd className="mt-0.5 text-sm text-text">
              {isScalar ? (
                String(value)
              ) : (
                <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs">
                  {JSON.stringify(value, null, 2)}
                </pre>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
