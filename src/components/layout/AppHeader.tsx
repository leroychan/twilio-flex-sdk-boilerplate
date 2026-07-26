import { Logo } from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { LocaleSwitcher } from '@/components/i18n/LocaleSwitcher';

export function AppHeader() {
  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
      <Logo />
      <div className="flex items-center gap-3">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>
    </header>
  );
}
