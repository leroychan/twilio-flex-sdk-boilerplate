'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { startConversationTransfer } from '@/lib/flex/actions/Conversation';
import { useDirectory, TransferTargetSelect } from '@/features/directory';

export function TransferModal({ open, taskSid, onClose }: { open: boolean; taskSid: string; onClose: () => void }) {
  const t = useTranslations('conversations');
  const { queues, workers } = useDirectory();
  const [target, setTarget] = useState('');
  const [mode, setMode] = useState<'WARM' | 'COLD'>('WARM');
  if (!open) return null;
  const submit = async () => {
    if (!target) return;
    await startConversationTransfer(taskSid, target, mode);
    onClose();
  };
  return (
    <div role="dialog" aria-label={t('transfer')} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-3 font-semibold text-text">{t('transfer')}</h2>
        <div className="mb-3">
          <TransferTargetSelect queues={queues} workers={workers} value={target} onChange={setTarget} />
        </div>
        <div className="mb-3 flex gap-2">
          <Button variant={mode === 'WARM' ? 'primary' : 'secondary'} onClick={() => setMode('WARM')}>{t('warm')}</Button>
          <Button variant={mode === 'COLD' ? 'primary' : 'secondary'} onClick={() => setMode('COLD')}>{t('cold')}</Button>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{'✕'}</Button>
          <Button onClick={submit} disabled={!target}>{t('transfer')}</Button>
        </div>
      </div>
    </div>
  );
}
