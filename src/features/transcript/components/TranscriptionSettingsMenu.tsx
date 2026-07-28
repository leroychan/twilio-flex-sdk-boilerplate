'use client';

import { Captions } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Popover } from '@/components/ui/Popover';
import { IconButton } from '@/components/ui/IconButton';
import { useFlexStore } from '@/store';

const fieldClass =
  'w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';

const LANGUAGES = ['en-US', 'en-GB', 'es-MX', 'es-ES', 'fr-FR', 'de-DE', 'pt-BR', 'ja-JP'];
const ENGINES = ['google', 'deepgram'];

export function TranscriptionSettingsMenu() {
  const t = useTranslations('transcript');
  const s = useFlexStore((st) => st.transcription);
  const update = useFlexStore((st) => st.setTranscriptionSettings);

  return (
    <Popover
      trigger={({ toggle, open, id }) => (
        <IconButton label={t('settings.title')} onClick={toggle} aria-expanded={open} aria-controls={id} size={40}>
          <Captions className="h-5 w-5" aria-hidden />
        </IconButton>
      )}
    >
      <div className="flex w-72 flex-col gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">{t('settings.title')}</span>

        <label className="flex items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={s.enabled}
            onChange={(e) => update({ enabled: e.target.checked })}
          />
          {t('settings.enabled')}
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          {t('settings.language')}
          <select aria-label={t('settings.language')} className={fieldClass} value={s.language}
            onChange={(e) => update({ language: e.target.value })}>
            {LANGUAGES.map((l) => (<option key={l} value={l}>{l}</option>))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          {t('settings.engine')}
          <select aria-label={t('settings.engine')} className={fieldClass} value={s.engine}
            onChange={(e) => update({ engine: e.target.value })}>
            {ENGINES.map((en) => (<option key={en} value={en}>{en}</option>))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          {t('settings.speechModel')}
          <input aria-label={t('settings.speechModel')} className={fieldClass} value={s.speechModel}
            onChange={(e) => update({ speechModel: e.target.value })} />
        </label>

        <label className="flex items-center gap-2 text-sm text-text">
          <input type="checkbox" checked={s.partialResults} onChange={(e) => update({ partialResults: e.target.checked })} />
          {t('settings.partialResults')}
        </label>
        <label className="flex items-center gap-2 text-sm text-text">
          <input type="checkbox" checked={s.profanityFilter} onChange={(e) => update({ profanityFilter: e.target.checked })} />
          {t('settings.profanityFilter')}
        </label>
        <label className="flex items-center gap-2 text-sm text-text">
          <input type="checkbox" checked={s.punctuation} onChange={(e) => update({ punctuation: e.target.checked })} />
          {t('settings.punctuation')}
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          {t('settings.hints')}
          <input aria-label={t('settings.hints')} className={fieldClass} value={s.hints}
            onChange={(e) => update({ hints: e.target.value })} />
        </label>
      </div>
    </Popover>
  );
}
