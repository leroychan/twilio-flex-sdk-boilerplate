'use client';
import { useTranslations } from 'next-intl';
import type { ConversationMessage } from '@/store/slices/conversations';

function MediaBubble({ media }: { media: NonNullable<ConversationMessage['media']> }) {
  const t = useTranslations('conversations');
  const isImage = media.contentType?.startsWith('image/') && media.url;
  if (isImage) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={media.url} alt={media.filename ?? ''} className="max-h-64 w-auto rounded" />;
  }
  if (media.url) {
    return (
      <a href={media.url} target="_blank" rel="noreferrer" className="underline">
        {media.filename ?? t('media.download')}
      </a>
    );
  }
  return <span className="italic">{media.filename ?? t('media.download')}</span>;
}

function EmailBody({ subject, htmlUrl }: { subject?: string; htmlUrl: string }) {
  const t = useTranslations('conversations');
  return (
    <div className="flex flex-col gap-1">
      {subject && (
        <span className="font-semibold text-text">
          {t('email.subjectPrefix')}
          {subject}
        </span>
      )}
      <iframe
        title={subject || t('email.body')}
        src={htmlUrl}
        sandbox=""
        className="h-64 w-full rounded border border-border bg-white"
      />
    </div>
  );
}

export function MessageList({ messages }: { messages: ConversationMessage[] }) {
  return (
    <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3" role="log" aria-live="polite">
      {messages.map((m) => {
        // Email messages render their HTML body full-width in a sandboxed iframe.
        if (m.htmlUrl) {
          return (
            <div key={m.sid} className="w-full">
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <EmailBody subject={m.subject} htmlUrl={m.htmlUrl} />
              </div>
            </div>
          );
        }
        return (
          <div key={m.sid} className={`flex ${m.isMine ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${m.isMine ? 'bg-primary text-white' : 'bg-surface-2 text-text'}`}
            >
              {m.body}
              {m.media && (
                <div className={m.body ? 'mt-2' : ''}>
                  <MediaBubble media={m.media} />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
