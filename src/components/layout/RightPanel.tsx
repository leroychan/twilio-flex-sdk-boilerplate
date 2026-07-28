'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useFlexStore } from '@/store';
import { Tabs, type TabItem } from '@/components/ui/Tabs';
import { CrmPanel } from './CrmPanel';
import { TranscriptPanel } from '@/features/transcript';

type RightTab = 'transcript' | 'crm';

/**
 * Right column: a tabbed Transcript / CRM panel. Transcript is auto-selected while
 * a call is active (CRM otherwise); the user can override by clicking. Both panels
 * stay mounted (hidden) so the live transcript subscription survives tab switches.
 */
export function RightPanel() {
  const t = useTranslations('transcript');
  const callSid = useFlexStore((s) => s.call.callSid);
  const [manual, setManual] = useState<RightTab | null>(null);

  const active: RightTab = manual ?? (callSid ? 'transcript' : 'crm');

  const tabs: TabItem[] = useMemo(
    () => [
      { id: 'transcript', label: t('tabs.transcript') },
      { id: 'crm', label: t('tabs.crm') },
    ],
    [t],
  );

  return (
    <div className="flex h-full flex-col">
      <Tabs tabs={tabs} activeId={active} onChange={(id) => setManual(id as RightTab)} aria-label={t('title')} />
      <div className="min-h-0 flex-1">
        <div className={active === 'transcript' ? 'h-full' : 'hidden'}>
          <TranscriptPanel />
        </div>
        <div className={active === 'crm' ? 'h-full' : 'hidden'}>
          <CrmPanel />
        </div>
      </div>
    </div>
  );
}
