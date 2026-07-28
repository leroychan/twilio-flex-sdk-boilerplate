import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/en.json';
import { CallPanel } from '../CallPanel';
import { INITIAL_CALL } from '@/store/slices/voice';

function wrap(ui: React.ReactNode) {
  return <NextIntlClientProvider locale="en" messages={{ voice: messages }}>{ui}</NextIntlClientProvider>;
}
const handlers = { onMuteToggle: vi.fn(), onHoldToggle: vi.fn(), onHangup: vi.fn(), onEndForAll: vi.fn(), onTransfer: vi.fn() };

describe('CallPanel', () => {
  it('shows idle state when no call', () => {
    render(wrap(<CallPanel call={{ ...INITIAL_CALL }} {...handlers} />));
    expect(screen.getByText('No active call')).toBeInTheDocument();
  });

  it('shows hangup for a connected call and fires it', async () => {
    render(wrap(<CallPanel call={{ ...INITIAL_CALL, status: 'connected', taskSid: 'WT1', callSid: 'CA1' }} {...handlers} />));
    await userEvent.click(screen.getByRole('button', { name: 'Hang up' }));
    expect(handlers.onHangup).toHaveBeenCalledOnce();
  });

  it('labels the mute button Unmute when muted', () => {
    render(wrap(<CallPanel call={{ ...INITIAL_CALL, status: 'connected', muted: true }} {...handlers} />));
    expect(screen.getByRole('button', { name: 'Unmute' })).toBeInTheDocument();
  });

  it('renders a tile per conference participant with hold and remove controls', async () => {
    const onHoldParticipant = vi.fn();
    const onKickParticipant = vi.fn();
    const participants = [
      { participantSid: 'PC1', type: 'customer', channelType: 'voice', isOnHold: false },
      { participantSid: 'PA2', type: 'agent', channelType: 'voice', workerSid: 'WK2', isOnHold: true },
    ];
    render(
      wrap(
        <CallPanel
          call={{ ...INITIAL_CALL, status: 'connected', taskSid: 'WT1' }}
          {...handlers}
          participants={participants}
          workerNames={{ WK2: 'Bob Agent' }}
          onHoldParticipant={onHoldParticipant}
          onKickParticipant={onKickParticipant}
        />,
      ),
    );
    // Customer + named agent both shown.
    expect(screen.getByText('Customer')).toBeInTheDocument();
    expect(screen.getByText('Bob Agent')).toBeInTheDocument();
    // On-hold agent shows a Resume affordance; customer shows Hold.
    const holdButtons = screen.getAllByRole('button', { name: /Hold|Resume/ });
    expect(holdButtons.length).toBeGreaterThanOrEqual(2);
    await userEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]!);
    expect(onKickParticipant).toHaveBeenCalledWith('PC1');
  });

  it('shows the recording toggle only when recording is enabled and fires it', async () => {
    const onToggleRecording = vi.fn();
    const base = { ...INITIAL_CALL, status: 'connected' as const, taskSid: 'WT1' };
    const { rerender } = render(
      wrap(<CallPanel call={base} {...handlers} onToggleRecording={onToggleRecording} />),
    );
    expect(screen.queryByRole('button', { name: /Recording/ })).toBeNull();

    rerender(
      wrap(
        <CallPanel
          call={{ ...base, recordingEnabled: true }}
          {...handlers}
          onToggleRecording={onToggleRecording}
        />,
      ),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Pause recording' }));
    expect(onToggleRecording).toHaveBeenCalledOnce();

    rerender(
      wrap(
        <CallPanel
          call={{ ...base, recordingEnabled: true, recordingPaused: true }}
          {...handlers}
          onToggleRecording={onToggleRecording}
        />,
      ),
    );
    expect(screen.getByRole('button', { name: 'Resume recording' })).toBeInTheDocument();
  });

  it('adds an external participant from the number field', async () => {
    const onAddParticipant = vi.fn();
    render(
      wrap(
        <CallPanel
          call={{ ...INITIAL_CALL, status: 'connected', taskSid: 'WT1' }}
          {...handlers}
          onAddParticipant={onAddParticipant}
        />,
      ),
    );
    await userEvent.type(screen.getByPlaceholderText('Enter a number'), '+15551234567');
    await userEvent.click(screen.getByRole('button', { name: 'Add participant' }));
    expect(onAddParticipant).toHaveBeenCalledWith('+15551234567');
  });
});
