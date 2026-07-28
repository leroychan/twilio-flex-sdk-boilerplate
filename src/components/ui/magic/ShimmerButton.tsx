import { ButtonHTMLAttributes } from 'react';

/**
 * Magic UI — ShimmerButton. A button with a rotating light band riding its
 * border and a soft highlight on press. Pure CSS (keyframes `shimmer-slide` +
 * `spin-around` in tailwind.config.ts); no animation library. Colors track the
 * brand tokens so it works in both themes.
 */
export function ShimmerButton({
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      style={
        {
          '--speed': '2.5s',
          '--cut': '0.05em',
          ...props.style,
        } as React.CSSProperties
      }
      className={`group relative z-0 flex cursor-pointer items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-lg border border-white/10 bg-primary px-4 py-2 text-sm font-semibold text-white transition-transform duration-300 hover:scale-[1.02] active:translate-y-px disabled:pointer-events-none disabled:opacity-50 ${className}`}
    >
      {/* traveling shimmer band */}
      <span className="absolute inset-0 -z-30 overflow-hidden [container-type:size] [border-radius:inherit] [mask:none]">
        <span className="absolute inset-0 h-[100cqh] animate-shimmer-slide [aspect-ratio:1] [border-radius:0] [mask:none]">
          <span className="absolute -inset-full w-auto rotate-0 animate-spin-around [background:conic-gradient(from_calc(270deg-(30deg*0.5)),transparent_0,white_30deg,transparent_60deg)] [translate:0_0]" />
        </span>
      </span>
      {children}
      {/* inner fill so the shimmer only shows at the edge */}
      <span className="absolute inset-[var(--cut)] -z-20 rounded-[inherit] bg-primary" />
      {/* subtle top highlight */}
      <span className="absolute inset-0 -z-10 rounded-[inherit] bg-gradient-to-b from-white/25 to-transparent opacity-40" />
    </button>
  );
}
