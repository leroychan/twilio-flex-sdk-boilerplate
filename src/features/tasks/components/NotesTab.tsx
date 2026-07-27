'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useTasks } from '../hooks/useTasks';

const DEBOUNCE_MS = 600;

/**
 * The "Notes" tab. Persists agent notes into the task's attributes under
 * `agentNotes` via SetTaskAttributes (debounced), merged with the current
 * attributes so siblings aren't clobbered. Because notes live in task
 * attributes they survive tab/task switches and are available at wrap-up.
 */
export function NotesTab({
  taskSid,
  attributes,
  onPersist,
}: {
  taskSid: string;
  attributes: Record<string, unknown>;
  onPersist?: (taskSid: string, attributes: Record<string, unknown>) => Promise<void>;
}) {
  const t = useTranslations('tasks');
  const { setAttributes } = useTasks();
  const persist = onPersist ?? setAttributes;
  const [value, setValue] = useState(
    typeof attributes.agentNotes === 'string' ? (attributes.agentNotes as string) : '',
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const onChange = (next: string) => {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void persist(taskSid, { ...attributes, agentNotes: next });
    }, DEBOUNCE_MS);
  };

  return (
    <div className="p-4">
      <label className="sr-only" htmlFor={`notes-${taskSid}`}>
        {t('notes.label')}
      </label>
      <textarea
        id={`notes-${taskSid}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('notes.placeholder')}
        className="min-h-[200px] w-full resize-none rounded-md border border-border bg-surface p-3 text-sm text-text outline-none placeholder:text-muted focus:border-primary"
      />
    </div>
  );
}
