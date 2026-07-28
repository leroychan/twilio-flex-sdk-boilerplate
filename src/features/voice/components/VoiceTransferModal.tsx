'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { startVoiceTransfer, addExternalParticipant } from '@/lib/flex/actions/Voice';
import { useDirectory, TransferTargetSelect } from '@/features/directory';

export function VoiceTransferModal({ open, taskSid, onClose }: { open: boolean; taskSid: string; onClose: () => void }) {
  const t = useTranslations('voice');
  const { queues, workers } = useDirectory();
  const [target, setTarget] = useState('');
  const [mode, setMode] = useState<'WARM' | 'COLD'>('WARM');
  const [external, setExternal] = useState('');
  if (!open) return null;
  const transfer = async () => {
    if (!target) return;
    await startVoiceTransfer(taskSid, target, mode);
    onClose();
  };
  const addExternal = async () => {
    if (!external.trim()) return;
    await addExternalParticipant(taskSid, external.trim());
    setExternal('');
  };
  const field = 'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text';
  return (
    <div role="dialog" aria-label={t('transfer')} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-3 font-semibold text-text">{t('transfer')}</h2>
        <div className="mb-2">
          <TransferTargetSelect queues={queues} workers={workers} value={target} onChange={setTarget} />
        </div>
        <div className="mb-3 flex gap-2">
          <Button variant={mode === 'WARM' ? 'primary' : 'secondary'} onClick={() => setMode('WARM')}>{t('warm')}</Button>
          <Button variant={mode === 'COLD' ? 'primary' : 'secondary'} onClick={() => setMode('COLD')}>{t('cold')}</Button>
          <Button onClick={transfer} disabled={!target}>{t('transfer')}</Button>
        </div>
        <label className="mb-2 block text-sm text-muted">{t('addParticipant')}
          <input value={external} onChange={(e) => setExternal(e.target.value)} className={field} />
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{'✕'}</Button>
          <Button variant="secondary" onClick={addExternal} disabled={!external.trim()}>{t('addParticipant')}</Button>
        </div>
      </div>
    </div>
  );
}
