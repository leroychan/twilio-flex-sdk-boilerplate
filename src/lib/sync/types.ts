export interface TranscriptionSyncMessage {
  type: 'transcription';
  text: string;
  role: 'agent' | 'customer' | string;
  isFinal?: boolean;
}
export type SyncStreamMessage =
  | TranscriptionSyncMessage
  | { type: string; [k: string]: unknown };
export type SyncStreamListener = (msg: SyncStreamMessage) => void;
