'use client';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { MessageList } from './MessageList';
import { MessageComposer } from './MessageComposer';
import type { ActiveConversation } from '@/store/slices/conversations';

interface Props {
  conversation: ActiveConversation | null;
  onSend: (body: string) => void;
  onPause: () => void;
  onLeave: () => void;
  onTransfer: () => void;
}

export function ConversationPanel({ conversation, onSend, onPause, onLeave, onTransfer }: Props) {
  const t = useTranslations('conversations');
  if (!conversation) {
    return <Card><p className="text-muted">{t('empty')}</p></Card>;
  }
  return (
    <Card className="flex h-full flex-col p-0">
      <header className="flex items-center justify-between border-b border-border p-3">
        <h2 className="font-semibold text-text">{conversation.friendlyName}</h2>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onTransfer}>{t('transfer')}</Button>
          <Button variant="secondary" onClick={onPause}>{t('pause')}</Button>
          <Button variant="danger" onClick={onLeave}>{t('leave')}</Button>
        </div>
      </header>
      <MessageList messages={conversation.messages} />
      <MessageComposer onSend={onSend} />
    </Card>
  );
}
