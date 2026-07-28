import { describe, it, expect, beforeEach, vi } from 'vitest';

const execute = vi.fn();
const getFlexClient = vi.fn(() => ({ execute }));

const { GetTaskParticipants, AddTaskParticipantListener, GetChannelsForTask, Base } = vi.hoisted(
  () => {
    class Base {
      args: unknown[];
      constructor(...args: unknown[]) {
        this.args = args;
      }
    }
    return {
      Base,
      GetTaskParticipants: class GetTaskParticipants extends Base {},
      AddTaskParticipantListener: class AddTaskParticipantListener extends Base {},
      GetChannelsForTask: class GetChannelsForTask extends Base {},
    };
  },
);

vi.mock('@/lib/flex/client', () => ({ getFlexClient: () => getFlexClient() }));
vi.mock('@twilio/flex-sdk/actions/Task', () => ({
  // existing classes referenced by Task.ts imports must exist as well
  AcceptTask: class AcceptTask extends Base {},
  RejectTask: class RejectTask extends Base {},
  WrapUpTask: class WrapUpTask extends Base {},
  CompleteTask: class CompleteTask extends Base {},
  EndTask: class EndTask extends Base {},
  SetTaskAttributes: class SetTaskAttributes extends Base {},
  GetTaskParticipants,
  AddTaskParticipantListener,
  GetChannelsForTask,
}));

import { getTaskParticipants, addTaskParticipantListener, getChannelsForTask } from '../Task';

describe('Task participant wrappers', () => {
  beforeEach(() => execute.mockReset());

  it('getTaskParticipants executes GetTaskParticipants(taskSid)', async () => {
    execute.mockResolvedValue([{ participantSid: 'UT1' }]);
    const res = await getTaskParticipants('WT1');
    expect(execute).toHaveBeenCalledTimes(1);
    const action = execute.mock.calls[0]![0] as { args: unknown[] };
    expect(action).toBeInstanceOf(GetTaskParticipants);
    expect(action.args).toEqual(['WT1']);
    expect(res).toEqual([{ participantSid: 'UT1' }]);
  });

  it('addTaskParticipantListener executes AddTaskParticipantListener with event + listener', async () => {
    const unsubscribe = vi.fn();
    execute.mockResolvedValue({ unsubscribe });
    const listener = vi.fn();
    const res = await addTaskParticipantListener('WT1', 'participantAdded', listener);
    const action = execute.mock.calls[0]![0] as { args: unknown[] };
    expect(action).toBeInstanceOf(AddTaskParticipantListener);
    expect(action.args).toEqual(['WT1', 'participantAdded', listener]);
    expect(res.unsubscribe).toBe(unsubscribe);
  });

  it('getChannelsForTask executes GetChannelsForTask(taskSid)', async () => {
    execute.mockResolvedValue([{ sid: 'UO1' }]);
    const res = await getChannelsForTask('WT1');
    const action = execute.mock.calls[0]![0] as { args: unknown[] };
    expect(action).toBeInstanceOf(GetChannelsForTask);
    expect(res).toEqual([{ sid: 'UO1' }]);
  });
});
