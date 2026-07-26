import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/en.json';

const setInputDevice = vi.fn().mockResolvedValue(undefined);
const speakerSet = vi.fn().mockResolvedValue(undefined);
const device = {
  audio: {
    setInputDevice,
    speakerDevices: { set: speakerSet },
    availableInputDevices: new Map([['mic1', { label: 'Mic One' } as MediaDeviceInfo]]),
    availableOutputDevices: new Map([['spk1', { label: 'Speaker One' } as MediaDeviceInfo]]),
  },
};
vi.mock('../../lib/device', () => ({ getVoiceDevice: () => device }));
import { AudioDevicePicker } from '../AudioDevicePicker';

function wrap(ui: React.ReactNode) {
  return <NextIntlClientProvider locale="en" messages={{ voice: messages }}>{ui}</NextIntlClientProvider>;
}
beforeEach(() => { setInputDevice.mockClear(); speakerSet.mockClear(); });

describe('AudioDevicePicker', () => {
  it('sets the chosen microphone', async () => {
    render(wrap(<AudioDevicePicker />));
    await userEvent.selectOptions(screen.getByLabelText('Microphone'), 'mic1');
    await waitFor(() => expect(setInputDevice).toHaveBeenCalledWith('mic1'));
  });
});
