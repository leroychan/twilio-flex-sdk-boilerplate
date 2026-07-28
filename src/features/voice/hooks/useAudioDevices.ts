'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  enumerateAudioDevices,
  requestAudioPermission,
  getSelectedInput,
  getSelectedOutput,
  persistSelectedInput,
  persistSelectedOutput,
  type AudioDeviceInfo,
} from '../lib/audioDevices';

export interface UseAudioDevicesResult {
  inputs: AudioDeviceInfo[];
  outputs: AudioDeviceInfo[];
  selectedInput: string | null;
  selectedOutput: string | null;
  chooseInput: (id: string) => void;
  chooseOutput: (id: string) => void;
}

/**
 * Manages the browser's audio device lists and the agent's chosen input/output.
 * On mount it requests mic permission (so labels resolve) and enumerates devices,
 * then re-enumerates on `devicechange`. Selection is persisted and applied to any
 * active call. Runs on page load — no live call required.
 */
export function useAudioDevices(): UseAudioDevicesResult {
  const [inputs, setInputs] = useState<AudioDeviceInfo[]>([]);
  const [outputs, setOutputs] = useState<AudioDeviceInfo[]>([]);
  const [selectedInput, setSelectedInput] = useState<string | null>(() => getSelectedInput());
  const [selectedOutput, setSelectedOutput] = useState<string | null>(() => getSelectedOutput());

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      const { inputs: ins, outputs: outs } = await enumerateAudioDevices();
      if (cancelled) return;
      setInputs(ins);
      setOutputs(outs);
      // Fall back to the first available device so the selector is never blank.
      setSelectedInput((cur) => cur ?? ins[0]?.id ?? null);
      setSelectedOutput((cur) => cur ?? outs[0]?.id ?? null);
    };

    void (async () => {
      await requestAudioPermission();
      await refresh();
    })();

    const media = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
    const onChange = () => void refresh();
    media?.addEventListener?.('devicechange', onChange);
    return () => {
      cancelled = true;
      media?.removeEventListener?.('devicechange', onChange);
    };
  }, []);

  const chooseInput = useCallback((id: string) => {
    setSelectedInput(id);
    persistSelectedInput(id);
  }, []);

  const chooseOutput = useCallback((id: string) => {
    setSelectedOutput(id);
    persistSelectedOutput(id);
  }, []);

  return { inputs, outputs, selectedInput, selectedOutput, chooseInput, chooseOutput };
}
