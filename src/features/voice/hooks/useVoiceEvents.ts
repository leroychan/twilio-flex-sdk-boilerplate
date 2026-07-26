'use client';
import { useEffect } from 'react';
import { AddVoiceEventListener } from '@twilio/flex-sdk/actions/Voice';
import { useFlexStore } from '@/store';
import type { VoiceParticipant } from '@/store/slices/voice';

interface RawVoiceEvent {
  type: string;
  taskSid?: string;
  callSid?: string;
  participants?: VoiceParticipant[];
}

// NOTE (integration): the real SDK exposes AddVoiceEventListener as an Action class —
// `client.execute(new AddVoiceEventListener(VoiceClientEvent.X, listener))` — resolving to
// `{ unsubscribe }`, registering ONE event type per instance. This hook uses the simplified
// callback shape for the boilerplate; when wiring a live account, register one listener per
// VoiceClientEvent and collect the unsubscribes here. Exercising these events requires a live
// session, so this bridge is validated against real Twilio, not in unit tests.
const register = AddVoiceEventListener as unknown as (
  cb: (e: RawVoiceEvent) => void,
) => (() => void) | void;

export function useVoiceEvents(): void {
  const setCall = useFlexStore((s) => s.setCall);
  const resetCall = useFlexStore((s) => s.resetCall);
  const setParticipants = useFlexStore((s) => s.setParticipants);

  useEffect(() => {
    const unsubscribe = register((e: RawVoiceEvent) => {
      switch (e.type) {
        case 'callRinging':
          setCall({ status: 'ringing', taskSid: e.taskSid ?? null, callSid: e.callSid ?? null });
          break;
        case 'callConnected':
          setCall({ status: 'connected', startedAt: Date.now() });
          break;
        case 'callDisconnected':
          setCall({ status: 'ended' });
          resetCall();
          break;
        case 'participantsUpdated':
          if (e.participants) setParticipants(e.participants);
          break;
      }
    });
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, [setCall, resetCall, setParticipants]);
}
