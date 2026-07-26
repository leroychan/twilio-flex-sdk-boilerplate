import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/en.json';

const resumeConversation = vi.fn();
const getPausedConversations = vi.fn();
vi.mock('@/lib/flex/actions/Conversation', () => ({ resumeConversation: (...a: unknown[]) => resumeConversation(...a), getPausedConversations: () => getPausedConversations() }));

import { useFlexStore } from '@/store';
import { PausedConversationsModal } from '../PausedConversationsModal';

function wrap(ui: React.ReactNode) {
  return <NextIntlClientProvider locale="en" messages={{ conversations: messages }}>{ui}</NextIntlClientProvider>;
}

beforeEach(() => {
  resumeConversation.mockReset().mockResolvedValue(undefined);
  // The mount-effect refresh is idempotent here: it returns the same parked list so
  // the Resume button stays mounted through the click.
  getPausedConversations.mockReset().mockResolvedValue([{ sid: 'CH9', friendlyName: 'Parked chat', pausedAt: 'x' }]);
  // The conversations slice is composed into the shared store by the coordinator;
  // in isolation we seed the state + setter the modal reads.
  useFlexStore.setState({
    pausedConversations: [{ sid: 'CH9', friendlyName: 'Parked chat', pausedAt: 'x' }],
    setPausedConversations: (list: unknown) => useFlexStore.setState({ pausedConversations: list } as never),
  } as never);
});

describe('PausedConversationsModal', () => {
  it('lists paused conversations and resumes one', async () => {
    render(wrap(<PausedConversationsModal open onClose={vi.fn()} />));
    expect(screen.getByText('Parked chat')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Resume' }));
    await waitFor(() => expect(resumeConversation).toHaveBeenCalledWith('CH9'));
  });
});
