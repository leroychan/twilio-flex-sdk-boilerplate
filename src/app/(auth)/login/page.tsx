'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useFlexStore } from '@/store';
import { requestToken, exchangeSsoToken } from '@/lib/flex/auth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const SSO_PROFILE_SID = process.env.NEXT_PUBLIC_FLEX_SSO_PROFILE_SID ?? '';

export default function LoginPage() {
  const t = useTranslations('session');
  const router = useRouter();
  const searchParams = useSearchParams();
  const setToken = useFlexStore((s) => s.setToken);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  // SSO OAuth callback: exchange ?code&state for an access token, then continue.
  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    if (!code || !state) return;
    const codeVerifier = sessionStorage.getItem('flex.codeVerifier');
    const nonce = sessionStorage.getItem('flex.nonce');
    if (!codeVerifier || !nonce) return;

    setBusy(true);
    exchangeSsoToken({ ssoProfileSid: SSO_PROFILE_SID, codeVerifier, nonce, code })
      .then(({ accessToken }) => {
        sessionStorage.removeItem('flex.codeVerifier');
        sessionStorage.removeItem('flex.nonce');
        setToken(accessToken);
        router.push('/agent-desktop');
      })
      .catch(() => {
        setError(true);
        setBusy(false);
      });
  }, [searchParams, router, setToken]);

  async function handleCustomToken() {
    setBusy(true);
    setError(false);
    try {
      const { token } = await requestToken();
      setToken(token);
      router.push('/agent-desktop');
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg text-text">
      <Card className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-extrabold">{t('title')}</h1>
        <p className="mt-1 text-muted">{t('subtitle')}</p>
        {error && <p className="mt-3 text-danger">{t('error')}</p>}
        <div className="mt-6 flex flex-col gap-3">
          <Button onClick={handleCustomToken} disabled={busy}>
            {busy ? t('signingIn') : t('demoMode')}
          </Button>
        </div>
      </Card>
    </main>
  );
}
