'use client';

// Task action wrappers — follow the exact shape of actions/Worker.ts:
//   1. import the action classes from '@twilio/flex-sdk/actions/Task'
//   2. get the singleton client via getFlexClient() (guarded)
//   3. client.execute(new <Action>(...positionalArgs))  // match the SDK constructor
//   4. funnel every failure through normalizeFlexError()
import {
  AcceptTask,
  RejectTask,
  WrapUpTask,
  CompleteTask,
  EndTask,
  SetTaskAttributes,
} from '@twilio/flex-sdk/actions/Task';
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

/** Accept the reservation's task. */
export async function acceptTask(taskSid: string): Promise<void> {
  const client = requireClient();
  try {
    await client.execute(new AcceptTask(taskSid));
  } catch (err) {
    throw normalizeFlexError(err);
  }
}

/** Reject the reservation's task. */
export async function rejectTask(taskSid: string): Promise<void> {
  const client = requireClient();
  try {
    await client.execute(new RejectTask(taskSid));
  } catch (err) {
    throw normalizeFlexError(err);
  }
}

/** Move an accepted task into wrap-up. */
export async function wrapUpTask(taskSid: string): Promise<void> {
  const client = requireClient();
  try {
    await client.execute(new WrapUpTask(taskSid));
  } catch (err) {
    throw normalizeFlexError(err);
  }
}

/** Complete a wrapping-up task. */
export async function completeTask(taskSid: string): Promise<void> {
  const client = requireClient();
  try {
    await client.execute(new CompleteTask(taskSid));
  } catch (err) {
    throw normalizeFlexError(err);
  }
}

/**
 * End a task. The `reason` argument is accepted for API symmetry with the
 * consuming hook, but the SDK `EndTask` constructor takes only the task SID
 * (no reason parameter), so it is not forwarded.
 */
export async function endTask(taskSid: string, _reason?: string): Promise<void> {
  const client = requireClient();
  try {
    await client.execute(new EndTask(taskSid));
  } catch (err) {
    throw normalizeFlexError(err);
  }
}

/** Replace the task's attributes. */
export async function setTaskAttributes(
  taskSid: string,
  attributes: Record<string, unknown>,
): Promise<void> {
  const client = requireClient();
  try {
    await client.execute(new SetTaskAttributes(taskSid, attributes));
  } catch (err) {
    throw normalizeFlexError(err);
  }
}
