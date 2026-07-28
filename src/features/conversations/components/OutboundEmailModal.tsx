'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Editor from 'react-simple-wysiwyg';
import { Button } from '@/components/ui/Button';
import { startOutboundEmailTask, addEmailParticipant } from '@/lib/flex/actions/Conversation';

export function OutboundEmailModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations('conversations');
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  if (!open) return null;
  const submit = async () => {
    if (!to.trim() || !subject.trim()) return;
    const { taskSid } = await startOutboundEmailTask({ to: to.trim(), subject: subject.trim(), body });
    if (cc.trim() && taskSid) await addEmailParticipant(taskSid, cc.trim(), 'cc');
    onClose();
  };
  const field = 'mb-3 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text';
  return (
    <div role="dialog" aria-label={t('email.new')} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-3 font-semibold text-text">{t('email.new')}</h2>
        <label className="block text-sm text-muted">{t('email.to')}
          <input aria-label={t('email.to')} value={to} onChange={(e) => setTo(e.target.value)} className={field} />
        </label>
        <label className="block text-sm text-muted">{t('email.cc')}
          <input aria-label={t('email.cc')} value={cc} onChange={(e) => setCc(e.target.value)} className={field} />
        </label>
        <label className="block text-sm text-muted">{t('email.subject')}
          <input aria-label={t('email.subject')} value={subject} onChange={(e) => setSubject(e.target.value)} className={field} />
        </label>
        <label className="mb-3 block text-sm text-muted">{t('email.body')}
          <div className="rounded-md border border-border bg-surface"><Editor value={body} onChange={(e) => setBody(e.target.value)} /></div>
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>✕</Button>
          <Button onClick={submit} disabled={!to.trim() || !subject.trim()}>{t('email.send')}</Button>
        </div>
      </div>
    </div>
  );
}
