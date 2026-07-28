'use client';
import { useFlexStore } from '@/store';
import { getActiveVoiceCall } from '@/lib/flex/registry';
import {
  endCallForAll,
  holdParticipant,
  unholdParticipant,
  kickParticipant,
  addExternalParticipant,
} from '@/lib/flex/actions/Voice';

export function useVoiceControls() {
  const call = useFlexStore((s) => s.call);
  const taskParticipants = useFlexStore((s) => s.taskParticipants);
  const setMuted = useFlexStore((s) => s.setMuted);
  const setCall = useFlexStore((s) => s.setCall);

  const toggleMute = () => {
    const next = !call.muted;
    // Mute lives on the VoiceCall itself (mute()/unmute()), not the Device.
    const voiceCall = getActiveVoiceCall() as unknown as
      | { mute?: () => void; unmute?: () => void }
      | undefined;
    if (next) voiceCall?.mute?.();
    else voiceCall?.unmute?.();
    setMuted(next);
  };

  // Hold/resume the agent's own call leg. This goes through the VoiceCall handle
  // (hold()/unhold()), NOT HoldVoiceParticipant — the latter needs a participant
  // SID and `call.participants` is only populated for multi-party conferences, so
  // the primary Hold button must not depend on it (it was a no-op before).
  const toggleHold = async () => {
    const voiceCall = getActiveVoiceCall() as unknown as
      | { hold?: () => Promise<unknown>; unhold?: () => Promise<unknown> }
      | undefined;
    if (!voiceCall) return;
    if (call.status === 'onHold') {
      await voiceCall.unhold?.();
      setCall({ status: 'connected' });
    } else {
      await voiceCall.hold?.();
      setCall({ status: 'onHold' });
    }
  };

  const hangup = async () => {
    if (call.taskSid) await endCallForAll(call.taskSid);
  };

  const endForAll = async () => {
    if (call.taskSid) await endCallForAll(call.taskSid);
  };

  // DTMF is sent on the underlying voice-sdk Call (call.call.sendDigits).
  const sendDigit = (d: string) => {
    const voiceCall = getActiveVoiceCall() as unknown as
      | { call?: { sendDigits?: (digits: string) => void } }
      | undefined;
    voiceCall?.call?.sendDigits?.(d);
  };

  // Per-participant conference controls, driven by the tiles in CallPanel. Hold state
  // comes from the live taskParticipants map (kept fresh by subscribeTaskParticipants).
  const toggleParticipantHold = async (participantSid: string) => {
    if (!call.taskSid) return;
    const p = taskParticipants[call.taskSid]?.find((x) => x.participantSid === participantSid);
    if (p?.isOnHold) await unholdParticipant(call.taskSid, participantSid);
    else await holdParticipant(call.taskSid, participantSid);
  };

  const removeParticipant = async (participantSid: string) => {
    if (call.taskSid) await kickParticipant(call.taskSid, participantSid);
  };

  const addParticipant = async (to: string) => {
    if (call.taskSid) await addExternalParticipant(call.taskSid, to);
  };

  // Pause/resume recording on the live VoiceCall handle (recording is a method on
  // the call object, not a TaskRouter Action). "silence" keeps the recording file
  // continuous with silence in place of the paused segment.
  const toggleRecording = async () => {
    const voiceCall = getActiveVoiceCall();
    if (!voiceCall) return;
    if (call.recordingPaused) {
      await voiceCall.resumeRecording();
      setCall({ recordingPaused: false });
    } else {
      await voiceCall.pauseRecording('silence');
      setCall({ recordingPaused: true });
    }
  };

  return {
    toggleMute,
    toggleHold,
    hangup,
    endForAll,
    sendDigit,
    toggleParticipantHold,
    removeParticipant,
    addParticipant,
    toggleRecording,
  };
}
