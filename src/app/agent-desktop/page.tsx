'use client';

import dynamic from 'next/dynamic';

// ssr:false is mandatory — the Flex SDK requires window/WebRTC/localStorage and must
// never render on the server. The page itself is a client component so dynamic() with
// ssr:false is allowed under Next.js 15.
const AgentDesktopShell = dynamic(
  () => import('@/features/session/components/AgentDesktopShell').then((m) => m.AgentDesktopShell),
  { ssr: false },
);

export default function AgentDesktopPage() {
  return <AgentDesktopShell />;
}
