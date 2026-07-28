import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/en.json';

vi.mock('../../hooks/useConversation', () => ({
  useConversation: () => ({ send: vi.fn(), sendMedia: vi.fn(), sendEmail: vi.fn(), notifyTyping: vi.fn() }),
}));
vi.mock('../../hooks/useCustomerPresence', () => ({ useCustomerPresence: () => null }));

const pauseConversation = vi.fn();
const leaveConversation = vi.fn();
vi.mock('@/lib/flex/actions/Conversation', () => ({
  pauseConversation: (sid: string) => pauseConversation(sid),
  leaveConversation: (sid: string) => leaveConversation(sid),
}));

const end = vi.fn();
const complete = vi.fn();
vi.mock('@/features/tasks/hooks/useTasks', () => ({
  useTasks: () => ({ end, complete }),
}));

import { ConversationTabView } from '../ConversationTabView';
import { useFlexStore } from '@/store';

function wrap(ui: React.ReactNode) {
  return <NextIntlClientProvider locale="en" messages={{ conversations: messages }}>{ui}</NextIntlClientProvider>;
}

const TASK_SID = 'WT123';
const CONV_SID = 'CH456';

describe('ConversationTabView chat controls', () => {
  beforeEach(() => {
    pauseConversation.mockReset();
    leaveConversation.mockReset();
    end.mockReset();
    useFlexStore.setState({
      conversations: {
        [CONV_SID]: { sid: CONV_SID, taskSid: TASK_SID, friendlyName: 'Jane', type: 'chat', messages: [] },
      },
    });
  });

  it('leaves using the task SID, not the conversation SID', async () => {
    render(wrap(<ConversationTabView taskSid={TASK_SID} active />));
    await userEvent.click(screen.getByRole('button', { name: messages.more }));
    await userEvent.click(screen.getByRole('button', { name: messages.leave }));
    expect(leaveConversation).toHaveBeenCalledWith(TASK_SID);
  });

  it('pauses using the task SID, not the conversation SID', async () => {
    render(wrap(<ConversationTabView taskSid={TASK_SID} active />));
    await userEvent.click(screen.getByRole('button', { name: messages.more }));
    await userEvent.click(screen.getByRole('button', { name: messages.pause }));
    expect(pauseConversation).toHaveBeenCalledWith(TASK_SID);
  });

  it('ends the chat via the task lifecycle (EndTask), keyed by task SID', async () => {
    render(wrap(<ConversationTabView taskSid={TASK_SID} active />));
    await userEvent.click(screen.getByRole('button', { name: messages.end }));
    expect(end).toHaveBeenCalledWith(TASK_SID);
  });
});
