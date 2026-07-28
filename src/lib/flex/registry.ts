'use client';

import type { Conversation } from '@twilio/flex-sdk/actions/Conversation';
import type { VoiceCall } from '@twilio/flex-sdk/actions/Voice';

// Non-serializable, event-emitting SDK handles live here (module singletons),
// keyed by taskSid — NOT in Zustand. Mirrors the client.ts singleton pattern so
// a UI hot-reload never tears down an active conversation/call handle.
const conversations = new Map<string, Conversation>();
const voiceCalls = new Map<string, VoiceCall>();

export function setConversationHandle(taskSid: string, c: Conversation): void {
  conversations.set(taskSid, c);
}
export function getConversationHandle(taskSid: string): Conversation | undefined {
  return conversations.get(taskSid);
}
export function deleteConversationHandle(taskSid: string): void {
  conversations.delete(taskSid);
}

export function setVoiceCallHandle(taskSid: string, c: VoiceCall): void {
  voiceCalls.set(taskSid, c);
}
export function getVoiceCallHandle(taskSid: string): VoiceCall | undefined {
  return voiceCalls.get(taskSid);
}
export function deleteVoiceCallHandle(taskSid: string): void {
  voiceCalls.delete(taskSid);
}

// The single in-progress voice call. The device-level `incoming`/outbound events
// deliver the VoiceCall before its taskSid is known, and there is only ever one
// active call, so recording controls reach it through this singleton.
let activeVoiceCall: VoiceCall | undefined;
export function setActiveVoiceCall(c: VoiceCall | undefined): void {
  activeVoiceCall = c;
}
export function getActiveVoiceCall(): VoiceCall | undefined {
  return activeVoiceCall;
}
export function clearActiveVoiceCall(): void {
  activeVoiceCall = undefined;
}

export function resetRegistry(): void {
  conversations.clear();
  voiceCalls.clear();
  activeVoiceCall = undefined;
}
