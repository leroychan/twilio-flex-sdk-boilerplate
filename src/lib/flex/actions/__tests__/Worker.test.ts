import { describe, it, expect, beforeEach, vi } from 'vitest';

const getFlexClient = vi.fn();

// Defined via vi.hoisted so the class references exist before the hoisted
// vi.mock factory below runs (plain top-level classes would be in the TDZ).
const { SetCurrentActivity, SetAttributes } = vi.hoisted(() => {
  class SetCurrentActivity {
    constructor(public args: unknown) {}
  }
  class SetAttributes {
    constructor(public args: unknown) {}
  }
  return { SetCurrentActivity, SetAttributes };
});

vi.mock('@/lib/flex/client', () => ({
  getFlexClient: () => getFlexClient(),
}));
vi.mock('@twilio/flex-sdk/actions/Worker', () => ({ SetCurrentActivity, SetAttributes }));

import { setCurrentActivity, setAttributes } from '../Worker';

describe('Worker action wrappers', () => {
  beforeEach(() => getFlexClient.mockReset());

  it('setCurrentActivity executes SetCurrentActivity via the client', async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    getFlexClient.mockReturnValue({ execute });
    await setCurrentActivity('WA123');
    expect(execute).toHaveBeenCalledTimes(1);
    const action = execute.mock.calls[0]![0];
    expect(action).toBeInstanceOf(SetCurrentActivity);
    expect(action.args).toEqual('WA123');
  });

  it('setAttributes executes SetAttributes via the client', async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    getFlexClient.mockReturnValue({ execute });
    await setAttributes({ team: 'blue' });
    const action = execute.mock.calls[0]![0];
    expect(action).toBeInstanceOf(SetAttributes);
    expect(action.args).toEqual({ team: 'blue' });
  });

  it('throws a client_not_initialized error when there is no client', async () => {
    getFlexClient.mockReturnValue(null);
    await expect(setCurrentActivity('WA1')).rejects.toMatchObject({
      code: 'client_not_initialized',
      severity: 'error',
    });
  });

  it('normalizes SDK failures', async () => {
    const execute = vi.fn().mockRejectedValue({ code: 42, message: 'denied' });
    getFlexClient.mockReturnValue({ execute });
    await expect(setAttributes({})).rejects.toEqual({
      code: '42',
      severity: 'error',
      message: 'denied',
    });
  });
});
