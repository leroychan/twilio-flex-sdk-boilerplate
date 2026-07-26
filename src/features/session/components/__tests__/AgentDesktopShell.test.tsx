import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { useFlexStore } from '@/store';
import { loadMessages } from '@/i18n/loadMessages';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
// Keep the SDK boundary out of the shell test — render children directly.
vi.mock('@/lib/flex/provider', () => ({
  FlexClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { AgentDesktopShell } from '../AgentDesktopShell';

const messages = loadMessages('en');
function renderShell() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AgentDesktopShell />
    </NextIntlClientProvider>,
  );
}

describe('AgentDesktopShell', () => {
  beforeEach(() => {
    useFlexStore.setState({ token: null, worker: null, connectionState: 'disconnected' });
    replace.mockReset();
  });

  it('redirects to /login when there is no token', async () => {
    renderShell();
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
  });

  it('renders the desktop when a token is present', () => {
    useFlexStore.setState({ token: 'tok-1' });
    renderShell();
    expect(screen.getByTestId('agent-desktop')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
