import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  resolveInstanceSid,
  mintFlexUserToken,
  resetInstanceSidCache,
  listActivities,
  FlexTokenError,
} from '../flexToken';

const CREDS = { accountSid: 'AC1', apiKey: 'SK1', apiSecret: 'secret' };

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

describe('flexToken', () => {
  beforeEach(() => {
    resetInstanceSidCache();
    vi.restoreAllMocks();
  });
  afterEach(() => vi.restoreAllMocks());

  it('uses the explicit instanceSid without fetching', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const sid = await resolveInstanceSid({ ...CREDS, instanceSid: 'GOexplicit' });
    expect(sid).toBe('GOexplicit');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('auto-discovers and caches the instance SID from Configuration', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse(200, { flex_instance_sid: 'GOdiscovered' }));
    const first = await resolveInstanceSid(CREDS);
    const second = await resolveInstanceSid(CREDS);
    expect(first).toBe('GOdiscovered');
    expect(second).toBe('GOdiscovered');
    expect(fetchSpy).toHaveBeenCalledTimes(1); // cached
    const url = String(fetchSpy.mock.calls[0]![0]);
    expect(url).toContain('/v1/Configuration');
    const init = fetchSpy.mock.calls[0]![1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Basic ' + Buffer.from('SK1:secret').toString('base64'),
    );
  });

  it('throws flex_config_unavailable when Configuration fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(403, {}));
    await expect(resolveInstanceSid(CREDS)).rejects.toMatchObject({
      code: 'flex_config_unavailable',
      status: 502,
    });
  });

  it('mints a token: resolves user then posts to Tokens', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse(200, { users: [{ flex_user_sid: 'FU9' }] }))
      .mockResolvedValueOnce(jsonResponse(200, { access_token: 'REAL.flex.jwt' }));
    const result = await mintFlexUserToken({ ...CREDS, instanceSid: 'GO1' }, 'lechan');
    expect(result).toEqual({ token: 'REAL.flex.jwt', identity: 'lechan' });
    expect(String(fetchSpy.mock.calls[0]![0])).toContain(
      '/v4/Instances/GO1/Users?Username=lechan',
    );
    expect(String(fetchSpy.mock.calls[1]![0])).toContain(
      '/v4/Instances/GO1/Users/FU9/Tokens',
    );
    expect((fetchSpy.mock.calls[1]![1] as RequestInit).method).toBe('POST');
  });

  it('throws flex_user_not_found when no user matches', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(200, { users: [] }));
    await expect(
      mintFlexUserToken({ ...CREDS, instanceSid: 'GO1' }, 'ghost'),
    ).rejects.toMatchObject({ code: 'flex_user_not_found', status: 404 });
  });

  it('throws flex_token_mint_failed when token POST has no access_token', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse(200, { users: [{ flex_user_sid: 'FU9' }] }))
      .mockResolvedValueOnce(jsonResponse(200, {}));
    await expect(
      mintFlexUserToken({ ...CREDS, instanceSid: 'GO1' }, 'lechan'),
    ).rejects.toMatchObject({ code: 'flex_token_mint_failed', status: 502 });
  });

  it('FlexTokenError is instanceof Error', () => {
    const e = new FlexTokenError('flex_user_not_found', 404);
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe('flex_user_not_found');
  });

  describe('listActivities', () => {
    it('maps friendly_name to name and returns the activity list', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        jsonResponse(200, {
          activities: [
            { sid: 'WA1', friendly_name: 'Available', available: true },
            { sid: 'WA2', friendly_name: 'Offline', available: false },
          ],
        }),
      );
      const result = await listActivities(
        { apiKey: 'SK1', apiSecret: 'secret' },
        'WSxxx',
      );
      expect(result).toEqual([
        { sid: 'WA1', name: 'Available', available: true },
        { sid: 'WA2', name: 'Offline', available: false },
      ]);
      const url = String(fetchSpy.mock.calls[0]![0]);
      expect(url).toContain('/v1/Workspaces/WSxxx/Activities');
      const init = fetchSpy.mock.calls[0]![1] as RequestInit;
      expect((init.headers as Record<string, string>).Authorization).toBe(
        'Basic ' + Buffer.from('SK1:secret').toString('base64'),
      );
    });

    it('returns [] when workspaceSid is undefined without fetching', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const result = await listActivities({ apiKey: 'SK1', apiSecret: 'secret' }, undefined);
      expect(result).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('returns [] when the fetch is non-ok', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(403, {}));
      const result = await listActivities({ apiKey: 'SK1', apiSecret: 'secret' }, 'WSxxx');
      expect(result).toEqual([]);
    });

    it('returns [] when fetch throws', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));
      const result = await listActivities({ apiKey: 'SK1', apiSecret: 'secret' }, 'WSxxx');
      expect(result).toEqual([]);
    });
  });
});
