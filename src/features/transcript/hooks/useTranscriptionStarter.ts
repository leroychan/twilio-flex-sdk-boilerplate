'use client';

import { useEffect, useRef } from 'react';
import { useFlexStore } from '@/store';

/**
 * When a voice call connects (and transcription is enabled), start Real-Time
 * Transcription on that CallSid exactly once. Mounted in the desktop shell so it
 * runs regardless of which right-panel tab is visible. A 503 (not configured) is
 * ignored — the panel already shows its "not configured" state.
 */
export function useTranscriptionStarter(): void {
  const callSid = useFlexStore((s) => s.call.callSid);
  const status = useFlexStore((s) => s.call.status);
  const settings = useFlexStore((s) => s.transcription);
  const startedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!settings.enabled || !callSid) return;
    if (status !== 'connected' && status !== 'onHold') return;
    if (startedRef.current.has(callSid)) return;
    startedRef.current.add(callSid);

    void fetch('/api/transcription/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        callSid,
        language: settings.language,
        engine: settings.engine,
        speechModel: settings.speechModel,
        partialResults: settings.partialResults,
        profanityFilter: settings.profanityFilter,
        punctuation: settings.punctuation,
        hints: settings.hints,
      }),
    }).catch(() => {
      // best-effort; the panel reflects actual stream state
    });
  }, [callSid, status, settings]);
}
