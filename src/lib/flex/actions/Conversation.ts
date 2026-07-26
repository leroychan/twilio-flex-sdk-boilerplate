'use client';

// Thin wrappers over @twilio/flex-sdk/actions/Conversation. Each wrapper keeps a
// stable, feature-facing signature (consumed unchanged by the store slice + UI),
// while constructing the SDK action objects with the EXACT positional args the
// installed 4.1.x typings require. Every failure funnels through normalizeFlexError.
import {
  PauseConversation,
  ResumeConversation,
  GetPausedConversations,
  LeaveConversation,
  StartConversationTransfer,
  GetConversationTransfers,
  GetContentTemplates,
  StartOutboundEmailTask,
  AddEmailParticipant,
  RemoveEmailParticipant,
  ParticipantLevel,
} from '@twilio/flex-sdk/actions/Conversation';
import { getFlexClient } from '@/lib/flex/client';
import { normalizeFlexError } from '@/lib/flex/errors';

export interface PausedConversation { sid: string; friendlyName: string; pausedAt: string }
export interface ConversationTransfer { sid: string; to: string; mode: 'WARM' | 'COLD'; status: string }
export interface ContentTemplate { sid: string; friendlyName: string; body: string }
export interface OutboundEmailInput { to: string; subject: string; body: string }

function client() {
  const c = getFlexClient();
  if (!c) throw normalizeFlexError({ message: 'Flex client not initialized.', code: 'client_not_initialized' });
  return c;
}

async function run<T>(action: unknown): Promise<T> {
  try {
    return (await client().execute(action as never)) as T;
  } catch (err) {
    throw normalizeFlexError(err);
  }
}

export const pauseConversation = (sid: string) => run<void>(new PauseConversation(sid));

// Real SDK: ResumeConversation takes Pick<PausedConversation, 'interactionSid' | 'sid'>.
// The feature-facing signature stays `(sid: string)`; we build the required object.
export const resumeConversation = (sid: string) =>
  run<void>(new ResumeConversation({ sid, interactionSid: sid }));

export const getPausedConversations = () => run<PausedConversation[]>(new GetPausedConversations());
export const leaveConversation = (sid: string) => run<void>(new LeaveConversation(sid));

// Real SDK: StartConversationTransfer(taskSid, to) — no mode param. `mode` is kept in
// the wrapper signature for feature/API compatibility but is not forwarded.
export const startConversationTransfer = (sid: string, target: string, mode: 'WARM' | 'COLD') => {
  void mode;
  return run<void>(new StartConversationTransfer(sid, target));
};

export const getConversationTransfers = (sid: string) => run<ConversationTransfer[]>(new GetConversationTransfers(sid));
export const getContentTemplates = () => run<ContentTemplate[]>(new GetContentTemplates());

// Real SDK: StartOutboundEmailTask(to, options?) — subject/body are not first-class
// constructor params, so they are carried via attributesForTaskCreation.
export const startOutboundEmailTask = (input: OutboundEmailInput) =>
  run<{ taskSid: string }>(
    new StartOutboundEmailTask(input.to, {
      attributesForTaskCreation: { subject: input.subject, body: input.body },
    }),
  );

// Real SDK: AddEmailParticipant(taskSid, email, level, options?) — level is required.
export const addEmailParticipant = (sid: string, address: string) =>
  run<void>(new AddEmailParticipant(sid, address, ParticipantLevel.To));

export const removeEmailParticipant = (sid: string, participantSid: string) =>
  run<void>(new RemoveEmailParticipant(sid, participantSid));
