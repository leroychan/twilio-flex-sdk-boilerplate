import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '@/features/session/messages/en.json';
import { IconRail } from '../IconRail';

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ session: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe('IconRail', () => {
  it('marks the active view with aria-current', () => {
    renderWithIntl(
      <IconRail activeView="queues" onViewChange={vi.fn()} onDialpad={vi.fn()} showTeams />,
    );
    expect(screen.getByRole('button', { name: 'Queues Stats' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Agent Desktop' })).not.toHaveAttribute('aria-current');
  });

  it('changes view on click and fires the dialpad callback without changing view', async () => {
    const onViewChange = vi.fn();
    const onDialpad = vi.fn();
    renderWithIntl(
      <IconRail activeView="desktop" onViewChange={onViewChange} onDialpad={onDialpad} showTeams />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Teams' }));
    expect(onViewChange).toHaveBeenCalledWith('teams');
    await userEvent.click(screen.getByRole('button', { name: 'Dialpad' }));
    expect(onDialpad).toHaveBeenCalledOnce();
  });

  it('hides Teams when showTeams is false', () => {
    renderWithIntl(
      <IconRail activeView="desktop" onViewChange={vi.fn()} onDialpad={vi.fn()} showTeams={false} />,
    );
    expect(screen.queryByRole('button', { name: 'Teams' })).not.toBeInTheDocument();
  });
});
