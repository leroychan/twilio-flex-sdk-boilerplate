import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/en.json';
import directoryMessages from '@/features/directory/messages/en.json';

const startVoiceTransfer = vi.fn();
const addExternalParticipant = vi.fn();
vi.mock('@/lib/flex/actions/Voice', () => ({
  startVoiceTransfer: (...a: unknown[]) => startVoiceTransfer(...a),
  addExternalParticipant: (...a: unknown[]) => addExternalParticipant(...a),
}));
vi.mock('@/lib/flex/workspace', () => ({
  fetchTaskQueuesList: vi.fn().mockResolvedValue([{ sid: 'WQ1', name: 'Sales' }]),
  fetchWorkersList: vi.fn().mockResolvedValue([
    { sid: 'WK123', name: 'Ada', activitySid: 'WA1', activityName: 'Available', available: true, attributes: {} },
  ]),
}));

import { VoiceTransferModal } from '../VoiceTransferModal';
import { resetDirectoryCache } from '@/features/directory';

function wrap(ui: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={{ voice: messages, directory: directoryMessages }}>
      {ui}
    </NextIntlClientProvider>
  );
}
beforeEach(() => {
  startVoiceTransfer.mockReset().mockResolvedValue(undefined);
  addExternalParticipant.mockReset().mockResolvedValue({ participantSid: 'PA9' });
  resetDirectoryCache();
});

describe('VoiceTransferModal', () => {
  it('starts a warm transfer to a picked agent', async () => {
    render(wrap(<VoiceTransferModal open taskSid="WT1" onClose={vi.fn()} />));
    // Directory loads asynchronously; wait for the agent option to appear.
    await waitFor(() => expect(screen.getByRole('option', { name: 'Ada' })).toBeInTheDocument());
    await userEvent.selectOptions(screen.getByRole('combobox'), 'WK123');
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
