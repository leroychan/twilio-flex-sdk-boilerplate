import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const { getTaskParticipants, getConversationsUser } = vi.hoisted(() => ({
  getTaskParticipants: vi.fn(),
  getConversationsUser: vi.fn(),
}));
vi.mock('@/lib/flex/actions/Task', () => ({ getTaskParticipants }));
vi.mock('@/lib/flex/actions/Conversation', () => ({ getConversationsUser }));

import { useCustomerPresence } from '../useCustomerPresence';

function makeUser(isOnline: boolean) {
  const listeners: Record<string, () => void> = {};
  return {
    isOnline,
    on: (e: string, l: () => void) => {
      listeners[e] = l;
    },
    removeListener: vi.fn(),
    emit: (e: string) => listeners[e]?.(),
    setOnline(v: boolean) {
      (this as { isOnline: boolean }).isOnline = v;
    },
  };
}

describe('useCustomerPresence', () => {
  beforeEach(() => {
    getTaskParticipants.mockReset();
    getConversationsUser.mockReset();
  });

  it('resolves the customer identity and returns online status', async () => {
    getTaskParticipants.mockResolvedValue([
      { type: 'agent', participantSid: 'PA1' },
      { type: 'customer', participantSid: 'PC1', mediaProperties: { identity: 'cust_1' } },
    ]);
    getConversationsUser.mockResolvedValue(makeUser(true));

    const { result } = renderHook(() => useCustomerPresence('WT1'));
    await waitFor(() => expect(result.current).toBe(true));
    expect(getConversationsUser).toHaveBeenCalledWith('cust_1');
  });

  it('reacts to the user "updated" event', async () => {
    getTaskParticipants.mockResolvedValue([
      { type: 'customer', participantSid: 'PC1', mediaProperties: { identity: 'cust_1' } },
    ]);
    const user = makeUser(false);
    getConversationsUser.mockResolvedValue(user);

    const { result } = renderHook(() => useCustomerPresence('WT1'));
    await waitFor(() => expect(result.current).toBe(false));

    act(() => {
      user.setOnline(true);
      user.emit('updated');
    });
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('returns null when there is no customer participant (e.g. voice)', async () => {
    getTaskParticipants.mockResolvedValue([{ type: 'agent', participantSid: 'PA1' }]);
    const { result } = renderHook(() => useCustomerPresence('WT1'));
    // allow the async effect to settle
    await new Promise((r) => setTimeout(r, 10));
    expect(result.current).toBeNull();
    expect(getConversationsUser).not.toHaveBeenCalled();
  });

  it('no-ops without a taskSid', () => {
    const { result } = renderHook(() => useCustomerPresence(null));
    expect(result.current).toBeNull();
    expect(getTaskParticipants).not.toHaveBeenCalled();
  });
});
