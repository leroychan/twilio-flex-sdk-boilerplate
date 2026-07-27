'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useFlexStore } from '@/store';
import { FlexClientProvider } from '@/lib/flex/provider';
import { PluginRoot } from '@/components/plugins/PluginRoot';
import { PluginSlot } from '@/components/plugins/PluginSlot';
import { Logo } from '@/components/ui/Logo';
import { Separator } from '@/components/ui/Separator';
import { IconRail, type DesktopView } from '@/components/layout/IconRail';
import { ResizableColumns } from '@/components/layout/ResizableColumns';
import { CrmPanel } from '@/components/layout/CrmPanel';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { LocaleSwitcher } from '@/components/i18n/LocaleSwitcher';
import { ActivitySelector } from '@/features/presence/components/ActivitySelector';
import { usePresence } from '@/features/presence/hooks/usePresence';
import { usePresenceEvents } from '@/features/presence/hooks/usePresenceEvents';
import { TaskList } from '@/features/tasks/components/TaskList';
import { useTaskEvents } from '@/features/tasks/hooks/useTaskEvents';
import {
  CallPanel,
  OutboundDialer,
  VoiceTransferModal,
  AudioSettingsMenu,
  useVoiceControls,
  useVoiceEvents,
} from '@/features/voice';
import { useConversationEvents } from '@/features/conversations';
import { SupervisorPanel } from '@/features/supervisor';
import { QueuesView } from '@/features/queues';
import { useIsSupervisor } from '../hooks/useIsSupervisor';
import { SelectedTaskDetail } from './SelectedTaskDetail';

/**
 * The live agent workspace, rendered inside FlexClientProvider (so the SDK client and
 * event bridges are available) and PluginRoot (so <PluginSlot> renders contributions).
 * Feature modules are composed here; event-bridge hooks populate the store.
 */
function DesktopBody() {
  const tSup = useTranslations('supervisor');
  usePresenceEvents();
  useTaskEvents();
  useVoiceEvents();
  useConversationEvents();

  const call = useFlexStore((s) => s.call);
  const taskParticipantsMap = useFlexStore((s) => s.taskParticipants);
  const workerNames = useFlexStore((s) => s.workerNames);
  const controls = useVoiceControls();
  const callParticipants = call.taskSid ? (taskParticipantsMap[call.taskSid] ?? []) : [];

  const isSupervisor = useIsSupervisor();
  const { activities } = usePresence();
  const supervisorActivities = useMemo(
    () => activities.map((a) => ({ sid: a.sid, name: a.name })),
    [activities],
  );

  const [dialerOpen, setDialerOpen] = useState(false);
  const [voiceTransferOpen, setVoiceTransferOpen] = useState(false);
  const [view, setView] = useState<DesktopView>('desktop');

  return (
    <PluginRoot>
      <main
        data-testid="agent-desktop"
        className="flex h-screen flex-col overflow-hidden bg-bg text-text"
      >
        <header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-6 py-3">
          <Logo className="h-8 w-auto" />
          <div className="flex items-center gap-2">
            <PluginSlot name="header-action" />

            {/* appearance */}
            <ThemeToggle />
            <LocaleSwitcher />
            <Separator />

            {/* audio devices (dial + teams now live in the rail) */}
            <AudioSettingsMenu />
            <Separator />

            {/* presence */}
            <ActivitySelector />
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <IconRail
            activeView={view}
            onViewChange={setView}
            onDialpad={() => setDialerOpen(true)}
            showTeams={isSupervisor}
          />

          <div className="min-h-0 flex-1">
            {view === 'queues' ? (
              <QueuesView />
            ) : view === 'teams' && isSupervisor ? (
              <div className="h-full overflow-y-auto p-4">
                <h2 className="mb-3 text-sm font-semibold text-text">{tSup('title')}</h2>
                <SupervisorPanel activities={supervisorActivities} />
              </div>
            ) : (
              <ResizableColumns
                left={<TaskList />}
                middle={
                  <div className="flex flex-col gap-4 p-4">
                    <SelectedTaskDetail
                      callPanel={
                        <CallPanel
                          call={call}
                          onMuteToggle={controls.toggleMute}
                          onHoldToggle={() => void controls.toggleHold()}
                          onHangup={() => void controls.hangup()}
                          onEndForAll={() => void controls.endForAll()}
                          onTransfer={() => setVoiceTransferOpen(true)}
                          participants={callParticipants}
                          workerNames={workerNames}
                          onHoldParticipant={(sid) => void controls.toggleParticipantHold(sid)}
                          onKickParticipant={(sid) => void controls.removeParticipant(sid)}
                          onAddParticipant={(to) => void controls.addParticipant(to)}
                          onToggleRecording={() => void controls.toggleRecording()}
                        />
                      }
                    />
                    <PluginSlot name="task-panel" />
                  </div>
                }
                right={<CrmPanel />}
              />
            )}
          </div>
        </div>

        <OutboundDialer open={dialerOpen} onClose={() => setDialerOpen(false)} />
        <VoiceTransferModal
          open={voiceTransferOpen}
          taskSid={call.taskSid ?? ''}
          onClose={() => setVoiceTransferOpen(false)}
        />
      </main>
    </PluginRoot>
  );
}

/**
 * Session-gated container: redirects to /login when there is no token, otherwise mounts
 * the live FlexClientProvider + workspace.
 */
export function AgentDesktopShell() {
  const token = useFlexStore((s) => s.token);
  const router = useRouter();

  useEffect(() => {
    if (!token) router.replace('/login');
  }, [token, router]);

  if (!token) return null;

  return (
    // autoAcceptIncomingCalls: the agent's browser leg is auto-answered when the
    // conference dials in on task accept. Without it the WebRTC leg rings unanswered
    // and the conference fails to assemble.
    <FlexClientProvider token={token} options={{ autoAcceptIncomingCalls: true }}>
      <DesktopBody />
    </FlexClientProvider>
  );
}
