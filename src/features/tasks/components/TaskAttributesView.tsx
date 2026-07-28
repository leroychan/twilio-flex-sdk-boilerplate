'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Braces, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

/** Readable render of a task's attributes — the "Info" tab. */
export function TaskAttributesView({ attributes }: { attributes: Record<string, unknown> }) {
  const t = useTranslations('tasks');
  const [jsonOpen, setJsonOpen] = useState(false);
  const entries = Object.entries(attributes ?? {});

  if (entries.length === 0) {
    return <p className="p-4 text-sm text-muted">{t('info.empty')}</p>;
  }

  return (
    <div>
      <div className="flex justify-end border-b border-border px-4 py-2">
        <button
          type="button"
          onClick={() => setJsonOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-surface-2"
        >
          <Braces className="h-3.5 w-3.5" aria-hidden />
          {t('info.viewJson')}
        </button>
      </div>

      <dl className="divide-y divide-border">
        {entries.map(([key, value]) => {
          const isScalar = value === null || typeof value !== 'object';
          return (
            <div key={key} className="px-4 py-2.5">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted">{key}</dt>
              <dd className="mt-0.5 text-sm text-text">
                {isScalar ? (
                  String(value)
                ) : (
                  <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs">
                    {JSON.stringify(value, null, 2)}
                  </pre>
                )}
              </dd>
            </div>
          );
        })}
      </dl>

      {jsonOpen && <JsonPayloadModal attributes={attributes} onClose={() => setJsonOpen(false)} />}
    </div>
  );
}

/** Full-payload viewer: the entire attributes object, pretty-printed, with copy. */
function JsonPayloadModal({
  attributes,
  onClose,
}: {
  attributes: Record<string, unknown>;
  onClose: () => void;
}) {
  const t = useTranslations('tasks');
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(attributes, null, 2);

  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(json);
      setCopied(true);
    } catch {
      // Clipboard may be unavailable (insecure context) — no-op.
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('info.payloadTitle')}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-lg border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-semibold text-text">{t('info.payloadTitle')}</h2>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={copy}>
              {copied ? t('info.copied') : t('info.copy')}
            </Button>
            <button
              type="button"
              aria-label={t('info.close')}
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-text"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>
        <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-xs text-text">
          {json}
        </pre>
      </div>
    </div>
  );
}
