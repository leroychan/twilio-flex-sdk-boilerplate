import { Logo } from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export function AppHeader() {
  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
      <Logo />
      <ThemeToggle />
    </header>
  );
}
