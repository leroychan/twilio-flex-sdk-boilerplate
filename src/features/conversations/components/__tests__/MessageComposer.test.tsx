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

  it('sends on Enter and clears the field', async () => {
    const onSend = vi.fn();
    render(wrap(<MessageComposer onSend={onSend} />));
    const input = screen.getByPlaceholderText('Type a message…');
    await userEvent.type(input, 'hello{Enter}');
    expect(onSend).toHaveBeenCalledWith('hello');
    expect((input as HTMLTextAreaElement).value).toBe('');
  });

  it('inserts a newline on Shift+Enter without sending', async () => {
    const onSend = vi.fn();
    render(wrap(<MessageComposer onSend={onSend} />));
    const input = screen.getByPlaceholderText('Type a message…');
    await userEvent.type(input, 'line1{Shift>}{Enter}{/Shift}line2');
    expect(onSend).not.toHaveBeenCalled();
    expect((input as HTMLTextAreaElement).value).toBe('line1\nline2');
  });

  it('disables the input and Send when disabled', () => {
    render(wrap(<MessageComposer onSend={vi.fn()} disabled />));
    expect(screen.getByPlaceholderText('Type a message…')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  it('does not send on Enter when disabled', async () => {
    const onSend = vi.fn();
    render(wrap(<MessageComposer onSend={onSend} disabled />));
    const input = screen.getByPlaceholderText('Type a message…');
    await userEvent.type(input, 'hello{Enter}');
    expect(onSend).not.toHaveBeenCalled();
  });
});
