import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useFlexStore } from '@/store';

const initFlexClient = vi.fn();
const registerSessionListeners = vi.fn(() => vi.fn());

vi.mock('@/lib/flex/client', () => ({
  initFlexClient: (...a: unknown[]) => initFlexClient(...a),
}));
vi.mock('@/lib/flex/events', () => ({
  registerSessionListeners: (...a: unknown[]) => registerSessionListeners(...a),
}));

import { FlexClientProvider, useFlexClientContext } from '../provider';

function Probe() {
  const { client, error } = useFlexClientContext();
  return <div data-testid="probe">{error ?? (client ? 'has-client' : 'no-client')}</div>;
}

describe('FlexClientProvider', () => {
  beforeEach(() => {
    useFlexStore.setState({ token: null, worker: null, connectionState: 'disconnected' });
    initFlexClient.mockReset();
    registerSessionListeners.mockClear();
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
});
