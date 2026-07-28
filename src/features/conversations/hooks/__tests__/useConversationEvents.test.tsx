import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const getFlexClient = vi.fn();
const execute = vi.fn();
vi.mock('@/lib/flex/client', () => ({ getFlexClient: () => getFlexClient() }));
vi.mock('@twilio/flex-sdk/actions/Conversation', () => ({
  AddConversationEventListener: class {
    constructor(
      public name: string,
      public listener: unknown,
    ) {}
  },
}));
import { useConversationEvents } from '../useConversationEvents';

beforeEach(() => {
  getFlexClient.mockReset();
  execute.mockReset().mockResolvedValue({ unsubscribe: () => {} });
});

describe('useConversationEvents', () => {
  it('registers conversationJoined and conversationRemoved via client.execute', () => {
    // messageAdded is owned per-task by useConversation, not this global bridge.
    getFlexClient.mockReturnValue({ execute });
    renderHook(() => useConversationEvents());
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('no-ops (never throws) when there is no live client', () => {
    getFlexClient.mockReturnValue(null);
    expect(() => renderHook(() => useConversationEvents())).not.toThrow();
    expect(execute).not.toHaveBeenCalled();
  });
});
