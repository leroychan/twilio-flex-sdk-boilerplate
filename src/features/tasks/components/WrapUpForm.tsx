'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';

export interface WrapUpValues {
  disposition: string;
  notes: string;
}

const DISPOSITIONS = ['resolved', 'unresolved', 'callback', 'other'] as const;

/** Disposition + notes form shown in a task's wrapping state; calls onComplete. */
export function WrapUpForm({
  onComplete,
  completing = false,
}: {
  onComplete: (values: WrapUpValues) => void | Promise<void>;
  completing?: boolean;
}) {
  const t = useTranslations('tasks');
  const [disposition, setDisposition] = useState<string>('resolved');
  const [notes, setNotes] = useState('');

  return (
    <form
      className="flex w-full flex-col gap-3 px-6"
      onSubmit={(e) => {
        e.preventDefault();
        void onComplete({ disposition, notes });
      }}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="wrapup-disposition" className="text-xs font-medium text-muted">
          {t('wrapUpForm.dispositionLabel')}
        </label>
        <select
          id="wrapup-disposition"
          value={disposition}
          onChange={(e) => setDisposition(e.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary"
        >
          {DISPOSITIONS.map((d) => (
            <option key={d} value={d}>
              {t(`wrapUpForm.disposition.${d}`)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="wrapup-notes" className="text-xs font-medium text-muted">
          {t('wrapUpForm.notesLabel')}
        </label>
        <textarea
          id="wrapup-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('wrapUpForm.notesPlaceholder')}
          className="min-h-[100px] resize-none rounded-md border border-border bg-surface p-3 text-sm text-text outline-none placeholder:text-muted focus:border-primary"
        />
      </div>

      <Button type="submit" disabled={completing}>
        {completing ? t('wrapUpForm.completing') : t('wrapUpForm.complete')}
      </Button>
    </form>
  );
}
