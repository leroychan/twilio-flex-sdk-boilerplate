import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/en.json';
import { SupervisorPanel } from '../SupervisorPanel';

const { hook } = vi.hoisted(() => ({
  hook: {
    workers: [] as unknown[],
    monitoredTasks: [] as unknown[],
    activeMonitorTaskSid: null as string | null,
    monitorMode: null as string | null,
    supervisorError: null as string | null,
    startMode: vi.fn(),
    stopMonitoring: vi.fn(),
    changeWorkerActivity: vi.fn(),
    updateWorkerAttributes: vi.fn(),
  },
}));

vi.mock('../../hooks/useSupervisor', () => ({ useSupervisor: () => hook }));

function renderPanel() {
  return render(
    <NextIntlClientProvider locale="en" messages={{ supervisor: messages }}>
      <SupervisorPanel activities={[{ sid: 'WA0', name: 'Offline' }]} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  hook.workers = [];
  hook.monitoredTasks = [];
  hook.activeMonitorTaskSid = null;
  hook.monitorMode = null;
  hook.supervisorError = null;
});

describe('SupervisorPanel', () => {
  it('renders the section heading and empty states', () => {
    renderPanel();
    expect(screen.getByRole('heading', { name: 'Supervisor' })).toBeInTheDocument();
    expect(screen.getByText('No live tasks to monitor.')).toBeInTheDocument();
    expect(screen.getByText('No workers to display.')).toBeInTheDocument();
  });

  it('shows the error alert when supervisorError is set', () => {
    hook.supervisorError = 'boom';
    renderPanel();
    expect(screen.getByRole('alert')).toHaveTextContent('boom');
  });

  it('starts monitor mode when a task is selected', async () => {
    hook.monitoredTasks = [
      {
        taskSid: 'WT1',
        reservationSid: 'WR1',
        workerSid: 'WK1',
        workerName: 'Ada',
        queueName: 'Sales',
        channelType: 'voice',
      },
    ];
    renderPanel();
    await userEvent.click(screen.getByRole('button', { name: /Ada/ }));
    expect(hook.startMode).toHaveBeenCalledWith('WT1', 'monitor');
  });

  it('renders monitor controls for the active task and switches to coach', async () => {
    hook.monitoredTasks = [
      {
        taskSid: 'WT1',
        reservationSid: 'WR1',
        workerSid: 'WK1',
        workerName: 'Ada',
        queueName: 'Sales',
        channelType: 'voice',
      },
    ];
    hook.activeMonitorTaskSid = 'WT1';
    hook.monitorMode = 'monitor';
    renderPanel();
    await userEvent.click(screen.getByRole('button', { name: 'Coach' }));
    expect(hook.startMode).toHaveBeenCalledWith('WT1', 'coach');
  });
});
