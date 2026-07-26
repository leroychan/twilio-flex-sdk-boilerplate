import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/en.json';

const startVoiceTransfer = vi.fn();
const addExternalParticipant = vi.fn();
vi.mock('@/lib/flex/actions/Voice', () => ({
  startVoiceTransfer: (...a: unknown[]) => startVoiceTransfer(...a),
  addExternalParticipant: (...a: unknown[]) => addExternalParticipant(...a),
}));
import { VoiceTransferModal } from '../VoiceTransferModal';

function wrap(ui: React.ReactNode) {
  return <NextIntlClientProvider locale="en" messages={{ voice: messages }}>{ui}</NextIntlClientProvider>;
}
beforeEach(() => {
  startVoiceTransfer.mockReset().mockResolvedValue(undefined);
  addExternalParticipant.mockReset().mockResolvedValue({ participantSid: 'PA9' });
});

describe('VoiceTransferModal', () => {
  it('starts a warm transfer', async () => {
    render(wrap(<VoiceTransferModal open taskSid="WT1" onClose={vi.fn()} />));
    await userEvent.type(screen.getByLabelText('Transfer'), 'WK123');
    await userEvent.click(screen.getByRole('button', { name: 'Transfer' }));
    await waitFor(() => expect(startVoiceTransfer).toHaveBeenCalledWith('WT1', 'WK123', 'WARM'));
  });

  it('adds an external participant', async () => {
    render(wrap(<VoiceTransferModal open taskSid="WT1" onClose={vi.fn()} />));
    await userEvent.type(screen.getByLabelText('Add participant'), '+15550000000');
    await userEvent.click(screen.getByRole('button', { name: 'Add participant' }));
    await waitFor(() => expect(addExternalParticipant).toHaveBeenCalledWith('WT1', '+15550000000'));
  });
});
