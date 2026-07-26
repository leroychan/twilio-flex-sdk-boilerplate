'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';

export function MessageComposer({ onSend }: { onSend: (body: string) => void }) {
  const t = useTranslations('conversations');
  const [value, setValue] = useState('');
  const submit = () => {
    const body = value.trim();
    if (!body) return;
    onSend(body);
    setValue('');
  };
  return (
    <div className="flex items-end gap-2 border-t border-border p-3">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t('composerPlaceholder')}
        rows={2}
        className="flex-1 resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm text-text"
      />
      <Button onClick={submit} disabled={!value.trim()}>{t('send')}</Button>
    </div>
  );
}
