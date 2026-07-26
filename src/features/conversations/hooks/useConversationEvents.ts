'use client';
import { useEffect } from 'react';
import { AddConversationEventListener } from '@twilio/flex-sdk/actions/Conversation';
import { useFlexStore } from '@/store';

interface RawConvEvent {
  type: string;
  conversationSid: string;
  friendlyName?: string;
  message?: { sid: string; author: string; body: string; dateCreated: string; isMine: boolean };
}

// NOTE (integration): the real SDK exposes AddConversationEventListener as an Action
// class — `client.execute(new AddConversationEventListener(eventName, listener))` —
// resolving to `{ unsubscribe }`. This hook uses the callback-registration shape the
// plan specifies; the coordinator adapts the wiring in the provider bootstrap.
const register = AddConversationEventListener as unknown as (
  cb: (e: RawConvEvent) => void,
) => (() => void) | void;

export function useConversationEvents(): void {
  const upsertConversation = useFlexStore((s) => s.upsertConversation);
  const addMessage = useFlexStore((s) => s.addMessage);
  const removeConversation = useFlexStore((s) => s.removeConversation);

  useEffect(() => {
    const unsubscribe = register((e: RawConvEvent) => {
      switch (e.type) {
        case 'conversationJoined':
          upsertConversation({ sid: e.conversationSid, friendlyName: e.friendlyName ?? e.conversationSid, messages: [], type: 'chat' });
          break;
        case 'messageAdded':
          if (e.message) addMessage(e.conversationSid, e.message);
          break;
        case 'conversationRemoved':
          removeConversation(e.conversationSid);
          break;
      }
    });
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, [upsertConversation, addMessage, removeConversation]);
}
