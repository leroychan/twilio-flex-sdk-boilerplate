'use client';

const DIGITS: Array<{ d: string; sub: string }> = [
  { d: '1', sub: '' },
  { d: '2', sub: 'ABC' },
  { d: '3', sub: 'DEF' },
  { d: '4', sub: 'GHI' },
  { d: '5', sub: 'JKL' },
  { d: '6', sub: 'MNO' },
  { d: '7', sub: 'PQRS' },
  { d: '8', sub: 'TUV' },
  { d: '9', sub: 'WXYZ' },
  { d: '*', sub: '' },
  { d: '0', sub: '+' },
  { d: '#', sub: '' },
];

export function Dialpad({ onDigit }: { onDigit: (digit: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {DIGITS.map(({ d, sub }) => (
        <button
          key={d}
          type="button"
          aria-label={d}
          onClick={() => onDigit(d)}
          className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface-2 py-2.5 text-text shadow-sm transition-transform hover:scale-105 hover:bg-surface active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="text-lg font-semibold leading-none">{d}</span>
          <span className="mt-0.5 h-3 text-[10px] font-medium tracking-[0.15em] text-muted">
            {sub}
          </span>
        </button>
      ))}
    </div>
  );
}
