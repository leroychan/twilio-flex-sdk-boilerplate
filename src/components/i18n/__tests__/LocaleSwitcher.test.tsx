import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import { LocaleSwitcher } from '../LocaleSwitcher';
import { setLocale } from '@/i18n/setLocale';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('@/i18n/setLocale', () => ({ setLocale: vi.fn().mockResolvedValue(undefined) }));

const messages = {
  common: {
    localeSwitcher: {
      label: 'Select language',
      locale: {
        en: 'English',
        'zh-CN': '中文 (简体)',
        'zh-HK': '中文 (繁體)',
        'ja-JP': '日本語',
        'ko-KR': '한국어',
        'es-ES': 'Español',
        'hi-IN': 'हिन्दी',
        'id-ID': 'Bahasa Indonesia',
        'pt-BR': 'Português',
        'th-TH': 'ภาษาไทย',
        'vi-VN': 'Tiếng Việt',
        'tl-PH': 'Filipino',
      },
    },
  },
};

function renderSwitcher() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <LocaleSwitcher />
    </NextIntlClientProvider>,
  );
}

describe('LocaleSwitcher', () => {
  beforeEach(() => {
    refresh.mockClear();
    vi.mocked(setLocale).mockClear();
  });

  it('renders a labelled selector listing the supported locales', () => {
    renderSwitcher();
    expect(screen.getByRole('combobox', { name: 'Select language' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'English' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Español' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '日本語' })).toBeInTheDocument();
  });

  it('persists the chosen locale and refreshes without a full reload', async () => {
    renderSwitcher();
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Select language' }),
      'es-ES',
    );
    expect(setLocale).toHaveBeenCalledWith('es-ES');
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  });
});
