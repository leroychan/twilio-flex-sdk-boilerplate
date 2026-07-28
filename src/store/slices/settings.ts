import type { StateCreator } from 'zustand';

export interface TranscriptionSettings {
  enabled: boolean;
  language: string;
  engine: string;
  speechModel: string;
  partialResults: boolean;
  profanityFilter: boolean;
  punctuation: boolean;
  hints: string;
}

export const DEFAULT_TRANSCRIPTION_SETTINGS: TranscriptionSettings = {
  enabled: true,
  language: 'en-US',
  engine: 'google',
  speechModel: 'telephony',
  partialResults: true,
  profanityFilter: true,
  punctuation: true,
  hints: '',
};

export interface SettingsSlice {
  transcription: TranscriptionSettings;
  setTranscriptionSettings(patch: Partial<TranscriptionSettings>): void;
}

export const createSettingsSlice: StateCreator<SettingsSlice, [], [], SettingsSlice> = (set) => ({
  transcription: { ...DEFAULT_TRANSCRIPTION_SETTINGS },
  setTranscriptionSettings: (patch) =>
    set((s) => ({ transcription: { ...s.transcription, ...patch } })),
});
