'use client';
import { useState } from 'react';
import { useFlexStore } from '@/store';
import { useConversation } from '../hooks/useConversation';
import { useCustomerPresence } from '../hooks/useCustomerPresence';
import { ConversationPanel } from './ConversationPanel';
import { TransferModal } from './TransferModal';
import { pauseConversation, leaveConversation } from '@/lib/flex/actions/Conversation';

/**
 * One mounted conversation. Owns the live SDK handle (via useConversation) and the
 * customer presence subscription for its task, so every open conversation stays
 * hydrated and receiving messages even while its tab is hidden.
 */
export function ConversationTabView({ taskSid, active }: { taskSid: string; active: boolean }) {
  const conversation = useFlexStore(
    (s) => Object.values(s.conversations).find((c) => c.taskSid === taskSid) ?? null,
  );
  const { send, sendMedia, sendEmail, notifyTyping } = useConversation(taskSid);
  const online = useCustomerPresence(taskSid);
  const [transferOpen, setTransferOpen] = useState(false);

  return (
    <div className={active ? '' : 'hidden'} data-testid={`conversation-tab-${taskSid}`}>
      <ConversationPanel
        conversation={conversation}
        online={online}
        onSend={(body) => void send(body)}
        onTyping={notifyTyping}
        onSendMedia={(file) => void sendMedia(file)}
        onSendEmail={(htmlBody, subject) => void sendEmail(htmlBody, subject)}
        onPause={() => {
          if (conversation) void pauseConversation(conversation.sid);
        }}
        onLeave={() => {
          if (conversation) void leaveConversation(conversation.sid);
        }}
        onTransfer={() => setTransferOpen(true)}
      />
      {conversation && (
        <TransferModal
          open={transferOpen}
          conversationSid={conversation.sid}
          onClose={() => setTransferOpen(false)}
        />
      )}
    </div>
  );
}
