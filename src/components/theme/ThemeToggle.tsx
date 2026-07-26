'use client';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const current = mounted ? resolvedTheme : undefined;
  return (
    <button
      type="button"
      aria-label="toggle theme"
      data-theme={current}
      onClick={() => setTheme(current === 'dark' ? 'light' : 'dark')}
      className="rounded-md border border-border bg-surface px-3 py-2 text-text hover:bg-surface-2"
    >
      {current === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
