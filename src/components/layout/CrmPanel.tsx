'use client';

import { Contact } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PluginSlot } from '@/components/plugins/PluginSlot';

/**
 * Right-column CRM surface. Ships with an empty state and a `side-panel` plugin
 * slot so a CRM integration can render customer context here without touching the
 * shell.
 */
export function CrmPanel() {
  const t = useTranslations('crm');
  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <PluginSlot name="side-panel" />
      <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-6 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Contact className="h-6 w-6" aria-hidden />
        </span>
        <p className="font-semibold text-text">{t('title')}</p>
        <p className="text-sm text-muted">{t('subtitle')}</p>
      </div>
    </div>
  );
}
