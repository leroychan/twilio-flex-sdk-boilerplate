import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useFlexStore } from '@/store';

const initFlexClient = vi.fn();
const registerSessionListeners = vi.fn((...a: unknown[]) => {
  void a;
  return vi.fn();
});
const startCustomTokenRefresh = vi.fn((..._a: unknown[]) => vi.fn());

vi.mock('@/lib/flex/client', () => ({
  initFlexClient: (...a: unknown[]) => initFlexClient(...a),
}));
vi.mock('@/lib/flex/events', () => ({
  registerSessionListeners: (...a: unknown[]) => registerSessionListeners(...a),
}));
vi.mock('@/lib/flex/tokenRefresh', () => ({
  startCustomTokenRefresh: (...a: unknown[]) => startCustomTokenRefresh(...a),
  refreshCustomToken: vi.fn(),
}));

import { FlexClientProvider, useFlexClientContext } from '../provider';

function Probe() {
  const { client, error } = useFlexClientContext();
  return <div data-testid="probe">{error ?? (client ? 'has-client' : 'no-client')}</div>;
}

describe('FlexClientProvider', () => {
  beforeEach(() => {
    useFlexStore.setState({
      token: null,
      identity: 'agent-1',
      worker: null,
      connectionState: 'disconnected',
    });
    initFlexClient.mockReset();
    registerSessionListeners.mockClear();
    startCustomTokenRefresh.mockClear();
  });

  it('does nothing without a token', () => {
    render(
      <FlexClientProvider token={null}>
        <Probe />
      </FlexClientProvider>,
    );
    expect(screen.getByTestId('probe').textContent).toBe('no-client');
    expect(initFlexClient).not.toHaveBeenCalled();
  });

  it('creates the client, resolves the worker, and registers listeners', async () => {
    const worker = { sid: 'WK1' };
    const fakeClient = { getWorker: vi.fn().mockResolvedValue(worker) };
    initFlexClient.mockResolvedValue(fakeClient);

    render(
      <FlexClientProvider token="tok-1">
        <Probe />
      </FlexClientProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('probe').textContent).toBe('has-client'));
    expect(initFlexClient).toHaveBeenCalledWith('tok-1', undefined);
    expect(registerSessionListeners).toHaveBeenCalledWith(fakeClient);
    expect(useFlexStore.getState().worker).toBe(worker);
    expect(useFlexStore.getState().connectionState).toBe('connected');
  });

  it('surfaces a normalized error on failure', async () => {
    initFlexClient.mockRejectedValue({ code: 'x', message: 'init failed' });
    render(
      <FlexClientProvider token="tok-1">
        <Probe />
      </FlexClientProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toBe('init failed'));
    expect(useFlexStore.getState().connectionState).toBe('error');
  });

  it('starts the custom-token refresh loop with the stored identity', async () => {
    const fakeClient = { getWorker: vi.fn().mockResolvedValue({ sid: 'WK1' }) };
    initFlexClient.mockResolvedValue(fakeClient);

    render(
      <FlexClientProvider token="tok-1">
        <Probe />
      </FlexClientProvider>,
    );

    await waitFor(() => expect(startCustomTokenRefresh).toHaveBeenCalledWith(fakeClient, 'agent-1'));
  });

  it('does NOT start the custom refresh loop on the SSO path', async () => {
    const fakeClient = { getWorker: vi.fn().mockResolvedValue({ sid: 'WK1' }) };
    initFlexClient.mockResolvedValue(fakeClient);

    render(
      <FlexClientProvider token="tok-1" options={{ refreshToken: 'r1', ssoProfileSid: 'sso1' }}>
        <Probe />
      </FlexClientProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('probe').textContent).toBe('has-client'));
    expect(startCustomTokenRefresh).not.toHaveBeenCalled();
  });

  it('does not re-initialize when the token value changes (refresh)', async () => {
    const fakeClient = { getWorker: vi.fn().mockResolvedValue({ sid: 'WK1' }) };
    initFlexClient.mockResolvedValue(fakeClient);

    const { rerender } = render(
      <FlexClientProvider token="tok-1">
        <Probe />
      </FlexClientProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toBe('has-client'));
    expect(initFlexClient).toHaveBeenCalledTimes(1);

    // A refresh rotates the token; the presence-keyed effect must not re-init.
    rerender(
      <FlexClientProvider token="tok-2">
        <Probe />
      </FlexClientProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toBe('has-client'));
    expect(initFlexClient).toHaveBeenCalledTimes(1);
  });
});
