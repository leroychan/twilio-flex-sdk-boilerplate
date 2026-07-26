import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFlexStore } from '@/store';

const push = vi.fn();
const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => new URLSearchParams(''),
}));
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));
// SDK is browser-only — mock it so exchangeToken never touches window.
vi.mock('@twilio/flex-sdk', () => ({ exchangeToken: vi.fn() }));

import LoginPage from '../page';

describe('LoginPage', () => {
  beforeEach(() => {
    useFlexStore.setState({ token: null, worker: null, connectionState: 'disconnected' });
    push.mockReset();
    vi.restoreAllMocks();
  });

  it('demo-mode sign-in fetches a token, stores it, and navigates to the desktop', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ token: 'STUB.abc.STUB', identity: 'demo-agent', stub: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    render(<LoginPage />);
    await userEvent.click(screen.getByRole('button', { name: 'demoMode' }));

    await waitFor(() => expect(useFlexStore.getState().token).toBe('STUB.abc.STUB'));
    expect(push).toHaveBeenCalledWith('/agent-desktop');
  });

  it('shows an error message when the token request fails', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('nope', { status: 500 }));
    render(<LoginPage />);
    await userEvent.click(screen.getByRole('button', { name: 'demoMode' }));
    await waitFor(() => expect(screen.getByText('error')).toBeInTheDocument());
    expect(push).not.toHaveBeenCalled();
  });
});
