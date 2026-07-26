'use client';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { useFlexStore } from '@/store';
import { getPausedConversations, resumeConversation } from '@/lib/flex/actions/Conversation';

export function PausedConversationsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations('conversations');
  const paused = useFlexStore((s) => s.pausedConversations);
  const setPaused = useFlexStore((s) => s.setPausedConversations);

  useEffect(() => {
    if (open) getPausedConversations().then(setPaused).catch(() => {});
  }, [open, setPaused]);

  if (!open) return null;

  const resume = async (sid: string) => {
    await resumeConversation(sid);
    setPaused(await getPausedConversations());
  };

  return (
    <div role="dialog" aria-label={t('pausedTitle')} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-text">{t('pausedTitle')}</h2>
          <Button variant="ghost" onClick={onClose} aria-label="close">✕</Button>
        </div>
        {paused.length === 0 ? (
          <p className="text-muted">{t('noPaused')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {paused.map((c) => (
              <li key={c.sid} className="flex items-center justify-between rounded-md border border-border p-2">
                <span className="text-text">{c.friendlyName}</span>
                <Button onClick={() => resume(c.sid)}>{t('resume')}</Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
