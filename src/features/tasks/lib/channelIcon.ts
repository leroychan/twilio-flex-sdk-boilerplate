import type { ComponentType } from 'react';
import { Phone, MessageSquare, MessageCircle, Mail, Inbox } from 'lucide-react';
import { WhatsAppIcon } from '@/components/ui/icons/WhatsAppIcon';

export type ChannelIconType = ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;

// Channel → glyph. WhatsApp gets its brand logo; the rest reuse lucide icons.
const ICONS: Record<string, ChannelIconType> = {
  voice: Phone,
  whatsapp: WhatsAppIcon,
  sms: MessageSquare,
  messenger: MessageCircle,
  chat: MessageSquare,
  web: MessageSquare,
  email: Mail,
};

/** Icon component for a resolved channel token; a generic inbox icon otherwise. */
export function channelIcon(channel: string): ChannelIconType {
  return ICONS[channel] ?? Inbox;
}

// Channels we carry a translated label for; anything else uses the "other" copy.
const LABELLED = new Set(['voice', 'whatsapp', 'sms', 'messenger', 'chat', 'web', 'email']);

/** i18n key under `tasks.channel.*` for a resolved channel token. */
export function channelLabelKey(channel: string): string {
  return LABELLED.has(channel) ? channel : 'other';
}

/** Channels we treat as real-time voice (drives the incoming/live call surfaces). */
export function isVoiceChannel(channel: string): boolean {
  return channel === 'voice';
}
