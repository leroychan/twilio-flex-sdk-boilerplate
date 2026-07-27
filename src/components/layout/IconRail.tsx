'use client';

import { useTranslations } from 'next-intl';
import { Headset, Users, Grid3x3, Clock, type LucideIcon } from 'lucide-react';

export type DesktopView = 'desktop' | 'teams' | 'queues';

interface RailAction {
  key: string;
  labelKey: 'desktop' | 'teams' | 'dialpad' | 'queues';
  Icon: LucideIcon;
  view?: DesktopView; // absent => action button (dialpad)
}

const ACTIONS: RailAction[] = [
  { key: 'desktop', labelKey: 'desktop', Icon: Headset, view: 'desktop' },
  { key: 'teams', labelKey: 'teams', Icon: Users, view: 'teams' },
  { key: 'dialpad', labelKey: 'dialpad', Icon: Grid3x3 },
  { key: 'queues', labelKey: 'queues', Icon: Clock, view: 'queues' },
];

/**
 * Extreme-left icon rail (mirrors flex-template-builder's IconNav). Switches the
 * desktop view; the Dialpad entry opens the outbound modal instead of switching.
 * Teams is supervisor-gated.
 */
export function IconRail({
  activeView,
  onViewChange,
  onDialpad,
  showTeams,
}: {
  activeView: DesktopView;
  onViewChange: (view: DesktopView) => void;
  onDialpad: () => void;
  showTeams: boolean;
}) {
  const t = useTranslations('session');

  return (
    <nav
      aria-label={t('rail.label')}
      className="flex w-14 shrink-0 flex-col border-r border-border bg-surface py-2"
    >
      {ACTIONS.filter((a) => a.key !== 'teams' || showTeams).map(({ key, labelKey, Icon, view }) => {
        const isActive = view !== undefined && view === activeView;
        const label = t(`rail.${labelKey}`);
        return (
          <button
            key={key}
            type="button"
            title={label}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => (view ? onViewChange(view) : onDialpad())}
            className={`relative flex h-11 items-center justify-center transition-colors ${
              isActive
                ? 'bg-surface-2 text-primary'
                : 'text-muted hover:bg-surface-2 hover:text-text'
            }`}
          >
            {isActive && <span className="absolute inset-y-0 left-0 w-0.5 rounded-r bg-primary" />}
            <Icon className="h-5 w-5" aria-hidden />
          </button>
        );
      })}
    </nav>
  );
}
