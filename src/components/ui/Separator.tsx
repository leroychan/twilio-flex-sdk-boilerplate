/**
 * Thin vertical rule for grouping items in a horizontal toolbar (e.g. the top
 * bar). Decorative, so it is hidden from assistive tech.
 */
export function Separator({ className = '' }: { className?: string }) {
  return <span aria-hidden className={`mx-1 h-6 w-px shrink-0 bg-border ${className}`} />;
}
