'use client';

import { useEffect, useRef } from 'react';
import { useFlexStore } from '@/store';
import { getConversationBySid } from '@/lib/flex/actions/Conversation';
import { resolveTaskContact } from '../lib/taskContact';

/**
 * Backfills each non-voice task's display name from its Conversation resource.
 *
 * Webchat task attributes carry only the customer's anonymous `FX…` identity — the
 * real name lives on the Conversation resource under `pre_engagement_data`. This
 * hook fetches that conversation (once per task, best-effort) and writes the
 * resolved name onto the task via `setTaskContactName`, so the task list and
 * workspace header show e.g. "Leroy" instead of an `FX…` SID. Fetches that fail
 * (no live client, agent not yet a participant) are swallowed — the UI falls back
 * to the channel label.
 */
export function useTaskContactNames(): void {
  const tasks = useFlexStore((s) => s.tasks);
  const setTaskContactName = useFlexStore((s) => s.setTaskContactName);
  const attempted = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const task of tasks) {
      if (task.taskChannelUniqueName === 'voice' || task.contactName) continue;
      if (attempted.current.has(task.taskSid)) continue;
      const convSid =
        typeof task.attributes.conversationSid === 'string' ? task.attributes.conversationSid : null;
      if (!convSid) continue;

      attempted.current.add(task.taskSid);
      void (async () => {
        try {
          const conv = (await getConversationBySid(convSid)) as {
            conversation?: { attributes?: unknown };
          };
          const attrs = conv.conversation?.attributes;
          const record = attrs && typeof attrs === 'object' ? (attrs as Record<string, unknown>) : null;
          const name = resolveTaskContact(record).name;
          if (name) setTaskContactName(task.taskSid, name);
        } catch {
          // Best-effort: requires a live conversations session + participation.
        }
      })();
    }
  }, [tasks, setTaskContactName]);
}
