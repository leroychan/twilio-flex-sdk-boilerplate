import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/en.json';
import { MediaPickerModal } from '../MediaPickerModal';

function wrap(ui: React.ReactNode) {
  return <NextIntlClientProvider locale="en" messages={{ conversations: messages }}>{ui}</NextIntlClientProvider>;
}

beforeEach(() => {
  // jsdom lacks object URL APIs used for image previews.
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:preview');
  globalThis.URL.revokeObjectURL = vi.fn();
});

describe('MediaPickerModal', () => {
  it('renders nothing when closed', () => {
    render(wrap(<MediaPickerModal open={false} onClose={vi.fn()} onSend={vi.fn()} />));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('keeps Send disabled until a file is chosen, then sends it and closes', async () => {
    const onSend = vi.fn();
    const onClose = vi.fn();
    render(wrap(<MediaPickerModal open onClose={onClose} onSend={onSend} />));

    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();

    const file = new File(['data'], 'photo.png', { type: 'image/png' });
    await userEvent.upload(screen.getByLabelText('Choose a file'), file);

    const send = screen.getByRole('button', { name: 'Send' });
    expect(send).toBeEnabled();
    await userEvent.click(send);

    expect(onSend).toHaveBeenCalledWith(file);
    expect(onClose).toHaveBeenCalled();
  });

  it('shows name and size for a non-image file', async () => {
    render(wrap(<MediaPickerModal open onClose={vi.fn()} onSend={vi.fn()} />));
    const file = new File(['a'.repeat(2048)], 'notes.pdf', { type: 'application/pdf' });
    await userEvent.upload(screen.getByLabelText('Choose a file'), file);
    expect(screen.getByText(/notes\.pdf/)).toBeInTheDocument();
    expect(screen.getByText(/2 KB/)).toBeInTheDocument();
  });

  it('cancel closes without sending', async () => {
    const onSend = vi.fn();
    const onClose = vi.fn();
    render(wrap(<MediaPickerModal open onClose={onClose} onSend={onSend} />));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
    expect(onSend).not.toHaveBeenCalled();
  });
});
