'use client';

import { type ReactNode, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader } from 'lucide-react';
import { useFlexStore } from '@/store';
import { Tabs, type TabItem } from '@/components/ui/Tabs';
import { ConversationTabView } from '@/features/conversations';
import { IncomingTaskPanel } from '@/features/tasks/components/IncomingTaskPanel';
import { TaskAttributesView } from '@/features/tasks/components/TaskAttributesView';
import { NotesTab } from '@/features/tasks/components/NotesTab';
import { WrapUpForm, type WrapUpValues } from '@/features/tasks/components/WrapUpForm';
import { useTasks } from '@/features/tasks/hooks/useTasks';
import { resolveTaskContact } from '@/features/tasks/lib/taskContact';

type TabId = 'call' | 'conversation' | 'notes' | 'info';

/**
 * Tabbed middle-column workspace mirroring flex-template-builder: a header
 * (contact + status badge) + Call/Notes/Info (voice) or Conversation/Notes/Info
 * (chat). The live CallPanel is injected (its controls live in the shell).
 */
export function TaskWorkspace({ callPanel }: { callPanel: ReactNode }) {
  const t = useTranslations('session');
  const activeTaskSid = useFlexStore((s) => s.activeTaskSid);
  const tasks = useFlexStore((s) => s.tasks);
  const call = useFlexStore((s) => s.call);
  const { accept, reject, complete, setAttributes } = useTasks();
  const [activeTab, setActiveTab] = useState<TabId>('call');
  const [completing, setCompleting] = useState(false);

  const task = tasks.find((x) => x.taskSid === activeTaskSid);
  const isVoice = task?.taskChannelUniqueName === 'voice';

  const tabs: TabItem[] = useMemo(() => {
    const first: TabItem = isVoice
      ? { id: 'call', label: t('workspace.tabs.call') }
      : { id: 'conversation', label: t('workspace.tabs.conversation') };
    return [
      first,
      { id: 'notes', label: t('workspace.tabs.notes') },
      { id: 'info', label: t('workspace.tabs.info') },
    ];
  }, [isVoice, t]);

  if (!task) return null;

  const { name, phone } = resolveTaskContact(task.attributes);
  const contact = name || phone || task.taskSid;
  const primaryTabId: TabId = isVoice ? 'call' : 'conversation';
  const effectiveTab: TabId = tabs.some((tab) => tab.id === activeTab) ? activeTab : primaryTabId;

  const status =
    task.status === 'pending'
      ? t('workspace.status.incoming')
      : task.status === 'wrapping'
        ? t('workspace.status.wrapping')
        : isVoice && !((call.status === 'connected' || call.status === 'onHold') && call.taskSid === task.taskSid)
          ? t('workspace.status.connecting')
          : t('workspace.status.live');

  const onComplete = async (_values: WrapUpValues) => {
    setCompleting(true);
    try {
      await complete(task.taskSid);
    } catch {
      setCompleting(false);
    }
  };

  const renderPrimary = () => {
    if (task.status === 'pending') {
      return <IncomingTaskPanel task={task} onAccept={accept} onReject={reject} />;
    }
    if (task.status === 'wrapping') {
      return (
        <div className="flex flex-col items-center gap-5 py-8">
          <WrapUpForm onComplete={onComplete} completing={completing} />
        </div>
      );
    }
    if (isVoice) {
      const callActive =
        (call.status === 'connected' || call.status === 'onHold') && call.taskSid === task.taskSid;
      if (callActive) return <>{callPanel}</>;
      return (
        <div className="flex flex-col items-center gap-3 py-10 text-center text-muted">
          <Loader className="h-6 w-6 animate-spin" aria-hidden />
        </div>
      );
    }
    return null; // chat conversation is rendered (kept mounted) below
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-bg">
      <div className="shrink-0 border-b border-border px-6 py-3">
        <h2 className="text-sm font-semibold leading-tight text-text">{contact}</h2>
        <span className="text-xs text-muted">{status}</span>
      </div>

      <Tabs
        tabs={tabs}
        activeId={effectiveTab}
        onChange={(id) => setActiveTab(id as TabId)}
        aria-label={t('workspace.views')}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Chat conversations stay mounted (hidden) so their live handle isn't torn down. */}
        {!isVoice && (
          <ConversationTabView taskSid={task.taskSid} active={effectiveTab === 'conversation'} />
        )}
        {effectiveTab === primaryTabId && isVoice && renderPrimary()}
        {effectiveTab === 'notes' && (
          <NotesTab taskSid={task.taskSid} attributes={task.attributes} onPersist={setAttributes} />
        )}
        {effectiveTab === 'info' && <TaskAttributesView attributes={task.attributes} />}
      </div>
    </div>
  );
}
