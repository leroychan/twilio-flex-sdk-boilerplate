'use client';

// Supervisor / monitoring action wrappers. Same shape as the reference
// actions/Worker.ts wrapper:
//   1. import the action classes from '@twilio/flex-sdk/actions/<Domain>'
//   2. get the singleton client via getFlexClient() (throws if not ready)
//   3. client.execute(new <Action>(...positionalArgs))  // match the SDK constructor
//   4. funnel every failure through normalizeFlexError()
//
// Real-SDK positional constructors (verified against the .d.ts):
//   MonitorCall(taskSid, reservationSid, options?)  -> silent listen
//   CoachCall(taskSid, options?)                    -> whisper (agent-only)
//   BargeCall(taskSid)                              -> join the call for everyone
//   SetWorkerActivity(targetWorkerSid, activitySid, { activityUpdateOptions?: { rejectPendingReservations? } })
//   SetWorkerAttributes(targetWorkerSid, attributes, options?)
import { MonitorCall, CoachCall, BargeCall } from '@twilio/flex-sdk/actions/Voice';
import { SetWorkerActivity, SetWorkerAttributes } from '@twilio/flex-sdk/actions/Supervisor';
import { getFlexClient } from '../client';
import { normalizeFlexError, type NormalizedFlexError } from '../errors';

function requireClient() {
  const client = getFlexClient();
  if (!client) {
    const err: NormalizedFlexError = {
      code: 'client_not_initialized',
      severity: 'error',
      message: 'Flex client is not initialized.',
    };
    throw err;
  }
  return client;
}

/** Silent listen on a live call. Requires the agent's reservation SID for the task. */
export async function monitorCall(taskSid: string, reservationSid: string): Promise<void> {
  const client = requireClient();
  try {
    await client.execute(new MonitorCall(taskSid, reservationSid));
  } catch (err) {
    throw normalizeFlexError(err);
  }
}

/** Whisper coaching — only the agent hears the supervisor. */
export async function coachCall(taskSid: string): Promise<void> {
  const client = requireClient();
  try {
    await client.execute(new CoachCall(taskSid));
  } catch (err) {
    throw normalizeFlexError(err);
  }
}

/** Barge — join the supervisor into the call for everyone. */
export async function bargeCall(taskSid: string): Promise<void> {
  const client = requireClient();
  try {
    await client.execute(new BargeCall(taskSid));
  } catch (err) {
    throw normalizeFlexError(err);
  }
}

/** Set the activity (presence) of ANOTHER worker — a supervisor capability. */
export async function setWorkerActivity(
  workerSid: string,
  activitySid: string,
  rejectPendingReservations = false,
): Promise<void> {
  const client = requireClient();
  try {
    await client.execute(
      new SetWorkerActivity(workerSid, activitySid, {
        activityUpdateOptions: { rejectPendingReservations },
      }),
    );
  } catch (err) {
    throw normalizeFlexError(err);
  }
}

/** Overwrite the attributes of ANOTHER worker — a supervisor capability. */
export async function setWorkerAttributes(
  workerSid: string,
  attributes: Record<string, unknown>,
): Promise<void> {
  const client = requireClient();
  try {
    await client.execute(new SetWorkerAttributes(workerSid, attributes));
  } catch (err) {
    throw normalizeFlexError(err);
  }
}
