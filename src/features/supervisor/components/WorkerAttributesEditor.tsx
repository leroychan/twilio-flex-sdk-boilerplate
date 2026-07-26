'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';

export function WorkerAttributesEditor({
  attributes,
  onSave,
  busy = false,
}: {
  attributes: Record<string, unknown>;
  onSave: (attributes: Record<string, unknown>) => void;
  busy?: boolean;
}) {
  const t = useTranslations('supervisor');
  const [draft, setDraft] = useState(() => JSON.stringify(attributes, null, 2));
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    try {
      const parsed = JSON.parse(draft) as Record<string, unknown>;
      setError(null);
      onSave(parsed);
    } catch {
      setError(t('workers.invalidJson'));
    }
  };

  return (
    <div className="mt-2">
      <label htmlFor="worker-attributes" className="block text-xs font-medium text-muted">
        {t('workers.attributes')}
      </label>
      <textarea
        id="worker-attributes"
        aria-label={t('workers.attributes')}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        rows={4}
        className="mt-1 w-full rounded-md border border-border bg-surface p-2 font-mono text-xs text-text"
      />
      {error ? (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      ) : null}
      <Button variant="secondary" className="mt-2" onClick={handleSave} disabled={busy}>
        {t('workers.saveAttributes')}
      </Button>
    </div>
  );
}
