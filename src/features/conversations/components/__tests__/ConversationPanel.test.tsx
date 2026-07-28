import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/en.json';
import { ConversationPanel } from '../ConversationPanel';

const noop = () => {};
function wrap(ui: React.ReactNode) {
  return <NextIntlClientProvider locale="en" messages={{ conversations: messages }}>{ui}</NextIntlClientProvider>;
}

describe('ConversationPanel', () => {
  it('shows empty state with no conversation', () => {
    render(wrap(<ConversationPanel conversation={null} onSend={noop} onPause={noop} onLeave={noop} onTransfer={noop} onEnd={noop} />));
    expect(screen.getByText('No active conversation')).toBeInTheDocument();
  });

  it('renders messages, the End chat button, and a More menu of secondary actions', async () => {
    const conv = { sid: 'CH1', taskSid: 'WT1', friendlyName: 'Chat', type: 'chat' as const, messages: [{ sid: 'M1', author: 'c', body: 'hi', dateCreated: 'n', isMine: false }] };
    render(wrap(<ConversationPanel conversation={conv} onSend={vi.fn()} onPause={vi.fn()} onLeave={vi.fn()} onTransfer={vi.fn()} onEnd={vi.fn()} />));
    expect(screen.getByText('hi')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'End chat' })).toBeInTheDocument();
    // Secondary actions are collapsed into the More menu until opened.
    expect(screen.queryByRole('button', { name: 'Park' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'More' }));
    expect(screen.getByRole('button', { name: 'Park' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Transfer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Leave' })).toBeInTheDocument();
  });

  it('shows a Complete button (not End chat / More) once the task is wrapping', async () => {
    const conv = { sid: 'CH1', taskSid: 'WT1', friendlyName: 'Chat', type: 'chat' as const, messages: [] };
    const onComplete = vi.fn();
    render(
      wrap(
        <ConversationPanel
          conversation={conv}
          status="wrapping"
          onSend={vi.fn()}
          onPause={vi.fn()}
          onLeave={vi.fn()}
          onTransfer={vi.fn()}
          onEnd={vi.fn()}
          onComplete={onComplete}
        />,
      ),
    );
    expect(screen.queryByRole('button', { name: 'End chat' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'More' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Complete' }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('shows an online badge when the customer is online', () => {
    const conv = { sid: 'CH1', taskSid: 'WT1', friendlyName: 'Chat', type: 'chat' as const, messages: [] };
    render(wrap(<ConversationPanel conversation={conv} online onSend={noop} onPause={noop} onLeave={noop} onTransfer={noop} onEnd={noop} />));
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('shows an offline badge when the customer is offline', () => {
    const conv = { sid: 'CH1', taskSid: 'WT1', friendlyName: 'Chat', type: 'chat' as const, messages: [] };
    render(wrap(<ConversationPanel conversation={conv} online={false} onSend={noop} onPause={noop} onLeave={noop} onTransfer={noop} onEnd={noop} />));
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });
});
