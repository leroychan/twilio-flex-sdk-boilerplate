import { describe, it, expect, beforeEach } from 'vitest';
import { create } from 'zustand';
import { createConversationsSlice, type ConversationsSlice } from '../conversations';

const useTest = create<ConversationsSlice>()((...a) => ({ ...createConversationsSlice(...a) }));

beforeEach(() => useTest.setState({ conversations: {}, pausedConversations: [] }));

describe('conversationsSlice', () => {
  it('upserts a conversation and adds messages', () => {
    useTest.getState().upsertConversation({ sid: 'CH1', taskSid: 'WT1', friendlyName: 'Chat', messages: [], type: 'chat' });
    useTest.getState().addMessage('CH1', { sid: 'M1', author: 'cust', body: 'hi', dateCreated: 'now', isMine: false });
    expect(useTest.getState().conversations['CH1']!.messages).toHaveLength(1);
  });

  it('removes a conversation', () => {
    useTest.getState().upsertConversation({ sid: 'CH1', taskSid: 'WT1', friendlyName: 'Chat', messages: [], type: 'chat' });
    useTest.getState().removeConversation('CH1');
    expect(useTest.getState().conversations['CH1']).toBeUndefined();
  });

  it('stores paused conversations', () => {
    useTest.getState().setPausedConversations([{ sid: 'CH2', friendlyName: 'Parked', pausedAt: 'x' }]);
    expect(useTest.getState().pausedConversations).toHaveLength(1);
  });
});
