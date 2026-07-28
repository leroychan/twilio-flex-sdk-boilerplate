'use client';
import { MoreHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { Popover } from '@/components/ui/Popover';
import { MessageList } from './MessageList';
import { MessageComposer } from './MessageComposer';
import { EmailComposer } from './EmailComposer';
import type { ActiveConversation } from '@/store/slices/conversations';

const menuItemClass =
  'w-full rounded-md px-3 py-2 text-left text-sm text-text transition-colors hover:bg-surface-2';

interface Props {
  conversation: ActiveConversation | null;
  online?: boolean | null;
  /** Reservation status of the owning task; drives the End→Complete button + menu. */
  status?: string;
  onSend: (body: string) => void;
  onTyping?: () => void;
  onSendMedia?: (file: File) => void;
  onSendEmail?: (htmlBody: string, subject: string) => void;
  onPause: () => void;
  onLeave: () => void;
  onTransfer: () => void;
  /** End the live chat (EndTask) — moves the task into wrap-up. */
  onEnd: () => void;
  /** Complete the wrapping task (CompleteTask) — finishes and clears it. */
  onComplete?: () => void;
  /** Blocks the composer (typing/sending) — e.g. while the task is not accepted. */
  composerDisabled?: boolean;
}

export function ConversationPanel({
  conversation,
  online,
  status,
  onSend,
  onTyping,
  onSendMedia,
  onSendEmail,
  onPause,
  onLeave,
  onTransfer,
  onEnd,
  onComplete,
  composerDisabled = false,
}: Props) {
  const t = useTranslations('conversations');
  if (!conversation) {
    return <Card><p className="text-muted">{t('empty')}</p></Card>;
  }
  // Two-step lifecycle: while accepted, "End chat" (EndTask) moves the task into
  // wrap-up; once wrapping, the same slot becomes "Complete" (CompleteTask). The
  // secondary actions (transfer/park/leave) only apply to a live, accepted chat.
  const wrapping = status === 'wrapping';
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
        <div className="flex items-center gap-2">
          {!wrapping && (
            <Popover
              align="right"
              trigger={({ toggle, open, id }) => (
                <IconButton
                  label={t('more')}
                  onClick={toggle}
                  aria-expanded={open}
                  aria-controls={id}
                  size={38}
                >
                  <MoreHorizontal className="h-5 w-5" aria-hidden />
                </IconButton>
              )}
            >
              {({ close }) => (
                <div className="flex min-w-44 flex-col gap-0.5">
                  <button
                    type="button"
                    className={menuItemClass}
                    onClick={() => {
                      close();
                      onTransfer();
                    }}
                  >
                    {t('transfer')}
                  </button>
                  <button
                    type="button"
                    className={menuItemClass}
                    onClick={() => {
                      close();
                      onPause();
                    }}
                  >
                    {t('pause')}
                  </button>
                  <button
                    type="button"
                    className={menuItemClass}
                    onClick={() => {
                      close();
                      onLeave();
                    }}
                  >
                    {t('leave')}
                  </button>
                </div>
              )}
            </Popover>
          )}
          {wrapping ? (
            <Button onClick={onComplete}>{t('complete')}</Button>
          ) : (
            <Button variant="danger" onClick={onEnd}>
              {t('end')}
            </Button>
          )}
        </div>
      </header>
      <MessageList messages={conversation.messages} />
      {conversation.type === 'email' && onSendEmail ? (
        <EmailComposer
          onSend={onSendEmail}
          defaultSubject={conversation.messages.at(-1)?.subject}
          disabled={composerDisabled}
        />
      ) : (
        <MessageComposer
          onSend={onSend}
          onTyping={onTyping}
          onSendMedia={onSendMedia}
          disabled={composerDisabled}
        />
      )}
    </Card>
  );
}
