import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mirrors the repo's Worker.test convention: getFlexClient is a mock fn that returns
// a fresh `execute` per test. (The module-scoped `execute` + mockReset variant trips a
// vitest v4 unhandled-rejection false-positive on the reject path.)
const getFlexClient = vi.fn();
vi.mock('@/lib/flex/client', () => ({ getFlexClient: () => getFlexClient() }));
vi.mock('@twilio/flex-sdk/actions/Conversation', () => ({
  PauseConversation: class { constructor(public sid: string) {} },
  ResumeConversation: class { constructor(public sid: string) {} },
  GetPausedConversations: class {},
  LeaveConversation: class { constructor(public sid: string) {} },
  StartConversationTransfer: class { constructor(public sid: string, public target: string, public mode: string) {} },
  GetConversationTransfers: class { constructor(public sid: string) {} },
  GetContentTemplates: class {},
  StartOutboundEmailTask: class { constructor(public input: unknown) {} },
  AddEmailParticipant: class { constructor(public sid: string, public address: string) {} },
  RemoveEmailParticipant: class { constructor(public sid: string, public participantSid: string) {} },
  ParticipantLevel: { To: 'to', CC: 'cc' },
}));

import * as C from '../Conversation';

beforeEach(() => getFlexClient.mockReset());

describe('Conversation action wrappers', () => {
  it('pauseConversation executes a PauseConversation action', async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    getFlexClient.mockReturnValue({ execute });
    await C.pauseConversation('CH1');
    expect(execute).toHaveBeenCalledOnce();
  });

  it('getPausedConversations returns the executed result', async () => {
    const execute = vi.fn().mockResolvedValue([{ sid: 'CH1', friendlyName: 'Chat', pausedAt: '2026-01-01' }]);
    getFlexClient.mockReturnValue({ execute });
    const out = await C.getPausedConversations();
    expect(out[0]!.sid).toBe('CH1');
  });

  it('normalizes errors on failure', async () => {
    const execute = vi.fn().mockRejectedValue({ code: 500, message: 'boom', severity: 'error' });
    getFlexClient.mockReturnValue({ execute });
    await expect(C.resumeConversation('CH1')).rejects.toMatchObject({ code: '500', message: 'boom' });
  });

  it('startOutboundEmailTask returns the task sid', async () => {
    const execute = vi.fn().mockResolvedValue({ taskSid: 'WT1' });
    getFlexClient.mockReturnValue({ execute });
    const out = await C.startOutboundEmailTask({ to: 'a@b.com', subject: 'Hi', body: '<p>x</p>' });
    expect(out.taskSid).toBe('WT1');
  });
});
