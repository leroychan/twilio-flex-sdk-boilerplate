import type { StateCreator } from 'zustand';
import type { PausedConversation } from '@/lib/flex/actions/Conversation';

export interface ConversationMessageMedia {
  url?: string;
  filename?: string;
  contentType?: string;
}
export interface ConversationMessage {
  sid: string; author: string; body: string; dateCreated: string; isMine: boolean;
  media?: ConversationMessageMedia;
  /** Email subject line, when the message is an email. */
  subject?: string;
  /** Temporary URL to the email's text/html body, rendered in a sandboxed iframe. */
  htmlUrl?: string;
}
export interface ActiveConversation {
  sid: string; taskSid: string; friendlyName: string; messages: ConversationMessage[]; type: 'chat' | 'email';
}
export interface ConversationsSlice {
  conversations: Record<string, ActiveConversation>;
  pausedConversations: PausedConversation[];
  upsertConversation(c: ActiveConversation): void;
  addMessage(sid: string, m: ConversationMessage): void;
  removeConversation(sid: string): void;
  setPausedConversations(list: PausedConversation[]): void;
}

export const createConversationsSlice: StateCreator<ConversationsSlice, [], [], ConversationsSlice> = (set) => ({
  conversations: {},
  pausedConversations: [],
  upsertConversation: (c) => set((s) => ({ conversations: { ...s.conversations, [c.sid]: c } })),
  addMessage: (sid, m) =>
    set((s) => {
      const conv = s.conversations[sid];
      if (!conv) return s;
      // Dedupe by message sid — history hydration and live messageAdded can overlap.
      if (conv.messages.some((existing) => existing.sid === m.sid)) return s;
      return { conversations: { ...s.conversations, [sid]: { ...conv, messages: [...conv.messages, m] } } };
    }),
  removeConversation: (sid) =>
    set((s) => {
      const next = { ...s.conversations };
      delete next[sid];
      return { conversations: next };
    }),
  setPausedConversations: (list) => set({ pausedConversations: list }),
});
