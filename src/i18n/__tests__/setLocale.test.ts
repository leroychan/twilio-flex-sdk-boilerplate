import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cookies } from 'next/headers';
import { setLocale } from '../setLocale';

vi.mock('next/headers', () => ({ cookies: vi.fn() }));

const set = vi.fn();

beforeEach(() => {
  set.mockClear();
  vi.mocked(cookies).mockResolvedValue({ set } as unknown as Awaited<ReturnType<typeof cookies>>);
});

describe('setLocale', () => {
  it('persists a supported locale in the NEXT_LOCALE cookie', async () => {
    await setLocale('es-ES');
    expect(set).toHaveBeenCalledWith('NEXT_LOCALE', 'es-ES', expect.objectContaining({ path: '/' }));
  });

  it('ignores an unsupported locale', async () => {
    // @ts-expect-error deliberately invalid input for the guard test
    await setLocale('fr');
    expect(set).not.toHaveBeenCalled();
  });
});
