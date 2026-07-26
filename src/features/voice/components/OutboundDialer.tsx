'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { startOutboundCall } from '@/lib/flex/actions/Voice';

export function OutboundDialer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations('voice');
  const [number, setNumber] = useState('');
  if (!open) return null;
  const submit = async () => {
    const to = number.trim();
    if (!to) return;
    await startOutboundCall(to, undefined);
    onClose();
  };
  return (
    <div role="dialog" aria-label={t('dial')} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-3 font-semibold text-text">{t('dial')}</h2>
        <input
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder={t('phonePlaceholder')}
          className="mb-3 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text"
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>✕</Button>
          <Button onClick={submit} disabled={!number.trim()}>{t('dial')}</Button>
        </div>
      </div>
    </div>
  );
}
