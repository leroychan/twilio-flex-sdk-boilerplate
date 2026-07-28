import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/en.json';

vi.mock('../../hooks/useConversation', () => ({
  useConversation: () => ({ send: vi.fn(), sendMedia: vi.fn(), sendEmail: vi.fn(), notifyTyping: vi.fn() }),
}));
vi.mock('../../hooks/useCustomerPresence', () => ({ useCustomerPresence: () => null }));
vi.mock('../TransferModal', () => ({ TransferModal: () => null }));
vi.mock('@/lib/flex/actions/Conversation', () => ({
  pauseConversation: vi.fn(),
  leaveConversation: vi.fn(),
}));

import { ConversationTabs } from '../ConversationTabs';
import { useFlexStore } from '@/store';

function wrap(ui: React.ReactNode) {
  return <NextIntlClientProvider locale="en" messages={{ conversations: messages }}>{ui}</NextIntlClientProvider>;
}

const task = (taskSid: string, channel = 'chat') => ({
  reservationSid: `WR-${taskSid}`,
  taskSid,
  taskChannelUniqueName: channel,
  attributes: {},
  status: 'accepted' as const,
});
const conv = (sid: string, taskSid: string, friendlyName: string) => ({
  sid,
  taskSid,
  friendlyName,
  type: 'chat' as const,
  messages: [],
});

describe('ConversationTabs', () => {
  beforeEach(() => {
    useFlexStore.setState({ tasks: [], conversations: {} });
  });

  it('renders nothing when there are no chat tasks', () => {
    const { container } = render(wrap(<ConversationTabs />));
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a tab per chat conversation and selects the first by default', () => {
    useFlexStore.setState({
      tasks: [task('WT1'), task('WT2')],
      conversations: { CH1: conv('CH1', 'WT1', 'Alice'), CH2: conv('CH2', 'WT2', 'Bob') },
    });
    render(wrap(<ConversationTabs />));
    expect(screen.getByRole('tab', { name: 'Alice' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Bob' })).toHaveAttribute('aria-selected', 'false');
  });

  it('switches the active conversation when another tab is clicked', async () => {
    useFlexStore.setState({
      tasks: [task('WT1'), task('WT2')],
      conversations: { CH1: conv('CH1', 'WT1', 'Alice'), CH2: conv('CH2', 'WT2', 'Bob') },
    });
    render(wrap(<ConversationTabs />));
    await userEvent.click(screen.getByRole('tab', { name: 'Bob' }));
    expect(screen.getByRole('tab', { name: 'Bob' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Alice' })).toHaveAttribute('aria-selected', 'false');
  });

  it('does not render a tablist for a single conversation', () => {
    useFlexStore.setState({
      tasks: [task('WT1')],
      conversations: { CH1: conv('CH1', 'WT1', 'Alice') },
    });
    render(wrap(<ConversationTabs />));
    expect(screen.queryByRole('tablist')).toBeNull();
  });
});
