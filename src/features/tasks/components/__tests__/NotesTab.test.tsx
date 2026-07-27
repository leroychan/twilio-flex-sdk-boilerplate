import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '@/features/tasks/messages/en.json';
import { NotesTab } from '../NotesTab';

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ tasks: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe('NotesTab', () => {
  it('rehydrates existing notes from attributes', () => {
    renderWithIntl(
      <NotesTab taskSid="WT1" attributes={{ agentNotes: 'prior note' }} onPersist={vi.fn()} />,
    );
    expect(screen.getByRole('textbox')).toHaveValue('prior note');
  });

  it('persists merged attributes (debounced) after typing', async () => {
    const onPersist = vi.fn().mockResolvedValue(undefined);
    renderWithIntl(
      <NotesTab taskSid="WT1" attributes={{ from: '+1555', agentNotes: '' }} onPersist={onPersist} />,
    );
    await userEvent.type(screen.getByRole('textbox'), 'hello');
    await waitFor(() => expect(onPersist).toHaveBeenCalled(), { timeout: 2000 });
    expect(onPersist).toHaveBeenLastCalledWith('WT1', { from: '+1555', agentNotes: 'hello' });
  });
});
