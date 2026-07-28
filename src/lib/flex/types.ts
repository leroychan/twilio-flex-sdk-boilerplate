// Pure types shared across the server route and the browser SDK boundary.
// No runtime code here, so it is safe to import from both server and client modules.

export interface TokenResponse {
  token: string;
  identity: string;
  /** true when the app minted a mock token because live Twilio creds were absent. */
  stub: boolean;
  /**
   * TaskRouter activities prefetched server-side (live mode only) so the UI can
   * seed the activity selector before the browser SDK worker hydrates.
   */
  activities?: { sid: string; name: string; available: boolean }[];
}

export interface FlexClientOptions {
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'silent';
  autoAcceptIncomingCalls?: boolean;
  autoUpdateToken?: boolean;
  refreshToken?: string;
  ssoProfileSid?: string;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';
