'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Phone, PhoneOff, Check, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { formatPhone } from '@/lib/phone';
import type { TaskView } from '@/store/slices/tasks';
import { resolveTaskContact } from '../lib/taskContact';
import { channelIcon, isVoiceChannel } from '../lib/channelIcon';
import { resolveChannel } from '../lib/channel';
import { ChannelBadge } from './ChannelBadge';

type TaskAction = (taskSid: string) => void | Promise<void>;

interface Props {
  task: TaskView;
  onAccept: TaskAction;
  onReject: TaskAction;
}

/**
 * The middle-column surface for a task the agent has NOT yet accepted — the
 * incoming "pick up / decline" screen. Mirrors the reference desktop's wiring:
 * a prominent channel tag, the caller's number, plus the red-reject (left) /
 * green-accept (right) circular pair, driven by our own accept/reject actions.
 * Rendered instead of the live call/conversation until the reservation is
 * accepted, so we never expose an invalid End before accept.
 */
export function IncomingTaskPanel({ task, onAccept, onReject }: Props) {
  const t = useTranslations('tasks');
  const [busy, setBusy] = useState(false);

  const channel = resolveChannel(task.taskChannelUniqueName, task.attributes);
  const isVoice = isVoiceChannel(channel);
  const ChannelGlyph = channelIcon(channel);

  const { name, phone } = resolveTaskContact(task.attributes);
  const formattedPhone = formatPhone(phone);
  // Voice leads with the number; messaging leads with the name.
  const primary =
    (isVoice ? formattedPhone || name : name || formattedPhone) || t('unknownCaller');
  // Always surface the number too when it isn't already the primary line.
  const showPhoneLine = formattedPhone !== '' && formattedPhone !== primary;

  const run = (action: TaskAction) => () => {
    if (busy) return;
    const result = action(task.taskSid);
    if (result && typeof (result as Promise<void>).then === 'function') {
      setBusy(true);
      void (result as Promise<void>).finally(() => setBusy(false));
    }
  };

  return (
    <Card className="flex flex-col items-center justify-center gap-4 py-10 text-center">
      <ChannelBadge channel={channel} />

      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-primary">
        <ChannelGlyph className="h-8 w-8" aria-hidden />
      </span>

      <div className="flex flex-col items-center gap-1">
        <span className="text-2xl font-semibold tracking-wide text-text">{primary}</span>
        {showPhoneLine && <span className="font-mono text-sm text-muted">{formattedPhone}</span>}
        <span className="mt-1 flex items-center gap-1.5 text-sm text-info">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-info animate-status-ping opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-info" />
          </span>
          {isVoice ? t('incomingCall') : t('incomingChat')}
        </span>
      </div>

      <div className="flex items-center gap-6">
        <IconButton
          label={t('reject')}
          variant="danger"
          size={56}
          disabled={busy}
          onClick={run(onReject)}
        >
          {isVoice ? <PhoneOff className="h-6 w-6" aria-hidden /> : <X className="h-6 w-6" aria-hidden />}
        </IconButton>
        <IconButton
          label={t('accept')}
          variant="success"
          size={56}
          disabled={busy}
          onClick={run(onAccept)}
        >
          {isVoice ? <Phone className="h-6 w-6" aria-hidden /> : <Check className="h-6 w-6" aria-hidden />}
        </IconButton>
      </div>

      <p className="max-w-xs px-6 text-xs text-muted">
        {isVoice ? t('acceptHintVoice') : t('acceptHintChat')}
      </p>
    </Card>
  );
}
