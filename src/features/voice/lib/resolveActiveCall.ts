'use client';
import type { VoiceCall } from '@twilio/flex-sdk/actions/Voice';
import { getFlexClient } from '@/lib/flex/client';
import { useFlexStore } from '@/store';
import {
  setActiveVoiceCall,
  clearActiveVoiceCall,
  setVoiceCallHandle,
  deleteVoiceCallHandle,
} from '@/lib/flex/registry';
import { resolveCallByTask, attachCallDisconnect, type ResolveCallOptions } from './resolveCall';
import { applyPersistedSelectionToCall } from './audioDevices';
import { resolveTaskContact } from '@/features/tasks/lib/taskContact';

const asRecord = (v: unknown): Record<string, unknown> => (v ?? {}) as Record<string, unknown>;

/**
 * On reservation accept, resolve the live media call for a voice task and drive
 * the call state that gates the CallPanel. This is the authoritative path (the
 * reference model): the conference's incoming leg lands a beat after `accepted`,
 * so we retry GetCallByTask, then register the controllable VoiceCall + flip the
 * store to `connected`. No-ops without a live SDK client (stub/demo/tests).
 */
export async function resolveActiveVoiceCall(
  taskSid: string,
  options: ResolveCallOptions = {},
): Promise<void> {
  if (!getFlexClient()) return;
  const { setCall, resetCall } = useFlexStore.getState();

  const result = await resolveCallByTask(taskSid, options);

  if (result.kind === 'call') {
    const vc = result.call as VoiceCall;
    setActiveVoiceCall(vc);
    setVoiceCallHandle(taskSid, vc);
    applyPersistedSelectionToCall();

    const params = asRecord(asRecord(asRecord(vc).call).parameters);
    // Prefer the caller number carried on the task's routing attributes — the
    // same value the task list shows — over the WebRTC leg's `From` parameter,
    // which on a conference leg is often the Twilio DID or a `client:` identity
    // rather than the customer. Fall back to `From` when the task has no number.
    const task = useFlexStore.getState().tasks.find((t) => t.taskSid === taskSid);
    const callerNumber = task ? resolveTaskContact(task.attributes).phone : null;
    setCall({
      status: 'connected',
      taskSid,
      startedAt: Date.now(),
      from: callerNumber ?? (String(params.From ?? '') || null),
      callSid: String(params.CallSid ?? '') || null,
    });

    // The media leg can drop before the reservation lifecycle event arrives;
    // reset promptly so the panel unmounts and the handle is cleared.
    attachCallDisconnect(vc, () => {
      clearActiveVoiceCall();
      deleteVoiceCallHandle(taskSid);
      resetCall();
    });
    return;
  }

  // otherDevice: genuinely live but not controllable here — keep the task so the
  // agent can still EndTask (server-side). none/cancelled: nothing to adopt.
}
