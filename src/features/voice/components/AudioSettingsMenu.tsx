'use client';
import { Headphones, Mic, Volume2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Popover } from '@/components/ui/Popover';
import { IconButton } from '@/components/ui/IconButton';
import { useAudioDevices } from '../hooks/useAudioDevices';

const selectClass =
  'w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';

/**
 * Top-bar audio-device chooser. Device lists are enumerated on page load (see
 * useAudioDevices), so the selector is usable before any call; the chosen
 * input/output are remembered and applied to calls as they connect.
 */
export function AudioSettingsMenu() {
  const t = useTranslations('voice');
  const { inputs, outputs, selectedInput, selectedOutput, chooseInput, chooseOutput } =
    useAudioDevices();

  const empty = inputs.length === 0 && outputs.length === 0;

  return (
    <Popover
      trigger={({ toggle, open, id }) => (
        <IconButton
          label={t('audioSettings')}
          onClick={toggle}
          aria-expanded={open}
          aria-controls={id}
          size={40}
        >
          <Headphones className="h-5 w-5" aria-hidden />
        </IconButton>
      )}
    >
      <div className="flex flex-col gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          {t('devices')}
        </span>

        {empty ? (
          <p className="text-sm text-muted">{t('noAudioDevices')}</p>
        ) : (
          <>
            <label className="flex flex-col gap-1 text-sm text-muted">
              <span className="flex items-center gap-1.5 text-text">
                <Mic className="h-4 w-4 text-muted" aria-hidden />
                {t('microphone')}
              </span>
              <select
                aria-label={t('microphone')}
                className={selectClass}
                value={selectedInput ?? ''}
                onChange={(e) => chooseInput(e.target.value)}
              >
                {inputs.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label || d.id}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm text-muted">
              <span className="flex items-center gap-1.5 text-text">
                <Volume2 className="h-4 w-4 text-muted" aria-hidden />
                {t('speaker')}
              </span>
              <select
                aria-label={t('speaker')}
                className={selectClass}
                value={selectedOutput ?? ''}
                onChange={(e) => chooseOutput(e.target.value)}
              >
                {outputs.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label || d.id}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
      </div>
    </Popover>
  );
}
