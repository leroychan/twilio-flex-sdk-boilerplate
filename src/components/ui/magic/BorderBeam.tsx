/**
 * Magic UI — BorderBeam. Renders a traveling light along the border of its
 * rounded parent. Drop it inside a `relative` container; it paints an animated
 * conic-gradient ring (see `.mui-border-beam` in globals.css) and never
 * intercepts pointer events. Purely decorative, so it is aria-hidden.
 */
export function BorderBeam({
  durationSeconds = 6,
  widthPx = 1.5,
  className = '',
}: {
  durationSeconds?: number;
  widthPx?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`mui-border-beam ${className}`}
      style={
        {
          '--beam-duration': `${durationSeconds}s`,
          '--beam-width': `${widthPx}px`,
        } as React.CSSProperties
      }
    />
  );
}
