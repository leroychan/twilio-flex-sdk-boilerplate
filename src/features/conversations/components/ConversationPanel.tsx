'use client';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { MessageList } from './MessageList';
import { MessageComposer } from './MessageComposer';
import { EmailComposer } from './EmailComposer';
import type { ActiveConversation } from '@/store/slices/conversations';

interface Props {
  conversation: ActiveConversation | null;
  online?: boolean | null;
  onSend: (body: string) => void;
  onTyping?: () => void;
  onSendMedia?: (file: File) => void;
  onSendEmail?: (htmlBody: string, subject: string) => void;
  onPause: () => void;
  onLeave: () => void;
  onTransfer: () => void;
}

export function ConversationPanel({
  conversation,
  online,
  onSend,
  onTyping,
  onSendMedia,
  onSendEmail,
  onPause,
  onLeave,
  onTransfer,
}: Props) {
  const t = useTranslations('conversations');
  if (!conversation) {
    return <Card><p className="text-muted">{t('empty')}</p></Card>;
  }
  return (
    <Card className="flex h-full flex-col p-0">
      <header className="flex items-center justify-between border-b border-border p-3">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-text">{conversation.friendlyName}</h2>
          {online != null && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                online ? 'bg-success/10 text-success' : 'bg-surface-2 text-muted'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-success' : 'bg-muted'}`}
                aria-hidden
              />
              {online ? t('online') : t('offline')}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onTransfer}>{t('transfer')}</Button>
          <Button variant="secondary" onClick={onPause}>{t('pause')}</Button>
          <Button variant="danger" onClick={onLeave}>{t('leave')}</Button>
        </div>
      </header>
      <MessageList messages={conversation.messages} />
      {conversation.type === 'email' && onSendEmail ? (
        <EmailComposer
          onSend={onSendEmail}
          defaultSubject={conversation.messages.at(-1)?.subject}
        />
      ) : (
        <MessageComposer onSend={onSend} onTyping={onTyping} onSendMedia={onSendMedia} />
      )}
    </Card>
  );
}
