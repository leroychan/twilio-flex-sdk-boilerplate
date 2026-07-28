import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/en.json';

vi.mock('react-simple-wysiwyg', () => ({
  __esModule: true,
  default: ({ value, onChange }: { value: string; onChange: (e: { target: { value: string } }) => void }) => (
    <textarea aria-label="body" value={value} onChange={(e) => onChange({ target: { value: e.target.value } })} />
  ),
}));

import { EmailComposer } from '../EmailComposer';

function wrap(ui: React.ReactNode) {
  return <NextIntlClientProvider locale="en" messages={{ conversations: messages }}>{ui}</NextIntlClientProvider>;
}

describe('EmailComposer', () => {
  it('prefills the subject and sends an HTML reply', async () => {
    const onSend = vi.fn();
    render(wrap(<EmailComposer onSend={onSend} defaultSubject="Re: Order" />));
    expect((screen.getByLabelText('Subject') as HTMLInputElement).value).toBe('Re: Order');
    await userEvent.type(screen.getByLabelText('body'), '<b>hi</b>');
    await userEvent.click(screen.getByRole('button', { name: 'Reply' }));
    expect(onSend).toHaveBeenCalledWith('<b>hi</b>', 'Re: Order');
  });

  it('disables Reply until the body has content', () => {
    render(wrap(<EmailComposer onSend={vi.fn()} />));
    expect(screen.getByRole('button', { name: 'Reply' })).toBeDisabled();
  });
});
