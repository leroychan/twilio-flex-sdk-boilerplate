'use client';

import { useState, type MouseEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useCallTimer } from '@/features/voice/hooks/useCallTimer';
import type { TaskView } from '@/store/slices/tasks';
import { resolveTaskContact } from '../lib/taskContact';
import { formatPhone } from '@/lib/phone';
import { resolveChannel } from '../lib/channel';
import { channelIcon, channelLabelKey, isVoiceChannel } from '../lib/channelIcon';

type TaskAction = (taskSid: string) => void | Promise<void>;

export interface TaskCardProps {
  task: TaskView;
  preview?: string;
  /** Whether this task's detail is currently shown in the middle column. */
  selected?: boolean;
  /** Select this task (show its detail). Omit to render a non-interactive card. */
  onSelect?: () => void;
  onAccept: TaskAction;
  onReject: TaskAction;
  onWrapUp: TaskAction;
  onComplete: TaskAction;
}

// Channel glyph tint: voice reads as "live/connected", messaging as informational,
// everything else as an attention-worthy other channel.
const CHANNEL_ICON_STYLES: Record<string, string> = {
  voice: 'text-success',
  sms: 'text-info',
};

// Semantic status chip. Uses an OPAQUE surface fill + a 1px colored ring rather
// than the translucent `*-soft` tokens: a soft (translucent) pill blends into
// the translucent `bg-primary-soft` of a selected card and becomes unreadable
// (blue-on-blue for pending, muddy amber for wrapping). Opaque + ring reads
// cleanly on any card background. Falls back to a neutral chip.
const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-surface text-info ring-1 ring-inset ring-info',
  accepted: 'bg-surface text-success ring-1 ring-inset ring-success',
  wrapping: 'bg-surface text-warning ring-1 ring-inset ring-warning',
};

export function TaskCard({
  task,
  preview,
  selected = false,
  onSelect,
  onAccept,
  onReject,
  onWrapUp,
  onComplete,
}: TaskCardProps) {
  const t = useTranslations('tasks');
  const elapsed = useCallTimer(task.createdAt ?? null);
  const [busy, setBusy] = useState(false);

  // Guard against duplicate transition requests. A card lingers until its own
  // reservation lifecycle event removes it, so without this a second click (or an
  // impatient re-click) fires a second CompleteTask/WrapUpTask against a
  // reservation that has already moved on — the SDK rejects that with a 400.
  const run = (action: TaskAction) => (event: MouseEvent) => {
    event.stopPropagation();
    if (busy) return;
    const result = action(task.taskSid);
    if (result && typeof (result as Promise<void>).then === 'function') {
      setBusy(true);
      void (result as Promise<void>).finally(() => setBusy(false));
    }
  };

  const channel = resolveChannel(task.taskChannelUniqueName, task.attributes);
  const ChannelIcon = channelIcon(channel);
  const iconStyle = CHANNEL_ICON_STYLES[channel] ?? 'text-warning';
  const voice = isVoiceChannel(channel);

  const contact = resolveTaskContact(task.attributes);
  const primary =
    contact.name ??
    (contact.phone ? formatPhone(contact.phone) : t(`channel.${channelLabelKey(channel)}`));

  return (
    <div
      role="listitem"
      aria-current={selected ? true : undefined}
      onClick={onSelect}
      className={`border-l-2 px-3 py-2.5 ${
        selected
          ? 'border-primary bg-primary-soft'
          : 'border-transparent hover:bg-surface-2'
      }${onSelect ? ' cursor-pointer transition-colors' : ''}`}
    >
      <div className="flex items-center gap-2">
        <ChannelIcon className={`h-4 w-4 shrink-0 ${iconStyle}`} aria-hidden />
        <span className="flex-1 truncate text-sm font-medium text-text">{primary}</span>
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
            STATUS_STYLES[task.status] ?? 'bg-surface text-muted ring-1 ring-inset ring-border'
          }`}
        >
          {t(`status.${task.status}`)}
        </span>
        {task.createdAt != null && (
          <span className="text-xs tabular-nums text-muted" aria-label={t('elapsed')}>
            {elapsed}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 pl-6 text-xs text-muted">
        {preview ? (
          <span className="truncate">{preview}</span>
        ) : task.status === 'accepted' ? (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
            <span className="truncate">{voice ? t('liveVoice') : t('liveChat')}</span>
          </>
        ) : task.status === 'wrapping' ? (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden />
            <span className="truncate">{t('wrapEnded')}</span>
          </>
        ) : task.status === 'pending' ? (
          <span className="truncate">{voice ? t('incomingCall') : t('incomingChat')}</span>
        ) : null}
      </div>

      <div className="mt-2 flex gap-1.5">
        {task.status === 'pending' && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={run(onAccept)}
              className="rounded bg-success-soft px-2 py-1.5 text-xs font-medium text-success transition-colors disabled:opacity-60"
            >
              {t('accept')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={run(onReject)}
              className="rounded bg-danger-soft px-2 py-1.5 text-xs font-medium text-danger transition-colors disabled:opacity-60"
            >
              {t('reject')}
            </button>
          </>
        )}
        {task.status === 'accepted' && (
          <button
            type="button"
            disabled={busy}
            onClick={run(onWrapUp)}
            className="rounded bg-surface-2 px-2 py-1.5 text-xs font-medium text-text transition-colors disabled:opacity-60"
          >
            {t('wrapUp')}
          </button>
        )}
        {task.status === 'wrapping' && (
          <button
            type="button"
            disabled={busy}
            onClick={run(onComplete)}
            className="rounded bg-success-soft px-2 py-1.5 text-xs font-medium text-success transition-colors disabled:opacity-60"
          >
            {t('complete')}
          </button>
        )}
      </div>
    </div>
  );
}
