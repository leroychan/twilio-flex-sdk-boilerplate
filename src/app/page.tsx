import { AppHeader } from '@/components/layout/AppHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function Home() {
  return (
    <main className="min-h-screen bg-bg text-text">
      <AppHeader />
      <div className="mx-auto max-w-3xl p-8">
        <Card>
          <h1 className="font-display text-3xl font-extrabold">Twilio Flex SDK Boilerplate</h1>
          <p className="mt-2 text-muted">Next.js + TypeScript agent desktop foundation.</p>
          <div className="mt-4 flex gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="danger">Danger</Button>
          </div>
        </Card>
      </div>
    </main>
  );
}
