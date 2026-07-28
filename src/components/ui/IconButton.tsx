import { ButtonHTMLAttributes } from 'react';

type IconVariant = 'neutral' | 'active' | 'primary' | 'danger' | 'success';

const variants: Record<IconVariant, string> = {
  neutral: 'bg-surface-2 text-text border border-border hover:bg-surface',
  active: 'bg-primary text-white border border-transparent hover:bg-primary-hover',
  primary: 'bg-primary text-white border border-transparent hover:bg-primary-hover',
  danger: 'bg-danger text-white border border-transparent hover:opacity-90',
  success: 'bg-success text-white border border-transparent hover:opacity-90',
};

/**
 * Circular icon-only control (call controls, top-bar affordances). `label` is
 * mandatory — it becomes both the accessible name and the tooltip, so every
 * icon button stays screen-reader friendly and testable by role+name.
 */
export function IconButton({
  label,
  variant = 'neutral',
  size = 44,
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  variant?: IconVariant;
  size?: number;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      style={{ width: size, height: size }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full shadow-sm outline-none transition-transform duration-150 hover:scale-105 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface active:scale-95 disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
