import { useTranslations } from 'next-intl';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function Home() {
  const t = useTranslations('common');
  return (
    <main className="min-h-screen bg-bg text-text">
      <AppHeader />
      <div className="mx-auto max-w-3xl p-8">
        <Card>
          <h1 className="font-display text-3xl font-extrabold">{t('app.title')}</h1>
          <p className="mt-2 text-muted">{t('app.subtitle')}</p>
          <div className="mt-4 flex gap-3">
            <Button>{t('buttons.primary')}</Button>
            <Button variant="secondary">{t('buttons.secondary')}</Button>
            <Button variant="danger">{t('buttons.danger')}</Button>
          </div>
        </Card>
      </div>
    </main>
  );
}
