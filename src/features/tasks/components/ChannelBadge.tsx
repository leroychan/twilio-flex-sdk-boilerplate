'use client';

import { useTranslations } from 'next-intl';
import { channelIcon, channelLabelKey } from '../lib/channelIcon';

// Per-channel accent, using our semantic tokens so both themes track. WhatsApp
// leans on the success (green) scale to echo its brand; voice on the brand
// primary; text channels on info.
const ACCENTS: Record<string, string> = {
  voice: 'bg-primary-soft text-primary',
  whatsapp: 'bg-success-soft text-success',
  sms: 'bg-info-soft text-info',
  messenger: 'bg-info-soft text-info',
  chat: 'bg-info-soft text-info',
  web: 'bg-info-soft text-info',
  email: 'bg-surface-2 text-muted',
};

/**
 * A prominent, channel-identifying pill (icon + label) shown on the incoming
 * task surface. The channel is resolved from task attributes upstream (see
 * resolveChannel), so WhatsApp/SMS tasks riding a generic chat TaskChannel still
 * show the correct logo and name.
 */
export function ChannelBadge({ channel, className = '' }: { channel: string; className?: string }) {
  const t = useTranslations('tasks');
  const Icon = channelIcon(channel);
  const accent = ACCENTS[channel] ?? 'bg-surface-2 text-muted';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${accent} ${className}`}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {t(`channel.${channelLabelKey(channel)}`)}
    </span>
  );
}
