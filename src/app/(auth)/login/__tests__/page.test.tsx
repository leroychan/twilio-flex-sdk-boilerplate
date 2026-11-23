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

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

/** Route the page's two calls: the user-suggestion GET and the token POST. */
function mockFetch(opts: { users?: unknown; token: () => Response }) {
  return vi.spyOn(global, 'fetch').mockImplementation(async (input) =>
    String(input) === '/api/flex-users'
      ? json(200, opts.users ?? { users: [], stub: true })
      : opts.token(),
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    useFlexStore.setState({ token: null, worker: null, connectionState: 'disconnected' });
    push.mockReset();
    vi.restoreAllMocks();
  });

  it('sign-in fetches a token, stores it, and navigates to the desktop', async () => {
    mockFetch({
      token: () => json(200, { token: 'STUB.abc.STUB', identity: 'demo-agent', stub: true }),
    });

    render(<LoginPage />);
    await userEvent.click(screen.getByRole('button', { name: 'signIn' }));

    await waitFor(() => expect(useFlexStore.getState().token).toBe('STUB.abc.STUB'));
    // The minting identity is persisted so the refresh loop can replay it.
    expect(useFlexStore.getState().identity).toBe('demo-agent');
    expect(push).toHaveBeenCalledWith('/agent-desktop');
  });

  it('shows an error message when the token request fails', async () => {
    mockFetch({ token: () => new Response('nope', { status: 500 }) });
    render(<LoginPage />);
    await userEvent.click(screen.getByRole('button', { name: 'signIn' }));
    await waitFor(() => expect(screen.getByText('error')).toBeInTheDocument());
    expect(push).not.toHaveBeenCalled();
  });

  it('suggests existing Flex users and signs in as the one picked', async () => {
    const fetchSpy = mockFetch({
      users: { users: [{ username: 'ann@acme.com', fullName: 'Ann A' }], stub: false },
      token: () => json(200, { token: 'LIVE', identity: 'ann@acme.com', stub: false }),
    });
    render(<LoginPage />);

    const pick = await screen.findByRole('button', { name: /ann@acme\.com/ });
    expect(screen.getByText('usernameHint')).toBeInTheDocument();
    expect(screen.getByText('usernamePickHint')).toBeInTheDocument();

    // Picking a suggestion fills the input, same as typing it.
    await userEvent.click(pick);
    expect(screen.getByRole('textbox')).toHaveValue('ann@acme.com');
    await userEvent.click(screen.getByRole('button', { name: 'signIn' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/agent-desktop'));
    const tokenCall = fetchSpy.mock.calls.find(([url]) => url === '/api/token');
    expect(JSON.parse(String(tokenCall![1]!.body))).toEqual({ username: 'ann@acme.com' });
  });

  it('filters the suggestions by what has been typed', async () => {
    mockFetch({
      users: {
        users: [
          { username: 'ann@acme.com', fullName: 'Ann A' },
          { username: 'bob@acme.com', fullName: 'Bob B' },
        ],
        stub: false,
      },
      token: () => json(500, {}),
    });
    render(<LoginPage />);
    await screen.findByRole('button', { name: /bob@acme\.com/ });

    await userEvent.type(screen.getByRole('textbox'), 'ann');
    expect(screen.getByRole('button', { name: /ann@acme\.com/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /bob@acme\.com/ })).not.toBeInTheDocument();
  });

  it('tells stub-mode users any username works', async () => {
    mockFetch({ token: () => json(500, {}) });
    render(<LoginPage />);
    await waitFor(() => expect(screen.getByText('usernameHintStub')).toBeInTheDocument());
    expect(screen.queryByText('usernameHint')).not.toBeInTheDocument();
  });
});
