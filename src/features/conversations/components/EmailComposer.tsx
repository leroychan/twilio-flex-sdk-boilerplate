'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Editor from 'react-simple-wysiwyg';
import { Button } from '@/components/ui/Button';

/** Rich reply composer for email conversations: subject + WYSIWYG HTML body. */
export function EmailComposer({
  onSend,
  defaultSubject,
  disabled = false,
}: {
  onSend: (htmlBody: string, subject: string) => void;
  defaultSubject?: string;
  /** Blocks editing/sending — e.g. while the task is not yet accepted (preview). */
  disabled?: boolean;
}) {
  const t = useTranslations('conversations');
  const [subject, setSubject] = useState(defaultSubject ?? '');
  const [html, setHtml] = useState('');
  const submit = () => {
    if (disabled) return;
    const body = html.trim();
    if (!body) return;
    onSend(body, subject.trim());
    setHtml('');
  };
  return (
    <div className="flex flex-col gap-2 border-t border-border p-3">
      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder={t('email.subject')}
        aria-label={t('email.subject')}
        disabled={disabled}
        className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text disabled:cursor-not-allowed disabled:opacity-60"
      />
      <div className="rounded-md border border-border bg-surface">
        <Editor value={html} onChange={(e) => setHtml(e.target.value)} disabled={disabled} />
      </div>
      <div className="flex justify-end">
        <Button onClick={submit} disabled={disabled || !html.trim()}>
          {t('email.reply')}
        </Button>
      </div>
    </div>
  );
}
