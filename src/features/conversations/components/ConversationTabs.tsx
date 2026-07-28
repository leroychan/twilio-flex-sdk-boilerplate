'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useFlexStore } from '@/store';
import { resolveTaskContact } from '@/features/tasks/lib/taskContact';
import { ConversationTabView } from './ConversationTabView';

/**
 * Multi-conversation host: one tab per accepted non-voice task. Every conversation
 * is mounted (and therefore live) via ConversationTabView; the tab bar only toggles
 * which one is visible. Renders nothing when there is no active conversation.
 */
export function ConversationTabs() {
  const t = useTranslations('conversations');
  const tasks = useFlexStore((s) => s.tasks);
  const conversations = useFlexStore((s) => s.conversations);
  const chatTasks = tasks.filter(
    (task) => task.status === 'accepted' && task.taskChannelUniqueName !== 'voice',
  );
  const [activeTaskSid, setActiveTaskSid] = useState<string | null>(null);

  // Keep the active selection valid as chats are accepted/wrapped up.
  useEffect(() => {
    if (chatTasks.length === 0) {
      if (activeTaskSid !== null) setActiveTaskSid(null);
      return;
    }
    if (!chatTasks.some((task) => task.taskSid === activeTaskSid)) {
      setActiveTaskSid(chatTasks[0]?.taskSid ?? null);
    }
  }, [chatTasks, activeTaskSid]);

  if (chatTasks.length === 0) return null;

  const labelFor = (taskSid: string): string => {
    const conv = Object.values(conversations).find((c) => c.taskSid === taskSid);
    const task = chatTasks.find((x) => x.taskSid === taskSid);
    return (
      conv?.friendlyName ??
      resolveTaskContact(task?.attributes).name ??
      t('conversationFallback')
    );
  };

  return (
    <div className="flex flex-col gap-2">
      {chatTasks.length > 1 && (
        <div role="tablist" className="flex gap-1 border-b border-border">
          {chatTasks.map((task) => {
            const selected = task.taskSid === activeTaskSid;
            return (
              <button
                key={task.taskSid}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveTaskSid(task.taskSid)}
                className={`rounded-t-md px-3 py-1.5 text-sm ${
                  selected
                    ? 'border-b-2 border-primary font-medium text-text'
                    : 'text-muted hover:text-text'
                }`}
              >
                {labelFor(task.taskSid)}
              </button>
            );
          })}
        </div>
      )}
      {chatTasks.map((task) => (
        <ConversationTabView
          key={task.taskSid}
          taskSid={task.taskSid}
          active={task.taskSid === activeTaskSid}
        />
      ))}
    </div>
  );
}
