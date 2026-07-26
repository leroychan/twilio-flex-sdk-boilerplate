'use client';

import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { locales, type Locale } from '@/i18n/config';
import { setLocale } from '@/i18n/setLocale';

export function LocaleSwitcher() {
  const activeLocale = useLocale();
  const t = useTranslations('common');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value as Locale;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <select
      aria-label={t('localeSwitcher.label')}
      value={activeLocale}
      disabled={isPending}
      onChange={onChange}
      className="rounded-md border border-border bg-surface px-3 py-2 text-text hover:bg-surface-2 disabled:opacity-50"
    >
      {locales.map((locale) => (
        <option key={locale} value={locale}>
          {t(`localeSwitcher.locale.${locale}`)}
        </option>
      ))}
    </select>
  );
}
