'use client';
import { getAccountConfig } from '@twilio/flex-sdk';

/**
 * Whether call recording is enabled for the account. Drives the pause/resume
 * recording control. Returns false (control hidden) if the config can't be read.
 */
export async function fetchCallRecordingEnabled(sessionToken: string): Promise<boolean> {
  try {
    const config = await getAccountConfig(sessionToken);
    return !!config.callRecordingEnabled;
  } catch {
    return false;
  }
}
