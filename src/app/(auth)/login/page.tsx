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
  const setIdentity = useFlexStore((s) => s.setIdentity);
  const setActivities = useFlexStore((s) => s.setActivities);
  const [busy, setBusy] = useState(false);
  const [username, setUsername] = useState('');
  const [errorCode, setErrorCode] = useState<string | null>(null);

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
        setErrorCode('token_request_failed');
        setBusy(false);
      });
  }, [searchParams, router, setToken]);

  async function handleCustomToken() {
    setBusy(true);
    setErrorCode(null);
    try {
      const res = await requestToken(username.trim() || undefined);
      setToken(res.token);
      // Persist the minting identity so the custom-token refresh loop can replay
      // the mint before the token expires (and after a reload).
      setIdentity(res.identity);
      if (res.activities?.length) setActivities(res.activities);
      router.push('/agent-desktop');
    } catch (e) {
      setErrorCode((e as Error).message || 'token_request_failed');
      setBusy(false);
    }
  }

  const errorText =
    errorCode === 'flex_user_not_found'
      ? t('errors.userNotFound')
      : errorCode === 'username_required'
        ? t('errors.usernameRequired')
        : errorCode
          ? t('error')
          : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg text-text">
      <Card className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-extrabold">{t('title')}</h1>
        <p className="mt-1 text-muted">{t('subtitle')}</p>
        {errorText && <p className="mt-3 text-danger">{errorText}</p>}
        <div className="mt-6 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-text">
            <span>{t('usernameLabel')}</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('usernamePlaceholder')}
              className="rounded-md border border-border bg-surface px-3 py-2 text-text"
            />
          </label>
          <Button onClick={handleCustomToken} disabled={busy}>
            {busy ? t('signingIn') : t('demoMode')}
          </Button>
        </div>
      </Card>
    </main>
  );
}
