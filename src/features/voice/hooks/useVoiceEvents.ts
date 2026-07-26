'use client';
import { useEffect } from 'react';
import { AddVoiceEventListener } from '@twilio/flex-sdk/actions/Voice';
import { getFlexClient } from '@/lib/flex/client';
import { useFlexStore } from '@/store';

type Unsub = () => void;
const asRecord = (v: unknown): Record<string, unknown> => (v ?? {}) as Record<string, unknown>;

/**
 * Bridges Flex voice-device events into the store. The real SDK exposes AddVoiceEventListener
 * as an Action executed per event via `client.execute(new AddVoiceEventListener(eventName,
 * listener))`, resolving to `{ unsubscribe }`. We register the device-level `incoming` event
 * and, from the delivered VoiceCall, follow its accept/disconnect to drive call status.
 * No-ops without a live client (stub/demo mode or tests), so it never throws.
 */
export function useVoiceEvents(): void {
  const setCall = useFlexStore((s) => s.setCall);
  const resetCall = useFlexStore((s) => s.resetCall);

  useEffect(() => {
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

    void register('incoming', (call) => {
      const c = asRecord(call);
      const params = asRecord(c.parameters);
      setCall({ status: 'ringing', callSid: String(params.CallSid ?? '') || null });
      const on = c.on as ((ev: string, cb: (...a: unknown[]) => void) => void) | undefined;
      if (typeof on === 'function') {
        on('accept', () => setCall({ status: 'connected', startedAt: Date.now() }));
        on('disconnect', () => {
          setCall({ status: 'ended' });
          resetCall();
        });
      }
    });

    return () => {
      cancelled = true;
      unsubs.forEach((u) => u());
    };
  }, [setCall, resetCall]);
}
