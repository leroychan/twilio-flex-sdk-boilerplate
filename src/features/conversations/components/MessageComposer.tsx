'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { MediaPickerModal } from './MediaPickerModal';

export function MessageComposer({
  onSend,
  onTyping,
  onSendMedia,
}: {
  onSend: (body: string) => void;
  onTyping?: () => void;
  onSendMedia?: (file: File) => void;
}) {
  const t = useTranslations('conversations');
  const [value, setValue] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const submit = () => {
    const body = value.trim();
    if (!body) return;
    onSend(body);
    setValue('');
  };
  return (
    <div className="flex items-end gap-2 border-t border-border p-3">
      {onSendMedia && (
        <>
          <Button variant="secondary" aria-label={t('attach')} onClick={() => setPickerOpen(true)}>
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
        placeholder={t('composerPlaceholder')}
        rows={2}
        className="flex-1 resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm text-text"
      />
      <Button onClick={submit} disabled={!value.trim()}>
        {t('send')}
      </Button>
    </div>
  );
}
