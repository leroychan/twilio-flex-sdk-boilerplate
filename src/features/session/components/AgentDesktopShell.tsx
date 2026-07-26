'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFlexStore } from '@/store';
import { FlexClientProvider } from '@/lib/flex/provider';

// The session-gated container for the agent desktop. Later feature parts render
// their panels as children here (behind the live FlexClientProvider).
export function AgentDesktopShell() {
  const token = useFlexStore((s) => s.token);
  const router = useRouter();

  useEffect(() => {
    if (!token) router.replace('/login');
  }, [token, router]);

  if (!token) return null;

  return (
    <FlexClientProvider token={token}>
      <main data-testid="agent-desktop" className="min-h-screen bg-bg text-text">
        {/* Feature parts (presence, tasks, voice, conversations, supervisor) mount here. */}
      </main>
    </FlexClientProvider>
  );
}
