import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import messages from '@/features/transcript/messages/en.json';
import type { TranscriptEntry } from '../../lib/transcriptMessage';

// jsdom does not implement scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

const { useLiveTranscript } = vi.hoisted(() => ({ useLiveTranscript: vi.fn() }));
vi.mock('../../hooks/useLiveTranscript', () => ({ useLiveTranscript }));

const { useFlexStore } = vi.hoisted(() => ({ useFlexStore: vi.fn() }));
vi.mock('@/store', () => ({ useFlexStore }));

import { TranscriptPanel } from '../TranscriptPanel';

function renderPanel() {
  return render(
    <NextIntlClientProvider locale="en" messages={{ transcript: messages }}>
      <TranscriptPanel />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  useFlexStore.mockReset();
  useLiveTranscript.mockReset();
  // TranscriptPanel selects call.callSid: useFlexStore(s => s.call.callSid)
  useFlexStore.mockImplementation((sel: (s: unknown) => unknown) =>
    sel({ call: { callSid: 'CA1' } }));
});

describe('TranscriptPanel', () => {
  it('shows the no-call empty state when idle', () => {
    useFlexStore.mockImplementation((sel: (s: unknown) => unknown) => sel({ call: { callSid: null } }));
    useLiveTranscript.mockReturnValue({ entries: [], status: 'idle' });
    renderPanel();
    expect(screen.getByText('No active call.')).toBeInTheDocument();
  });

  it('shows the not-configured hint', () => {
    useLiveTranscript.mockReturnValue({ entries: [], status: 'not_configured' });
    renderPanel();
    expect(screen.getByText("Live transcript isn't configured.")).toBeInTheDocument();
  });

  it('shows the waiting state while listening with no entries', () => {
    useLiveTranscript.mockReturnValue({ entries: [], status: 'listening' });
    renderPanel();
    expect(screen.getByText('Waiting for transcription…')).toBeInTheDocument();
  });

  it('renders entries with localized speaker labels', () => {
    const entries: TranscriptEntry[] = [
      { id: 'CA1-0', role: 'customer', speaker: 'customer', text: 'I need help', at: '' },
      { id: 'CA1-1', role: 'agent', speaker: 'agent', text: 'Happy to help', at: '' },
    ];
    useLiveTranscript.mockReturnValue({ entries, status: 'listening' });
    renderPanel();
    expect(screen.getByText('I need help')).toBeInTheDocument();
    expect(screen.getByText('Happy to help')).toBeInTheDocument();
    expect(screen.getByText('Agent')).toBeInTheDocument();
    expect(screen.getByText('Customer')).toBeInTheDocument();
  });
});
