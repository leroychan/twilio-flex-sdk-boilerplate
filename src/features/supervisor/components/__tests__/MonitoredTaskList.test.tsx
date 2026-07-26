import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/en.json';
import { MonitoredTaskList } from '../MonitoredTaskList';
import type { MonitoredTask } from '@/store/slices/supervisor';

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ supervisor: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const task: MonitoredTask = {
  taskSid: 'WT1',
  reservationSid: 'WR1',
  workerSid: 'WK1',
  workerName: 'Ada',
  queueName: 'Sales',
  channelType: 'voice',
};

describe('MonitoredTaskList', () => {
  it('shows the empty state when there are no tasks', () => {
    renderWithIntl(<MonitoredTaskList tasks={[]} activeTaskSid={null} onSelect={vi.fn()} />);
    expect(screen.getByText('No live tasks to monitor.')).toBeInTheDocument();
  });

  it('marks the active task as pressed and fires onSelect', async () => {
    const onSelect = vi.fn();
    renderWithIntl(<MonitoredTaskList tasks={[task]} activeTaskSid="WT1" onSelect={onSelect} />);
    const button = screen.getByRole('button', { name: /Ada/ });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(button);
    expect(onSelect).toHaveBeenCalledWith('WT1');
  });
});
