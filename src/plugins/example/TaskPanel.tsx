'use client';

import { useTranslations } from 'next-intl';
import { usePluginStore } from '@/components/plugins/usePluginStore';

/**
 * Example task-side-panel — the template for a real plugin (e.g. a CRM panel).
 * Read task/session state via usePluginStore (never import `@/store`), and render
 * translated copy from the plugin's own i18n namespace ("example").
 * Disabled by default — see plugins/README.md to enable.
 */
export function ExampleTaskPanel() {
  const t = useTranslations('example');
  const sliceCount = usePluginStore((state) => Object.keys(state).length);
  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <h3 className="font-display text-lg font-bold text-text">{t('title')}</h3>
      <p className="mt-1 text-sm text-muted">{t('description')}</p>
      <p className="mt-2 text-xs text-muted">{t('storeKeys', { count: sliceCount })}</p>
    </section>
  );
}
