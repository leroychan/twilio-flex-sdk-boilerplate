// Server-only. Mints a real Flex access token via Flex SDK Authentication
// "Option 3" (build-your-own-authentication) user-token endpoints.
// NEVER import this from client ('use client') code.

const FLEX_API = 'https://flex-api.twilio.com';
const TASKROUTER_API = 'https://taskrouter.twilio.com';

export interface FlexTokenCreds {
  accountSid: string;
  apiKey: string;
  apiSecret: string;
  /** Explicit Flex instance SID (GO…). Auto-discovered from Configuration when absent. */
  instanceSid?: string;
}

export interface MintResult {
  token: string;
  identity: string;
}

export type FlexTokenErrorCode =
  | 'flex_config_unavailable'
  | 'flex_user_not_found'
  | 'flex_token_mint_failed';

export class FlexTokenError extends Error {
  code: FlexTokenErrorCode;
  status: number;
  constructor(code: FlexTokenErrorCode, status: number, message?: string) {
    super(message ?? code);
    this.name = 'FlexTokenError';
    this.code = code;
    this.status = status;
  }
}

function basicAuthHeader(apiKey: string, apiSecret: string): string {
  return 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
}

let cachedInstanceSid: string | null = null;

export function resetInstanceSidCache(): void {
  cachedInstanceSid = null;
}

export async function resolveInstanceSid(creds: FlexTokenCreds): Promise<string> {
  if (creds.instanceSid) return creds.instanceSid;
  if (cachedInstanceSid) return cachedInstanceSid;

  const res = await fetch(`${FLEX_API}/v1/Configuration`, {
    headers: { Authorization: basicAuthHeader(creds.apiKey, creds.apiSecret) },
  });
  if (!res.ok) {
    throw new FlexTokenError(
      'flex_config_unavailable',
      502,
      `Flex Configuration fetch failed (${res.status})`,
    );
  }
  const json = (await res.json()) as { flex_instance_sid?: string };
  if (!json.flex_instance_sid) {
    throw new FlexTokenError(
      'flex_config_unavailable',
      502,
      'flex_instance_sid missing from Configuration',
    );
  }
  cachedInstanceSid = json.flex_instance_sid;
  return cachedInstanceSid;
}

export interface ActivityDTO {
  sid: string;
  name: string;
  available: boolean;
}

/**
 * List a workspace's TaskRouter activities via REST so the UI can seed the
 * activity selector before the browser SDK worker hydrates. Returns [] when the
 * workspace SID is absent or the call fails — this is a best-effort prefetch,
 * never fatal to token minting.
 */
export async function listActivities(
  creds: Pick<FlexTokenCreds, 'apiKey' | 'apiSecret'>,
  workspaceSid: string | undefined,
): Promise<ActivityDTO[]> {
  if (!workspaceSid) return [];
  try {
    const res = await fetch(
      `${TASKROUTER_API}/v1/Workspaces/${workspaceSid}/Activities?PageSize=50`,
      { headers: { Authorization: basicAuthHeader(creds.apiKey, creds.apiSecret) } },
    );
    if (!res.ok) return [];
    const json = (await res.json()) as {
      activities?: Array<{ sid: string; friendly_name: string; available: boolean }>;
    };
    return (json.activities ?? []).map((a) => ({
      sid: a.sid,
      name: a.friendly_name,
      available: Boolean(a.available),
    }));
  } catch {
    return [];
  }
}

export async function mintFlexUserToken(
  creds: FlexTokenCreds,
  username: string,
  ttlSeconds = 3600,
): Promise<MintResult> {
  const instanceSid = await resolveInstanceSid(creds);
  const auth = basicAuthHeader(creds.apiKey, creds.apiSecret);

  const userRes = await fetch(
    `${FLEX_API}/v4/Instances/${instanceSid}/Users?Username=${encodeURIComponent(username)}`,
    { headers: { Authorization: auth } },
  );
  if (!userRes.ok) {
    throw new FlexTokenError(
      'flex_user_not_found',
      404,
      `Flex user lookup failed (${userRes.status})`,
    );
  }
  const userJson = (await userRes.json()) as {
    users?: Array<{ flex_user_sid?: string }>;
  };
  const flexUserSid = userJson.users?.[0]?.flex_user_sid;
  if (!flexUserSid) {
    throw new FlexTokenError(
      'flex_user_not_found',
      404,
      `No Flex user for username "${username}"`,
    );
  }

  const tokenRes = await fetch(
    `${FLEX_API}/v4/Instances/${instanceSid}/Users/${flexUserSid}/Tokens`,
    {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: ttlSeconds }),
    },
  );
  if (!tokenRes.ok) {
    throw new FlexTokenError(
      'flex_token_mint_failed',
      502,
      `Flex token mint failed (${tokenRes.status})`,
    );
  }
  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  if (!tokenJson.access_token) {
    throw new FlexTokenError(
      'flex_token_mint_failed',
      502,
      'access_token missing from mint response',
    );
  }
  return { token: tokenJson.access_token, identity: username };
}
