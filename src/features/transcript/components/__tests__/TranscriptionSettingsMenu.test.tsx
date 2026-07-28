import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import messages from '@/features/transcript/messages/en.json';
import { DEFAULT_TRANSCRIPTION_SETTINGS } from '@/store/slices/settings';

const { useFlexStore } = vi.hoisted(() => ({ useFlexStore: vi.fn() }));
vi.mock('@/store', () => ({ useFlexStore }));

import { TranscriptionSettingsMenu } from '../TranscriptionSettingsMenu';

const setTranscriptionSettings = vi.fn();

function renderMenu() {
  return render(
    <NextIntlClientProvider locale="en" messages={{ transcript: messages }}>
      <TranscriptionSettingsMenu />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  useFlexStore.mockReset();
  setTranscriptionSettings.mockReset();
  useFlexStore.mockImplementation((sel: (s: unknown) => unknown) =>
    sel({ transcription: { ...DEFAULT_TRANSCRIPTION_SETTINGS }, setTranscriptionSettings }));
});

describe('TranscriptionSettingsMenu', () => {
  it('opens the popover and shows controls', async () => {
    renderMenu();
    await userEvent.click(screen.getByRole('button', { name: 'Transcription' }));
    expect(screen.getByLabelText('Enable live transcription')).toBeChecked();
    expect(screen.getByLabelText('Language')).toHaveValue('en-US');
  });

  it('writes an enable toggle change to the store', async () => {
    renderMenu();
    await userEvent.click(screen.getByRole('button', { name: 'Transcription' }));
    await userEvent.click(screen.getByLabelText('Enable live transcription'));
    expect(setTranscriptionSettings).toHaveBeenCalledWith({ enabled: false });
  });

  it('writes a language change to the store', async () => {
    renderMenu();
    await userEvent.click(screen.getByRole('button', { name: 'Transcription' }));
    await userEvent.selectOptions(screen.getByLabelText('Language'), 'es-MX');
    expect(setTranscriptionSettings).toHaveBeenCalledWith({ language: 'es-MX' });
  });
});
