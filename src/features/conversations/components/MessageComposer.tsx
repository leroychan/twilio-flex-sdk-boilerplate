'use client';
import { useState, type KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { MediaPickerModal } from './MediaPickerModal';

export function MessageComposer({
  onSend,
  onTyping,
  onSendMedia,
  disabled = false,
}: {
  onSend: (body: string) => void;
  onTyping?: () => void;
  onSendMedia?: (file: File) => void;
  /** Blocks typing/sending — e.g. while the task is not yet accepted (preview). */
  disabled?: boolean;
}) {
  const t = useTranslations('conversations');
  const [value, setValue] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const submit = () => {
    if (disabled) return;
    const body = value.trim();
    if (!body) return;
    onSend(body);
    setValue('');
  };
  // Enter sends; Shift+Enter inserts a newline.
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };
  return (
    <div className="flex items-end gap-2 border-t border-border p-3">
      {onSendMedia && (
        <>
          <Button
            variant="secondary"
            aria-label={t('attach')}
            onClick={() => setPickerOpen(true)}
            disabled={disabled}
          >
            {'📎'}
          </Button>
          <MediaPickerModal
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            onSend={(file) => onSendMedia(file)}
          />
        </>
      )}
      <textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (e.target.value.length > 0) onTyping?.();
        }}
        onKeyDown={onKeyDown}
        disabled={disabled}
        placeholder={t('composerPlaceholder')}
        rows={2}
        className="flex-1 resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm text-text disabled:cursor-not-allowed disabled:opacity-60"
      />
      <Button onClick={submit} disabled={disabled || !value.trim()}>
        {t('send')}
      </Button>
    </div>
  );
}
