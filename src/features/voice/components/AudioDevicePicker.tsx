'use client';
import { useTranslations } from 'next-intl';
import { getVoiceDevice } from '../lib/device';

export function AudioDevicePicker() {
  const t = useTranslations('voice');
  const device = getVoiceDevice();
  const audio = device?.audio;
  if (!audio) return <p className="text-sm text-muted">{t('devices')}: —</p>;

  const inputs = Array.from(audio.availableInputDevices?.entries() ?? []);
  const outputs = Array.from(audio.availableOutputDevices?.entries() ?? []);
  const select = 'rounded-md border border-border bg-surface px-2 py-1 text-sm text-text';

  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-sm text-muted">
        {t('microphone')}
        <select aria-label={t('microphone')} className={select} onChange={(e) => audio.setInputDevice(e.target.value)}>
          {inputs.map(([id, info]) => <option key={id} value={id}>{info.label || id}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm text-muted">
        {t('speaker')}
        <select aria-label={t('speaker')} className={select} onChange={(e) => audio.speakerDevices?.set(e.target.value)}>
          {outputs.map(([id, info]) => <option key={id} value={id}>{info.label || id}</option>)}
        </select>
      </label>
    </div>
  );
}
