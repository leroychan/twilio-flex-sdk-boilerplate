// Address schemes Twilio prefixes onto a task's `from`/handle, mapped to the
// channel they imply. Lets us recover the real medium (e.g. WhatsApp) even when
// the task rides the generic chat/messaging TaskChannel.
const ADDRESS_PREFIXES: Record<string, string> = {
  whatsapp: 'whatsapp',
  messenger: 'messenger',
  sms: 'sms',
  gbm: 'gbm',
  rcs: 'rcs',
};

const ADDRESS_KEYS = ['from', 'caller', 'customerAddress', 'customer_address'];

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

/**
 * Determine the real communication channel for a task. Twilio routes WhatsApp,
 * SMS, Messenger, etc. through generic `chat`/`messaging` TaskChannels, so the
 * medium the customer actually used lives in the task attributes, not the
 * TaskChannel name. Resolution order: explicit `channelType`/`channel`
 * attribute → address-scheme prefix on the caller handle → the TaskChannel name
 * itself. Always returns a lowercased channel token.
 */
export function resolveChannel(
  taskChannelUniqueName: string,
  attributes: Record<string, unknown> | null | undefined,
): string {
  const attrs = attributes ?? {};

  const explicit = str(attrs.channelType) ?? str(attrs.channel);
  if (explicit) return explicit.toLowerCase();

  for (const key of ADDRESS_KEYS) {
    const value = str(attrs[key]);
    if (!value) continue;
    const scheme = value.split(':', 1)[0]?.toLowerCase() ?? '';
    if (ADDRESS_PREFIXES[scheme]) return ADDRESS_PREFIXES[scheme];
  }

  return taskChannelUniqueName.toLowerCase();
}
