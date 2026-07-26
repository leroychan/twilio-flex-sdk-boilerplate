'use client';
import { useFlexStore } from '@/store';
import { getVoiceDevice } from '../lib/device';
import { endCallForAll, holdParticipant, unholdParticipant } from '@/lib/flex/actions/Voice';

export function useVoiceControls() {
  const call = useFlexStore((s) => s.call);
  const setMuted = useFlexStore((s) => s.setMuted);
  const setCall = useFlexStore((s) => s.setCall);

  const toggleMute = () => {
    const next = !call.muted;
    getVoiceDevice()?.mute(next);
    setMuted(next);
  };

  const toggleHold = async () => {
    const first = call.participants[0];
    if (!call.taskSid || !first) return;
    if (first.onHold) {
      await unholdParticipant(call.taskSid, first.sid);
      setCall({ status: 'connected' });
    } else {
      await holdParticipant(call.taskSid, first.sid);
      setCall({ status: 'onHold' });
    }
  };

  const hangup = async () => {
    if (call.taskSid) await endCallForAll(call.taskSid);
  };

  const endForAll = async () => {
    if (call.taskSid) await endCallForAll(call.taskSid);
  };

  const sendDigit = (d: string) => getVoiceDevice()?.sendDigits(d);

  return { toggleMute, toggleHold, hangup, endForAll, sendDigit };
}
