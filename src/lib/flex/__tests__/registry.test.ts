import { describe, it, expect, beforeEach } from 'vitest';
import {
  setConversationHandle,
  getConversationHandle,
  deleteConversationHandle,
  setVoiceCallHandle,
  getVoiceCallHandle,
  deleteVoiceCallHandle,
  setActiveVoiceCall,
  getActiveVoiceCall,
  clearActiveVoiceCall,
  resetRegistry,
} from '../registry';

describe('flex registry', () => {
  beforeEach(() => resetRegistry());

  it('stores and retrieves a conversation handle by taskSid', () => {
    const handle = { sid: 'CH1' } as never;
    setConversationHandle('WT1', handle);
    expect(getConversationHandle('WT1')).toBe(handle);
    deleteConversationHandle('WT1');
    expect(getConversationHandle('WT1')).toBeUndefined();
  });

  it('stores and retrieves a voice call handle by taskSid', () => {
    const call = { isMuted: () => false } as never;
    setVoiceCallHandle('WT2', call);
    expect(getVoiceCallHandle('WT2')).toBe(call);
    deleteVoiceCallHandle('WT2');
    expect(getVoiceCallHandle('WT2')).toBeUndefined();
  });

  it('stores, retrieves, and clears the active voice call singleton', () => {
    const call = { pauseRecording: () => Promise.resolve() } as never;
    expect(getActiveVoiceCall()).toBeUndefined();
    setActiveVoiceCall(call);
    expect(getActiveVoiceCall()).toBe(call);
    clearActiveVoiceCall();
    expect(getActiveVoiceCall()).toBeUndefined();
  });

  it('resetRegistry clears maps and the active call', () => {
    setConversationHandle('WT1', {} as never);
    setVoiceCallHandle('WT2', {} as never);
    setActiveVoiceCall({} as never);
    resetRegistry();
    expect(getConversationHandle('WT1')).toBeUndefined();
    expect(getVoiceCallHandle('WT2')).toBeUndefined();
    expect(getActiveVoiceCall()).toBeUndefined();
  });
});
