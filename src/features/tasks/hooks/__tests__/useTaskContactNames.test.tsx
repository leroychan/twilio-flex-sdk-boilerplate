import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const getConversationBySid = vi.fn();
vi.mock('@/lib/flex/actions/Conversation', () => ({
  getConversationBySid: (sid: string) => getConversationBySid(sid),
}));

import { useTaskContactNames } from '../useTaskContactNames';
import { useFlexStore } from '@/store';
import type { TaskView } from '@/store/slices/tasks';

const chatTask: TaskView = {
  reservationSid: 'WR1',
  taskSid: 'WT1',
  taskChannelUniqueName: 'chat',
  attributes: { channelType: 'web', conversationSid: 'CH1', customerName: 'FX' + '0'.repeat(32) },
  status: 'accepted',
};

describe('useTaskContactNames', () => {
  beforeEach(() => {
    getConversationBySid.mockReset();
    useFlexStore.setState({ tasks: [] });
  });

  it('resolves the pre-engagement name from the conversation and stores it on the task', async () => {
    getConversationBySid.mockResolvedValue({
      sid: 'CH1',
      conversation: { attributes: { pre_engagement_data: { friendlyName: 'Leroy' } } },
    });
    useFlexStore.setState({ tasks: [chatTask] });

    renderHook(() => useTaskContactNames());

    await waitFor(() =>
      expect(useFlexStore.getState().tasks.find((t) => t.taskSid === 'WT1')?.contactName).toBe('Leroy'),
    );
    expect(getConversationBySid).toHaveBeenCalledWith('CH1');
  });

  it('does not fetch for voice tasks or tasks without a conversationSid', async () => {
    useFlexStore.setState({
      tasks: [
        { ...chatTask, taskChannelUniqueName: 'voice', attributes: { from: '+1555' } },
        { ...chatTask, taskSid: 'WT2', reservationSid: 'WR2', attributes: { channelType: 'web' } },
      ],
    });
    renderHook(() => useTaskContactNames());
    // Give any stray effect a tick to run.
    await Promise.resolve();
    expect(getConversationBySid).not.toHaveBeenCalled();
  });

  it('does not re-fetch a task it has already attempted', async () => {
    getConversationBySid.mockResolvedValue({ sid: 'CH1', conversation: { attributes: {} } });
    useFlexStore.setState({ tasks: [chatTask] });
    const { rerender } = renderHook(() => useTaskContactNames());
    await waitFor(() => expect(getConversationBySid).toHaveBeenCalledTimes(1));
    // A store change (e.g. status) re-runs the effect but must not re-fetch.
    useFlexStore.getState().updateTaskStatus('WR1', 'wrapping');
    rerender();
    await Promise.resolve();
    expect(getConversationBySid).toHaveBeenCalledTimes(1);
  });
});
