'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useFlexStore } from '@/store';
import { FlexClientProvider } from '@/lib/flex/provider';
import { PluginRoot } from '@/components/plugins/PluginRoot';
import { PluginSlot } from '@/components/plugins/PluginSlot';
import { Button } from '@/components/ui/Button';
import { ActivitySelector } from '@/features/presence/components/ActivitySelector';
import { TaskList } from '@/features/tasks/components/TaskList';
import {
  CallPanel,
  OutboundDialer,
  VoiceTransferModal,
  AudioDevicePicker,
  useVoiceControls,
  useVoiceEvents,
} from '@/features/voice';
import {
  ConversationPanel,
  TransferModal,
  useConversationEvents,
} from '@/features/conversations';
import { SupervisorPanel } from '@/features/supervisor';
import { pauseConversation, leaveConversation } from '@/lib/flex/actions/Conversation';

/**
 * The live agent workspace, rendered inside FlexClientProvider (so the SDK client and
 * event bridges are available) and PluginRoot (so <PluginSlot> renders contributions).
 * Feature modules are composed here; event-bridge hooks populate the store.
 */
function DesktopBody() {
  const t = useTranslations('session');
  useVoiceEvents();
  useConversationEvents();

  const call = useFlexStore((s) => s.call);
  const conversationsMap = useFlexStore((s) => s.conversations);
  const addMessage = useFlexStore((s) => s.addMessage);
  const controls = useVoiceControls();

  const [dialerOpen, setDialerOpen] = useState(false);
  const [voiceTransferOpen, setVoiceTransferOpen] = useState(false);
  const [convTransferOpen, setConvTransferOpen] = useState(false);

  const activeConversation = Object.values(conversationsMap)[0] ?? null;

  return (
    <PluginRoot>
      <main data-testid="agent-desktop" className="min-h-screen bg-bg text-text">
        <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
          <ActivitySelector />
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setDialerOpen(true)}>
              {t('desktop.dial')}
            </Button>
            <PluginSlot name="header-action" />
          </div>
        </header>

        <div className="grid grid-cols-12 gap-4 p-4">
          <section className="col-span-12 md:col-span-3">
            <TaskList />
          </section>

          <section className="col-span-12 flex flex-col gap-4 md:col-span-6">
            <CallPanel
              call={call}
              onMuteToggle={controls.toggleMute}
              onHoldToggle={() => void controls.toggleHold()}
              onHangup={() => void controls.hangup()}
              onEndForAll={() => void controls.endForAll()}
              onTransfer={() => setVoiceTransferOpen(true)}
            />
            <ConversationPanel
              conversation={activeConversation}
              onSend={(body) => {
                if (!activeConversation) return;
                addMessage(activeConversation.sid, {
                  sid: `local-${Date.now()}`,
                  author: 'me',
                  body,
                  dateCreated: new Date().toISOString(),
                  isMine: true,
                });
              }}
              onPause={() => {
                if (activeConversation) void pauseConversation(activeConversation.sid);
              }}
              onLeave={() => {
                if (activeConversation) void leaveConversation(activeConversation.sid);
              }}
              onTransfer={() => setConvTransferOpen(true)}
            />
            <PluginSlot name="task-panel" />
          </section>

          <section className="col-span-12 flex flex-col gap-4 md:col-span-3">
            <SupervisorPanel />
            <AudioDevicePicker />
            <PluginSlot name="side-panel" />
          </section>
        </div>

        <OutboundDialer open={dialerOpen} onClose={() => setDialerOpen(false)} />
        <VoiceTransferModal
          open={voiceTransferOpen}
          taskSid={call.taskSid ?? ''}
          onClose={() => setVoiceTransferOpen(false)}
        />
        {activeConversation && (
          <TransferModal
            open={convTransferOpen}
            conversationSid={activeConversation.sid}
            onClose={() => setConvTransferOpen(false)}
          />
        )}
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
    <FlexClientProvider token={token}>
      <DesktopBody />
    </FlexClientProvider>
  );
}
