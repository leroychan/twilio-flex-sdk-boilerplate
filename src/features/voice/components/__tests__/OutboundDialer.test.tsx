import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/en.json';

const startOutboundCall = vi.fn();
vi.mock('@/lib/flex/actions/Voice', () => ({ startOutboundCall: (...a: unknown[]) => startOutboundCall(...a) }));
const adoptVoiceCall = vi.fn();
vi.mock('../../lib/adoptVoiceCall', () => ({ adoptVoiceCall: (...a: unknown[]) => adoptVoiceCall(...a) }));
import { OutboundDialer } from '../OutboundDialer';

function wrap(ui: React.ReactNode) {
  return <NextIntlClientProvider locale="en" messages={{ voice: messages }}>{ui}</NextIntlClientProvider>;
}
const fakeCall = { call: {} };
beforeEach(() => {
  startOutboundCall.mockReset().mockResolvedValue(fakeCall);
  adoptVoiceCall.mockReset();
});

describe('OutboundDialer', () => {
  it('places an outbound call and adopts the returned handle', async () => {
    const onClose = vi.fn();
    render(wrap(<OutboundDialer open onClose={onClose} />));
    await userEvent.type(screen.getByPlaceholderText('Enter a number'), '+15551234567');
    await userEvent.click(screen.getByRole('button', { name: 'Call' }));
    await waitFor(() => expect(startOutboundCall).toHaveBeenCalledWith('+15551234567'));
    await waitFor(() => expect(adoptVoiceCall).toHaveBeenCalledWith(fakeCall));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('disables Call when empty', () => {
    render(wrap(<OutboundDialer open onClose={vi.fn()} />));
    expect(screen.getByRole('button', { name: 'Call' })).toBeDisabled();
  });
});
