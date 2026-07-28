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
function mockCallSid(sid: string | null) {
  useFlexStore.setState({ call: { ...INITIAL_CALL, callSid: sid } });
}

beforeEach(() => useFlexStore.setState({ call: { ...INITIAL_CALL } }));

describe('RightPanel', () => {
  it('auto-selects Transcript when a call is active', () => {
    mockCallSid('CA1');
    renderPanel();
    expect(screen.getByRole('tab', { name: 'Real-time transcription' })).toHaveAttribute('aria-selected', 'true');
  });

  it('defaults to CRM when no call is active', () => {
    mockCallSid(null);
    renderPanel();
    expect(screen.getByRole('tab', { name: 'CRM' })).toHaveAttribute('aria-selected', 'true');
  });

  it('keeps both panels mounted and switches on click', async () => {
    mockCallSid('CA1');
    renderPanel();
    // both mounted regardless of active tab
    expect(screen.getByTestId('transcript-panel')).toBeInTheDocument();
    expect(screen.getByTestId('crm-panel')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'CRM' }));
    expect(screen.getByRole('tab', { name: 'CRM' })).toHaveAttribute('aria-selected', 'true');
  });
});
