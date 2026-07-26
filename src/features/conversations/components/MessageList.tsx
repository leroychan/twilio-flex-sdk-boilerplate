'use client';
import type { ConversationMessage } from '@/store/slices/conversations';

export function MessageList({ messages }: { messages: ConversationMessage[] }) {
  return (
    <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3" role="log" aria-live="polite">
      {messages.map((m) => (
        <div key={m.sid} className={`flex ${m.isMine ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${m.isMine ? 'bg-primary text-white' : 'bg-surface-2 text-text'}`}>
            {m.body}
          </div>
        </div>
      ))}
    </div>
  );
}
