import { render, screen } from '@testing-library/react';
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
    render(wrap(<ConversationPanel conversation={null} onSend={noop} onPause={noop} onLeave={noop} onTransfer={noop} />));
    expect(screen.getByText('No active conversation')).toBeInTheDocument();
  });

  it('renders messages and action buttons for an active conversation', () => {
    const conv = { sid: 'CH1', friendlyName: 'Chat', type: 'chat' as const, messages: [{ sid: 'M1', author: 'c', body: 'hi', dateCreated: 'n', isMine: false }] };
    render(wrap(<ConversationPanel conversation={conv} onSend={vi.fn()} onPause={vi.fn()} onLeave={vi.fn()} onTransfer={vi.fn()} />));
    expect(screen.getByText('hi')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Park' })).toBeInTheDocument();
  });
});
