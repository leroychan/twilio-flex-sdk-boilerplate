'use client';

import { useEffect, useId, useRef, useState } from 'react';

/**
 * Minimal popover: a trigger the caller renders (given open state + a toggle)
 * and a panel anchored to the top-right of the trigger. Closes on outside click
 * or Escape. No portal — it renders in-flow inside a `relative` wrapper, which
 * is all the top-bar affordances need.
 */
export function Popover({
  trigger,
  children,
  align = 'right',
  className = '',
}: {
  trigger: (state: { open: boolean; toggle: () => void; id: string }) => React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((v) => !v), id })}
      {open && (
        <div
          id={id}
          role="dialog"
          className={`absolute top-[calc(100%+0.5rem)] z-50 min-w-64 rounded-xl border border-border bg-surface p-3 shadow-lg ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${className}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
