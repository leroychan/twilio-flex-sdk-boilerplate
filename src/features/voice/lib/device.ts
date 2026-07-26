'use client';
import { getFlexClient } from '@/lib/flex/client';

export interface VoiceDevice {
  mute(shouldMute: boolean): void;
  sendDigits(digits: string): void;
  audio?: {
    setInputDevice(id: string): Promise<void>;
    speakerDevices?: { set(id: string): Promise<void> };
    availableInputDevices?: Map<string, MediaDeviceInfo>;
    availableOutputDevices?: Map<string, MediaDeviceInfo>;
  };
}

export function getVoiceDevice(): VoiceDevice | null {
  const client = getFlexClient() as unknown as { voice?: { device?: VoiceDevice } } | null;
  return client?.voice?.device ?? null;
}
