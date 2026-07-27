import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '@/features/tasks/messages/en.json';
import { WrapUpForm } from '../WrapUpForm';

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ tasks: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe('WrapUpForm', () => {
  it('submits the chosen disposition and notes', async () => {
    const onComplete = vi.fn();
    renderWithIntl(<WrapUpForm onComplete={onComplete} />);
    await userEvent.selectOptions(screen.getByLabelText('Disposition'), 'callback');
    await userEvent.type(screen.getByLabelText('Wrap-up notes'), 'will call back');
    await userEvent.click(screen.getByRole('button', { name: 'Complete' }));
    expect(onComplete).toHaveBeenCalledWith({ disposition: 'callback', notes: 'will call back' });
  });

  it('disables the button and shows the busy label while completing', () => {
    renderWithIntl(<WrapUpForm onComplete={vi.fn()} completing />);
    const btn = screen.getByRole('button', { name: 'Completing…' });
    expect(btn).toBeDisabled();
  });
});
