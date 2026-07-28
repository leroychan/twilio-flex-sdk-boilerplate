'use client';
import { useEffect, useState } from 'react';
import { getTaskParticipants } from '@/lib/flex/actions/Task';
import { getConversationsUser } from '@/lib/flex/actions/Conversation';

interface PresenceUser {
  isOnline?: boolean | null;
  on?: (event: string, listener: () => void) => void;
  removeListener?: (event: string, listener: () => void) => void;
}

/**
 * Track the customer's online/offline presence for a conversation task.
 * Finds the `customer` participant, resolves its Conversations User by identity,
 * seeds `isOnline`, and reacts to the user's `updated` event. Returns `null` when
 * presence is unknown or not applicable (e.g. voice tasks with no customer identity).
 */
export function useCustomerPresence(taskSid: string | null): boolean | null {
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    if (!taskSid) return;
    setOnline(null);
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void (async () => {
      try {
        const participants = await getTaskParticipants(taskSid);
        const customer = participants.find((p) => String(p.type) === 'customer');
        const identity = (customer as { mediaProperties?: { identity?: string | null } } | undefined)
          ?.mediaProperties?.identity;
        if (!identity) return;

        const user = (await getConversationsUser(identity)) as unknown as PresenceUser;
        if (cancelled || !user) return;
        setOnline(!!user.isOnline);
        const listener = () => setOnline(!!user.isOnline);
        user.on?.('updated', listener);
        cleanup = () => user.removeListener?.('updated', listener);
      } catch {
        // Best-effort: presence requires a connected conversations session.
      }
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [taskSid]);

  return online;
}
