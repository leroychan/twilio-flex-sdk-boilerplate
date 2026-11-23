import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card } from '@/components/ui/Card';

const STEPS = [
  { key: 'install', command: 'npm install' },
  { key: 'configure', command: 'cp .env.example .env.local' },
  { key: 'run', command: 'npm run dev' },
  { key: 'signIn', command: null },
] as const;

export default function Home() {
  const tc = useTranslations('common');
  const t = useTranslations('home');
  return (
    <main className="min-h-screen bg-bg text-text">
      <AppHeader />
      <div className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
        <Card>
          <h1 className="font-display text-3xl font-extrabold">{tc('app.title')}</h1>
          <p className="mt-2 text-muted">{tc('app.subtitle')}</p>
          <Link
            href="/login"
            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            {t('signIn')}
          </Link>
        </Card>
        <Card>
          <h2 className="font-display text-xl font-bold">{t('gettingStarted.title')}</h2>
          <p className="mt-1 text-sm text-muted">{t('gettingStarted.intro')}</p>
          <ol className="mt-4 flex flex-col gap-4">
            {STEPS.map(({ key, command }, i) => (
              <li key={key} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{t(`gettingStarted.steps.${key}.title`)}</p>
                  <p className="text-sm text-muted">{t(`gettingStarted.steps.${key}.body`)}</p>
                  {command && (
                    <pre className="mt-2 overflow-x-auto rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-sm">
                      <code>{command}</code>
                    </pre>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </main>
  );
}
