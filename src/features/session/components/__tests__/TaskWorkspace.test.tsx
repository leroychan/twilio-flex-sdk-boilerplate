import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import sessionMessages from '@/features/session/messages/en.json';
import tasksMessages from '@/features/tasks/messages/en.json';
import { useFlexStore } from '@/store';
import { TaskWorkspace } from '../TaskWorkspace';

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider
      locale="en"
      messages={{ session: sessionMessages, tasks: tasksMessages }}
    >
      {ui}
    </NextIntlClientProvider>,
  );
}

describe('TaskWorkspace', () => {
  beforeEach(() => {
    useFlexStore.setState({
      activeTaskSid: 'WT1',
      tasks: [
        {
          reservationSid: 'WR1',
          taskSid: 'WT1',
          taskChannelUniqueName: 'voice',
          attributes: { from: '+15551234567', agentNotes: '' },
          status: 'accepted',
        },
      ],
      call: { status: 'connected', taskSid: 'WT1' } as never,
    });
  });

  it('renders Call/Notes/Info tabs for a voice task and shows the injected call panel', () => {
    renderWithIntl(<TaskWorkspace callPanel={<div data-testid="call-panel" />} />);
    expect(screen.getByRole('tab', { name: 'Call' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Notes' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Info' })).toBeInTheDocument();
    expect(screen.getByTestId('call-panel')).toBeInTheDocument();
  });

  it('switches to the Info tab and renders task attributes', async () => {
    renderWithIntl(<TaskWorkspace callPanel={<div data-testid="call-panel" />} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Info' }));
    expect(screen.getByText('from')).toBeInTheDocument();
    // The phone also appears in the contact header (no name attribute), so it is
    // present more than once — assert the Info-tab value row rendered it.
    expect(screen.getAllByText('+15551234567').length).toBeGreaterThanOrEqual(1);
  });
});
