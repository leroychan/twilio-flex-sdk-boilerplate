import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../messages/en.json';
import { TransferTargetSelect } from '../TransferTargetSelect';

function wrap(ui: React.ReactNode) {
  return <NextIntlClientProvider locale="en" messages={{ directory: messages }}>{ui}</NextIntlClientProvider>;
}

const queues = [{ sid: 'WQ1', name: 'Sales' }];
const workers = [
  { sid: 'WK1', name: 'Ada', activitySid: 'WA1', activityName: 'Available', available: true, attributes: {} },
];

describe('TransferTargetSelect', () => {
  it('renders queue and agent options', () => {
    render(wrap(<TransferTargetSelect queues={queues} workers={workers} value="" onChange={vi.fn()} />));
    expect(screen.getByRole('option', { name: 'Sales' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Ada' })).toBeInTheDocument();
  });

  it('emits the selected sid', async () => {
    const onChange = vi.fn();
    render(wrap(<TransferTargetSelect queues={queues} workers={workers} value="" onChange={onChange} />));
    await userEvent.selectOptions(screen.getByRole('combobox'), 'WK1');
    expect(onChange).toHaveBeenCalledWith('WK1');
  });
});
