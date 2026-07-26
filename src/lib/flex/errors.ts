// Maps any FlexSdkError-shaped value (or arbitrary thrown value) into a stable,
// UI-friendly shape. Every action wrapper funnels failures through here so the app
// handles SDK errors uniformly. No 'use client' needed — pure, isomorphic logic.

export type FlexErrorSeverity = 'info' | 'warning' | 'error';

export interface NormalizedFlexError {
  code: string;
  severity: FlexErrorSeverity;
  message: string;
}

export function normalizeFlexError(err: unknown): NormalizedFlexError {
  if (err && typeof err === 'object') {
    const e = err as { code?: string | number; message?: string; severity?: string };
    const severity: FlexErrorSeverity =
      e.severity === 'warning' || e.severity === 'info' ? e.severity : 'error';
    return {
      code: e.code !== undefined && e.code !== null ? String(e.code) : 'unknown_error',
      severity,
      message: e.message ?? 'An unexpected error occurred.',
    };
  }
  return {
    code: 'unknown_error',
    severity: 'error',
    message: typeof err === 'string' ? err : 'An unexpected error occurred.',
  };
}
