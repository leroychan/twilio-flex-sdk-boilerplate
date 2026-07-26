import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import messages from '@/features/presence/messages/en.json';
import { usePresence } from '../../hooks/usePresence';
import { ActivitySelector } from '../ActivitySelector';

vi.mock('../../hooks/usePresence', () => ({ usePresence: vi.fn() }));

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ presence: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe('ActivitySelector', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders an option per activity and reflects the current activity', () => {
    vi.mocked(usePresence).mockReturnValue({
      activities: [
        { sid: 'WA1', name: 'Available', available: true },
        { sid: 'WA2', name: 'Offline', available: false },
      ],
      currentActivitySid: 'WA1',
      changeActivity: vi.fn().mockResolvedValue(undefined),
    });
    renderWithIntl(<ActivitySelector />);
    const select = screen.getByRole('combobox', { name: 'Set your activity' }) as HTMLSelectElement;
    expect(select.value).toBe('WA1');
    expect(screen.getByRole('option', { name: 'Available' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Offline' })).toBeInTheDocument();
  });

  it('calls changeActivity when a new activity is selected', async () => {
    const changeActivity = vi.fn().mockResolvedValue(undefined);
    vi.mocked(usePresence).mockReturnValue({
      activities: [
        { sid: 'WA1', name: 'Available', available: true },
        { sid: 'WA2', name: 'Offline', available: false },
      ],
      currentActivitySid: 'WA1',
      changeActivity,
    });
    renderWithIntl(<ActivitySelector />);
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Set your activity' }),
      'WA2',
    );
    expect(changeActivity).toHaveBeenCalledWith('WA2');
  });

  it('shows a placeholder option when there are no activities', () => {
    vi.mocked(usePresence).mockReturnValue({
      activities: [],
      currentActivitySid: null,
      changeActivity: vi.fn().mockResolvedValue(undefined),
    });
    renderWithIntl(<ActivitySelector />);
    expect(screen.getByRole('option', { name: 'No activities available' })).toBeInTheDocument();
  });
});
