import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/en.json';
import { WorkerList } from '../WorkerList';
import type { MonitoredWorker } from '@/store/slices/supervisor';

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ supervisor: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const worker = (sid: string, name: string): MonitoredWorker => ({
  sid,
  friendlyName: name,
  activitySid: 'WA0',
  activityName: 'Offline',
  available: false,
  attributes: {},
});

describe('WorkerList', () => {
  it('shows the empty state when there are no workers', () => {
    renderWithIntl(
      <WorkerList workers={[]} activities={[]} onActivityChange={vi.fn()} onAttributesSave={vi.fn()} />,
    );
    expect(screen.getByText('No workers to display.')).toBeInTheDocument();
  });

  it('renders one card per worker', () => {
    renderWithIntl(
      <WorkerList
        workers={[worker('WK1', 'Ada'), worker('WK2', 'Grace')]}
        activities={[{ sid: 'WA0', name: 'Offline' }]}
        onActivityChange={vi.fn()}
        onAttributesSave={vi.fn()}
      />,
    );
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByText('Grace')).toBeInTheDocument();
  });
});
