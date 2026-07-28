import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '@/features/tasks/messages/en.json';
import { TaskAttributesView } from '../TaskAttributesView';

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ tasks: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe('TaskAttributesView', () => {
  it('renders scalar attributes as key/value rows', () => {
    renderWithIntl(<TaskAttributesView attributes={{ from: '+15551234567', name: 'Ada' }} />);
    expect(screen.getByText('from')).toBeInTheDocument();
    expect(screen.getByText('+15551234567')).toBeInTheDocument();
    expect(screen.getByText('name')).toBeInTheDocument();
    expect(screen.getByText('Ada')).toBeInTheDocument();
  });

  it('JSON-stringifies nested objects', () => {
    renderWithIntl(<TaskAttributesView attributes={{ conversations: { channel: 'sms' } }} />);
    expect(screen.getByText(/"channel": "sms"/)).toBeInTheDocument();
  });

  it('shows the empty message when there are no attributes', () => {
    renderWithIntl(<TaskAttributesView attributes={{}} />);
    expect(screen.getByText('No task attributes')).toBeInTheDocument();
  });

  it('opens a dialog showing the full formatted JSON payload', async () => {
    renderWithIntl(<TaskAttributesView attributes={{ from: '+15551234567', customers: { name: 'Ada' } }} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'View JSON' }));
    const dialog = screen.getByRole('dialog');
    // The payload is rendered pretty-printed (2-space indent).
    expect(dialog).toHaveTextContent('"from": "+15551234567"');
    expect(dialog).toHaveTextContent('"name": "Ada"');
  });

  it('does not render the View JSON button when there are no attributes', () => {
    renderWithIntl(<TaskAttributesView attributes={{}} />);
    expect(screen.queryByRole('button', { name: 'View JSON' })).not.toBeInTheDocument();
  });
});
