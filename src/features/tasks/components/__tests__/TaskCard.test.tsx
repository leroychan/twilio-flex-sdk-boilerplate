import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import messages from '@/features/tasks/messages/en.json';
import type { TaskView } from '@/store/slices/tasks';
import { TaskCard } from '../TaskCard';

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ tasks: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const base: TaskView = {
  reservationSid: 'WR1',
  taskSid: 'WT1',
  taskChannelUniqueName: 'voice',
  attributes: {},
  status: 'pending',
};

function handlers() {
  return {
    onAccept: vi.fn(),
    onReject: vi.fn(),
    onWrapUp: vi.fn(),
    onComplete: vi.fn(),
  };
}

describe('TaskCard', () => {
  it('shows the channel and translated status', () => {
    renderWithIntl(<TaskCard task={base} {...handlers()} />);
    expect(screen.getByText('voice')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('renders Accept/Reject for pending and fires callbacks', async () => {
    const h = handlers();
    renderWithIntl(<TaskCard task={base} {...h} />);
    await userEvent.click(screen.getByRole('button', { name: 'Accept' }));
    await userEvent.click(screen.getByRole('button', { name: 'Reject' }));
    expect(h.onAccept).toHaveBeenCalledWith('WT1');
    expect(h.onReject).toHaveBeenCalledWith('WT1');
  });

  it('renders Wrap up for accepted tasks', async () => {
    const h = handlers();
    renderWithIntl(<TaskCard task={{ ...base, status: 'accepted' }} {...h} />);
    await userEvent.click(screen.getByRole('button', { name: 'Wrap up' }));
    expect(h.onWrapUp).toHaveBeenCalledWith('WT1');
  });

  it('renders Complete for wrapping tasks', async () => {
    const h = handlers();
    renderWithIntl(<TaskCard task={{ ...base, status: 'wrapping' }} {...h} />);
    await userEvent.click(screen.getByRole('button', { name: 'Complete' }));
    expect(h.onComplete).toHaveBeenCalledWith('WT1');
  });
});
