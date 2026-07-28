'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useFlexStore } from '@/store';
import { useLiveTranscript } from '../hooks/useLiveTranscript';

export function TranscriptPanel() {
  const t = useTranslations('transcript');
  const callSid = useFlexStore((s) => s.call.callSid);
  const { entries, status } = useLiveTranscript(callSid);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [entries.length]);

  const speakerLabel = (role: string, speaker: string) =>
    role === 'agent' ? t('speaker.agent') : role === 'customer' ? t('speaker.customer') : speaker || t('speaker.other');

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-text">{t('title')}</h3>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {status === 'idle' ? (
          <p className="text-sm text-muted">{t('empty.noCall')}</p>
        ) : status === 'not_configured' ? (
          <div className="flex flex-col gap-1">
            <p className="text-sm text-muted">{t('empty.notConfigured')}</p>
            <p className="text-xs text-muted">{t('empty.notConfiguredHint')}</p>
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted">{t('empty.waiting')}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {entries.map((e) => (
              <li key={e.id} className={`flex flex-col ${e.role === 'agent' ? 'items-end text-right' : 'items-start'}`}>
                <span className="text-xs font-medium text-muted">{speakerLabel(e.role, e.speaker)}</span>
                <span className="inline-block max-w-[85%] rounded-lg bg-surface-2 px-3 py-1.5 text-sm text-text">
                  {e.text}
                </span>
              </li>
            ))}
            <div ref={endRef} />
          </ul>
        )}
      </div>
    </div>
  );
}
