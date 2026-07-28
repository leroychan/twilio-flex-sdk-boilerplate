import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const { getConversationByTask } = vi.hoisted(() => ({ getConversationByTask: vi.fn() }));
vi.mock('@/lib/flex/actions/Conversation', () => ({ getConversationByTask }));

import { useConversation } from '../useConversation';
import { useFlexStore } from '@/store';
import { getConversationHandle, resetRegistry } from '@/lib/flex/registry';

function makeConv() {
  const listeners: Record<string, (m: unknown) => void> = {};
  return {
    sid: 'CH1',
    sendMessage: vi.fn().mockResolvedValue(1),
    sendTyping: vi.fn().mockResolvedValue(undefined),
    getMessages: vi.fn().mockResolvedValue({
      items: [{ sid: 'IM1', author: 'cust', body: 'hello', dateCreated: new Date('2026-07-27T03:00:00Z') }],
    }),
    conversation: {
      friendlyName: 'Web Chat',
      on: (e: string, l: (m: unknown) => void) => {
        listeners[e] = l;
      },
      removeListener: vi.fn(),
      emit: (e: string, m: unknown) => listeners[e]?.(m),
    },
  };
}

describe('useConversation', () => {
  beforeEach(() => {
    getConversationByTask.mockReset();
    resetRegistry();
    useFlexStore.setState({ conversations: {}, tasks: [] });
  });

  it('fetches, registers the handle, and hydrates history into the store', async () => {
    const conv = makeConv();
    getConversationByTask.mockResolvedValue(conv);

    renderHook(() => useConversation('WT1'));

    await waitFor(() => {
      expect(useFlexStore.getState().conversations.CH1).toBeDefined();
    });
    expect(getConversationByTask).toHaveBeenCalledWith('WT1');
    expect(getConversationHandle('WT1')).toBe(conv);
    expect(useFlexStore.getState().conversations.CH1?.friendlyName).toBe('Web Chat');
    expect(useFlexStore.getState().conversations.CH1?.messages).toHaveLength(1);
    expect(useFlexStore.getState().conversations.CH1?.messages[0]?.body).toBe('hello');
  });

  it('appends live messageAdded events (deduped by sid)', async () => {
    const conv = makeConv();
    getConversationByTask.mockResolvedValue(conv);
    renderHook(() => useConversation('WT1'));
    await waitFor(() => expect(useFlexStore.getState().conversations.CH1).toBeDefined());

    act(() => {
      conv.conversation.emit('messageAdded', {
        sid: 'IM2',
        author: 'cust',
        body: 'again',
        dateCreated: new Date('2026-07-27T03:01:00Z'),
      });
      // duplicate sid should be ignored
      conv.conversation.emit('messageAdded', { sid: 'IM2', author: 'cust', body: 'dup', dateCreated: new Date() });
    });
    expect(useFlexStore.getState().conversations.CH1?.messages).toHaveLength(2);
  });

  it('send() calls the registry handle sendMessage', async () => {
    const conv = makeConv();
    getConversationByTask.mockResolvedValue(conv);
    const { result } = renderHook(() => useConversation('WT1'));
    await waitFor(() => expect(getConversationHandle('WT1')).toBe(conv));

    await act(async () => {
      await result.current.send('hi there');
    });
    expect(conv.sendMessage).toHaveBeenCalledWith({ body: 'hi there' });
  });

  it('sendMedia() calls the registry handle sendMessage with attachedFiles', async () => {
    const conv = makeConv();
    getConversationByTask.mockResolvedValue(conv);
    const { result } = renderHook(() => useConversation('WT1'));
    await waitFor(() => expect(getConversationHandle('WT1')).toBe(conv));

    const file = new File(['data'], 'photo.png', { type: 'image/png' });
    await act(async () => {
      await result.current.sendMedia(file);
    });
    expect(conv.sendMessage).toHaveBeenCalledWith({ attachedFiles: [file], body: '' });
  });

  it('sendEmail() sends an html body with subject and content type', async () => {
    const conv = makeConv();
    getConversationByTask.mockResolvedValue(conv);
    const { result } = renderHook(() => useConversation('WT1'));
    await waitFor(() => expect(getConversationHandle('WT1')).toBe(conv));

    await act(async () => {
      await result.current.sendEmail('<p>hi</p>', 'Re: Order');
    });
    expect(conv.sendMessage).toHaveBeenCalledWith({
      htmlBody: '<p>hi</p>',
      subject: 'Re: Order',
      contentType: 'text/html',
    });
  });

  it('resolves the email html body url for email tasks', async () => {
    useFlexStore.setState({
      tasks: [
        { reservationSid: 'WR1', taskSid: 'WT1', taskChannelUniqueName: 'email', attributes: {}, status: 'accepted' },
      ],
    });
    const conv = makeConv();
    conv.getMessages = vi.fn().mockResolvedValue({
      items: [
        {
          sid: 'IM9',
          author: 'cust',
          subject: 'Your order',
          dateCreated: new Date('2026-07-27T03:00:00Z'),
          getEmailBody: () => ({ getContentTemporaryUrl: () => Promise.resolve('https://media/body.html') }),
        },
      ],
    });
    getConversationByTask.mockResolvedValue(conv);

    renderHook(() => useConversation('WT1'));
    await waitFor(() =>
      expect(useFlexStore.getState().conversations.CH1?.messages[0]?.htmlUrl).toBe('https://media/body.html'),
    );
  });

  it('no-ops without a taskSid', () => {
    renderHook(() => useConversation(null));
    expect(getConversationByTask).not.toHaveBeenCalled();
  });
});
