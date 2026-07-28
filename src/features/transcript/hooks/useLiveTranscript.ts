'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { subscribeToStream } from '@/lib/sync/client';
import { toTranscriptEntry, type TranscriptEntry } from '../lib/transcriptMessage';
import type { SyncStreamMessage } from '@/lib/sync/types';

export type TranscriptStatus = 'idle' | 'not_configured' | 'listening';

export function useLiveTranscript(callSid: string | null): {
  entries: TranscriptEntry[];
  status: TranscriptStatus;
} {
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [status, setStatus] = useState<TranscriptStatus>('idle');
  const indexRef = useRef(0);

  useEffect(() => {
    if (!callSid) {
      setEntries([]);
      setStatus('idle');
      return;
    }
    let cancelled = false;
    indexRef.current = 0;
    setEntries([]);
    setStatus('listening');

    const handler = (msg: SyncStreamMessage) => {
      if (cancelled) return;
      const entry = toTranscriptEntry(msg, callSid, indexRef.current);
      if (!entry) return;
      indexRef.current += 1;
      setEntries((prev) => [...prev, entry]);
    };

    let unsubscribe: (() => void) | null = null;
    void subscribeToStream(`session-${callSid}`, handler).then((res) => {
      if (cancelled) {
        res.unsubscribe();
        return;
      }
      unsubscribe = res.unsubscribe;
      if (!res.configured) setStatus('not_configured');
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [callSid]);

  return useMemo(() => ({ entries, status }), [entries, status]);
}
