'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Slide-over drawer anchored to a screen edge, with a dimming overlay. Closes on
 * overlay click or Escape. Renders nothing when closed. Used for the supervisor
 * console so it overlays the desktop rather than competing for column space.
 */
export function Drawer({
  open,
  onClose,
  title,
  side = 'right',
  closeLabel,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  side?: 'left' | 'right';
  closeLabel: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label={closeLabel}
        onClick={onClose}
        className={`flex-1 bg-black/40 ${side === 'right' ? 'order-1' : 'order-2'}`}
      />
      <aside
        className={`flex h-full w-full max-w-md flex-col overflow-y-auto border-border bg-surface shadow-2xl ${
          side === 'right' ? 'order-2 border-l' : 'order-1 border-r'
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-display text-lg font-bold text-text">{title}</h2>
          <button
            type="button"
            aria-label={closeLabel}
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="flex-1">{children}</div>
      </aside>
    </div>
  );
}
