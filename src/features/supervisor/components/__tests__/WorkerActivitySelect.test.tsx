import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/en.json';
import { WorkerActivitySelect } from '../WorkerActivitySelect';

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ supervisor: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const activities = [
  { sid: 'WA0', name: 'Offline' },
  { sid: 'WA1', name: 'Available' },
];

describe('WorkerActivitySelect', () => {
  it('renders options and reflects the current activity', () => {
    renderWithIntl(
      <WorkerActivitySelect activities={activities} currentActivitySid="WA0" onChange={vi.fn()} />,
    );
    const select = screen.getByLabelText('Change activity') as HTMLSelectElement;
    expect(select.value).toBe('WA0');
    expect(screen.getByRole('option', { name: 'Available' })).toBeInTheDocument();
  });

  it('calls onChange with the selected activity sid', async () => {
    const onChange = vi.fn();
    renderWithIntl(
      <WorkerActivitySelect activities={activities} currentActivitySid="WA0" onChange={onChange} />,
    );
    await userEvent.selectOptions(screen.getByLabelText('Change activity'), 'WA1');
    expect(onChange).toHaveBeenCalledWith('WA1');
  });
});
