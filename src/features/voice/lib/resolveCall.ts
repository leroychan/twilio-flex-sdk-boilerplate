'use client';
import type { VoiceCall } from '@twilio/flex-sdk/actions/Voice';
import { getCallByTask } from '@/lib/flex/actions/Voice';

/**
 * Bounded resolution of a live media Call for a TaskRouter task via GetCallByTask.
 * Ported from the flex-template-builder reference: the Voice SDK device usually
 * has not yet received the conference's incoming leg at the moment a reservation
 * flips to `accepted`, so an immediate GetCallByTask fails ("active on a
 * different voice device"). A brief lead-in + bounded retry lets the device
 * register the call, then hands back a controllable VoiceCall.
 */
export type ResolveCallResult =
  | { kind: 'call'; call: VoiceCall }
  | { kind: 'otherDevice' }
  | { kind: 'none' }
  | { kind: 'cancelled' };

export interface ResolveCallOptions {
  /** Number of GetCallByTask attempts before giving up. Default 5. */
  attempts?: number;
  /** Backoff before attempt N (0-indexed). Default 1000 * (n + 1) ms. */
  backoffMs?: (attempt: number) => number;
  /** Delay before the FIRST attempt (the leg lands a beat after accept). Default 600. */
  initialDelayMs?: number;
  /** Return true to abort between attempts (effect cleanup). */
  isCancelled?: () => boolean;
  /** Per-attempt logger. */
  onAttempt?: (attempt: number, hasCall: boolean) => void;
  /** Injectable for tests. Defaults to the getCallByTask action wrapper. */
  getCall?: (taskSid: string) => Promise<VoiceCall | null>;
  /** Injectable for tests. Defaults to setTimeout. */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function resolveCallByTask(
  taskSid: string,
  options: ResolveCallOptions = {},
): Promise<ResolveCallResult> {
  const {
    attempts = 5,
    backoffMs = (n) => 1000 * (n + 1),
    initialDelayMs = 600,
    isCancelled,
    onAttempt,
    getCall = getCallByTask,
    sleep = defaultSleep,
  } = options;

  let onOtherDevice = false;

  if (initialDelayMs > 0) {
    await sleep(initialDelayMs);
    if (isCancelled?.()) return { kind: 'cancelled' };
  }

  for (let attempt = 0; attempt < attempts; attempt++) {
    if (isCancelled?.()) return { kind: 'cancelled' };
    try {
      const vc = await getCall(taskSid);
      onAttempt?.(attempt, !!vc);
      if (isCancelled?.()) return { kind: 'cancelled' };
      if (vc) return { kind: 'call', call: vc };
    } catch (err) {
      // A transferred/re-routed call is genuinely LIVE but its media leg is on a
      // different voice device, so GetCallByTask can't hand us a controllable
      // Call here. This is NOT an ended call.
      const message = String((err as { message?: unknown })?.message ?? err ?? '');
      if (/different voice device/i.test(message)) onOtherDevice = true;
      // Otherwise transient during SDK/device reconnect — retry.
    }
    await sleep(backoffMs(attempt));
  }

  if (isCancelled?.()) return { kind: 'cancelled' };
  return onOtherDevice ? { kind: 'otherDevice' } : { kind: 'none' };
}

const asRecord = (v: unknown): Record<string, unknown> => (v ?? {}) as Record<string, unknown>;

type Emitter = {
  on?: (event: string, cb: () => void) => void;
  off?: (event: string, cb: () => void) => void;
};

/**
 * Attach a one-shot `disconnect` listener that detaches itself when it fires.
 * The event emitter is the raw voice-sdk Call at `voiceCall.call`; falls back to
 * the wrapper defensively. Returns a manual cleanup for effect teardown.
 */
export function attachCallDisconnect(call: VoiceCall, handler: () => void): () => void {
  const wrapper = asRecord(call);
  const emitter = (asRecord(wrapper.call) as Emitter).on
    ? (wrapper.call as Emitter)
    : (wrapper as Emitter);
  const wrapped = () => {
    try {
      emitter.off?.('disconnect', wrapped);
    } catch {
      // best effort
    }
    handler();
  };
  try {
    emitter.on?.('disconnect', wrapped);
  } catch {
    // best effort
  }
  return () => {
    try {
      emitter.off?.('disconnect', wrapped);
    } catch {
      // best effort
    }
  };
}
