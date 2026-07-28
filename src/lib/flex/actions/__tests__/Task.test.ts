import { describe, it, expect, beforeEach, vi } from 'vitest';

const getFlexClient = vi.fn();

// Explicit hoisted mock classes (same pattern as Worker.test.ts) so `instanceof`
// works and constructor args can be asserted. Each captures its positional args.
const { AcceptTask, RejectTask, WrapUpTask, CompleteTask, EndTask, SetTaskAttributes } =
  vi.hoisted(() => {
    class Base {
      args: unknown[];
      constructor(...args: unknown[]) {
        this.args = args;
      }
    }
    return {
      AcceptTask: class AcceptTask extends Base {},
      RejectTask: class RejectTask extends Base {},
      WrapUpTask: class WrapUpTask extends Base {},
      CompleteTask: class CompleteTask extends Base {},
      EndTask: class EndTask extends Base {},
      SetTaskAttributes: class SetTaskAttributes extends Base {},
    };
  });

vi.mock('@/lib/flex/client', () => ({ getFlexClient: () => getFlexClient() }));
vi.mock('@twilio/flex-sdk/actions/Task', () => ({
  AcceptTask,
  RejectTask,
  WrapUpTask,
  CompleteTask,
  EndTask,
  SetTaskAttributes,
}));

import {
  acceptTask,
  rejectTask,
  wrapUpTask,
  completeTask,
  endTask,
  setTaskAttributes,
} from '../Task';

describe('Task action wrappers', () => {
  beforeEach(() => getFlexClient.mockReset());

  it('acceptTask executes AcceptTask with the task sid', async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    getFlexClient.mockReturnValue({ execute });
    await acceptTask('WT1');
    const action = execute.mock.calls[0]![0];
    expect(action).toBeInstanceOf(AcceptTask);
    expect(action.args).toEqual(['WT1']);
  });

  it('rejectTask executes RejectTask with the task sid', async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    getFlexClient.mockReturnValue({ execute });
    await rejectTask('WT1');
    const action = execute.mock.calls[0]![0];
    expect(action).toBeInstanceOf(RejectTask);
    expect(action.args).toEqual(['WT1']);
  });

  it('wrapUpTask executes WrapUpTask with the task sid', async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    getFlexClient.mockReturnValue({ execute });
    await wrapUpTask('WT1');
    const action = execute.mock.calls[0]![0];
    expect(action).toBeInstanceOf(WrapUpTask);
    expect(action.args).toEqual(['WT1']);
  });

  it('completeTask executes CompleteTask with the task sid', async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    getFlexClient.mockReturnValue({ execute });
    await completeTask('WT1');
    const action = execute.mock.calls[0]![0];
    expect(action).toBeInstanceOf(CompleteTask);
    expect(action.args).toEqual(['WT1']);
  });

  it('completeTask resolves (idempotent) when the reservation is already completed', async () => {
    const execute = vi.fn().mockRejectedValue({
      code: 400,
      severity: 'error',
      message:
        'Reservation WR1 was in incorrect state completed, should be in states wrapping,accepted',
    });
    getFlexClient.mockReturnValue({ execute });
    await expect(completeTask('WT1')).resolves.toBeUndefined();
  });

  it('completeTask still throws for unrelated failures', async () => {
    const execute = vi.fn().mockRejectedValue({ code: 500, message: 'boom' });
    getFlexClient.mockReturnValue({ execute });
    await expect(completeTask('WT1')).rejects.toMatchObject({ code: '500', message: 'boom' });
  });

  it('wrapUpTask resolves (idempotent) when the reservation already left the accepted state', async () => {
    const execute = vi.fn().mockRejectedValue({
      code: 400,
      severity: 'error',
      message: 'Reservation WR1 was in incorrect state wrapping, should be in states accepted',
    });
    getFlexClient.mockReturnValue({ execute });
    await expect(wrapUpTask('WT1')).resolves.toBeUndefined();
  });

  it('endTask executes EndTask with only the task sid (SDK EndTask takes no reason)', async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    getFlexClient.mockReturnValue({ execute });
    await endTask('WT1', 'customer_hangup');
    const action = execute.mock.calls[0]![0];
    expect(action).toBeInstanceOf(EndTask);
    expect(action.args).toEqual(['WT1']);
  });

  it('setTaskAttributes executes SetTaskAttributes with sid and attributes', async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    getFlexClient.mockReturnValue({ execute });
    await setTaskAttributes('WT1', { priority: 'high' });
    const action = execute.mock.calls[0]![0];
    expect(action).toBeInstanceOf(SetTaskAttributes);
    expect(action.args).toEqual(['WT1', { priority: 'high' }]);
  });

  it('setTaskAttributes forwards mergeExisting when merge is requested', async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    getFlexClient.mockReturnValue({ execute });
    await setTaskAttributes('WT1', { wrapup_notes: 'x' }, { merge: true });
    const action = execute.mock.calls[0]![0];
    expect(action.args).toEqual(['WT1', { wrapup_notes: 'x' }, { mergeExisting: true }]);
  });

  it('throws a client_not_initialized error when there is no client', async () => {
    getFlexClient.mockReturnValue(null);
    await expect(acceptTask('WT1')).rejects.toMatchObject({
      code: 'client_not_initialized',
      severity: 'error',
    });
  });

  it('normalizes SDK failures', async () => {
    const execute = vi.fn().mockRejectedValue({ code: 42, message: 'denied' });
    getFlexClient.mockReturnValue({ execute });
    await expect(acceptTask('WT1')).rejects.toEqual({
      code: '42',
      severity: 'error',
      message: 'denied',
    });
  });
});
