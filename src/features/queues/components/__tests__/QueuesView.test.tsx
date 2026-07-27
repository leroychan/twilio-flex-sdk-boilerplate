import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '@/features/queues/messages/en.json';
import { QueuesView } from '../QueuesView';
import type { QueueStatsState } from '../../hooks/useQueueStats';

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ queues: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const configured: QueueStatsState = {
  configured: true,
  loading: false,
  error: false,
  updatedAt: '2026-07-27T00:00:00.000Z',
  queues: [
    {
      sid: 'WQ1', friendlyName: 'Support', waiting: 2, active: 1,
      longestWaitAge: 65, availableWorkers: 4, eligibleWorkers: 6, avgWaitAccepted: 9,
    },
  ],
};

describe('QueuesView', () => {
  it('renders the "not configured" placeholder when creds are absent', () => {
    renderWithIntl(
      <QueuesView
        stats={{ configured: false, loading: false, error: false, updatedAt: null, queues: [] }}
      />,
    );
    expect(screen.getByText(/require Twilio account credentials/i)).toBeInTheDocument();
  });

  it('renders a queue row when configured', () => {
    renderWithIntl(<QueuesView stats={configured} />);
    expect(screen.getByText('Support')).toBeInTheDocument();
    expect(screen.getByText('1:05')).toBeInTheDocument(); // 65s => 1:05
  });
});
