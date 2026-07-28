'use client';
import { useEffect } from 'react';
import { AddConversationEventListener } from '@twilio/flex-sdk/actions/Conversation';
import { getFlexClient } from '@/lib/flex/client';
import { useFlexStore } from '@/store';

type Unsub = () => void;
const asRecord = (v: unknown): Record<string, unknown> => (v ?? {}) as Record<string, unknown>;

/**
 * Bridges Flex conversation events into the store. The real SDK exposes
 * AddConversationEventListener as an Action executed per event type via
 * `client.execute(new AddConversationEventListener(eventName, listener))`, resolving to
 * `{ unsubscribe }`. This hook registers the events we care about and cleans them up.
 * It no-ops when no live client is present (stub/demo mode or tests), so it never throws —
 * the store simply isn't populated until a real session connects.
 */
export function useConversationEvents(): void {
  const upsertConversation = useFlexStore((s) => s.upsertConversation);
  const removeConversation = useFlexStore((s) => s.removeConversation);

  useEffect(() => {
    const client = getFlexClient();
    if (!client) return;

    const unsubs: Unsub[] = [];
    let cancelled = false;

    const register = async (eventName: string, listener: (payload: unknown) => void) => {
      try {
        const action = new AddConversationEventListener(eventName as never, listener as never);
        const res = (await client.execute(action)) as { unsubscribe?: Unsub } | undefined;
        if (res?.unsubscribe) {
          if (cancelled) res.unsubscribe();
          else unsubs.push(res.unsubscribe);
        }
      } catch {
        // Best-effort: registration requires a fully connected conversations session.
      }
    };

    void register('conversationJoined', (c) => {
      const conv = asRecord(c);
      const sid = String(conv.sid ?? '');
      if (sid) {
        // Lifecycle placeholder so the conversation appears in the tab list.
        // Messages are owned/hydrated by useConversation for the selected task.
        upsertConversation({
          sid,
          taskSid: String(asRecord(conv.task).sid ?? conv.taskSid ?? ''),
          friendlyName: String(conv.friendlyName ?? sid),
          messages: [],
          type: 'chat',
        });
      }
    });

    void register('conversationRemoved', (c) => {
      const sid = String(asRecord(c).sid ?? '');
      if (sid) removeConversation(sid);
    });

    return () => {
      cancelled = true;
      unsubs.forEach((u) => u());
    };
  }, [upsertConversation, removeConversation]);
}
