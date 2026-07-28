'use client';
import { getActiveVoiceCall } from '@/lib/flex/registry';

export interface AudioDeviceInfo {
  id: string;
  label: string;
}

const INPUT_KEY = 'flex.audio.inputDeviceId';
const OUTPUT_KEY = 'flex.audio.outputDeviceId';

function hasMediaDevices(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.enumerateDevices;
}

function safeGet(key: string): string | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
  } catch {
    // Private mode / disabled storage — selection just won't persist.
  }
}

/**
 * Ask for microphone permission once so `enumerateDevices` returns real device
 * labels (browsers withhold labels until granted). Best-effort: the stream is
 * released immediately and denial is swallowed (we still enumerate, unlabeled).
 */
export async function requestAudioPermission(): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
  } catch {
    // Permission denied or no input device present.
  }
}

/** Enumerate the browser's audio input/output devices. Empty when unsupported. */
export async function enumerateAudioDevices(): Promise<{
  inputs: AudioDeviceInfo[];
  outputs: AudioDeviceInfo[];
}> {
  if (!hasMediaDevices()) return { inputs: [], outputs: [] };
  const devices = await navigator.mediaDevices.enumerateDevices();
  const pick = (kind: MediaDeviceKind): AudioDeviceInfo[] =>
    devices
      .filter((d) => d.kind === kind && d.deviceId)
      .map((d) => ({ id: d.deviceId, label: d.label }));
  return { inputs: pick('audioinput'), outputs: pick('audiooutput') };
}

// The Twilio Voice Device (and its AudioHelper) only exists on a live VoiceCall,
// so device selection is applied to whatever call is currently active.
function activeAudio(): {
  setInputDevice?: (id: string) => unknown;
  speakerDevices?: { set?: (id: string) => unknown };
} | null {
  const call = getActiveVoiceCall() as { device?: { audio?: unknown } } | null;
  return (call?.device?.audio ?? null) as ReturnType<typeof activeAudio>;
}

function applyInput(id: string): void {
  void activeAudio()?.setInputDevice?.(id);
}

function applyOutput(id: string): void {
  void activeAudio()?.speakerDevices?.set?.(id);
}

export function getSelectedInput(): string | null {
  return safeGet(INPUT_KEY);
}

export function getSelectedOutput(): string | null {
  return safeGet(OUTPUT_KEY);
}

/** Persist + immediately apply the chosen microphone to the active call (if any). */
export function persistSelectedInput(id: string): void {
  safeSet(INPUT_KEY, id);
  applyInput(id);
}

/** Persist + immediately apply the chosen speaker to the active call (if any). */
export function persistSelectedOutput(id: string): void {
  safeSet(OUTPUT_KEY, id);
  applyOutput(id);
}

/**
 * Re-apply the remembered device selection to the active call — call this when a
 * call is adopted so a fresh call honours the user's earlier choice.
 */
export function applyPersistedSelectionToCall(): void {
  const input = getSelectedInput();
  if (input) applyInput(input);
  const output = getSelectedOutput();
  if (output) applyOutput(output);
}
