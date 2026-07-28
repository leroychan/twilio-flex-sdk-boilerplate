'use client';
import type { VoiceCall } from '@twilio/flex-sdk/actions/Voice';
import { setActiveVoiceCall, clearActiveVoiceCall } from '@/lib/flex/registry';
import { fetchCallRecordingEnabled } from '@/lib/flex/accountConfig';
import { applyPersistedSelectionToCall } from './audioDevices';
import { useFlexStore } from '@/store';
import { resolveTaskContact } from '@/features/tasks/lib/taskContact';

const asRecord = (v: unknown): Record<string, unknown> => (v ?? {}) as Record<string, unknown>;

/**
 * Adopts a live VoiceCall into the store + registry and follows its lifecycle.
 * Shared by both entry points: the device-level `incoming` event (inbound) and
 * StartOutboundCall's resolved handle (outbound). Keeps the live, non-serializable
 * handle in the registry (for recording/audio) while only view-model state hits the store.
 */
export function adoptVoiceCall(call: VoiceCall): void {
  const wrapper = asRecord(call);
  // The event emitter + call parameters live on the RAW voice-sdk Call at
  // `voiceCall.call`, NOT on the VoiceCall wrapper (which exposes only control
  // methods: mute/hold/disconnect/…). Binding `on`/reading `parameters` off the
  // wrapper silently no-ops, so the call never transitions past 'ringing' and
  // the CallPanel never appears. Fall back to the wrapper defensively.
  const raw = asRecord(wrapper.call ?? wrapper);
  const params = asRecord(raw.parameters);
  const { setCall, resetCall } = useFlexStore.getState();

  setActiveVoiceCall(call);
  // Honour the agent's remembered mic/speaker choice on this fresh call.
  applyPersistedSelectionToCall();

  // With autoAcceptIncomingCalls the browser leg may already be answered before
  // we attach listeners — the raw Call reports "open". Seed 'connected' so we
  // don't miss the accept edge and get stuck on 'ringing'.
  const status = typeof raw.status === 'function' ? (raw.status as () => string)() : undefined;
  const alreadyOpen = status === 'open';
  // Prefer the caller number from the active task's attributes (matching the
  // task list) over the WebRTC leg's `From` param; fall back to `From`.
  const state = useFlexStore.getState();
  const activeTask = state.tasks.find((t) => t.taskSid === state.activeTaskSid);
  const callerNumber = activeTask ? resolveTaskContact(activeTask.attributes).phone : null;
  setCall({
    status: alreadyOpen ? 'connected' : 'ringing',
    startedAt: alreadyOpen ? Date.now() : null,
    callSid: String(params.CallSid ?? '') || null,
    from: callerNumber ?? (String(params.From ?? '') || null),
    recordingPaused: false,
  });

  // Recording availability is an account setting; refresh per call so it survives
  // resetCall between calls.
  const token = useFlexStore.getState().token;
  if (token) {
    void fetchCallRecordingEnabled(token).then((enabled) => setCall({ recordingEnabled: enabled }));
  }

  const on = raw.on as ((ev: string, cb: (...a: unknown[]) => void) => void) | undefined;
  if (typeof on === 'function') {
    on('accept', () => {
      applyPersistedSelectionToCall();
      setCall({ status: 'connected', startedAt: Date.now() });
    });
    // disconnect (hung up), cancel (caller gave up before answer), reject
    // (declined) all terminate the leg — clear the handle and reset state.
    const end = () => {
      setCall({ status: 'ended' });
      clearActiveVoiceCall();
      resetCall();
    };
    on('disconnect', end);
    on('cancel', end);
    on('reject', end);
  }
}
