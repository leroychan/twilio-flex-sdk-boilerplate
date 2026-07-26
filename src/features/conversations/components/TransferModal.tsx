'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { startConversationTransfer } from '@/lib/flex/actions/Conversation';

export function TransferModal({ open, conversationSid, onClose }: { open: boolean; conversationSid: string; onClose: () => void }) {
  const t = useTranslations('conversations');
  const [target, setTarget] = useState('');
  const [mode, setMode] = useState<'WARM' | 'COLD'>('WARM');
  if (!open) return null;
  const submit = async () => {
    if (!target.trim()) return;
    await startConversationTransfer(conversationSid, target.trim(), mode);
    onClose();
  };
  return (
    <div role="dialog" aria-label={t('transfer')} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-3 font-semibold text-text">{t('transfer')}</h2>
        <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="worker or queue SID"
          className="mb-3 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text" />
        <div className="mb-3 flex gap-2">
          <Button variant={mode === 'WARM' ? 'primary' : 'secondary'} onClick={() => setMode('WARM')}>WARM</Button>
          <Button variant={mode === 'COLD' ? 'primary' : 'secondary'} onClick={() => setMode('COLD')}>COLD</Button>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>✕</Button>
          <Button onClick={submit} disabled={!target.trim()}>{t('transfer')}</Button>
        </div>
      </div>
    </div>
  );
}
