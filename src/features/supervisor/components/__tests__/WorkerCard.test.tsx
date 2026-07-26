import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/en.json';
import { WorkerCard } from '../WorkerCard';
import type { MonitoredWorker } from '@/store/slices/supervisor';

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ supervisor: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const worker: MonitoredWorker = {
  sid: 'WK1',
  friendlyName: 'Ada Lovelace',
  activitySid: 'WA0',
  activityName: 'Offline',
  available: false,
  attributes: { role: 'agent' },
};

const activities = [
  { sid: 'WA0', name: 'Offline' },
  { sid: 'WA1', name: 'Available' },
];

describe('WorkerCard', () => {
  it('renders the worker name and activity', () => {
    renderWithIntl(
      <WorkerCard
        worker={worker}
        activities={activities}
        onActivityChange={vi.fn()}
        onAttributesSave={vi.fn()}
      />,
    );
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    // Scope to the status line ("Offline · Unavailable") so it doesn't collide
    // with the identically-named <option> in the activity select.
    expect(screen.getByText(/Offline ·/)).toBeInTheDocument();
  });

  it('forwards activity changes with the worker sid', async () => {
    const onActivityChange = vi.fn();
    renderWithIntl(
      <WorkerCard
        worker={worker}
        activities={activities}
        onActivityChange={onActivityChange}
        onAttributesSave={vi.fn()}
      />,
    );
    await userEvent.selectOptions(screen.getByLabelText('Change activity'), 'WA1');
    expect(onActivityChange).toHaveBeenCalledWith('WK1', 'WA1');
  });

  it('forwards attribute saves with the worker sid', async () => {
    const onAttributesSave = vi.fn();
    renderWithIntl(
      <WorkerCard
        worker={worker}
        activities={activities}
        onActivityChange={vi.fn()}
        onAttributesSave={onAttributesSave}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save attributes' }));
    expect(onAttributesSave).toHaveBeenCalledWith('WK1', { role: 'agent' });
  });
});
