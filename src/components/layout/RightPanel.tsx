'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useFlexStore } from '@/store';
import { Tabs, type TabItem } from '@/components/ui/Tabs';
import { CrmPanel } from './CrmPanel';
import { TranscriptPanel } from '@/features/transcript';

type RightTab = 'transcript' | 'crm';

/**
 * Right column: a tabbed Transcript / CRM panel. The Transcript tab is shown only
 * while a call is active — mirroring the middle-column CallPanel, which appears on
 * a `connected`/`onHold` call — and is auto-selected then (CRM otherwise); the user
 * can override by clicking. Both panels stay mounted (hidden) during a call so the
 * live transcript subscription survives tab switches.
 */
export function RightPanel() {
  const t = useTranslations('transcript');
  const callStatus = useFlexStore((s) => s.call.status);
  const [manual, setManual] = useState<RightTab | null>(null);

  // An "active call" matches the CallPanel gate (connected or on hold).
  const callActive = callStatus === 'connected' || callStatus === 'onHold';

  const tabs: TabItem[] = useMemo(
    () => [
      ...(callActive ? [{ id: 'transcript', label: t('tabs.transcript') }] : []),
      { id: 'crm', label: t('tabs.crm') },
    ],
    [callActive, t],
  );

  // Keep the manual override only while it points at a still-present tab.
  const active: RightTab =
    manual && tabs.some((tab) => tab.id === manual) ? manual : callActive ? 'transcript' : 'crm';

  return (
    <div className="flex h-full flex-col">
      <Tabs tabs={tabs} activeId={active} onChange={(id) => setManual(id as RightTab)} aria-label={t('title')} />
      <div className="min-h-0 flex-1">
        {callActive && (
          <div className={active === 'transcript' ? 'h-full' : 'hidden'}>
            <TranscriptPanel />
          </div>
        )}
        <div className={active === 'crm' ? 'h-full' : 'hidden'}>
          <CrmPanel />
        </div>
      </div>
    </div>
  );
}
