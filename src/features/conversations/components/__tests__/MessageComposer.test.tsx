import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/en.json';
import { MessageComposer } from '../MessageComposer';

function wrap(ui: React.ReactNode) {
  return <NextIntlClientProvider locale="en" messages={{ conversations: messages }}>{ui}</NextIntlClientProvider>;
}

describe('MessageComposer', () => {
  it('sends typed text and clears the field', async () => {
    const onSend = vi.fn();
    render(wrap(<MessageComposer onSend={onSend} />));
    const input = screen.getByPlaceholderText('Type a message…');
    await userEvent.type(input, 'hello');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(onSend).toHaveBeenCalledWith('hello');
    expect((input as HTMLTextAreaElement).value).toBe('');
  });

  it('disables Send when empty', () => {
    render(wrap(<MessageComposer onSend={vi.fn()} />));
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });
});
