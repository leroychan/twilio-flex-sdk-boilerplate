import { resolveTaskContact } from '@/features/tasks/lib/taskContact';
import { isAnonymousUserSid } from './messageView';

/**
 * Pick the best human-readable label for a conversation.
 *
 * Webchat conversations frequently arrive with the SDK `friendlyName` set to the
 * anonymous customer identity (an `FX…` SID), and the task's routing attributes
 * carry only that same `FX…` identity — the customer's real name is instead stored
 * on the Conversation resource under `pre_engagement_data.friendlyName`. So we
 * resolve in this order: the pre-engagement name from the conversation attributes,
 * then any name from the task attributes, then a genuine (non-SID) conversation
 * friendlyName. The raw `FX…` friendlyName / conversation SID is the last-resort
 * fallback: we show a SID solely when no name can be resolved.
 */
export function resolveConversationName(
  convFriendlyName: string | null | undefined,
  taskAttributes: Record<string, unknown> | null | undefined,
  fallbackSid: string,
  conversationAttributes?: Record<string, unknown> | null | undefined,
): string {
  const preEngagementName = resolveTaskContact(conversationAttributes).name;
  const taskName = resolveTaskContact(taskAttributes).name;
  const convName = convFriendlyName?.trim() ? convFriendlyName.trim() : null;
  const realConvName = convName && !isAnonymousUserSid(convName) ? convName : null;
  return preEngagementName ?? taskName ?? realConvName ?? convName ?? fallbackSid;
}
