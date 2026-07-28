'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { MessagesSquare } from 'lucide-react';
import { useFlexStore } from '@/store';
import { useLiveTranscript } from '../hooks/useLiveTranscript';
import { TranscriptionSettingsMenu } from './TranscriptionSettingsMenu';

/** Localized wall-clock time for a bubble, tolerant of empty/invalid timestamps. */
function formatTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function TranscriptPanel() {
  const t = useTranslations('transcript');
  const callSid = useFlexStore((s) => s.call.callSid);
  const { entries, status } = useLiveTranscript(callSid);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [entries.length]);

  const speakerLabel = (role: string, speaker: string) =>
    role === 'agent' ? t('speaker.agent') : role === 'customer' ? t('speaker.customer') : speaker || t('speaker.other');

  return (
    <div className="flex h-full flex-col">
      {/* In-panel header: transcription settings (left) + live indicator (right). */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border px-3">
        <TranscriptionSettingsMenu />
        <div className="flex items-center gap-2">
          {status === 'listening' ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-success">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-success/70 animate-status-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              {t('status.live')}
            </span>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {status === 'idle' ? (
          <EmptyState icon={<MessagesSquare className="h-6 w-6" aria-hidden />} title={t('empty.noCall')} />
        ) : status === 'not_configured' ? (
          <EmptyState
            icon={<MessagesSquare className="h-6 w-6" aria-hidden />}
            title={t('empty.notConfigured')}
            hint={t('empty.notConfiguredHint')}
          />
        ) : entries.length === 0 ? (
          <EmptyState
            icon={
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full rounded-full bg-primary/60 animate-status-ping" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
              </span>
            }
            title={t('empty.waiting')}
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {entries.map((e) => {
              const isAgent = e.role === 'agent';
              const label = speakerLabel(e.role, e.speaker);
              const time = formatTime(e.at);
              return (
                <li key={e.id} className={`flex flex-col gap-1 ${isAgent ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-1.5 px-1 text-[11px] leading-none text-muted">
                    <span className="font-medium text-text/70">{label}</span>
                    {time ? (
                      <>
                        <span aria-hidden>·</span>
                        <time dateTime={e.at}>{time}</time>
                      </>
                    ) : null}
                  </div>
                  <div className={`flex max-w-[88%] items-end gap-2 ${isAgent ? 'flex-row-reverse' : 'flex-row'}`}>
                    <span
                      aria-hidden
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${
                        isAgent
                          ? 'bg-primary text-white'
                          : e.role === 'customer'
                            ? 'bg-surface-2 text-text ring-1 ring-border'
                            : 'bg-surface-2 text-muted ring-1 ring-border'
                      }`}
                    >
                      {label.charAt(0).toUpperCase()}
                    </span>
                    <span
                      className={`animate-bubble-in inline-block whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                        isAgent
                          ? 'rounded-br-sm bg-primary text-white'
                          : 'rounded-bl-sm border border-border bg-surface text-text'
                      }`}
                    >
                      {e.text}
                    </span>
                  </div>
                </li>
              );
            })}
            <div ref={endRef} />
          </ul>
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon, title, hint }: { icon: React.ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-muted">{icon}</div>
      <p className="text-sm text-muted">{title}</p>
      {hint ? <p className="max-w-[16rem] text-xs text-muted/80">{hint}</p> : null}
    </div>
  );
}
