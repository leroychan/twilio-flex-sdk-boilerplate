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
});
