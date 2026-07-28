import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import messages from '@/features/transcript/messages/en.json';
import { useFlexStore } from '@/store';
import { INITIAL_CALL } from '@/store/slices/voice';

vi.mock('@/features/transcript', () => ({ TranscriptPanel: () => <div data-testid="transcript-panel" /> }));
vi.mock('../CrmPanel', () => ({ CrmPanel: () => <div data-testid="crm-panel" /> }));

import { RightPanel } from '../RightPanel';

function renderPanel() {
  return render(
    <NextIntlClientProvider locale="en" messages={{ transcript: messages }}>
      <RightPanel />
    </NextIntlClientProvider>,
  );
}
function mockActiveCall() {
  useFlexStore.setState({ call: { ...INITIAL_CALL, callSid: 'CA1', status: 'connected' } });
}
function mockNoCall() {
  useFlexStore.setState({ call: { ...INITIAL_CALL } });
}

beforeEach(() => useFlexStore.setState({ call: { ...INITIAL_CALL } }));

describe('RightPanel', () => {
  it('shows and auto-selects the Transcript tab when a call is active', () => {
    mockActiveCall();
    renderPanel();
    expect(screen.getByRole('tab', { name: 'Real-time transcription' })).toHaveAttribute('aria-selected', 'true');
  });

  it('hides the Transcript tab and defaults to CRM when no call is active', () => {
    mockNoCall();
    renderPanel();
    expect(screen.queryByRole('tab', { name: 'Real-time transcription' })).toBeNull();
    expect(screen.queryByTestId('transcript-panel')).toBeNull();
    expect(screen.getByRole('tab', { name: 'CRM' })).toHaveAttribute('aria-selected', 'true');
  });

  it('keeps both panels mounted during a call and switches on click', async () => {
    mockActiveCall();
    renderPanel();
    // both mounted regardless of active tab
    expect(screen.getByTestId('transcript-panel')).toBeInTheDocument();
    expect(screen.getByTestId('crm-panel')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'CRM' }));
    expect(screen.getByRole('tab', { name: 'CRM' })).toHaveAttribute('aria-selected', 'true');
  });
});
