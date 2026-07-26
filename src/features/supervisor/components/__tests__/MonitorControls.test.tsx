import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import messages from '../../messages/en.json';
import { MonitorControls } from '../MonitorControls';

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ supervisor: messages }}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe('MonitorControls', () => {
  it('fires onStart with the chosen mode', async () => {
    const onStart = vi.fn();
    renderWithIntl(<MonitorControls activeMode={null} onStart={onStart} onStop={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Coach' }));
    expect(onStart).toHaveBeenCalledWith('coach');
  });

  it('marks the active mode as pressed', () => {
    renderWithIntl(<MonitorControls activeMode="barge" onStart={vi.fn()} onStop={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Barge' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('disables Stop when no mode is active and fires onStop otherwise', async () => {
    const onStop = vi.fn();
    const { rerender } = renderWithIntl(
      <MonitorControls activeMode={null} onStart={vi.fn()} onStop={onStop} />,
    );
    expect(screen.getByRole('button', { name: 'Stop' })).toBeDisabled();

    rerender(
      <NextIntlClientProvider locale="en" messages={{ supervisor: messages }}>
        <MonitorControls activeMode="monitor" onStart={vi.fn()} onStop={onStop} />
      </NextIntlClientProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(onStop).toHaveBeenCalledOnce();
  });
});
