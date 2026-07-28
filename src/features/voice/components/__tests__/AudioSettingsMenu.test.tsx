import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/en.json';

const chooseInput = vi.fn();
const chooseOutput = vi.fn();
const useAudioDevices = vi.fn();
vi.mock('../../hooks/useAudioDevices', () => ({ useAudioDevices: () => useAudioDevices() }));

import { AudioSettingsMenu } from '../AudioSettingsMenu';

function wrap(ui: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={{ voice: messages }}>
      {ui}
    </NextIntlClientProvider>
  );
}

const populated = {
  inputs: [{ id: 'mic1', label: 'Mic One' }],
  outputs: [{ id: 'spk1', label: 'Speaker One' }],
  selectedInput: 'mic1',
  selectedOutput: 'spk1',
  chooseInput,
  chooseOutput,
};

beforeEach(() => {
  chooseInput.mockClear();
  chooseOutput.mockClear();
  useAudioDevices.mockReset();
});

describe('AudioSettingsMenu', () => {
  it('is collapsed until the trigger is clicked', async () => {
    useAudioDevices.mockReturnValue(populated);
    render(wrap(<AudioSettingsMenu />));
    expect(screen.queryByLabelText('Microphone')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Audio settings' }));
    expect(screen.getByLabelText('Microphone')).toBeInTheDocument();
  });

  it('lists devices enumerated on load and reflects the current selection', async () => {
    useAudioDevices.mockReturnValue(populated);
    render(wrap(<AudioSettingsMenu />));
    await userEvent.click(screen.getByRole('button', { name: 'Audio settings' }));
    const mic = screen.getByLabelText('Microphone') as HTMLSelectElement;
    expect(mic.value).toBe('mic1');
    expect(screen.getByRole('option', { name: 'Mic One' })).toBeInTheDocument();
  });

  it('chooses the picked microphone', async () => {
    useAudioDevices.mockReturnValue({
      ...populated,
      inputs: [
        { id: 'mic1', label: 'Mic One' },
        { id: 'mic2', label: 'Mic Two' },
      ],
    });
    render(wrap(<AudioSettingsMenu />));
    await userEvent.click(screen.getByRole('button', { name: 'Audio settings' }));
    await userEvent.selectOptions(screen.getByLabelText('Microphone'), 'mic2');
    expect(chooseInput).toHaveBeenCalledWith('mic2');
  });

  it('explains when no audio devices are found', async () => {
    useAudioDevices.mockReturnValue({
      inputs: [],
      outputs: [],
      selectedInput: null,
      selectedOutput: null,
      chooseInput,
      chooseOutput,
    });
    render(wrap(<AudioSettingsMenu />));
    await userEvent.click(screen.getByRole('button', { name: 'Audio settings' }));
    expect(screen.getByText('No audio devices found.')).toBeInTheDocument();
  });
});
