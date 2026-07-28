'use client';
import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import {
  Mic,
  MicOff,
  Pause,
  Play,
  PhoneForwarded,
  PhoneOff,
  Power,
  Circle,
  CircleDot,
  UserPlus,
  User,
  Headset,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { BorderBeam } from '@/components/ui/magic/BorderBeam';
import { formatPhone } from '@/lib/phone';
import { useCallTimer } from '../hooks/useCallTimer';
import type { CallState } from '@/store/slices/voice';
import type { TaskParticipantView } from '@/store/slices/tasks';

interface Props {
  call: CallState;
  onMuteToggle: () => void;
  onHoldToggle: () => void;
  onHangup: () => void;
  onEndForAll: () => void;
  onTransfer: () => void;
  participants?: TaskParticipantView[];
  workerNames?: Record<string, string>;
  onHoldParticipant?: (participantSid: string) => void;
  onKickParticipant?: (participantSid: string) => void;
  onAddParticipant?: (to: string) => void;
  onToggleRecording?: () => void;
}

const ROLE_KEYS = new Set(['customer', 'agent', 'external']);

function RoleAvatar({ type }: { type: string }) {
  const Icon = type === 'agent' ? Headset : type === 'external' ? PhoneForwarded : User;
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
      <Icon className="h-4 w-4" aria-hidden />
    </span>
  );
}

type ControlTone = 'neutral' | 'danger' | 'warning' | 'primary';

const ACTIVE_TONE: Record<ControlTone, string> = {
  neutral: 'border-border bg-surface-2 text-text',
  danger: 'border-danger bg-danger-soft text-danger',
  warning: 'border-warning bg-warning-soft text-warning',
  primary: 'border-primary bg-primary-soft text-primary',
};

/**
 * A round call-control button with a label beneath it. Toggled controls (mute,
 * hold, recording) light up in their semantic tone; idle controls stay neutral.
 * `label` is both the accessible name (aria-label) and the visible caption.
 */
function ControlButton({
  label,
  onClick,
  disabled,
  active = false,
  tone = 'neutral',
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  tone?: ControlTone;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={onClick}
        disabled={disabled}
        aria-pressed={active}
        className={`flex h-12 w-12 items-center justify-center rounded-full border shadow-sm outline-none transition-transform duration-150 hover:scale-105 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface active:scale-95 disabled:pointer-events-none disabled:opacity-50 ${
          active ? ACTIVE_TONE[tone] : 'border-border bg-surface-2 text-text hover:bg-surface'
        }`}
      >
        {children}
      </button>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

export function CallPanel({
  call,
  onMuteToggle,
  onHoldToggle,
  onHangup,
  onEndForAll,
  onTransfer,
  participants = [],
  workerNames = {},
  onHoldParticipant,
  onKickParticipant,
  onAddParticipant,
  onToggleRecording,
}: Props) {
  const t = useTranslations('voice');
  const elapsed = useCallTimer(call.startedAt);
  const [addValue, setAddValue] = useState('');

  if (call.status === 'idle') {
    return (
      <Card className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-muted">
          <PhoneOff className="h-6 w-6" aria-hidden />
        </span>
        <p className="text-muted">{t('idle')}</p>
      </Card>
    );
  }

  const onHold = call.status === 'onHold';
  const ringing = call.status === 'ringing';
  const dotColor = ringing ? 'bg-info' : onHold ? 'bg-warning' : 'bg-success';
  const dotText = ringing ? 'text-info' : onHold ? 'text-warning' : 'text-success';
  const statusLabel = ringing ? t('incoming') : onHold ? t('onHold') : t('live');
  const recording = call.recordingEnabled && !call.recordingPaused;

  const labelFor = (p: TaskParticipantView): string => {
    if (p.workerSid && workerNames[p.workerSid]) return workerNames[p.workerSid]!;
    return ROLE_KEYS.has(p.type) ? t(`roles.${p.type}`) : t('roles.unknown');
  };

  const submitAdd = () => {
    const to = addValue.trim();
    if (!to || !onAddParticipant) return;
    onAddParticipant(to);
    setAddValue('');
  };

  return (
    <Card className="relative flex flex-col gap-5 overflow-hidden">
      <BorderBeam />

      {/* Status bar: recording indicator (left) + live status & timer (right). */}
      <div className="flex items-center justify-between">
        {call.recordingEnabled && !call.recordingPaused ? (
          <span className="flex items-center gap-1.5 rounded-full bg-danger-soft px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-danger">
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-status-ping rounded-full bg-danger opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-danger" />
            </span>
            {t('rec')}
          </span>
        ) : (
          <span aria-hidden />
        )}
        <span className="flex items-center gap-2 text-sm text-muted">
          <span className={`font-medium ${dotText}`}>{statusLabel}</span>
          <span className="text-border" aria-hidden>
            {'|'}
          </span>
          <span className="font-mono tabular-nums text-text" aria-label="elapsed">
            {elapsed}
          </span>
        </span>
      </div>

      {/* Hero identity: avatar, big caller number, and a pulsing live status. */}
      <div className="flex flex-col items-center gap-3 py-2">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-soft text-primary ring-4 ring-primary/10">
          <User className="h-10 w-10" aria-hidden />
        </span>
        <span className="text-2xl font-semibold tracking-wide text-text">
          {call.from ? formatPhone(call.from) : t('roles.unknown')}
        </span>
        <span className={`flex items-center gap-1.5 text-sm font-medium ${dotText}`}>
          <span className="relative flex h-2 w-2" aria-hidden>
            {!onHold && (
              <span
                className={`absolute inline-flex h-full w-full animate-status-ping rounded-full ${dotColor} opacity-75`}
              />
            )}
            <span className={`relative inline-flex h-2 w-2 rounded-full ${dotColor}`} />
          </span>
          {statusLabel}
        </span>
      </div>

      {/* Primary controls: mute / hold / transfer (+ recording when enabled). */}
      <div className="flex flex-wrap items-start justify-center gap-5">
        <ControlButton
          label={call.muted ? t('unmute') : t('mute')}
          onClick={onMuteToggle}
          active={call.muted}
          tone="danger"
        >
          {call.muted ? <MicOff className="h-5 w-5" aria-hidden /> : <Mic className="h-5 w-5" aria-hidden />}
        </ControlButton>

        <ControlButton
          label={onHold ? t('unhold') : t('hold')}
          onClick={onHoldToggle}
          active={onHold}
          tone="warning"
        >
          {onHold ? <Play className="h-5 w-5" aria-hidden /> : <Pause className="h-5 w-5" aria-hidden />}
        </ControlButton>

        <ControlButton label={t('transfer')} onClick={onTransfer}>
          <PhoneForwarded className="h-5 w-5" aria-hidden />
        </ControlButton>

        {onToggleRecording && call.recordingEnabled && (
          <ControlButton
            label={call.recordingPaused ? t('resumeRecording') : t('pauseRecording')}
            onClick={onToggleRecording}
            active={recording}
            tone="danger"
          >
            {call.recordingPaused ? (
              <Circle className="h-5 w-5" aria-hidden />
            ) : (
              <CircleDot className="h-5 w-5" aria-hidden />
            )}
          </ControlButton>
        )}
      </div>

      {/* End actions: prominent Hang up + a subtler End-for-all. */}
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          aria-label={t('hangup')}
          onClick={onHangup}
          className="flex h-12 items-center justify-center gap-2 rounded-full bg-danger px-10 font-semibold text-white shadow-sm outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 focus-visible:ring-offset-surface active:scale-95"
        >
          <PhoneOff className="h-5 w-5" aria-hidden />
          {t('hangup')}
        </button>
        <button
          type="button"
          aria-label={t('endForAll')}
          onClick={onEndForAll}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted outline-none transition-colors hover:text-danger focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Power className="h-3.5 w-3.5" aria-hidden />
          {t('endForAll')}
        </button>
      </div>

      {participants.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            {t('participants')}
          </span>
          <ul className="flex flex-col gap-2">
            {participants.map((p) => (
              <li
                key={p.participantSid}
                className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2"
              >
                <span className="flex items-center gap-2 text-sm text-text">
                  <RoleAvatar type={p.type} />
                  {labelFor(p)}
                  {p.isOnHold && (
                    <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning">
                      {t('onHold')}
                    </span>
                  )}
                </span>
                <span className="flex gap-1.5">
                  {onHoldParticipant && (
                    <IconButton
                      label={p.isOnHold ? t('unhold') : t('hold')}
                      variant={p.isOnHold ? 'active' : 'neutral'}
                      size={36}
                      onClick={() => onHoldParticipant(p.participantSid)}
                    >
                      {p.isOnHold ? (
                        <Play className="h-4 w-4" aria-hidden />
                      ) : (
                        <Pause className="h-4 w-4" aria-hidden />
                      )}
                    </IconButton>
                  )}
                  {onKickParticipant && (
                    <IconButton
                      label={t('remove')}
                      variant="danger"
                      size={36}
                      onClick={() => onKickParticipant(p.participantSid)}
                    >
                      <PhoneOff className="h-4 w-4" aria-hidden />
                    </IconButton>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {onAddParticipant && (
        <div className="flex items-end gap-2">
          <input
            value={addValue}
            onChange={(e) => setAddValue(e.target.value)}
            placeholder={t('phonePlaceholder')}
            className="flex-1 rounded-full border border-border bg-surface px-4 py-2 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <Button onClick={submitAdd} disabled={!addValue.trim()} className="flex items-center gap-1.5">
            <UserPlus className="h-4 w-4" aria-hidden />
            {t('addParticipant')}
          </Button>
        </div>
      )}
    </Card>
  );
}
