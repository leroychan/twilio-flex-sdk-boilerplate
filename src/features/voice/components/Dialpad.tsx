'use client';
import { Button } from '@/components/ui/Button';

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

export function Dialpad({ onDigit }: { onDigit: (digit: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {DIGITS.map((d) => (
        <Button key={d} variant="secondary" onClick={() => onDigit(d)} aria-label={d}>{d}</Button>
      ))}
    </div>
  );
}
