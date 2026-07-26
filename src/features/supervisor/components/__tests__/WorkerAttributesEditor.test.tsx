import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/en.json';
import { WorkerAttributesEditor } from '../WorkerAttributesEditor';

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ supervisor: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe('WorkerAttributesEditor', () => {
  it('saves parsed JSON when valid', async () => {
    const onSave = vi.fn();
    renderWithIntl(<WorkerAttributesEditor attributes={{ role: 'agent' }} onSave={onSave} />);
    const textarea = screen.getByLabelText('Attributes');
    await userEvent.clear(textarea);
    await userEvent.type(textarea, '{{"role":"lead"}');
    await userEvent.click(screen.getByRole('button', { name: 'Save attributes' }));
    expect(onSave).toHaveBeenCalledWith({ role: 'lead' });
  });

  it('shows an alert and does not save when JSON is invalid', async () => {
    const onSave = vi.fn();
    renderWithIntl(<WorkerAttributesEditor attributes={{}} onSave={onSave} />);
    const textarea = screen.getByLabelText('Attributes');
    await userEvent.clear(textarea);
    await userEvent.type(textarea, 'not json');
    await userEvent.click(screen.getByRole('button', { name: 'Save attributes' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Attributes must be valid JSON.');
  });
});
