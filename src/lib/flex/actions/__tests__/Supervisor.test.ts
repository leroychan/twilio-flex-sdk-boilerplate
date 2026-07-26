import { describe, it, expect, beforeEach, vi } from 'vitest';

const getFlexClient = vi.fn();

// Defined via vi.hoisted so the class references exist before the hoisted
// vi.mock factories below run. The real SDK actions are CLASSES executed with
// positional constructor args via client.execute(new Action(...)).
const { MonitorCall, CoachCall, BargeCall, SetWorkerActivity, SetWorkerAttributes } = vi.hoisted(
  () => {
    class MonitorCall {
      args: unknown[];
      constructor(...args: unknown[]) {
        this.args = args;
      }
    }
    class CoachCall {
      args: unknown[];
      constructor(...args: unknown[]) {
        this.args = args;
      }
    }
    class BargeCall {
      args: unknown[];
      constructor(...args: unknown[]) {
        this.args = args;
      }
    }
    class SetWorkerActivity {
      args: unknown[];
      constructor(...args: unknown[]) {
        this.args = args;
      }
    }
    class SetWorkerAttributes {
      args: unknown[];
      constructor(...args: unknown[]) {
        this.args = args;
      }
    }
    return { MonitorCall, CoachCall, BargeCall, SetWorkerActivity, SetWorkerAttributes };
  },
);

vi.mock('@/lib/flex/client', () => ({ getFlexClient: () => getFlexClient() }));
vi.mock('@twilio/flex-sdk/actions/Voice', () => ({ MonitorCall, CoachCall, BargeCall }));
vi.mock('@twilio/flex-sdk/actions/Supervisor', () => ({ SetWorkerActivity, SetWorkerAttributes }));

import {
  monitorCall,
  coachCall,
  bargeCall,
  setWorkerActivity,
  setWorkerAttributes,
} from '../Supervisor';

describe('Supervisor action wrappers', () => {
  beforeEach(() => getFlexClient.mockReset());

  it('monitorCall executes MonitorCall(taskSid, reservationSid) via the client', async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    getFlexClient.mockReturnValue({ execute });
    await monitorCall('WT1', 'WR1');
    expect(execute).toHaveBeenCalledTimes(1);
    const action = execute.mock.calls[0]![0];
    expect(action).toBeInstanceOf(MonitorCall);
    expect(action.args).toEqual(['WT1', 'WR1']);
  });

  it('coachCall executes CoachCall(taskSid) via the client', async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    getFlexClient.mockReturnValue({ execute });
    await coachCall('WT2');
    const action = execute.mock.calls[0]![0];
    expect(action).toBeInstanceOf(CoachCall);
    expect(action.args).toEqual(['WT2']);
  });

  it('bargeCall executes BargeCall(taskSid) via the client', async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    getFlexClient.mockReturnValue({ execute });
    await bargeCall('WT3');
    const action = execute.mock.calls[0]![0];
    expect(action).toBeInstanceOf(BargeCall);
    expect(action.args).toEqual(['WT3']);
  });

  it('setWorkerActivity executes SetWorkerActivity with default rejectPendingReservations=false', async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    getFlexClient.mockReturnValue({ execute });
    await setWorkerActivity('WK1', 'WA1');
    const action = execute.mock.calls[0]![0];
    expect(action).toBeInstanceOf(SetWorkerActivity);
    expect(action.args).toEqual([
      'WK1',
      'WA1',
      { activityUpdateOptions: { rejectPendingReservations: false } },
    ]);
  });

  it('setWorkerActivity forwards rejectPendingReservations when provided', async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    getFlexClient.mockReturnValue({ execute });
    await setWorkerActivity('WK1', 'WA1', true);
    const action = execute.mock.calls[0]![0];
    expect(action.args).toEqual([
      'WK1',
      'WA1',
      { activityUpdateOptions: { rejectPendingReservations: true } },
    ]);
  });

  it('setWorkerAttributes executes SetWorkerAttributes(workerSid, attributes)', async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    getFlexClient.mockReturnValue({ execute });
    await setWorkerAttributes('WK1', { role: 'lead' });
    const action = execute.mock.calls[0]![0];
    expect(action).toBeInstanceOf(SetWorkerAttributes);
    expect(action.args).toEqual(['WK1', { role: 'lead' }]);
  });

  it('throws a client_not_initialized error when there is no client', async () => {
    getFlexClient.mockReturnValue(null);
    await expect(monitorCall('WT1', 'WR1')).rejects.toMatchObject({
      code: 'client_not_initialized',
      severity: 'error',
    });
  });

  it('rethrows a normalized error when the SDK action fails', async () => {
    const execute = vi.fn().mockRejectedValue({ code: 42, message: 'denied' });
    getFlexClient.mockReturnValue({ execute });
    await expect(monitorCall('WT1', 'WR1')).rejects.toEqual({
      code: '42',
      severity: 'error',
      message: 'denied',
    });
  });
});
