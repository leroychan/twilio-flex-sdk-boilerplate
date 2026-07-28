import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/en.json';
import { IncomingTaskPanel } from '../IncomingTaskPanel';
import type { TaskView } from '@/store/slices/tasks';

function wrap(ui: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={{ tasks: messages }}>
      {ui}
    </NextIntlClientProvider>
  );
}

const voiceTask: TaskView = {
  reservationSid: 'WR1',
  taskSid: 'WT1',
  taskChannelUniqueName: 'voice',
  attributes: { from: '+15623197825' },
  status: 'pending',
};

const chatTask: TaskView = {
  reservationSid: 'WR2',
  taskSid: 'WT2',
  taskChannelUniqueName: 'chat',
  attributes: { name: 'Ada Lovelace' },
  status: 'pending',
};

describe('IncomingTaskPanel', () => {
  it('shows the formatted caller number and incoming-call status for voice', () => {
    render(wrap(<IncomingTaskPanel task={voiceTask} onAccept={vi.fn()} onReject={vi.fn()} />));
    expect(screen.getByText('+1 562-319-7825')).toBeInTheDocument();
    expect(screen.getByText('Incoming call…')).toBeInTheDocument();
  });

  it('shows the contact name and incoming-chat status for messaging', () => {
    render(wrap(<IncomingTaskPanel task={chatTask} onAccept={vi.fn()} onReject={vi.fn()} />));
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Incoming chat request')).toBeInTheDocument();
  });

  it('fires onAccept with the task sid', async () => {
    const onAccept = vi.fn();
    render(wrap(<IncomingTaskPanel task={voiceTask} onAccept={onAccept} onReject={vi.fn()} />));
    await userEvent.click(screen.getByRole('button', { name: 'Accept' }));
    expect(onAccept).toHaveBeenCalledWith('WT1');
  });

  it('fires onReject with the task sid', async () => {
    const onReject = vi.fn();
    render(wrap(<IncomingTaskPanel task={voiceTask} onAccept={vi.fn()} onReject={onReject} />));
    await userEvent.click(screen.getByRole('button', { name: 'Reject' }));
    expect(onReject).toHaveBeenCalledWith('WT1');
  });

  it('falls back to the unknown-caller label when no identity is present', () => {
    const bare: TaskView = { ...voiceTask, attributes: {} };
    render(wrap(<IncomingTaskPanel task={bare} onAccept={vi.fn()} onReject={vi.fn()} />));
    expect(screen.getByText('Unknown caller')).toBeInTheDocument();
  });

  it('shows a WhatsApp channel tag and the number for a whatsapp task riding a chat channel', () => {
    const whatsappTask: TaskView = {
      reservationSid: 'WR3',
      taskSid: 'WT3',
      taskChannelUniqueName: 'chat',
      attributes: { channelType: 'whatsapp', from: 'whatsapp:+14155238886', name: 'Grace' },
      status: 'pending',
    };
    render(wrap(<IncomingTaskPanel task={whatsappTask} onAccept={vi.fn()} onReject={vi.fn()} />));
    // Prominent channel tag + name + the formatted number both visible.
    expect(screen.getByText('WhatsApp')).toBeInTheDocument();
    expect(screen.getByText('Grace')).toBeInTheDocument();
    expect(screen.getByText('+1 415-523-8886')).toBeInTheDocument();
  });

  it('renders the voice channel tag for a voice task', () => {
    render(wrap(<IncomingTaskPanel task={voiceTask} onAccept={vi.fn()} onReject={vi.fn()} />));
    expect(screen.getByText('Voice')).toBeInTheDocument();
  });
});
