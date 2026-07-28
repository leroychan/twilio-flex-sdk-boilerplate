import { describe, it, expect, vi, beforeEach } from 'vitest';

const getFlexClient = vi.fn();
vi.mock('@/lib/flex/client', () => ({ getFlexClient: () => getFlexClient() }));
vi.mock('@twilio/flex-sdk/actions/Conversation', () => ({
  GetConversationByTask: class {
    constructor(public taskSid: string) {}
  },
  GetConversationBySid: class {
    constructor(public sid: string) {}
  },
  GetConversationsUser: class {
    constructor(public identity: string) {}
  },
}));

import { getConversationByTask, getConversationBySid, getConversationsUser } from '../Conversation';
import {
  GetConversationByTask,
  GetConversationBySid,
  GetConversationsUser,
} from '@twilio/flex-sdk/actions/Conversation';

beforeEach(() => getFlexClient.mockReset());

describe('Conversation fetch wrappers', () => {
  it('getConversationByTask executes GetConversationByTask(taskSid)', async () => {
    const execute = vi.fn().mockResolvedValue({ sid: 'CH1' });
    getFlexClient.mockReturnValue({ execute });
    const conv = await getConversationByTask('WT1');
    const action = execute.mock.calls[0]![0] as { taskSid: string };
    expect(action).toBeInstanceOf(GetConversationByTask);
    expect(action.taskSid).toBe('WT1');
    expect(conv).toEqual({ sid: 'CH1' });
  });

  it('getConversationBySid executes GetConversationBySid(sid)', async () => {
    const execute = vi.fn().mockResolvedValue({ sid: 'CH2' });
    getFlexClient.mockReturnValue({ execute });
    await getConversationBySid('CH2');
    const action = execute.mock.calls[0]![0] as { sid: string };
    expect(action).toBeInstanceOf(GetConversationBySid);
    expect(action.sid).toBe('CH2');
  });

  it('getConversationsUser executes GetConversationsUser(identity)', async () => {
    const execute = vi.fn().mockResolvedValue({ isOnline: true });
    getFlexClient.mockReturnValue({ execute });
    const user = await getConversationsUser('cust-1');
    const action = execute.mock.calls[0]![0] as { identity: string };
    expect(action).toBeInstanceOf(GetConversationsUser);
    expect(action.identity).toBe('cust-1');
    expect(user).toEqual({ isOnline: true });
  });
});
