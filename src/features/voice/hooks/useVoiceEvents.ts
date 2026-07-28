'use client';
import { useEffect } from 'react';
import { AddVoiceEventListener } from '@twilio/flex-sdk/actions/Voice';
import type { VoiceCall } from '@twilio/flex-sdk/actions/Voice';
import { getFlexClient } from '@/lib/flex/client';
import { useFlexStore } from '@/store';
import { adoptVoiceCall } from '../lib/adoptVoiceCall';

type Unsub = () => void;

/**
 * Bridges Flex voice-device events into the store. The real SDK exposes AddVoiceEventListener
 * as an Action executed per event via `client.execute(new AddVoiceEventListener(eventName,
 * listener))`, resolving to `{ unsubscribe }`. We register the device-level `incoming` event
 * and, from the delivered VoiceCall, follow its accept/disconnect to drive call status.
 *
 * The registration is keyed off the store `worker`, NOT bare mount: `initFlexClient` is async,
 * so at first render `getFlexClient()` is still null. The provider sets the worker only after
 * the client is ready, so waiting for the worker guarantees the client exists — and, crucially,
 * the SDK requires this listener to be registered BEFORE a voice task is accepted (otherwise
 * AcceptTask fails to create the conference). No-ops without a live client, so it never throws.
 */
export function useVoiceEvents(): void {
  const worker = useFlexStore((s) => s.worker);

  useEffect(() => {
    if (!worker) return;
    const client = getFlexClient();
    if (!client) return;

    const unsubs: Unsub[] = [];
    let cancelled = false;

    const register = async (eventName: string, listener: (payload: unknown) => void) => {
      try {
        const action = new AddVoiceEventListener(eventName as never, listener as never);
        const res = (await client.execute(action)) as { unsubscribe?: Unsub } | undefined;
        if (res?.unsubscribe) {
          if (cancelled) res.unsubscribe();
          else unsubs.push(res.unsubscribe);
        }
      } catch {
        // Best-effort: registration requires a registered voice device.
      }
    };

    void register('incoming', (call) => adoptVoiceCall(call as VoiceCall));

    return () => {
      cancelled = true;
      unsubs.forEach((u) => u());
    };
  }, [worker]);
}
