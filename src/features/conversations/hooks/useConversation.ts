'use client';
import { useCallback, useEffect } from 'react';
import { getConversationByTask } from '@/lib/flex/actions/Conversation';
import {
  setConversationHandle,
  getConversationHandle,
  deleteConversationHandle,
} from '@/lib/flex/registry';
import { useFlexStore } from '@/store';
import { toMessageView, type SdkMessageLike } from '../messageView';

interface UnderlyingEmitter {
  on?: (event: string, listener: (m: unknown) => void) => void;
  removeListener?: (event: string, listener: (m: unknown) => void) => void;
  friendlyName?: string | null;
}
interface ConversationHandle {
  sid: string;
  conversation?: UnderlyingEmitter;
  sendMessage?: (opts: {
    body?: string;
    htmlBody?: string;
    subject?: string;
    contentType?: string;
    attachedFiles?: File[];
  }) => Promise<unknown>;
  sendTyping?: () => Promise<void>;
  getMessages?: () => Promise<{ items?: SdkMessageLike[] }>;
}

/**
 * Owns the live SDK Conversation for the selected task: fetches it, stores the
 * handle in the module registry, hydrates history, and subscribes to messageAdded
 * — pushing serializable view-models into the store. Returns send/typing helpers
 * bound to the registry handle. No-ops without a taskSid or live client.
 */
export function useConversation(taskSid: string | null): {
  send: (body: string) => Promise<void>;
  sendMedia: (file: File) => Promise<void>;
  sendEmail: (htmlBody: string, subject: string) => Promise<void>;
  notifyTyping: () => void;
} {
  const upsertConversation = useFlexStore((s) => s.upsertConversation);
  const addMessage = useFlexStore((s) => s.addMessage);
  const worker = useFlexStore((s) => s.worker);
  const selfIdentity = (worker as { friendlyName?: string } | null)?.friendlyName ?? '';

  useEffect(() => {
    if (!taskSid) return;
    let cancelled = false;
    let cleanupListener: (() => void) | undefined;

    void (async () => {
      try {
        const conv = (await getConversationByTask(taskSid)) as unknown as ConversationHandle;
        if (cancelled || !conv?.sid) return;
        setConversationHandle(taskSid, conv as never);

        const task = useFlexStore.getState().tasks.find((t) => t.taskSid === taskSid);
        const type = task?.taskChannelUniqueName === 'email' ? 'email' : 'chat';
        const friendlyName =
          conv.conversation?.friendlyName ??
          (task?.attributes.name as string | undefined) ??
          conv.sid;
        upsertConversation({ sid: conv.sid, taskSid, friendlyName, messages: [], type });

        // Ingest a message: build the view-model, resolve any attached-media
        // temporary URL (async, expiring), then push to the store (deduped by sid).
        const ingest = async (m: SdkMessageLike) => {
          const view = toMessageView(m, selfIdentity);
          const media = m.attachedMedia?.[0];
          if (view.media && media?.getContentTemporaryUrl) {
            try {
              const url = await media.getContentTemporaryUrl();
              if (url) view.media = { ...view.media, url };
            } catch {
              // ignore URL resolution failure; filename/contentType still render
            }
          }
          // Email bodies are rendered as HTML in a sandboxed iframe; resolve the
          // expiring temporary URL to the text/html body.
          if (type === 'email' && typeof m.getEmailBody === 'function') {
            try {
              const url = await m.getEmailBody('text/html')?.getContentTemporaryUrl?.();
              if (url) view.htmlUrl = url;
            } catch {
              // ignore; fall back to the plain-text body
            }
          }
          addMessage(conv.sid, view);
        };

        const page = await conv.getMessages?.();
        await Promise.all((page?.items ?? []).map(ingest));

        const listener = (m: unknown) => void ingest(m as SdkMessageLike);
        conv.conversation?.on?.('messageAdded', listener);
        cleanupListener = () => conv.conversation?.removeListener?.('messageAdded', listener);
      } catch {
        // Best-effort: requires a connected conversations session.
      }
    })();

    return () => {
      cancelled = true;
      cleanupListener?.();
      deleteConversationHandle(taskSid);
    };
  }, [taskSid, selfIdentity, upsertConversation, addMessage]);

  const send = useCallback(
    async (body: string) => {
      if (!taskSid) return;
      const conv = getConversationHandle(taskSid) as unknown as ConversationHandle | undefined;
      await conv?.sendMessage?.({ body });
    },
    [taskSid],
  );

  const sendMedia = useCallback(
    async (file: File) => {
      if (!taskSid) return;
      const conv = getConversationHandle(taskSid) as unknown as ConversationHandle | undefined;
      await conv?.sendMessage?.({ attachedFiles: [file], body: '' });
    },
    [taskSid],
  );

  const sendEmail = useCallback(
    async (htmlBody: string, subject: string) => {
      if (!taskSid) return;
      const conv = getConversationHandle(taskSid) as unknown as ConversationHandle | undefined;
      await conv?.sendMessage?.({ htmlBody, subject, contentType: 'text/html' });
    },
    [taskSid],
  );

  const notifyTyping = useCallback(() => {
    if (!taskSid) return;
    const conv = getConversationHandle(taskSid) as unknown as ConversationHandle | undefined;
    void conv?.sendTyping?.();
  }, [taskSid]);

  return { send, sendMedia, sendEmail, notifyTyping };
}
