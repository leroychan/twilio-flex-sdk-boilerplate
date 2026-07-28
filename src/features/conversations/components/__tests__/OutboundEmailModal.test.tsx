import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/en.json';

const startOutboundEmailTask = vi.fn();
const addEmailParticipant = vi.fn();
vi.mock('@/lib/flex/actions/Conversation', () => ({
  startOutboundEmailTask: (...a: unknown[]) => startOutboundEmailTask(...a),
  addEmailParticipant: (...a: unknown[]) => addEmailParticipant(...a),
}));
// react-simple-wysiwyg renders a contentEditable; stub to a textarea for deterministic tests.
vi.mock('react-simple-wysiwyg', () => ({
  __esModule: true,
  default: ({ value, onChange }: { value: string; onChange: (e: { target: { value: string } }) => void }) => (
    <textarea aria-label="body" value={value} onChange={(e) => onChange({ target: { value: e.target.value } })} />
  ),
}));
import { OutboundEmailModal } from '../OutboundEmailModal';

function wrap(ui: React.ReactNode) {
  return <NextIntlClientProvider locale="en" messages={{ conversations: messages }}>{ui}</NextIntlClientProvider>;
}
beforeEach(() => {
  startOutboundEmailTask.mockReset().mockResolvedValue({ taskSid: 'WT1' });
  addEmailParticipant.mockReset().mockResolvedValue(undefined);
});

describe('OutboundEmailModal', () => {
  it('submits an outbound email task', async () => {
    render(wrap(<OutboundEmailModal open onClose={vi.fn()} />));
    await userEvent.type(screen.getByLabelText('To'), 'a@b.com');
    await userEvent.type(screen.getByLabelText('Subject'), 'Hi');
    await userEvent.type(screen.getByLabelText('body'), 'Hello');
    await userEvent.click(screen.getByRole('button', { name: 'Send email' }));
    await waitFor(() => expect(startOutboundEmailTask).toHaveBeenCalledWith({ to: 'a@b.com', subject: 'Hi', body: 'Hello' }));
    expect(addEmailParticipant).not.toHaveBeenCalled();
  });

  it('adds a CC participant after creating the task', async () => {
    render(wrap(<OutboundEmailModal open onClose={vi.fn()} />));
    await userEvent.type(screen.getByLabelText('To'), 'a@b.com');
    await userEvent.type(screen.getByLabelText('Cc'), 'cc@b.com');
    await userEvent.type(screen.getByLabelText('Subject'), 'Hi');
    await userEvent.click(screen.getByRole('button', { name: 'Send email' }));
    await waitFor(() => expect(addEmailParticipant).toHaveBeenCalledWith('WT1', 'cc@b.com', 'cc'));
  });
});
