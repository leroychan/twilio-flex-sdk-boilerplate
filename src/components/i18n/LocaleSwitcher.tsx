'use client';

import { useTransition } from 'react';
import { Globe, ChevronDown } from 'lucide-react';
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
    <div className="relative flex items-center gap-1.5 rounded-full border border-border bg-surface py-1.5 pl-3 pr-2 text-text shadow-sm">
      <Globe className="h-4 w-4 text-muted" aria-hidden />
      <select
        aria-label={t('localeSwitcher.label')}
        value={activeLocale}
        disabled={isPending}
        onChange={onChange}
        className="appearance-none bg-transparent pr-5 text-sm font-medium text-text focus-visible:outline-none disabled:opacity-50"
      >
        {locales.map((locale) => (
          <option key={locale} value={locale}>
            {t(`localeSwitcher.locale.${locale}`)}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 h-4 w-4 text-muted" aria-hidden />
    </div>
  );
}
