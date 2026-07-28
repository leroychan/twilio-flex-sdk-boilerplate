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
    expect(screen.getByText('Voice')).toBeInTheDocument();
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

  it('disables the Complete button while the action is in flight (no double-complete)', async () => {
    const h = handlers();
    // A pending promise keeps the action "in flight" so a second click can't fire.
    h.onComplete.mockReturnValue(new Promise<void>(() => {}));
    renderWithIntl(<TaskCard task={{ ...base, status: 'wrapping' }} {...h} />);
    const button = screen.getByRole('button', { name: 'Complete' });
    await userEvent.click(button);
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(h.onComplete).toHaveBeenCalledTimes(1);
  });

  it('shows an elapsed timer when the task has a createdAt', () => {
    renderWithIntl(<TaskCard task={{ ...base, createdAt: 1000 }} {...handlers()} />);
    expect(screen.getByLabelText('Time elapsed')).toBeInTheDocument();
  });

  it('renders a last-message preview when provided', () => {
    renderWithIntl(<TaskCard task={base} preview="latest customer message" {...handlers()} />);
    expect(screen.getByText('latest customer message')).toBeInTheDocument();
  });

  it('calls onSelect when the card body is clicked', async () => {
    const h = handlers();
    const onSelect = vi.fn();
    renderWithIntl(<TaskCard task={base} onSelect={onSelect} {...h} />);
    await userEvent.click(screen.getByText('Voice'));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('marks the card as the current selection when selected', () => {
    renderWithIntl(<TaskCard task={base} selected onSelect={vi.fn()} {...handlers()} />);
    expect(screen.getByRole('listitem', { current: true })).toBeInTheDocument();
  });

  it('shows the formatted caller number as the primary line for a voice task', () => {
    renderWithIntl(
      <TaskCard task={{ ...base, attributes: { from: '+15551234567' } }} {...handlers()} />,
    );
    expect(screen.getByText('+1 555-123-4567')).toBeInTheDocument();
  });

  it('shows a live-call second line for an accepted voice task', () => {
    renderWithIntl(<TaskCard task={{ ...base, status: 'accepted' }} {...handlers()} />);
    expect(screen.getByText('Live call')).toBeInTheDocument();
  });
});
