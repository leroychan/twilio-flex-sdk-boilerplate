'use client';

import { Settings2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Popover } from '@/components/ui/Popover';
import { IconButton } from '@/components/ui/IconButton';
import { useFlexStore } from '@/store';

const fieldClass =
  'w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';

const ENGINES = ['deepgram', 'google'];
// Deepgram Nova models (Twilio `speechModel` when engine === 'deepgram').
const MODELS = ['nova-3', 'nova-2', 'nova-3-medical'];

// Languages supported by Deepgram Nova-3.
// https://developers.deepgram.com/docs/models-languages-overview#nova-3
const LANGUAGES: Array<{ code: string; name: string }> = [
  { code: 'multi', name: 'Multilingual' },
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'en-AU', name: 'English (Australia)' },
  { code: 'en-IN', name: 'English (India)' },
  { code: 'en-NZ', name: 'English (New Zealand)' },
  { code: 'es', name: 'Spanish' },
  { code: 'es-419', name: 'Spanish (Latin America)' },
  { code: 'fr', name: 'French' },
  { code: 'fr-CA', name: 'French (Canada)' },
  { code: 'de', name: 'German' },
  { code: 'de-CH', name: 'German (Switzerland)' },
  { code: 'nl', name: 'Dutch' },
  { code: 'nl-BE', name: 'Flemish' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)' },
  { code: 'pt-PT', name: 'Portuguese (Portugal)' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese (Mandarin, Simplified)' },
  { code: 'zh-TW', name: 'Chinese (Mandarin, Traditional)' },
  { code: 'zh-HK', name: 'Chinese (Cantonese)' },
  { code: 'ru', name: 'Russian' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'pl', name: 'Polish' },
  { code: 'tr', name: 'Turkish' },
  { code: 'sv', name: 'Swedish' },
  { code: 'da', name: 'Danish' },
  { code: 'no', name: 'Norwegian' },
  { code: 'fi', name: 'Finnish' },
  { code: 'el', name: 'Greek' },
  { code: 'cs', name: 'Czech' },
  { code: 'sk', name: 'Slovak' },
  { code: 'ro', name: 'Romanian' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'bg', name: 'Bulgarian' },
  { code: 'hr', name: 'Croatian' },
  { code: 'sr', name: 'Serbian' },
  { code: 'sl', name: 'Slovenian' },
  { code: 'et', name: 'Estonian' },
  { code: 'lv', name: 'Latvian' },
  { code: 'lt', name: 'Lithuanian' },
  { code: 'id', name: 'Indonesian' },
  { code: 'ms', name: 'Malay' },
  { code: 'tl', name: 'Tagalog' },
  { code: 'th', name: 'Thai' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'he', name: 'Hebrew' },
  { code: 'fa', name: 'Persian' },
  { code: 'ur', name: 'Urdu' },
  { code: 'bn', name: 'Bengali' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
  { code: 'kn', name: 'Kannada' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'mr', name: 'Marathi' },
  { code: 'ca', name: 'Catalan' },
  { code: 'mk', name: 'Macedonian' },
  { code: 'be', name: 'Belarusian' },
  { code: 'bs', name: 'Bosnian' },
];

export function TranscriptionSettingsMenu() {
  const t = useTranslations('transcript');
  const s = useFlexStore((st) => st.transcription);
  const update = useFlexStore((st) => st.setTranscriptionSettings);

  return (
    <Popover
      portal
      align="left"
      className="max-h-[calc(100vh-6rem)] overflow-y-auto"
      trigger={({ toggle, open, id }) => (
        <IconButton label={t('settings.title')} onClick={toggle} aria-expanded={open} aria-controls={id} size={32}>
          <Settings2 className="h-4 w-4" aria-hidden />
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
            {LANGUAGES.map((l) => (<option key={l.code} value={l.code}>{`${l.name} (${l.code})`}</option>))}
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
          <select aria-label={t('settings.speechModel')} className={fieldClass} value={s.speechModel}
            onChange={(e) => update({ speechModel: e.target.value })}>
            {MODELS.map((m) => (<option key={m} value={m}>{m}</option>))}
          </select>
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
