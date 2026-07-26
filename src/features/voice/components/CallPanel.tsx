'use client';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useCallTimer } from '../hooks/useCallTimer';
import type { CallState } from '@/store/slices/voice';

interface Props {
  call: CallState;
  onMuteToggle: () => void;
  onHoldToggle: () => void;
  onHangup: () => void;
  onEndForAll: () => void;
  onTransfer: () => void;
}

export function CallPanel({ call, onMuteToggle, onHoldToggle, onHangup, onEndForAll, onTransfer }: Props) {
  const t = useTranslations('voice');
  const elapsed = useCallTimer(call.startedAt);
  if (call.status === 'idle') {
    return <Card><p className="text-muted">{t('idle')}</p></Card>;
  }
  const onHold = call.status === 'onHold';
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-text">{onHold ? t('onHold') : t('title')}</span>
        <span className="font-mono text-muted" aria-label="elapsed">{elapsed}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={onMuteToggle}>{call.muted ? t('unmute') : t('mute')}</Button>
        <Button variant="secondary" onClick={onHoldToggle}>{onHold ? t('unhold') : t('hold')}</Button>
        <Button variant="secondary" onClick={onTransfer}>{t('transfer')}</Button>
        <Button variant="danger" onClick={onHangup}>{t('hangup')}</Button>
        <Button variant="danger" onClick={onEndForAll}>{t('endForAll')}</Button>
      </div>
    </Card>
  );
}
