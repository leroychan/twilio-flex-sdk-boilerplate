import type { SyncStreamMessage } from '@/lib/sync/types';

export interface TranscriptEntry {
  id: string;
  role: 'agent' | 'customer' | 'other';
  speaker: string; // raw role passthrough; the panel localizes agent/customer
  text: string;
  at: string; // ISO timestamp, stamped on receipt
}

const AGENT_ROLES = new Set(['agent', 'assistant']);
const CUSTOMER_ROLES = new Set(['customer', 'user', 'end-user']);

/**
 * Normalize a raw Sync message into a TranscriptEntry, or null if it is not a
 * final, non-empty transcription. `now` is injectable for deterministic tests.
 */
export function toTranscriptEntry(
  msg: SyncStreamMessage,
  callSid: string,
  index: number,
  now: () => string = () => new Date().toISOString(),
): TranscriptEntry | null {
  if (!msg || msg.type !== 'transcription') return null;
  const m = msg as { text?: unknown; role?: unknown; isFinal?: unknown };
  if (m.isFinal === false) return null;
  const text = typeof m.text === 'string' ? m.text.trim() : '';
  if (!text) return null;
  const raw = typeof m.role === 'string' ? m.role.toLowerCase() : '';
  const role = AGENT_ROLES.has(raw) ? 'agent' : CUSTOMER_ROLES.has(raw) ? 'customer' : 'other';
  return { id: `${callSid}-${index}`, role, speaker: raw || role, text, at: now() };
}
