'use client';

// REFERENCE WRAPPER — later parts add actions/Voice.ts, actions/Task.ts,
// actions/Conversation.ts, actions/Supervisor.ts following this exact shape:
//   1. import the action classes from '@twilio/flex-sdk/actions/<Domain>'
//   2. get the singleton client via getFlexClient()
//   3. client.execute(new <Action>({ ...args }))
//   4. funnel every failure through normalizeFlexError()
import { SetCurrentActivity, SetAttributes } from '@twilio/flex-sdk/actions/Worker';
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

export async function setCurrentActivity(activitySid: string): Promise<void> {
  const client = requireClient();
  try {
    await client.execute(new SetCurrentActivity({ activitySid }));
  } catch (err) {
    throw normalizeFlexError(err);
  }
}

export async function setAttributes(attributes: Record<string, unknown>): Promise<void> {
  const client = requireClient();
  try {
    await client.execute(new SetAttributes({ attributes }));
  } catch (err) {
    throw normalizeFlexError(err);
  }
}
