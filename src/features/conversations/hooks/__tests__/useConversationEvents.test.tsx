import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const addListener = vi.fn();
vi.mock('@twilio/flex-sdk/actions/Conversation', () => ({
  AddConversationEventListener: (cb: (e: unknown) => void) => { addListener(cb); return () => {}; },
}));
import { useConversationEvents } from '../useConversationEvents';

beforeEach(() => addListener.mockReset());

describe('useConversationEvents', () => {
  it('registers a conversation event listener on mount', () => {
    renderHook(() => useConversationEvents());
    expect(addListener).toHaveBeenCalledOnce();
  });
});
