import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/en.json';
import { Dialpad } from '../Dialpad';

function wrap(ui: React.ReactNode) {
  return <NextIntlClientProvider locale="en" messages={{ voice: messages }}>{ui}</NextIntlClientProvider>;
}

describe('Dialpad', () => {
  it('emits the pressed digit', async () => {
    const onDigit = vi.fn();
    render(wrap(<Dialpad onDigit={onDigit} />));
    await userEvent.click(screen.getByRole('button', { name: '5' }));
    await userEvent.click(screen.getByRole('button', { name: '#' }));
    expect(onDigit).toHaveBeenNthCalledWith(1, '5');
    expect(onDigit).toHaveBeenNthCalledWith(2, '#');
  });
});
