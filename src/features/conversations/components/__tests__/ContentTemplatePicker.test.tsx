import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/en.json';

const getContentTemplates = vi.fn();
vi.mock('@/lib/flex/actions/Conversation', () => ({ getContentTemplates: () => getContentTemplates() }));
import { ContentTemplatePicker } from '../ContentTemplatePicker';

function wrap(ui: React.ReactNode) {
  return <NextIntlClientProvider locale="en" messages={{ conversations: messages }}>{ui}</NextIntlClientProvider>;
}
beforeEach(() => getContentTemplates.mockReset().mockResolvedValue([{ sid: 'HX1', friendlyName: 'Greeting', body: 'Hello!' }]));

describe('ContentTemplatePicker', () => {
  it('loads templates and picks one', async () => {
    const onPick = vi.fn();
    render(wrap(<ContentTemplatePicker onPick={onPick} />));
    const btn = await screen.findByRole('button', { name: 'Greeting' });
    await userEvent.click(btn);
    await waitFor(() => expect(onPick).toHaveBeenCalledWith('Hello!'));
  });
});
