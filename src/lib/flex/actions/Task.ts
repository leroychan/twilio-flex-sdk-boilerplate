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
  GetTaskParticipants,
  AddTaskParticipantListener,
  GetChannelsForTask,
} from '@twilio/flex-sdk/actions/Task';
import type { TaskParticipant, TaskChannel } from '@twilio/flex-sdk/actions/Task';
import type { Task } from '@twilio/flex-sdk';
import { getFlexClient } from '../client';
import { normalizeFlexError, type NormalizedFlexError } from '../errors';

export type TaskParticipantEventName =
  | 'participantAdded'
  | 'participantModified'
  | 'participantRemoved';

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

/**
 * True when a reservation state-transition failed only because the reservation
 * has already reached (or passed) the target state. The Flex API reports this as
 * a 400 REQUEST_INVALID naming the reservation's *current* state, e.g.
 * "...was in incorrect state completed, should be in states wrapping,accepted".
 * These transitions are idempotent: the desired end state is already satisfied,
 * so we treat such a failure as a no-op. This absorbs the unavoidable race where
 * the reservation completes server-side (e.g. the voice conference ending) or via
 * a duplicate click between our request and the reservation's own lifecycle event.
 */
function isAlreadyInState(err: NormalizedFlexError, ...states: string[]): boolean {
  return states.some((s) => new RegExp(`incorrect state ${s}\\b`, 'i').test(err.message));
}

/** Move an accepted task into wrap-up. Idempotent if already wrapping/completed. */
export async function wrapUpTask(taskSid: string): Promise<void> {
  const client = requireClient();
  try {
    await client.execute(new WrapUpTask(taskSid));
  } catch (err) {
    const normalized = normalizeFlexError(err);
    if (isAlreadyInState(normalized, 'wrapping', 'completed')) return;
    throw normalized;
  }
}

/** Complete a wrapping-up task. Idempotent if the reservation is already completed. */
export async function completeTask(taskSid: string): Promise<void> {
  const client = requireClient();
  try {
    await client.execute(new CompleteTask(taskSid));
  } catch (err) {
    const normalized = normalizeFlexError(err);
    if (isAlreadyInState(normalized, 'completed')) return;
    throw normalized;
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

/** Fetch the current participants of a task. */
export async function getTaskParticipants(taskSid: string): Promise<TaskParticipant[]> {
  const client = requireClient();
  try {
    return (await client.execute(new GetTaskParticipants(taskSid))) as TaskParticipant[];
  } catch (err) {
    throw normalizeFlexError(err);
  }
}

/**
 * Subscribe to a single task-participant event type. `AddTaskParticipantListener`
 * is an Action class (one instance per event type); the resolved value carries an
 * `unsubscribe` to remove the listener.
 */
export async function addTaskParticipantListener(
  taskSid: string,
  eventName: TaskParticipantEventName,
  listener: (task: Task, participant: TaskParticipant) => void,
): Promise<{ unsubscribe: () => void }> {
  const client = requireClient();
  try {
    return (await client.execute(
      new AddTaskParticipantListener(taskSid, eventName, listener),
    )) as { unsubscribe: () => void };
  } catch (err) {
    throw normalizeFlexError(err);
  }
}

/** List the channels attached to a task. */
export async function getChannelsForTask(taskSid: string): Promise<TaskChannel[]> {
  const client = requireClient();
  try {
    return (await client.execute(new GetChannelsForTask(taskSid))) as TaskChannel[];
  } catch (err) {
    throw normalizeFlexError(err);
  }
}
