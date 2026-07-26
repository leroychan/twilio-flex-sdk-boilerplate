'use client';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import type { SupervisorMode } from '@/store/slices/supervisor';

const MODES: SupervisorMode[] = ['monitor', 'coach', 'barge'];

export function MonitorControls({
  disabled = false,
  activeMode,
  onStart,
  onStop,
}: {
  disabled?: boolean;
  activeMode: SupervisorMode | null;
  onStart: (mode: SupervisorMode) => void;
  onStop: () => void;
}) {
  const t = useTranslations('supervisor');
  return (
    <div className="flex flex-wrap gap-2">
      {MODES.map((mode) => (
        <Button
          key={mode}
          variant={activeMode === mode ? 'primary' : 'secondary'}
          aria-pressed={activeMode === mode}
          disabled={disabled}
          onClick={() => onStart(mode)}
        >
          {t(`controls.${mode}`)}
        </Button>
      ))}
      <Button variant="danger" disabled={disabled || activeMode === null} onClick={onStop}>
        {t('controls.stop')}
      </Button>
    </div>
  );
}
