'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Minimal popover: a trigger the caller renders (given open state + a toggle)
 * and a panel anchored below the trigger. Closes on outside click or Escape.
 *
 * By default the panel renders in-flow inside a `relative` wrapper, which is all
 * the top-bar affordances need. When the trigger lives inside a scroll/overflow
 * container (e.g. a resizable column) that would clip an in-flow panel, pass
 * `portal` to render it into `document.body` with fixed positioning instead.
 */
export function Popover({
  trigger,
  children,
  align = 'right',
  className = '',
  portal = false,
}: {
  trigger: (state: { open: boolean; toggle: () => void; id: string }) => React.ReactNode;
  /** Panel content. Pass a function to receive a `close()` (e.g. menu items that dismiss on click). */
  children: React.ReactNode | ((state: { close: () => void }) => React.ReactNode);
  align?: 'left' | 'right';
  className?: string;
  portal?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left?: number; right?: number }>({ top: 0 });
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
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

  // For the portal variant, measure the trigger and position the fixed panel
  // below it, re-measuring on scroll/resize while open.
  useLayoutEffect(() => {
    if (!portal || !open) return;
    const measure = () => {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      const top = rect.bottom + 8;
      setPos(align === 'right' ? { top, right: window.innerWidth - rect.right } : { top, left: rect.left });
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [portal, open, align]);

  const panelClass = `z-50 min-w-64 rounded-xl border border-border bg-surface p-3 shadow-lg ${className}`;
  const body = typeof children === 'function' ? children({ close: () => setOpen(false) }) : children;

  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((v) => !v), id })}
      {open &&
        (portal ? (
          createPortal(
            <div
              ref={panelRef}
              id={id}
              role="dialog"
              style={{ position: 'fixed', top: pos.top, left: pos.left, right: pos.right }}
              className={panelClass}
            >
              {body}
            </div>,
            document.body,
          )
        ) : (
          <div
            ref={panelRef}
            id={id}
            role="dialog"
            className={`absolute top-[calc(100%+0.5rem)] ${align === 'right' ? 'right-0' : 'left-0'} ${panelClass}`}
          >
            {body}
          </div>
        ))}
    </div>
  );
}
