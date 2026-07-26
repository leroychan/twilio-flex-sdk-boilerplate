import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import messages from '@/features/tasks/messages/en.json';
import type { TaskView } from '@/store/slices/tasks';
import { useTasks } from '../../hooks/useTasks';
import { TaskList } from '../TaskList';

vi.mock('../../hooks/useTasks', () => ({ useTasks: vi.fn() }));

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ tasks: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

function noopCommands() {
  return {
    accept: vi.fn().mockResolvedValue(undefined),
    reject: vi.fn().mockResolvedValue(undefined),
    wrapUp: vi.fn().mockResolvedValue(undefined),
    complete: vi.fn().mockResolvedValue(undefined),
    end: vi.fn().mockResolvedValue(undefined),
    setAttributes: vi.fn().mockResolvedValue(undefined),
  };
}

const task: TaskView = {
  reservationSid: 'WR1',
  taskSid: 'WT1',
  taskChannelUniqueName: 'chat',
  attributes: {},
  status: 'pending',
};

describe('TaskList', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the empty state when there are no tasks', () => {
    vi.mocked(useTasks).mockReturnValue({ tasks: [], ...noopCommands() });
    renderWithIntl(<TaskList />);
    expect(screen.getByText('No active tasks')).toBeInTheDocument();
  });

  it('renders a list item per task', () => {
    vi.mocked(useTasks).mockReturnValue({ tasks: [task], ...noopCommands() });
    renderWithIntl(<TaskList />);
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('chat')).toBeInTheDocument();
  });
});
