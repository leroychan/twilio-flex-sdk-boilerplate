'use client';
import {
  StartOutboundCall,
  HoldVoiceParticipant,
  UnholdVoiceParticipant,
  KickVoiceParticipant,
  AddExternalVoiceParticipant,
  EndVoiceCallForAll,
  StartVoiceTaskTransfer,
  CancelVoiceTaskTransfer,
  GetCallByTask,
} from '@twilio/flex-sdk/actions/Voice';
import { getFlexClient } from '@/lib/flex/client';
import { normalizeFlexError } from '@/lib/flex/errors';

function client() {
  const c = getFlexClient();
  if (!c) throw normalizeFlexError({ message: 'Flex client not initialized.' });
  return c;
}

async function run<T>(action: unknown): Promise<T> {
  try {
    return (await client().execute(action as never)) as T;
  } catch (err) {
    throw normalizeFlexError(err);
  }
}

// NOTE: the real @twilio/flex-sdk 4.1.x constructors differ from the plan's assumed
// shapes; wrappers below keep the plan's stable (taskSid, participantSid) signatures but
// map to the SDK's actual positional args.
//  - Hold/Unhold/KickVoiceParticipant take (targetParticipantSid, taskSid) — REVERSED.
//  - StartOutboundCall's caller id is options.fromNumber (not callerId).
//  - StartVoiceTaskTransfer's third arg is TransferTaskOptions ({ mode }), not a bare mode.

export const startOutboundCall = (to: string, options?: { callerId?: string }) =>
  run<{ callSid: string }>(
    new StartOutboundCall(to, options?.callerId ? { fromNumber: options.callerId } : undefined),
  );
export const holdParticipant = (taskSid: string, participantSid: string) =>
  run<void>(new HoldVoiceParticipant(participantSid, taskSid));
export const unholdParticipant = (taskSid: string, participantSid: string) =>
  run<void>(new UnholdVoiceParticipant(participantSid, taskSid));
export const kickParticipant = (taskSid: string, participantSid: string) =>
  run<void>(new KickVoiceParticipant(participantSid, taskSid));
export const addExternalParticipant = (taskSid: string, to: string) =>
  run<{ participantSid: string }>(new AddExternalVoiceParticipant(taskSid, to));
export const endCallForAll = (taskSid: string) => run<void>(new EndVoiceCallForAll(taskSid));
export const startVoiceTransfer = (taskSid: string, targetSid: string, mode: 'WARM' | 'COLD') =>
  run<void>(new StartVoiceTaskTransfer(taskSid, targetSid, { mode }));
export const cancelVoiceTransfer = (taskSid: string) => run<void>(new CancelVoiceTaskTransfer(taskSid));
export const getCallByTask = (taskSid: string) =>
  run<{ callSid: string; status: string } | null>(new GetCallByTask(taskSid));
