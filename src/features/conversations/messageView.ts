import type { ConversationMessage } from '@/store/slices/conversations';

/** Structural shape of an attached media item we consume. */
export interface SdkMediaLike {
  filename?: string | null;
  contentType?: string | null;
  getContentTemporaryUrl?: () => Promise<string | null>;
}

/** Structural shape of the SDK `Message` fields we consume (keeps mapping testable). */
export interface SdkMessageLike {
  sid?: string | null;
  index?: number | null;
  author?: string | null;
  body?: string | null;
  subject?: string | null;
  dateCreated?: Date | string | null;
  attachedMedia?: SdkMediaLike[] | null;
  /** Present on email messages; returns the media for a given body content type. */
  getEmailBody?: (type: string) => SdkMediaLike | null;
}

// Anonymous conversation user SIDs look like FX… (34 chars). Show a friendly label.
function isAnonymousUserSid(author: string | null | undefined): boolean {
  return Boolean(author && author.startsWith('FX') && author.length === 34);
}

function toIso(d: Date | string | null | undefined): string {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(d);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

/**
 * Map an SDK Message to the serializable slice view-model. Media carries
 * filename/contentType synchronously; the temporary URL is resolved separately
 * (see useConversation) since getContentTemporaryUrl is async and expiring.
 */
export function toMessageView(m: SdkMessageLike, selfIdentity: string): ConversationMessage {
  const author = m.author ?? '';
  const media = m.attachedMedia?.[0];
  return {
    sid: String(m.sid ?? m.index ?? author + toIso(m.dateCreated)),
    author: isAnonymousUserSid(author) ? 'Anonymous' : author,
    body: m.body ?? '',
    dateCreated: toIso(m.dateCreated),
    isMine: Boolean(author) && author === selfIdentity,
    ...(m.subject ? { subject: m.subject } : {}),
    ...(media
      ? { media: { filename: media.filename ?? undefined, contentType: media.contentType ?? undefined } }
      : {}),
  };
}
